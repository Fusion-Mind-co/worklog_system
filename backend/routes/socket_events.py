# routes/socket_events.py

from flask_socketio import SocketIO,  join_room, disconnect
from flask_jwt_extended import decode_token
from flask import current_app, request
import jwt

def register_socket_events(socketio):
    @socketio.on('connect')
    def handle_connect():
        try:
            # ヘッダーからトークンを取得
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                current_app.logger.error("認証トークンがありません")
                disconnect()
                return False
                
            token = auth_header.split(' ')[1]  # 'Bearer TOKEN'の形式
            
            # トークンをデコード
            try:
                decoded = decode_token(token)
                current_user_id = decoded['sub']
                
                # ユーザーIDをルームとして使用
                join_room(str(current_user_id))
                current_app.logger.info(f"ユーザーID {current_user_id} がWebSocketに接続しました")
                
                return True
            except jwt.ExpiredSignatureError:
                current_app.logger.error("トークンの有効期限が切れています")
                disconnect()
                return False
            except jwt.InvalidTokenError:
                current_app.logger.error("無効なトークンです")
                disconnect()
                return False
                
        except Exception as e:
            current_app.logger.error(f"WebSocket接続エラー: {str(e)}")
            disconnect()
            return False