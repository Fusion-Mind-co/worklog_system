# models/chat_permission.py

from datetime import datetime
from . import db

class ChatPermission(db.Model):
    """チャット許可モデル"""
    __tablename__ = 'chat_permissions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    partner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'partner_id': self.partner_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
