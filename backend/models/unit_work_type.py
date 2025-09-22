from datetime import datetime
from . import db

class UnitWorkType(db.Model):
    """ユニットと工事区分の関連モデル"""
    __tablename__ = 'unit_work_types'
    
    id = db.Column(db.Integer, primary_key=True)
    unit_id = db.Column(db.Integer, db.ForeignKey('unit_names.id', ondelete='CASCADE'), nullable=False)
    work_type_id = db.Column(db.Integer, db.ForeignKey('work_types.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ユニークキー制約
    __table_args__ = (
        db.UniqueConstraint('unit_id', 'work_type_id', name='uq_unit_work_type'),
    )