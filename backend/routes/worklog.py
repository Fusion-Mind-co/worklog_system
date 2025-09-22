from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, current_user
from datetime import datetime
import json

from models import db, User, WorkLog, WorkType
from services.worklog import validate_worklog_data

# Blueprintの作成
worklog_bp = Blueprint('worklog', __name__)

@worklog_bp.route('/worklog', methods=['POST'])
@jwt_required()
def create_worklog():
    """工数データを保存するエンドポイント"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # デバッグログ
    print(f"Received data: {data}")
    print(f"Current user ID: {current_user_id}")
    
    # データの検証
    validation_result = validate_worklog_data(data)
    if not validation_result['valid']:
        return jsonify({'error': validation_result['message']}), 400
    
    try:
        # 現在のユーザーを取得
        user = User.query.get(current_user_id)
        print(f"Found user: {user.name if user else 'None'}")
        
        if not user:
            return jsonify({'error': 'ユーザーが見つかりません'}), 404
        
        employee_id = user.employee_id
        
        # 日付をパース
        work_date = datetime.fromisoformat(data['workDate']).date()
        
        # 同じ日の既存データを探す（下書き状態のみ）
        existing_logs = WorkLog.query.filter_by(
            employee_id=employee_id,
            date=work_date,
            status='draft'
        ).all()
        
        print(f"Existing logs count: {len(existing_logs)}")
        
        # 既存データがあれば削除
        if existing_logs:
            for log in existing_logs:
                db.session.delete(log)
        
        # 新しい工数データを追加
        for row in data['workRows']:
            # 必須項目のチェック
            if not row.get('unitName') or not row.get('workType') or not row.get('minutes'):
                continue
            # quantity の "N/A" 判定 → None に変換（追加部分）
            quantity_raw = row.get('quantity')
            if quantity_raw == "N/A":
                quantity = None
            else:
                try:
                    quantity = int(quantity_raw) if quantity_raw is not None else None
                except ValueError:
                    quantity = None

            # minutes も安全に変換
            try:
                minutes = int(row.get('minutes', 0))
            except ValueError:
                minutes = 0

            print(f"Adding worklog row: {row}")
                
            work_log = WorkLog(
                employee_id=employee_id,
                row_number=row.get('id', ''),
                date=work_date,
                model=row.get('model', ''),
                serial_number=row.get('serialNumber', ''),
                work_order=row.get('workOrder', ''),
                part_number=row.get('partNumber', ''),
                order_number=row.get('orderNumber', ''),
                quantity=quantity,
                unit_name=row.get('unitName', ''),
                work_type=row.get('workType', ''),
                minutes=minutes,
                remarks=row.get('remarks', ''),
                status='draft'
            )
            db.session.add(work_log)
        
        db.session.commit()
        return jsonify({
            'message': '工数データが保存されました', 
            'date': data['workDate'],
            'updated_at': datetime.utcnow().isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()  # スタックトレースを出力
        print(f"Error details: {str(e)}")
        return jsonify({'error': f'データの保存に失敗しました: {str(e)}'}), 500

@worklog_bp.route('/worklog/daily', methods=['GET'])
@jwt_required()
def get_daily_worklog():
    """今日の工数データを取得するエンドポイント"""
    current_user_id = get_jwt_identity()
    
    # ユーザー情報を取得
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404
    
    # 日付パラメータ（デフォルトは今日）
    date_str = request.args.get('date')
    if date_str:
        try:
            target_date = datetime.fromisoformat(date_str).date()
        except ValueError:
            return jsonify({'error': '日付の形式が正しくありません'}), 400
    else:
        target_date = datetime.utcnow().date()
    
    # 工数データを取得（最終更新日時の降順）
    work_logs = WorkLog.query.filter_by(
        employee_id=user.employee_id,
        date=target_date
    ).order_by(WorkLog.updated_at.desc()).all()
    
    # 最終更新日時を取得（工数データがある場合）
    latest_updated = None
    if work_logs:
        latest_updated = max(log.updated_at for log in work_logs).isoformat()
    
    # レスポンス形式に変換
    work_rows = []
    for idx, log in enumerate(work_logs, 1):
        work_rows.append({
            'id': idx,
            'model': log.model or '',
            'serialNumber': log.serial_number or '',
            'workOrder': log.work_order or '',
            'partNumber': log.part_number or '',
            'orderNumber': log.order_number or '',
            'quantity': str(log.quantity) if log.quantity is not None else '',
            'unitName': log.unit_name,
            'workType': log.work_type,
            'minutes': str(log.minutes),
            'remarks': log.remarks or '',
            'status': log.status
        })
    
    return jsonify({
        'workDate': target_date.isoformat(),
        'workRows': work_rows,
        'updatedAt': latest_updated
    }), 200

# ユニット名/工事区分を取得
@worklog_bp.route("/worklog/unit-options", methods=["GET"])
@jwt_required()
def get_unit_options_with_work_types():
    """ユニット名と工事区分の対応表を返す"""
    from models import UnitName  # ループ防止のため関数内importでもOK

    units = UnitName.query.all()
    result = [
        {
            "name": unit.name,
            "work_types": [wt.name for wt in unit.work_types]
        }
        for unit in units
    ]
    return jsonify(result), 200
    

# その他のエンドポイントは必要に応じて追加