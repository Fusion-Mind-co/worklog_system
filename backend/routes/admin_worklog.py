from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, current_user
from datetime import datetime
import json

from models import db, User, WorkLog
from services.worklog import validate_worklog_data
from sqlalchemy import or_


# Blueprintの作成
admin_worklog_bp = Blueprint('admin_worklog', __name__)


# 工数履歴を取得
@admin_worklog_bp.route('/admin_worklog', methods=['GET'])
@jwt_required()
def get_admin_worklog():
    # クエリパラメータの取得
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    unit_name = request.args.get('unit_name')
    department = request.args.get('department')
    employee_id = request.args.get('employee_id')
    status = request.args.get('status')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 100, type=int)
    sort_by = request.args.get('sort_by', 'date')
    sort_order = request.args.get('sort_order', 'desc')
    
    # 基本クエリの構築
    query = WorkLog.query
    
    # 日付範囲フィルター（空文字の場合は全期間取得）
    if start_date and start_date.strip():
        try:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(WorkLog.date >= start_date_obj)
        except ValueError:
            return jsonify({'error': '開始日の形式が正しくありません (YYYY-MM-DD)'}), 400
    
    if end_date and end_date.strip():
        try:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(WorkLog.date <= end_date_obj)
        except ValueError:
            return jsonify({'error': '終了日の形式が正しくありません (YYYY-MM-DD)'}), 400
    
    # ユニット名フィルター
    if unit_name:
        query = query.filter(WorkLog.unit_name == unit_name)
    
    # 部署フィルター（Userテーブルとのジョイン）
    if department:
        query = query.join(User, WorkLog.employee_id == User.employee_id)\
                    .filter(User.department_name == department)
    
    # 社員IDフィルター
    if employee_id:
        query = query.filter(WorkLog.employee_id.like(f'%{employee_id}%'))
    
    # ステータスフィルター（修正箇所）
    if status:
        if status == 'pending':
            # 申請中データ全種類を取得（pending_add, pending_edit, pending_delete）
            query = query.filter(
                or_(
                    WorkLog.status == 'pending_add',
                    WorkLog.status == 'pending_edit', 
                    WorkLog.status == 'pending_delete'
                )
            )
        else:
            # 通常の単一ステータスフィルター
            query = query.filter(WorkLog.status == status)
    
    # 動的ソート実装
    if sort_by == 'date':
        if sort_order == 'asc':
            query = query.order_by(WorkLog.date.asc())
        else:
            query = query.order_by(WorkLog.date.desc())
    elif sort_by == 'employee_id':
        if sort_order == 'asc':
            query = query.order_by(WorkLog.employee_id.asc())
        else:
            query = query.order_by(WorkLog.employee_id.desc())
    elif sort_by == 'minutes':
        if sort_order == 'asc':
            query = query.order_by(WorkLog.minutes.asc())
        else:
            query = query.order_by(WorkLog.minutes.desc())
    elif sort_by == 'status':
        if sort_order == 'asc':
            query = query.order_by(WorkLog.status.asc())
        else:
            query = query.order_by(WorkLog.status.desc())
    elif sort_by == 'unit_name':
        if sort_order == 'asc':
            query = query.order_by(WorkLog.unit_name.asc())
        else:
            query = query.order_by(WorkLog.unit_name.desc())
    elif sort_by == 'work_type':
        if sort_order == 'asc':
            query = query.order_by(WorkLog.work_type.asc())
        else:
            query = query.order_by(WorkLog.work_type.desc())
    else:
        # デフォルトは日付降順
        query = query.order_by(WorkLog.date.desc())
    
    # CSV出力または件数取得の場合は特別処理
    csv_export = request.args.get('csv_export') == 'true'
    count_only = request.args.get('count_only') == 'true'

    if count_only:
        print(f"件数取得処理: count_only={count_only}")
        
        # ✅ pending_editの重複を除外したカウント
        # pending_editでoriginal_idがnullでないもの（編集後データ）を除外
        count_query = query.filter(
            (WorkLog.status != 'pending_edit') | 
            (WorkLog.original_id == None)
        )
        
        total_count = count_query.count()
        print(f"取得件数（pending_edit重複除外後）: {total_count}")
        return jsonify({'count': total_count}), 200

    if csv_export:
        # CSVの場合も同様の除外処理
        csv_query = query.filter(
            (WorkLog.status != 'pending_edit') | 
            (WorkLog.original_id == None)
        )
        work_logs = csv_query.all()
        paginated_logs = None
    else:
        # ページネーション情報は編集後データを除外して計算（件数を正しく保つ）
        display_query = query.filter(
            (WorkLog.status != 'pending_edit') | 
            (WorkLog.original_id == None)
        )
        paginated_logs = display_query.paginate(page=page, per_page=100, error_out=False)
        
        # 実際のデータ取得：ページ内の編集前データのIDを取得
        page_log_ids = [log.id for log in paginated_logs.items]
        
        # 編集前データ + 対応する編集後データの両方を取得
        work_logs = query.filter(
            (WorkLog.id.in_(page_log_ids)) |  # ページ内の編集前データ
            (WorkLog.original_id.in_(page_log_ids))  # 対応する編集後データ
        ).all()

    # すべてのemployee_idを抽出し、一括でユーザー情報を取得
    employee_ids = list({log.employee_id for log in work_logs})
    users = User.query.filter(User.employee_id.in_(employee_ids)).all()
    user_dict = {u.employee_id: u for u in users}

    # 現在のユーザーのデフォルトユニットを取得
    current_user_id = get_jwt_identity()
    current_user_data = User.query.get(current_user_id)
    default_unit = current_user_data.default_unit if current_user_data else None

    work_rows = []
    for log in work_logs:
        user = user_dict.get(log.employee_id)

        work_rows.append({
            'id': log.id,
            'date': log.date.isoformat() if log.date else '',
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
            'status': log.status,
            'editReason': log.edit_reason or '',
            'originalId': log.original_id,

            'employeeId': log.employee_id,
            'employeeName': user.name if user else '不明',
            'department': user.department_name if user else '不明',
            'position': user.position if user else '不明',
        })

    return jsonify({
        'workRows': work_rows,
        'defaultUnit': default_unit,
        'pagination': {
            'total_items': paginated_logs.total if paginated_logs else len(work_logs),
            'total_pages': paginated_logs.pages if paginated_logs else 1,
            'current_page': page if paginated_logs else 1,
            'per_page': 100 if paginated_logs else len(work_logs),
            'has_prev': paginated_logs.has_prev if paginated_logs else False,
            'has_next': paginated_logs.has_next if paginated_logs else False,
        }
    }), 200

