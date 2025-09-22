from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models import User

def admin_required(fn):
    """管理者権限を要求するデコレーター
    
    Args:
        fn: デコレートする関数
    
    Returns:
        decorated function: 管理者権限チェック付きの関数
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role_level < 3:  # 最高権限(3)のみアクセス可能
            return jsonify(msg="Admin privileges required"), 403
        return fn(*args, **kwargs)
    return wrapper

def role_required(min_level):
    """指定した権限レベル以上を要求するデコレーター
    
    Args:
        min_level (int): 最小必要権限レベル
    
    Returns:
        decorator: 権限チェック付きのデコレーター
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user or user.role_level < min_level:
                return jsonify(msg=f"Minimum role level {min_level} required"), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator