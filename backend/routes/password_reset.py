from flask import Blueprint, request, jsonify, current_app, render_template, url_for
from werkzeug.security import generate_password_hash
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid
from datetime import datetime, timedelta
import secrets
from models import db, User, PasswordResetRequest
from services.email_service import send_password_reset_email, send_admin_reset_notification
from services.auth import validate_reset_request, validate_reset_token

# パスワードリセット関連のBlueprintを作成
password_reset_bp = Blueprint('password_reset', __name__)

@password_reset_bp.route('/password-reset-request', methods=['POST'])
def request_password_reset():
    """パスワードリセットリクエスト処理
    
    ユーザーのメールアドレスにリセットリンクを送信する
    """
    data = request.get_json()
    
    # 入力データの検証
    validation_result = validate_reset_request(data)
    if not validation_result['valid']:
        return jsonify({'error': validation_result['message']}), 400
    
    employee_id = data.get('employeeId')
    email = data.get('email')
    
    # ユーザー検索
    user = User.query.filter_by(employee_id=employee_id, email=email).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # トークン生成（UUID + ランダム文字列で十分に長く推測困難なものに）
    token = f"{uuid.uuid4().hex}-{secrets.token_urlsafe(32)}"
    
    # DBにリセットリクエストを保存
    reset_request = PasswordResetRequest(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=24)  # 24時間有効
    )
    
    db.session.add(reset_request)
    db.session.commit()
    
    # リセットURL生成
    reset_url = f"{request.host_url.rstrip('/')}/api/password-reset-page?token={token}"

    
    # メール送信
    try:
        send_password_reset_email(user.email, user.name, reset_url)
    except Exception as e:
        current_app.logger.error(f"Failed to send email: {str(e)}")
        return jsonify({'error': 'Failed to send email'}), 500
    
    return jsonify({'message': 'Password reset email sent successfully'})

@password_reset_bp.route('/admin-password-reset-request', methods=['POST'])
def request_admin_password_reset():
    """管理者へのパスワードリセット依頼
    
    管理者にパスワードリセット依頼を送信する
    """
    data = request.get_json()
    
    employee_id = data.get('employeeId')
    note = data.get('note', '')
    
    if not employee_id:
        return jsonify({'error': 'Employee ID is required'}), 400
    
    # ユーザー検索
    user = User.query.filter_by(employee_id=employee_id).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # DBにリセットリクエストを保存 (管理者対応待ちフラグ付き)
    reset_request = PasswordResetRequest(
        user_id=user.id,
        requires_admin=True,
        admin_note=note,
        created_at=datetime.utcnow()
    )
    
    db.session.add(reset_request)
    db.session.commit()
    
    # 管理者へ通知（メールなど）
    try:
        # 管理者一覧を取得
        admins = User.query.filter(User.role_level >= 3).all()  # 部長以上は管理者
        
        if admins:
            admin_emails = [admin.email for admin in admins if admin.email]
            
            if admin_emails:
                send_admin_reset_notification(
                    admin_emails, 
                    user.name, 
                    user.employee_id,
                    note
                )
    except Exception as e:
        current_app.logger.error(f"Failed to send admin notification: {str(e)}")
        # 通知失敗してもユーザーにはエラーを返さない
    
    return render_template('password_reset_success.html')


@password_reset_bp.route('/password-reset', methods=['POST'])
def reset_password():
    """パスワードリセット処理
    
    トークンを使ってパスワードをリセットする
    """
    data = request.get_json()
    
    # 入力データの検証
    validation_result = validate_reset_token(data)
    if not validation_result['valid']:
        return jsonify({'error': validation_result['message']}), 400
    
    token = data.get('token')
    new_password = data.get('newPassword')
    
    # トークンのリセットリクエストを検索
    reset_request = PasswordResetRequest.query.filter_by(token=token, is_used=False).first()
    
    if not reset_request:
        return jsonify({'error': 'Invalid or used token'}), 400
    
    # トークンの有効期限チェック
    if reset_request.expires_at and reset_request.expires_at < datetime.utcnow():
        return jsonify({'error': 'Token has expired'}), 400
    
    # ユーザー情報取得
    user = User.query.get(reset_request.user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # パスワード更新
    user.password_hash = generate_password_hash(new_password)
    
    # トークンを使用済みにする
    reset_request.is_used = True
    reset_request.used_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({'message': 'Password has been reset successfully'})

@password_reset_bp.route('/password-reset-page', methods=['GET'])
def password_reset_page():
    """パスワードリセットページの表示
    
    トークンの確認とパスワード再設定フォームを表示
    """
    token = request.args.get('token')
    
    if not token:
        return render_template('password_reset_error.html', error='トークンが見つかりません')
    
    # トークンのリセットリクエストを検索
    reset_request = PasswordResetRequest.query.filter_by(token=token, is_used=False).first()
    
    if not reset_request:
        return render_template('password_reset_error.html', error='無効またはすでに使用されたトークンです')
    
    # トークンの有効期限チェック
    if reset_request.expires_at and reset_request.expires_at < datetime.utcnow():
        return render_template('password_reset_error.html', error='トークンの有効期限が切れています')
    
    # ユーザー情報取得
    user = User.query.get(reset_request.user_id)
    
    if not user:
        return render_template('password_reset_error.html', error='ユーザーが見つかりません')
    
    return render_template('password_reset.html', token=token, user_name=user.name)


# パスワード変更画面（ログイン済みユーザー用）
@password_reset_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """パスワード変更処理（ログインユーザー用）
    
    ログイン済みユーザーのパスワード変更
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current password and new password are required'}), 400
    
    # 現在のパスワードが正しいか確認
    if not user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400
    
    # パスワード更新
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Password has been changed successfully'})


@password_reset_bp.route('/password-reset-success', methods=['GET'])
def password_reset_success_page():
    return render_template('password_reset_success.html')
