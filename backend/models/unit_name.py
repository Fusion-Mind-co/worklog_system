from datetime import datetime
from . import db

class UnitName(db.Model):
    """ユニット名モデル"""
    __tablename__ = 'unit_names'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime)
    
    # 関連するWorkTypeへの参照
    work_types = db.relationship('WorkType', secondary='unit_work_types')
    
    def to_dict(self):
        """ユニット名を辞書形式で返す"""
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'work_types': [work_type.to_dict() for work_type in self.work_types]
        }