from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from models import db, User
from services.auth import validate_registration_data, validate_login_data

# 認証関連のBlueprintを作成
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """ユーザーログイン処理"""
    data = request.get_json()
    
    # 入力データの検証
    validation_result = validate_login_data(data)
    if not validation_result['valid']:
        return jsonify({'error': validation_result['message']}), 400
    
    employee_id = data.get('employeeId')
    password = data.get('password')
    remember_me = data.get('rememberMe', False)  # ✅ 追加
    
    # ユーザー検索
    user = User.query.filter_by(employee_id=employee_id).first()
    
    # パスワード検証
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    # ✅ 初回ログインのときだけ sound_enabled を False にする
    if user.sound_enabled is None:
        user.sound_enabled = False
        db.session.commit()

    # ✅ 追加：ログイン状態保存に応じてトークン有効期限を設定
    if remember_me:
        expires_delta = timedelta(days=30)  # 30日間
    else:
        expires_delta = timedelta(hours=8)   # 8時間（デフォルト）
    
    # アクセストークン生成
    access_token = create_access_token(
        identity=str(user.id),
        expires_delta=expires_delta  # ✅ 追加
    )
    
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict(),
        'expires_in': int(expires_delta.total_seconds())  # ✅ 追加：フロントエンド用
    })

@auth_bp.route('/register', methods=['POST'])
def register_user():
    """ユーザー登録処理"""
    data = request.get_json()
    
    # 入力データの検証
    validation_result = validate_registration_data(data)
    if not validation_result['valid']:
        return jsonify({'error': validation_result['message']}), 400
    
    # 既存ユーザーチェック
    if User.query.filter_by(employee_id=data['employeeId']).first():
        return jsonify({'error': 'Employee ID already exists'}), 400
    
    # パスワードハッシュ化
    password_hash = generate_password_hash(data['password'])
    
    # 新規ユーザー作成
    new_user = User(
        employee_id=data['employeeId'],
        name=data['name'],
        department_name=data['departmentName'],
        position=data['position'],
        email=data.get('email'),
        password_hash=password_hash,
        role_level=data.get('roleLevel', 1)  # デフォルトは一般ユーザー
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'message': 'Registration successful', 'user': new_user.to_dict()}), 201

@auth_bp.route('/users/me', methods=['GET'])
@jwt_required()
def get_user_info():
    """認証済みユーザーの情報取得"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()})

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():

    # クライアント側でトークンを破棄する指示のみを返す
    return jsonify({'message': 'Logout successful'})