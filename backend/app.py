# app.py

# 非同期処理の選択肢
# （Flaskよりも前に記述しなければいけない）
import eventlet
eventlet.monkey_patch()

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import config
import os

# リアルタイム通信用ライブラリ
from flask_socketio import SocketIO

# モデルとルートのインポート
from models import db, migrate
from routes import register_routes



def create_app(config_name=None):
    """アプリケーションファクトリ関数"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'default')
    
    # Flaskアプリ初期化
    app = Flask(__name__)
    app_config = config[config_name]
    app.config.from_object(app_config)
    app.config.from_object(config['development']) 
    
    # CORS設定
    CORS(app, supports_credentials=True)
    
    # 拡張機能の初期化
    db.init_app(app)
    migrate.init_app(app, db)
    jwt = JWTManager(app)
    
    # WebSocketの初期化
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")
    # SocketIOをアプリケーションのコンテキストに保存
    app.config['socketio'] = socketio

    # Socket.IOイベントの登録
    from routes.socket_events import register_socket_events
    register_socket_events(socketio)
    
    # JWTエラーハンドラーの追加
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'error': 'トークンの有効期限が切れています',
            'code': 'token_expired'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            'error': f'無効なトークンです: {str(error)}',
            'code': 'invalid_token'
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            'error': 'リクエストにトークンがありません',
            'code': 'authorization_required'
        }), 401
    
    # ルートの登録
    register_routes(app)
    
    # ヘルスチェックエンドポイント
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return {'status': 'ok', 'message': 'API is running'}
    
    return app, socketio

# gunicorn用：モジュールレベルでappインスタンスを作成
app, socketio = create_app()

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)