# admin_chat.py

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ChatPermission, User
from sqlalchemy.exc import SQLAlchemyError
import logging

admin_chat_bp = Blueprint("admin_chat", __name__)

@admin_chat_bp.route('/admin/chat-pairs', methods=['GET'])
@jwt_required()
def get_chat_permissions():
    """
    全てのチャット許可設定を取得する
    Returns:
        チャット許可リスト (ユーザーIDとパートナーIDの組み合わせ)
    """
    try:
        # データベースから全ての許可設定を取得
        permissions = ChatPermission.query.all()
        
        result = [
            {
                'user_id': p.user_id,
                'partner_id': p.partner_id
            } for p in permissions
        ]
        
        return jsonify(result), 200
        
    except SQLAlchemyError as e:
        # エラーログ
        current_app.logger.error(f"データベースエラー: {str(e)}")
        return jsonify({'error': 'データベースエラーが発生しました', 'details': str(e)}), 500
    except Exception as e:
        # 一般エラー
        current_app.logger.error(f"予期せぬエラー: {str(e)}")
        return jsonify({'error': '予期せぬエラーが発生しました'}), 500

@admin_chat_bp.route('/admin/chat-pairs', methods=['POST'])
@jwt_required()
def add_chat_pair():
    """
    チャット許可の1ペア（双方向）を追加する
    Request JSON:
        {
            "user_id": 1,
            "partner_id": 2
        }
    """
    data = request.get_json()
    user_id = data.get("user_id")
    partner_id = data.get("partner_id")

    # バリデーション
    if not user_id or not partner_id or user_id == partner_id:
        return jsonify({"error": "無効なユーザーIDです"}), 400

    # すでに存在していれば何もしない（双方向チェック）
    existing = ChatPermission.query.filter_by(user_id=user_id, partner_id=partner_id).first()
    if existing:
        return jsonify({"message": "既に存在しています"}), 200

    try:
        # 双方向登録
        db.session.add(ChatPermission(user_id=user_id, partner_id=partner_id))
        db.session.add(ChatPermission(user_id=partner_id, partner_id=user_id))
        db.session.commit()
        return jsonify({"message": "チャット許可ペアを追加しました"}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"追加エラー: {str(e)}")
        return jsonify({"error": "追加に失敗しました"}), 500

@admin_chat_bp.route('/admin/chat-pairs', methods=['DELETE'])
@jwt_required()
def delete_chat_pair():


    data = request.get_json()
    user_id = data.get("user_id")
    partner_id = data.get("partner_id")


    if not user_id or not partner_id or user_id == partner_id:
        return jsonify({"error": "無効なユーザーIDです"}), 400

    try:
        ChatPermission.query.filter_by(user_id=user_id, partner_id=partner_id).delete()
        ChatPermission.query.filter_by(user_id=partner_id, partner_id=user_id).delete()
        db.session.commit()
        return jsonify({"message": "チャット許可ペアを削除しました"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"削除エラー: {str(e)}")
        return jsonify({"error": "削除に失敗しました"}), 500
