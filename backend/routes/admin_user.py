# routes/admin_user.py

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User
from werkzeug.security import generate_password_hash
from sqlalchemy.exc import IntegrityError

admin_user_bp = Blueprint("admin_user", __name__)

# ユーザーデータ取得
@admin_user_bp.route("/admin_users", methods=["GET"])
@jwt_required()
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

# 新規ユーザー作成
@admin_user_bp.route("/admin_users", methods=["POST"])
@jwt_required()
def create_user():
    data = request.get_json()
    
    # 必須フィールドの検証
    required_fields = ["employee_id", "name", "department_name", "position", "password"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field}は必須です"}), 400
    
    # 既存ユーザーのチェック
    existing_user = User.query.filter_by(employee_id=data["employee_id"]).first()
    if existing_user:
        return jsonify({"error": "この社員IDは既に使用されています"}), 400
    
    # 新規ユーザーの作成
    try:
        new_user = User(
            employee_id=data["employee_id"],
            name=data["name"],
            department_name=data["department_name"],
            position=data["position"],
            email=data.get("email"),  # メールアドレスはオプション
            password_hash=generate_password_hash(data["password"]),
            role_level=int(data.get("role_level", 1))  # デフォルトは一般ユーザー
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({"message": "アカウントが作成されました", "user": new_user.to_dict()}), 201
    
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"error": "データベースエラー: " + str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "アカウント作成中にエラーが発生しました: " + str(e)}), 500

# ユーザー更新
@admin_user_bp.route("/admin_users/<int:user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id):
    data = request.get_json()
    
    # 更新対象のユーザーを検索
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "ユーザーが見つかりません"}), 404
    
    # 必須フィールドの検証
    required_fields = ["employee_id", "name", "department_name", "position"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field}は必須です"}), 400
    
    # 社員IDの重複チェック（自分以外）
    if data["employee_id"] != user.employee_id:
        existing_user = User.query.filter_by(employee_id=data["employee_id"]).first()
        if existing_user and existing_user.id != user_id:
            return jsonify({"error": "この社員IDは既に使用されています"}), 400
    
    try:
        # ユーザー情報の更新
        user.employee_id = data["employee_id"]
        user.name = data["name"]
        user.department_name = data["department_name"]
        user.position = data["position"]
        
        # オプションフィールドの更新
        if "email" in data:
            user.email = data["email"]
        
        if "role_level" in data:
            user.role_level = int(data["role_level"])
        
        # パスワード変更がある場合のみ更新
        if "password" in data and data["password"]:
            user.password_hash = generate_password_hash(data["password"])
        
        db.session.commit()
        return jsonify({"message": "ユーザー情報が更新されました", "user": user.to_dict()})
    
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"error": "データベースエラー: " + str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "ユーザー更新中にエラーが発生しました: " + str(e)}), 500

# ユーザー削除
@admin_user_bp.route("/admin_users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    # 削除対象のユーザーを検索
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "ユーザーが見つかりません"}), 404
    
    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "ユーザーが削除されました"})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "ユーザー削除中にエラーが発生しました: " + str(e)}), 500