# デフォルトユニットを保存
@admin_worklog_bp.route('/admin_worklog/save_default_unit', methods=['POST'])
@jwt_required()
def save_default_unit():
    # リクエストデータの取得と検証
    data = request.get_json()
    if data is None or 'unit_name' not in data:
        return jsonify({'error': '無効なリクエストデータです'}), 400

    unit_name = data['unit_name']
    
    # 「all」は保存しない
    if unit_name == 'all':
        return jsonify({'error': '「全て」は保存できません'}), 400
        
    try:
        # 現在のユーザーを取得
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'ユーザーが見つかりません'}), 404
        
        # デフォルトユニットを更新（nullの場合は解除）
        user.default_unit = unit_name
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '処理が完了しました',
            'defaultUnit': unit_name
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'デフォルトユニットの処理に失敗しました: {str(e)}'}), 500
    

# 申請中のカウント
@admin_worklog_bp.route('/admin_worklog/pending_count', methods=['GET'])
@jwt_required()
def get_pending_count():
    """
    未処理の申請数をカウントして返す
    query params:
        unit_name: フィルタリングするユニット名（オプション）
    """
    unit_name = request.args.get('unit_name')
    
    # クエリの基本部分
    query = WorkLog.query.filter(
        or_(
            WorkLog.status == 'pending_add',
            WorkLog.status == 'pending_delete',
            # pending_editで且つoriginal_idがnull
            (WorkLog.status == 'pending_edit') & (WorkLog.original_id == None)
        )
    )
    
    # ユニット名が指定されている場合はフィルタリング
    if unit_name:
        query = query.filter(WorkLog.unit_name == unit_name)
    
    # 各ステータスごとのカウントを取得
    pending_add_count = query.filter(WorkLog.status == 'pending_add').count()
    pending_edit_count = query.filter(WorkLog.status == 'pending_edit').count()
    pending_delete_count = query.filter(WorkLog.status == 'pending_delete').count()
    
    # 合計数を計算
    total_count = pending_add_count + pending_edit_count + pending_delete_count
    
    return jsonify({
        'total': total_count,
        'pending_add': pending_add_count,
        'pending_edit': pending_edit_count,
        'pending_delete': pending_delete_count
    }), 200

# デフォルトユニットを取得するAPI
@admin_worklog_bp.route('/admin_worklog/default_unit', methods=['GET'])
@jwt_required()
def get_default_unit():
    """
    現在のユーザーに設定されているデフォルトユニットを取得する
    """
    # 現在のユーザーを取得
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404
    
    return jsonify({
        'defaultUnit': user.default_unit
    }), 200