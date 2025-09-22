from .auth import auth_bp
from .password_reset import password_reset_bp
from .admin_chat import admin_chat_bp
from .worklog import worklog_bp  
from .worklog_history import worklog_history_bp
from .user import user_bp
from .chat import chat_bp
from .admin_unit import admin_unit_bp 
from .admin_user import admin_user_bp
from .admin_worklog import admin_worklog_bp
from .approval_rejection import approval_rejection_bp


def register_routes(app):
    """すべてのBlueprintをアプリケーションに登録する"""
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(password_reset_bp, url_prefix='/api')
    app.register_blueprint(worklog_bp, url_prefix='/api')
    app.register_blueprint(worklog_history_bp, url_prefix='/api')
    app.register_blueprint(admin_chat_bp, url_prefix="/api")
    app.register_blueprint(user_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(admin_unit_bp, url_prefix="/api")
    app.register_blueprint(admin_user_bp, url_prefix="/api")
    app.register_blueprint(admin_worklog_bp, url_prefix="/api")
    app.register_blueprint(approval_rejection_bp, url_prefix="/api")


    # 他のBlueprintをここに追加