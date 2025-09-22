# routes/chat.py - データ同時送信対応版

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ChatMessage, ChatPermission, User
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_, and_, desc
import logging
from datetime import datetime
from pytz import timezone,utc

from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect

chat_bp = Blueprint("chat", __name__)

# 時間を日本時間に変換
def to_jst(dt):
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = utc.localize(dt)  # UTCとして認識させる
    jst = timezone('Asia/Tokyo')
    return dt.astimezone(jst).isoformat()


# chat取得
@chat_bp.route('/chat/messages/<int:user_id>', methods=['GET'])
@jwt_required()
def get_chat_messages(user_id):
    """特定のユーザーとのチャット履歴を取得する（既読通知付き）"""
    current_user_id = get_jwt_identity()
    
    try:
        # 両ユーザー間のチャット許可を確認
        permission = ChatPermission.query.filter(
            or_(
                and_(ChatPermission.user_id == current_user_id, ChatPermission.partner_id == user_id),
                and_(ChatPermission.user_id == user_id, ChatPermission.partner_id == current_user_id)
            )
        ).first()
        
        if not permission:
            return jsonify({'error': 'チャット許可がありません'}), 403
            
        # 両ユーザー間のメッセージを取得
        messages = ChatMessage.query.filter(
            or_(
                and_(ChatMessage.sender_id == current_user_id, ChatMessage.receiver_id == user_id),
                and_(ChatMessage.sender_id == user_id, ChatMessage.receiver_id == current_user_id)
            )
        ).order_by(ChatMessage.created_at).all()
        
        # ✅ 既読処理前に未読メッセージをカウント
        unread_messages = ChatMessage.query.filter_by(
            sender_id=user_id,
            receiver_id=current_user_id,
            is_read=False
        ).all()
        
        unread_count = len(unread_messages)
        current_app.logger.info(f"Chat画面を開く: {unread_count}件の未読メッセージを既読処理")
        
        # ✅ 相手からのメッセージを既読にする
        for msg in unread_messages:
            msg.is_read = True
        
        db.session.commit()
        
        # ✅ 未読メッセージがあった場合、送信者に既読通知
        if unread_count > 0:
            # 送信者（user_id）の最新チャット履歴を取得
            sender_messages = get_chat_messages_between_users(user_id, current_user_id)
            sender_threads = get_user_chat_threads(user_id)
            
            # WebSocketで送信者に既読通知
            socketio = current_app.config.get('socketio')
            if socketio:
                socketio.emit('chat_messages_updated', {
                    'chat_partner_id': current_user_id,  # 送信者から見た相手（既読した人）
                    'messages': sender_messages,         # 既読状態が反映された履歴
                    'threads': sender_threads            # 更新されたスレッド一覧
                }, room=str(user_id))
                
                current_app.logger.info(f"既読通知送信: ユーザー{user_id}に{unread_count}件の既読通知を送信")
        
        # 結果をJSON形式に変換
        result = []
        for msg in messages:
            result.append({
                'id': msg.id,
                'sender_id': msg.sender_id,
                'receiver_id': msg.receiver_id,
                'message': msg.message,
                'is_read': msg.is_read,
                'is_edited': msg.is_edited,
                'created_at': to_jst(msg.created_at),
                'updated_at': to_jst(msg.updated_at)
            })
            
        return jsonify(result), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"データベースエラー: {str(e)}")
        return jsonify({'error': 'データベースエラーが発生しました'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"予期せぬエラー: {str(e)}")
        return jsonify({'error': '予期せぬエラーが発生しました'}), 500

# chat送信ロジック
@chat_bp.route('/chat/messages', methods=['POST'])
@jwt_required()
def send_message():
    # JWTから送信者IDを取得
    current_user_id = get_jwt_identity()
    # リクエストのJSONデータを取得
    data = request.get_json()
    
    # 必須データ検証
    if not data or not data.get('receiver_id') or not data.get('message'):
        return jsonify({'error': '受信者IDとメッセージは必須です'}), 400
        
    receiver_id = data.get('receiver_id')
    message_text = data.get('message')
    
    try:
        # チャット許可を確認
        permission = ChatPermission.query.filter(
            or_(
                and_(ChatPermission.user_id == current_user_id, ChatPermission.partner_id == receiver_id),
                and_(ChatPermission.user_id == receiver_id, ChatPermission.partner_id == current_user_id)
            )
        ).first()
        
        if not permission:
            return jsonify({'error': 'このユーザーとのチャット許可がありません'}), 403
        
        # ①送信メッセージをDBに追加
        new_message = ChatMessage(
            permission_id=permission.id,
            sender_id=current_user_id,
            receiver_id=receiver_id,
            message=message_text,
            is_read=False,
            is_edited=False,
            created_at=datetime.utcnow(),
            updated_at=None
        )
        
        db.session.add(new_message)
        db.session.commit()
        
        # ②該当の組み合わせのメッセージを全件取得
        sender_messages = get_chat_messages_between_users(current_user_id, receiver_id)
        receiver_messages = get_chat_messages_between_users(receiver_id, current_user_id)
        
        # 送信者・受信者の最新チャットスレッド情報を取得
        sender_threads = get_user_chat_threads(current_user_id)
        receiver_threads = get_user_chat_threads(receiver_id)

        # ③WebSocketで受信者に全履歴を送信
        socketio = current_app.config.get('socketio')
        if socketio:
            socketio.emit('chat_messages_updated', {
                'chat_partner_id': current_user_id,  # 受信者から見た相手（送信者）
                'messages': receiver_messages,
                'threads': receiver_threads
            }, room=str(receiver_id))

        # 送信者にはHTTP応答で全履歴を返却
        return jsonify({
            'messages': sender_messages,
            'threads': sender_threads
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"データベースエラー: {str(e)}")
        return jsonify({'error': 'データベースエラーが発生しました'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"予期せぬエラー: {str(e)}")
        return jsonify({'error': '予期せぬエラーが発生しました'}), 500


# ヘルパー関数：特定の2ユーザー間のメッセージ履歴を取得
def get_chat_messages_between_users(user_id, partner_id):
    """2ユーザー間のメッセージ履歴を取得（既読処理は行わない）"""
    try:
        messages = ChatMessage.query.filter(
            or_(
                and_(ChatMessage.sender_id == user_id, ChatMessage.receiver_id == partner_id),
                and_(ChatMessage.sender_id == partner_id, ChatMessage.receiver_id == user_id)
            )
        ).order_by(ChatMessage.created_at).all()
        
        result = []
        for msg in messages:
            result.append({
                'id': msg.id,
                'sender_id': msg.sender_id,
                'receiver_id': msg.receiver_id,
                'message': msg.message,
                'is_read': msg.is_read,
                'is_edited': msg.is_edited,
                'created_at': to_jst(msg.created_at),
                'updated_at': to_jst(msg.updated_at)
            })
            
        return result
        
    except Exception as e:
        current_app.logger.error(f"メッセージ履歴取得エラー: {str(e)}")
        return []


# ユーザーのチャットスレッド一覧を取得するヘルパー関数
def get_user_chat_threads(user_id):
    
    try:
        # ユーザーのチャット許可相手一覧を取得
        permissions = ChatPermission.query.filter_by(user_id=user_id).all()
        partner_ids = [p.partner_id for p in permissions]
        
        if not partner_ids:
            return []
            
        result = []
        for partner_id in partner_ids:
            # 各パートナーの情報を取得
            partner = User.query.get(partner_id)
            if not partner:
                continue
                
            # 最新メッセージを取得
            latest_message = ChatMessage.query.filter(
                or_(
                    and_(ChatMessage.sender_id == user_id, ChatMessage.receiver_id == partner_id),
                    and_(ChatMessage.sender_id == partner_id, ChatMessage.receiver_id == user_id)
                )
            ).order_by(desc(ChatMessage.created_at)).first()
            
            # 未読メッセージ数をカウント
            unread_count = ChatMessage.query.filter_by(
                sender_id=partner_id,
                receiver_id=user_id,
                is_read=False
            ).count()
            
            thread_info = {
                'id': partner.id,
                'name': partner.name,
                'department_name': partner.department_name,
                'position': partner.position,
                'unread': unread_count,
                'lastMessage': latest_message.message if latest_message else None,
                'lastMessageTime': to_jst(latest_message.created_at) if latest_message else None
            }
            
            result.append(thread_info)
            
        # 最新メッセージがある相手を上位に表示
        result.sort(key=lambda x: x['lastMessageTime'] if x['lastMessageTime'] else '', reverse=True)
        
        return result
        
    except Exception as e:
        current_app.logger.error(f"チャットスレッド取得エラー: {str(e)}")
        return []
    

# ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
# 未読メッセージ数（合計）を返す
@chat_bp.route('/chat/unread-count', methods=['GET'])
@jwt_required()
def get_unread_message_count():
    current_user_id = get_jwt_identity()
    try:
        count = ChatMessage.query.filter_by(
            receiver_id=current_user_id,
            is_read=False
        ).count()

        return jsonify({'unread_count': count}), 200

    except Exception as e:
        current_app.logger.error(f"未読メッセージ数取得エラー: {str(e)}")
        return jsonify({'error': '未読メッセージ数取得に失敗しました'}), 500


# ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝



@chat_bp.route('/chat/threads', methods=['GET'])
@jwt_required()
def get_chat_threads():
    """現在のユーザーのチャット相手一覧と最新メッセージを取得する"""
    current_user_id = get_jwt_identity()
    
    try:
        # ✅ 改善：共通関数を使用
        threads = get_user_chat_threads(current_user_id)
        return jsonify(threads), 200
        
    except SQLAlchemyError as e:
        current_app.logger.error(f"データベースエラー: {str(e)}")
        return jsonify({'error': 'データベースエラーが発生しました'}), 500
    except Exception as e:
        current_app.logger.error(f"予期せぬエラー: {str(e)}")
        return jsonify({'error': '予期せぬエラーが発生しました'}), 500


# メッセージ編集
@chat_bp.route('/chat/messages/<int:message_id>', methods=['PUT'])
@jwt_required()
def update_message(message_id):

    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or 'message' not in data:
        return jsonify({'error': '新しいメッセージ本文は必須です'}), 400
        
    try:
        # メッセージを取得
        message = ChatMessage.query.get(message_id)
        
        if not message:
            return jsonify({'error': 'メッセージが見つかりません'}), 404
            
        # 送信者のみ編集可能
        if int(message.sender_id) != int(current_user_id):
            return jsonify({'error': '他のユーザーのメッセージは編集できません'}), 403
            
        # メッセージを更新
        message.message = data['message']
        message.updated_at = datetime.utcnow()
        message.is_edited = True
        
        db.session.commit()
        
        # ✅ 編集後の全メッセージ履歴を取得
        sender_messages = get_chat_messages_between_users(current_user_id, message.receiver_id)
        receiver_messages = get_chat_messages_between_users(message.receiver_id, current_user_id)
        
        # ✅ 最新スレッド情報を取得
        sender_threads = get_user_chat_threads(current_user_id)
        receiver_threads = get_user_chat_threads(message.receiver_id)
        
        # ✅ WebSocketで統一イベントを送信
        socketio = current_app.config.get('socketio')
        if socketio:
            # 受信者に編集後の全履歴を送信
            socketio.emit('chat_messages_updated', {
                'chat_partner_id': current_user_id,  # 受信者から見た相手（編集者）
                'messages': receiver_messages,
                'threads': receiver_threads
            }, room=str(message.receiver_id))
            
            # 送信者（編集者）にも確認用で全履歴を送信
            socketio.emit('chat_messages_updated', {
                'chat_partner_id': message.receiver_id,  # 送信者から見た相手
                'messages': sender_messages,
                'threads': sender_threads
            }, room=str(current_user_id))
        
        # HTTP応答として編集後の全履歴を返却
        return jsonify({
            'messages': sender_messages,
            'threads': sender_threads
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"データベースエラー: {str(e)}")
        return jsonify({'error': 'データベースエラーが発生しました'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"予期せぬエラー: {str(e)}")
        return jsonify({'error': '予期せぬエラーが発生しました'}), 500


# メッセージ削除
@chat_bp.route('/chat/messages/<int:message_id>', methods=['DELETE'])
@jwt_required()
def delete_message(message_id):

    current_user_id = get_jwt_identity()
    
    try:
        # メッセージを取得
        message = ChatMessage.query.get(message_id)
        
        if not message:
            return jsonify({'error': 'メッセージが見つかりません'}), 404
            
        # 送信者のみ削除可能
        if int(message.sender_id) != int(current_user_id):
            return jsonify({'error': '他のユーザーのメッセージは削除できません'}), 403
        
        # 削除前に受信者IDを保存
        receiver_id = message.receiver_id
            
        # メッセージを削除
        db.session.delete(message)
        db.session.commit()
        
        # ✅ 削除後の全メッセージ履歴を取得
        sender_messages = get_chat_messages_between_users(current_user_id, receiver_id)
        receiver_messages = get_chat_messages_between_users(receiver_id, current_user_id)
        
        # ✅ 最新スレッド情報を取得
        sender_threads = get_user_chat_threads(current_user_id)
        receiver_threads = get_user_chat_threads(receiver_id)
        
        # ✅ WebSocketで統一イベントを送信
        socketio = current_app.config.get('socketio')
        if socketio:
            # 受信者に削除後の全履歴を送信
            socketio.emit('chat_messages_updated', {
                'chat_partner_id': current_user_id,  # 受信者から見た相手（削除者）
                'messages': receiver_messages,
                'threads': receiver_threads
            }, room=str(receiver_id))
            
            # 送信者（削除者）にも確認用で全履歴を送信
            socketio.emit('chat_messages_updated', {
                'chat_partner_id': receiver_id,  # 送信者から見た相手
                'messages': sender_messages,
                'threads': sender_threads
            }, room=str(current_user_id))
        
        # HTTP応答として削除後の全履歴を返却
        return jsonify({
            'messages': sender_messages,
            'threads': sender_threads
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"データベースエラー: {str(e)}")
        return jsonify({'error': 'データベースエラーが発生しました'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"予期せぬエラー: {str(e)}")
        return jsonify({'error': '予期せぬエラーが発生しました'}), 500



# ========================================================================================

# chat.py - mark_as_read関数の中身置き換え版

# ✅ 既存のエンドポイントURLはそのまま、中身を一括処理に変更
@chat_bp.route('/chat/messages/<int:message_id>/read', methods=['PATCH'])
@jwt_required()
def mark_as_read(message_id):
    """メッセージを既読にする（一括処理版）"""
    current_user_id = get_jwt_identity()
    
    try:
        # メッセージを取得して送信者を特定
        message = ChatMessage.query.get(message_id)
        
        if not message:
            return jsonify({'error': 'メッセージが見つかりません'}), 404
        
        if int(message.receiver_id) != int(current_user_id):
            return jsonify({'error': '他のユーザーのメッセージは既読にできません'}), 403
        
        sender_id = message.sender_id
        
        # ✅ この送信者からの未読メッセージを全て一括で既読にする
        unread_messages = ChatMessage.query.filter_by(
            sender_id=sender_id,
            receiver_id=current_user_id,
            is_read=False
        ).all()
        
        if not unread_messages:
            return jsonify({'message': '既読にするメッセージがありません'}), 200
        
        # 一括で既読にする
        read_count = 0
        for msg in unread_messages:
            msg.is_read = True
            read_count += 1
        
        db.session.commit()
        
        current_app.logger.info(f"一括既読処理完了: {read_count}件のメッセージを既読にしました")
        
        # ✅ 既読処理後に送信者の最新チャット履歴を取得
        sender_messages = get_chat_messages_between_users(sender_id, current_user_id)
        sender_threads = get_user_chat_threads(sender_id)
        
        # ✅ 受信者の未読数も計算
        current_user_unread_count = ChatMessage.query.filter_by(
            receiver_id=current_user_id,
            is_read=False
        ).count()
        
        # ✅ WebSocketで送信者に既読通知
        socketio = current_app.config.get('socketio')
        if socketio:
            socketio.emit('chat_messages_updated', {
                'chat_partner_id': current_user_id,  # 送信者から見た相手（既読した人）
                'messages': sender_messages,         # 既読状態が反映された履歴
                'threads': sender_threads            # 更新されたスレッド一覧
            }, room=str(sender_id))
        
        return jsonify({
            'success': True,
            'read_count': read_count,
            'unread_count': current_user_unread_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"既読処理エラー: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
# ========================================================================================


def notify_unread_count(user_id):
    """✅ 改善版：未読カウント通知（データ同時送信対応）"""
    from models import ChatMessage
    socketio = current_app.config.get("socketio")
    if not socketio:
        return

    # 未読カウントを計算
    count = ChatMessage.query.filter_by(
        receiver_id=user_id,
        is_read=False
    ).count()

    current_app.logger.info(f"未読カウント更新: ユーザーID={user_id}, 未読数={count}")

    # ✅ 改善：スレッド情報も一緒に送信
    threads = get_user_chat_threads(user_id)

    socketio.emit(
        "unread_count_updated_with_data",
        {
            "user_id": user_id, 
            "unread_count": count,
            "threads": threads
        },
        room=str(user_id)
    )