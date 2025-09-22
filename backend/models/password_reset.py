from datetime import datetime
from . import db

class PasswordResetRequest(db.Model):
    """パスワードリセットリクエストモデル"""
    __tablename__ = 'password_reset_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=True)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    
    # 管理者依頼関連フィールド
    requires_admin = db.Column(db.Boolean, default=False, nullable=False)
    admin_note = db.Column(db.Text, nullable=True)
    is_handled = db.Column(db.Boolean, default=False, nullable=False)
    handled_at = db.Column(db.DateTime, nullable=True)
    handled_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # リレーション
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('password_reset_requests', lazy='dynamic'))
    handled_by = db.relationship('User', foreign_keys=[handled_by_id], backref=db.backref('handled_reset_requests', lazy='dynamic'))
    
    def __repr__(self):
        return f'<PasswordResetRequest {self.id}>'
    
    def is_expired(self):
        """トークンが期限切れかどうか確認"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self):
        """辞書形式で返す"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_used': self.is_used,
            'used_at': self.used_at.isoformat() if self.used_at else None,
            'requires_admin': self.requires_admin,
            'admin_note': self.admin_note,
            'is_handled': self.is_handled,
            'handled_at': self.handled_at.isoformat() if self.handled_at else None,
            'handled_by_id': self.handled_by_id
        }