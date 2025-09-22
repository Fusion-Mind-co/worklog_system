from datetime import datetime
from . import db

class WorkType(db.Model):
    """工事区分モデル"""
    __tablename__ = 'work_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime)
    
    # 関連するUnitNameへの参照
    unit_names = db.relationship('UnitName', secondary='unit_work_types')
    
    def to_dict(self):
        """工事区分を辞書形式で返す"""
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }