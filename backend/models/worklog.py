from datetime import datetime
from . import db

class WorkLog(db.Model):
    """工数記録モデル"""
    __tablename__ = 'worklogs'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(10), db.ForeignKey('users.employee_id'), nullable=False)
    row_number = db.Column(db.Integer)
    date = db.Column(db.Date, nullable=False)
    model = db.Column(db.String(50))
    serial_number = db.Column(db.String(50))
    work_order = db.Column(db.String(50))
    part_number = db.Column(db.String(50))
    order_number = db.Column(db.String(50))
    quantity = db.Column(db.Integer)
    unit_name = db.Column(db.String(50), nullable=False)
    work_type = db.Column(db.String(50), nullable=False)
    minutes = db.Column(db.Integer, nullable=False)
    remarks = db.Column(db.Text)
    status = db.Column(db.String(20), default='draft')  # draft, pending, approved, rejected
    edit_reason = db.Column(db.Text)  # 編集理由
    original_id = db.Column(db.Integer, db.ForeignKey('worklogs.id'))  # 編集元のID
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 編集元への参照関係
    original = db.relationship("WorkLog", remote_side=[id], backref="edits", uselist=False)
    
    def to_dict(self):
        """工数記録を辞書形式で返す"""
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'row_number': self.row_number,
            'date': self.date.isoformat() if self.date else None,
            'model': self.model,
            'serialNumber': self.serial_number,
            'workOrder': self.work_order,
            'partNumber': self.part_number,
            'orderNumber': self.order_number,
            'quantity': self.quantity,
            'unitName': self.unit_name,
            'workType': self.work_type,
            'minutes': self.minutes,
            'remarks': self.remarks,
            'status': self.status,
            'editReason': self.edit_reason,
            'originalId': self.original_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }