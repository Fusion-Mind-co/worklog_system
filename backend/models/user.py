from datetime import datetime
from . import db
from .chat_message import ChatMessage

class User(db.Model):
    """ユーザーモデル"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(10), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    department_name = db.Column(db.String(50), nullable=False)
    position = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), nullable=True)
    password_hash = db.Column(db.Text, nullable=False)
    role_level = db.Column(db.Integer, default=1, nullable=False)
    default_unit = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_active_page = db.Column(db.String(50), nullable=True)
    sound_enabled = db.Column(db.Boolean, default=True)


    def to_dict(self):
        """ユーザー情報を辞書形式で返す"""
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'name': self.name,
            'department_name': self.department_name,
            'position': self.position,
            'email': self.email,
            'role_level': self.role_level,
            'default_unit': self.default_unit,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_active_page': self.last_active_page,
            'sound_enabled': self.sound_enabled

        }
    
    
    sent_messages = db.relationship(
        'ChatMessage',
        foreign_keys='ChatMessage.sender_id',
        backref=db.backref('sender_user'),
        cascade='all, delete-orphan',
        passive_deletes=True
    )

    received_messages = db.relationship(
        'ChatMessage',
        foreign_keys='ChatMessage.receiver_id',
        backref=db.backref('receiver_user'),
        cascade='all, delete-orphan',
        passive_deletes=True
    )

