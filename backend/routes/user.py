# routes/user.py

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User

user_bp = Blueprint("user", __name__)

@user_bp.route("/users", methods=["GET"])
@jwt_required()
def get_users():
    """
    全従業員一覧を取得するAPI。
    """
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

# 現在のユーザーの最新情報をデータベースから取得
@user_bp.route("/users/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """
    現在のユーザーの最新情報をデータベースから取得するAPI。
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()})

@user_bp.route("/users/last-page", methods=["POST"])
@jwt_required()
def update_last_active_page():
    print('last_active_page関数実行')
    user_id = get_jwt_identity()
    data = request.json
    page = data.get("page")

    if not page:
        return jsonify({'error': 'page is required'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.last_active_page = page
    db.session.commit()
    return jsonify({'message': 'last_active_page updated'})

# サウンドON/OFF　状態保存
@user_bp.route("/users/sound", methods=["POST"])
@jwt_required()
def update_sound_enabled():
    user_id = get_jwt_identity()
    data = request.json
    sound_enabled = data.get("sound_enabled")

    if sound_enabled is None:
        return jsonify({"error": "sound_enabled is required"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.sound_enabled = sound_enabled
    db.session.commit()
    return jsonify({"message": "Sound setting updated"})
