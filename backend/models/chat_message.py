# models/chat_message.py

from datetime import datetime
from . import db

class ChatMessage(db.Model):
    """チャットメッセージモデル"""
    __tablename__ = 'chat_messages'

    id = db.Column(db.Integer, primary_key=True)
    permission_id = db.Column(db.Integer, db.ForeignKey('chat_permissions.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    is_edited = db.Column(db.Boolean, default=False, nullable=False)  # 新しいカラム
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime)

    # リレーションシップ
    permission = db.relationship('ChatPermission', backref='messages')
    sender = db.relationship('User', foreign_keys=[sender_id])
    receiver = db.relationship('User', foreign_keys=[receiver_id])


    def to_dict(self):
        return {
            'id': self.id,
            'permission_id': self.permission_id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'message': self.message,
            'is_read': self.is_read,
            'is_edited': self.is_edited,  # 新しいフィールド
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }