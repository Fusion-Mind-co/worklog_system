# routes/worklog_history.py - パフォーマンス最適化版（Socket通知タイミング維持）

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, current_user
from datetime import datetime
from pytz import timezone
from datetime import timezone as dt_timezone
import json
from sqlalchemy import or_

from models import db, User, WorkLog
from services.worklog import validate_worklog_data

# Blueprintの作成
worklog_history_bp = Blueprint('worklog_history', __name__)

# 工数履歴を取得（ページネーション・フィルタリング対応）
@worklog_history_bp.route('/worklog_history', methods=['GET'])
@jwt_required()
def get_worklog_history():
    """工数履歴データを取得する（ページネーション・フィルタリング対応）"""
    print('get_worklog_history()関数実行 - 最適化版')

    current_user_id = get_jwt_identity()
    
    # クエリパラメータの取得
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    model = request.args.get('model')
    work_type = request.args.get('work_type')
    unit_name = request.args.get('unit_name')
    status = request.args.get('status')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 100, type=int)
    sort_by = request.args.get('sort_by', 'date')
    sort_order = request.args.get('sort_order', 'desc')
    
    # パラメータが存在する場合は新方式、ない場合は従来方式
    use_pagination = any([start_date, end_date, model, work_type, status, 
                         page != 1, per_page != 100])
    
    if use_pagination:
        # 新方式：ページネーション・フィルタリング対応
        worklog_data = get_user_worklog_data_paginated(
            current_user_id, 
            start_date=start_date,
            end_date=end_date,
            model=model,
            work_type=work_type,
            unit_name=unit_name,
            status=status,
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_order=sort_order
        )
    else:
        # 従来方式：全データ取得（後方互換性）
        worklog_data = get_user_worklog_data_legacy(current_user_id)
    
    return jsonify(worklog_data), 200

def get_user_worklog_data_paginated(user_id, start_date=None, end_date=None, 
                                  model=None, work_type=None, unit_name=None, status=None,
                                  page=1, per_page=100, sort_by='date', sort_order='desc'):
    """新方式：ユーザーの工数履歴データを取得する（ページネーション・フィルタリング対応）"""
    try:
        user = User.query.get(user_id)
        if not user:
            return {
                'workRows': [],
                'pagination': {
                    'total_items': 0,
                    'total_pages': 0,
                    'current_page': 1,
                    'per_page': per_page,
                    'has_prev': False,
                    'has_next': False,
                }
            }

        jst = timezone('Asia/Tokyo')
        
        # 基本クエリの構築
        query = WorkLog.query.filter_by(employee_id=user.employee_id)
        
        # 日付範囲フィルター
        if start_date and start_date.strip():
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(WorkLog.date >= start_date_obj)
            except ValueError:
                pass  # 無効な日付は無視
        
        if end_date and end_date.strip():
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(WorkLog.date <= end_date_obj)
            except ValueError:
                pass  # 無効な日付は無視
        
        # MODELフィルター
        if model and model != 'all':
            query = query.filter(WorkLog.model == model)
        
        
        # ユニット名フィルター
        if unit_name and unit_name != 'all':
            query = query.filter(WorkLog.unit_name == unit_name)    
        
        # 工事区分フィルター
        if work_type and work_type != 'all':
            query = query.filter(WorkLog.work_type == work_type)
        
        # ステータスフィルター
        if status and status != 'all':
            query = query.filter(WorkLog.status == status)
        
        # 動的ソート実装
        if sort_by == 'date':
            if sort_order == 'asc':
                query = query.order_by(WorkLog.date.asc())
            else:
                query = query.order_by(WorkLog.date.desc())
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
        elif sort_by == 'updated_at':
            if sort_order == 'asc':
                query = query.order_by(WorkLog.updated_at.asc())
            else:
                query = query.order_by(WorkLog.updated_at.desc())
        else:
            # デフォルトは最終更新日時の降順
            query = query.order_by(WorkLog.updated_at.desc())
        
        # 編集件数のカウントを編集前だけに限定する
        display_query = query.filter(
                or_(
                    WorkLog.status != 'pending_edit',
                    WorkLog.original_id == None
                )
            )

        # ページネーション実行       
        paginated_logs = display_query.paginate(page=page, per_page=per_page, error_out=False)
        # このページで選ばれた「編集前」ID群
        page_log_ids = [log.id for log in paginated_logs.items]

        # 返却用の実データは「編集前」＋「対応する編集後」を取得
        work_logs = query.filter(
            or_(
                WorkLog.id.in_(page_log_ids),
                WorkLog.original_id.in_(page_log_ids)
            )
        ).order_by(WorkLog.updated_at.desc()).all()
        
        # レスポンス形式に変換
        work_rows = []
        for log in work_logs:
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
                'updatedAt': log.updated_at.replace(tzinfo=dt_timezone.utc).astimezone(jst).isoformat() if log.updated_at else None
            })
        
        # 最終更新日時を取得
        latest_updated = None
        if work_logs:
            latest_updated = max(log.updated_at for log in work_logs).isoformat()
        
        return {
            'workRows': work_rows,
            'updatedAt': latest_updated,
            'pagination': {
                'total_items': paginated_logs.total,
                'total_pages': paginated_logs.pages,
                'current_page': page,
                'per_page': per_page,
                'has_prev': paginated_logs.has_prev,
                'has_next': paginated_logs.has_next,
            }
        }
        
    except Exception as e:
        current_app.logger.error(f"工数データ取得エラー: {str(e)}")
        return {
            'workRows': [], 
            'updatedAt': None,
            'pagination': {
                'total_items': 0,
                'total_pages': 0,
                'current_page': 1,
                'per_page': per_page,
                'has_prev': False,
                'has_next': False,
            }
        }

def get_user_worklog_data_legacy(user_id):
    """従来方式：ユーザーの工数履歴データを取得する（全データ取得）"""
    try:
        user = User.query.get(user_id)
        if not user:
            return {'workRows': [], 'updatedAt': None}

        jst = timezone('Asia/Tokyo')
        
        # 工数データを取得（最終更新日時の降順）
        work_logs = WorkLog.query.filter_by(
            employee_id=user.employee_id,
        ).order_by(WorkLog.updated_at.desc()).all()
        
        # レスポンス形式に変換
        work_rows = []
        for log in work_logs:
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
                'updatedAt': log.updated_at.replace(tzinfo=dt_timezone.utc).astimezone(jst).isoformat() if log.updated_at else None
            })
        
        # 最終更新日時を取得
        latest_updated = None
        if work_logs:
            latest_updated = max(log.updated_at for log in work_logs).isoformat()
        
        return {
            'workRows': work_rows,
            'updatedAt': latest_updated
        }
        
    except Exception as e:
        current_app.logger.error(f"工数データ取得エラー: {str(e)}")
        return {'workRows': [], 'updatedAt': None}

def get_user_worklog_data(user_id):
    """既存の関数（下位互換性のため維持）"""
    return get_user_worklog_data_legacy(user_id)

# ✅ 軽量化されたpending_count取得関数
def get_admin_pending_count(unit_name=None):
    """管理者用の未処理申請数を取得するヘルパー関数（最適化版）"""
    try:
        from sqlalchemy import or_
        
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
        
        return {
            'total': total_count,
            'pending_add': pending_add_count,
            'pending_edit': pending_edit_count,
            'pending_delete': pending_delete_count
        }
        
    except Exception as e:
        current_app.logger.error(f"未処理申請数取得エラー: {str(e)}")
        return {
            'total': 0,
            'pending_add': 0,
            'pending_edit': 0,
            'pending_delete': 0
        }

def get_user_reject_count(user_id):
    """ユーザーの却下済み未処理数を取得するヘルパー関数"""
    try:
        user = User.query.get(user_id)
        if not user:
            return {
                'total': 0,
                'rejected_add': 0,
                'rejected_edit': 0,
                'rejected_delete': 0
            }
        
        # 却下状態のワークログを取得
        rejected_add_count = WorkLog.query.filter_by(
            employee_id=user.employee_id,
            status='rejected_add'
        ).count()
        
        rejected_edit_count = WorkLog.query.filter_by(
            employee_id=user.employee_id,
            status='rejected_edit'
        ).count()
        
        rejected_delete_count = WorkLog.query.filter_by(
            employee_id=user.employee_id,
            status='rejected_delete'
        ).count()
        
        total_count = rejected_add_count + rejected_edit_count + rejected_delete_count
        
        return {
            'total': total_count,
            'rejected_add': rejected_add_count,
            'rejected_edit': rejected_edit_count,
            'rejected_delete': rejected_delete_count
        }
        
    except Exception as e:
        current_app.logger.error(f"却下数取得エラー: {str(e)}")
        return {
            'total': 0,
            'rejected_add': 0,
            'rejected_edit': 0,
            'rejected_delete': 0
        }

# 追加申請
@worklog_history_bp.route('/worklog_history/add', methods=['POST'])
@jwt_required()
def add_worklog():
    """✅ 最適化版：工数データの追加申請（軽量化Socket通知）"""
    current_user_id = get_jwt_identity()
    data = request.get_json()

    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404

    required_fields = ['date', 'unitName', 'workType', 'minutes', 'editReason']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'必須フィールド {field} がありません'}), 400

    try:
        work_date = datetime.fromisoformat(data['date']).date()
        minutes = int(data['minutes'])

        new_log = WorkLog(
            employee_id=user.employee_id,
            date=work_date,
            model=data.get('model'),
            serial_number=data.get('serialNumber'),
            work_order=data.get('workOrder'),
            part_number=data.get('partNumber'),
            order_number=data.get('orderNumber'),
            quantity=int(data['quantity']) if data.get('quantity') else None,
            unit_name=data['unitName'],
            work_type=data['workType'],
            minutes=minutes,
            remarks=data.get('remarks'),
            status='pending_add',
            edit_reason=data['editReason']
        )

        db.session.add(new_log)
        db.session.commit()

       
        # Socket通知
        socketio = current_app.config.get('socketio')
        if socketio:
            unit_name = data['unitName']
            admin_users = User.query.filter(User.role_level >= 2).all()
            
            for admin_user in admin_users:
                if not admin_user.default_unit or admin_user.default_unit == unit_name:
                    # pending_count事前計算
                    pending_count = get_admin_pending_count(admin_user.default_unit)
                    
                    # イベント名を修正: worklog_request_added → worklog_request_added_with_data
                    socketio.emit(
                        'worklog_request_added_with_data',  # 修正
                        {
                            'unit_name': unit_name,
                            'type': 'add',
                            'user_id': admin_user.id,
                            'pending_count': pending_count,  # 既に正しい構造
                            'employee_name': user.name,
                            'message': f'{user.name}さんが追加申請しました'
                        },
                        room=str(admin_user.id)
                    )

        return jsonify({
            'success': True,
            'message': '工数データの追加申請が送信されました',
            'worklog': new_log.to_dict(),
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'追加申請に失敗しました: {str(e)}'}), 500

# 工数データの編集申請
@worklog_history_bp.route('/worklog_history/edit', methods=['POST'])
@jwt_required()
def edit_worklog():
    """✅ 最適化版：工数データの編集申請（軽量化Socket通知）"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # ユーザー情報を取得
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404
    
    # 必須フィールドの確認
    required_fields = ['id', 'date', 'unitName', 'workType', 'minutes', 'editReason']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'必須フィールド {field} がありません'}), 400
    
    # 編集理由が空でないことを確認
    if not data['editReason'].strip():
        return jsonify({'error': '編集理由を入力してください'}), 400
    
    # 編集対象の工数データを取得
    original_worklog = WorkLog.query.get(data['id'])
    if not original_worklog:
        return jsonify({'error': '指定された工数データが見つかりません'}), 404
    
    # 該当ユーザーの工数データかチェック
    if original_worklog.employee_id != user.employee_id:
        return jsonify({'error': 'この工数データを編集する権限がありません'}), 403
    
    try:
        # 同じIDで編集申請中の工数データがあれば削除（再申請の場合）
        existing_edits = WorkLog.query.filter_by(
            original_id=original_worklog.id,
            status='pending_edit'
        ).all()
        
        for edit in existing_edits:
            db.session.delete(edit)
        
        # 日付をパース
        work_date = datetime.fromisoformat(data['date']).date() if isinstance(data['date'], str) else data['date']
        
        # 数値変換
        try:
            minutes = int(data['minutes'])
            quantity = int(data['quantity']) if data.get('quantity') and data['quantity'] != 'N/A' else None
        except (ValueError, TypeError):
            minutes = original_worklog.minutes
            quantity = original_worklog.quantity
        
        # 新しい編集申請を作成
        new_worklog = WorkLog(
            employee_id=user.employee_id,
            row_number=original_worklog.row_number,
            date=work_date,
            model=data.get('model', original_worklog.model),
            serial_number=data.get('serialNumber', original_worklog.serial_number),
            work_order=data.get('workOrder', original_worklog.work_order),
            part_number=data.get('partNumber', original_worklog.part_number),
            order_number=data.get('orderNumber', original_worklog.order_number),
            quantity=quantity,
            unit_name=data['unitName'],
            work_type=data['workType'],
            minutes=minutes,
            remarks=data.get('remarks', original_worklog.remarks),
            status='pending_edit', 
            edit_reason=data['editReason'],
            original_id=original_worklog.id
        )
        
        # 元データも申請中に更新
        original_worklog.status = 'pending_edit'
        
        db.session.add(new_worklog)
        db.session.commit()
           
        # Socket通知
        socketio = current_app.config.get('socketio')
        if socketio:
            unit_name = data['unitName']
            admin_users = User.query.filter(User.role_level >= 2).all()
            
            for admin_user in admin_users:
                if not admin_user.default_unit or admin_user.default_unit == unit_name:
                    pending_count = get_admin_pending_count(admin_user.default_unit)
                    
                    # イベント名を修正
                    socketio.emit(
                        'worklog_request_added_with_data',  # 修正
                        {
                            'unit_name': unit_name,
                            'type': 'edit',
                            'user_id': admin_user.id,
                            'pending_count': pending_count,
                            'employee_name': user.name,
                            'message': f'{user.name}さんが編集申請しました'
                        },
                        room=str(admin_user.id)
                    )
        
        return jsonify({
            'success': True,
            'message': '工数データの編集申請が送信されました',
            'worklog': new_worklog.to_dict(),
        }), 201
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'データの保存に失敗しました: {str(e)}'}), 500

# 削除申請
@worklog_history_bp.route('/worklog_history/delete', methods=['POST'])
@jwt_required()
def delete_worklog():
    """✅ 最適化版：工数データの削除申請（軽量化Socket通知）"""
    current_user_id = get_jwt_identity()
    data = request.get_json()

    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404

    if 'id' not in data or 'editReason' not in data:
        return jsonify({'error': '削除対象IDと削除理由は必須です'}), 400

    worklog = WorkLog.query.get(data['id'])
    if not worklog:
        return jsonify({'error': '該当する工数データが見つかりません'}), 404

    if worklog.employee_id != user.employee_id:
        return jsonify({'error': 'この工数データを削除申請する権限がありません'}), 403

    try:
        worklog.status = 'pending_delete'
        worklog.edit_reason = data['editReason']

        db.session.commit()

        # Socket通知
        socketio = current_app.config.get('socketio')
        if socketio:
            unit_name = worklog.unit_name
            admin_users = User.query.filter(User.role_level >= 2).all()
            
            for admin_user in admin_users:
                if not admin_user.default_unit or admin_user.default_unit == unit_name:
                    pending_count = get_admin_pending_count(admin_user.default_unit)
                    
                    # イベント名を修正
                    socketio.emit(
                        'worklog_request_added_with_data',  # 修正
                        {
                            'unit_name': unit_name,
                            'type': 'delete',
                            'user_id': admin_user.id,
                            'pending_count': pending_count,
                            'employee_name': user.name,
                            'message': f'{user.name}さんが削除申請しました'
                        },
                        room=str(admin_user.id)
                    )

        return jsonify({
            'success': True,
            'message': '削除申請が送信されました',
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'削除申請に失敗しました: {str(e)}'}), 500

# 申請キャンセル
@worklog_history_bp.route('/worklog_history/cancel', methods=['POST'])
@jwt_required()
def cancel_worklog_request():
    """✅ 最適化版：申請キャンセル（軽量化Socket通知）"""
    current_user_id = get_jwt_identity()
    data = request.get_json()

    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404

    log_id = data.get('id')
    original_id = data.get('originalId')
    status = data.get('status')

    if not log_id or not status:
        return jsonify({'error': 'IDまたはステータスが不足しています'}), 400

    try:
        if status == 'pending_edit':
            # 編集後データを削除
            edited_log = WorkLog.query.get(log_id)
            if not edited_log or edited_log.employee_id != user.employee_id:
                return jsonify({'error': '編集後データが見つかりません'}), 404

            if not original_id and edited_log.original_id:
                original_id = edited_log.original_id
            
            if not original_id:
                return jsonify({'error': 'originalId が必要です'}), 400

            original_log = WorkLog.query.get(original_id)
            if not original_log or original_log.employee_id != user.employee_id:
                return jsonify({'error': '編集元データが見つかりません'}), 404

            # 編集後データを削除
            db.session.delete(edited_log)
            
            # 編集元データのステータスをリセット
            original_log.status = 'draft'
            original_log.edit_reason = None

        elif status in ['pending_delete', 'rejected_edit']:
            log = WorkLog.query.get(log_id)
            if not log or log.employee_id != user.employee_id:
                return jsonify({'error': '削除対象が見つかりません'}), 404
            log.status = 'draft'
            log.edit_reason = None
            db.session.add(log)

        elif status == 'pending_add':
            log = WorkLog.query.get(log_id)
            if not log or log.employee_id != user.employee_id:
                return jsonify({'error': '追加対象が見つかりません'}), 404
            db.session.delete(log)

        else:
            return jsonify({'error': '不明なステータスです'}), 400

        db.session.commit()

        # Socket通知
        socketio = current_app.config.get('socketio')
        if socketio:
            # unit_name取得ロジック
            unit_name = None
            if status == 'pending_edit' and 'original_log' in locals():
                unit_name = original_log.unit_name
            elif status in ['pending_delete', 'rejected_edit'] and 'log' in locals():
                unit_name = log.unit_name
            elif status == 'pending_add' and 'log' in locals():
                unit_name = log.unit_name

            if unit_name:
                admin_users = User.query.filter(User.role_level >= 2).all()
                for admin_user in admin_users:
                    if not admin_user.default_unit or admin_user.default_unit == unit_name:
                        pending_count = get_admin_pending_count(admin_user.default_unit)
                        
                        # イベント名を修正（新規追加）
                        socketio.emit(
                            'worklog_request_added_with_data',  # 統一
                            {
                                'unit_name': unit_name,
                                'type': 'cancel',
                                'user_id': admin_user.id,
                                'pending_count': pending_count,
                                'employee_name': user.name,
                                'message': f'{user.name}さんが申請を取り消しました'
                            },
                            room=str(admin_user.id)
                        )

        return jsonify({
            'success': True, 
            'message': '申請を取り消しました',
        }), 200
    

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'取り消し処理に失敗しました: {str(e)}'}), 500

# 追加申請却下の取り消し
@worklog_history_bp.route('/worklog_history/cancel_rejected_add', methods=['POST'])
@jwt_required()
def cancel_rejected_add():
    current_user_id = get_jwt_identity()
    data = request.get_json()

    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404

    if 'id' not in data:
        return jsonify({'error': 'IDが不足しています'}), 400
    
    log_id = data['id']
    
    try:
        log = WorkLog.query.get(log_id)
        if not log or log.employee_id != user.employee_id:
            return jsonify({'error': '対象のデータが見つかりません'}), 404
        
        if log.status != 'rejected_add':
            return jsonify({'error': 'このデータは追加却下状態ではありません'}), 400
        
        unit_name = log.unit_name  # 削除前に保存
        
        db.session.delete(log)
        db.session.commit()


        # Socket通知
        socketio = current_app.config.get('socketio')
        if socketio:
            if unit_name:
                admin_users = User.query.filter(User.role_level >= 2).all()
                for admin_user in admin_users:
                    if not admin_user.default_unit or admin_user.default_unit == unit_name:
                        pending_count = get_admin_pending_count(admin_user.default_unit)
                        
                        # イベント名を修正
                        socketio.emit(
                            'worklog_request_added_with_data',  # 統一
                            {
                                'unit_name': unit_name,
                                'type': 'rejected_cancel',
                                'user_id': admin_user.id,
                                'pending_count': pending_count,
                                'employee_name': user.name,
                                'message': f'{user.name}さんが却下申請を取り消しました'
                            },
                            room=str(admin_user.id)
                        )

        
        return jsonify({
            'success': True,
            'message': '却下された追加申請を取り消しました',
            # ✅ updated_dataを削除（フロントエンドで再取得）
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'取り消し処理に失敗しました: {str(e)}'}), 500

# 削除申請却下の取り消し
@worklog_history_bp.route('/worklog_history/cancel_rejected_delete', methods=['POST'])
@jwt_required()
def cancel_rejected_delete():
    current_user_id = get_jwt_identity()
    data = request.get_json()

    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404

    if 'id' not in data:
        return jsonify({'error': 'IDが不足しています'}), 400
    
    log_id = data['id']
    
    try:
        log = WorkLog.query.get(log_id)
        if not log or log.employee_id != user.employee_id:
            return jsonify({'error': '対象のデータが見つかりません'}), 404
        
        if log.status != 'rejected_delete':
            return jsonify({'error': 'このデータは削除却下状態ではありません'}), 400
        
        unit_name = log.unit_name  # 削除前に保存
        
        # ステータスを通常に変更
        log.status = 'draft'
        log.edit_reason = None
        db.session.commit()


        # Socket通知
        socketio = current_app.config.get('socketio')
        if socketio:
            if unit_name:
                admin_users = User.query.filter(User.role_level >= 2).all()
                for admin_user in admin_users:
                    if not admin_user.default_unit or admin_user.default_unit == unit_name:
                        pending_count = get_admin_pending_count(admin_user.default_unit)
                        
                        # イベント名を修正
                        socketio.emit(
                            'worklog_request_added_with_data',  # 統一
                            {
                                'unit_name': unit_name,
                                'type': 'rejected_cancel',
                                'user_id': admin_user.id,
                                'pending_count': pending_count,
                                'employee_name': user.name,
                                'message': f'{user.name}さんが却下申請を取り消しました'
                            },
                            room=str(admin_user.id)
                        )
        
        return jsonify({
            'success': True,
            'message': '却下された削除申請を取り消しました',
            # ✅ updated_dataを削除（フロントエンドで再取得）
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'取り消し処理に失敗しました: {str(e)}'}), 500

# 却下されたデータを再申請
@worklog_history_bp.route('/worklog_history/resubmit', methods=['POST'])
@jwt_required()
def resubmit_worklog():
    """✅ 最適化版：却下されたデータを再申請（軽量化Socket通知）"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # ユーザー情報を取得
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404
    
    # 必須フィールドの確認
    required_fields = ['id', 'date', 'unitName', 'workType', 'minutes', 'editReason']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'必須フィールド {field} がありません'}), 400
    
    if not data['editReason'].strip():
        return jsonify({'error': '編集理由を入力してください'}), 400
    
    worklog = WorkLog.query.get(data['id'])
    if not worklog:
        return jsonify({'error': '指定されたデータが見つかりません'}), 404
    
    if worklog.employee_id != user.employee_id:
        return jsonify({'error': 'このデータを編集する権限がありません'}), 403
    
    try:
        # 元のステータスによって処理を分岐
        original_status = data.get('originalStatus', worklog.status)
        
        if original_status == 'rejected_add':
            # 追加却下の場合は、そのまま再申請
            worklog.status = 'pending_add'
            worklog.edit_reason = data['editReason']
            
            # 各フィールドを更新
            worklog.date = datetime.fromisoformat(data['date']).date() if isinstance(data['date'], str) else data['date']
            worklog.model = data.get('model', worklog.model)
            worklog.serial_number = data.get('serialNumber', worklog.serial_number)
            worklog.work_order = data.get('workOrder', worklog.work_order)
            worklog.part_number = data.get('partNumber', worklog.part_number)
            worklog.order_number = data.get('orderNumber', worklog.order_number)
            worklog.quantity = int(data['quantity']) if data.get('quantity') and data['quantity'] != 'N/A' else worklog.quantity
            worklog.unit_name = data['unitName']
            worklog.work_type = data['workType']
            worklog.minutes = int(data['minutes'])
            worklog.remarks = data.get('remarks', worklog.remarks)
            
        elif original_status == 'rejected_edit':
            # 編集却下の場合は、編集申請処理と同様
            existing_edits = WorkLog.query.filter_by(
                original_id=worklog.id,
                status='pending_edit'
            ).all()
            
            for edit in existing_edits:
                db.session.delete(edit)
            
            work_date = datetime.fromisoformat(data['date']).date() if isinstance(data['date'], str) else data['date']
            
            try:
                minutes = int(data['minutes'])
                quantity = int(data['quantity']) if data.get('quantity') and data['quantity'] != 'N/A' else None
            except (ValueError, TypeError):
                minutes = worklog.minutes
                quantity = worklog.quantity
            
            new_worklog = WorkLog(
                employee_id=user.employee_id,
                row_number=worklog.row_number,
                date=work_date,
                model=data.get('model', worklog.model),
                serial_number=data.get('serialNumber', worklog.serial_number),
                work_order=data.get('workOrder', worklog.work_order),
                part_number=data.get('partNumber', worklog.part_number),
                order_number=data.get('orderNumber', worklog.order_number),
                quantity=quantity,
                unit_name=data['unitName'],
                work_type=data['workType'],
                minutes=minutes,
                remarks=data.get('remarks', worklog.remarks),
                status='pending_edit', 
                edit_reason=data['editReason'],
                original_id=worklog.id
            )
            
            worklog.status = 'pending_edit'
            
            db.session.add(new_worklog)
        else:
            return jsonify({'error': 'このデータは却下状態ではありません'}), 400
        
        db.session.commit()

        # ✅ Socket通知のみ（重いデータ取得は削除）
        socketio = current_app.config.get('socketio')
        if socketio:
            unit_name = data['unitName']
            
            # 管理者権限を持つユーザーを取得（role_level >= 2）
            admin_users = User.query.filter(User.role_level >= 2).all()
            
            # 各管理者ユーザーにイベントを送信
            for admin_user in admin_users:
                if not admin_user.default_unit or admin_user.default_unit == unit_name:
                    # ✅ pending_count計算
                    pending_count = get_admin_pending_count(admin_user.default_unit)
                    
                    # ✅ 軽量通知
                    socketio.emit(
                        'worklog_request_added',
                        {
                            'unit_name': unit_name,
                            'type': 'edit',
                            'user_id': admin_user.id,
                            'pending_count': pending_count,
                            'employee_name': user.name,
                            'message': f'{user.name}さんが再申請しました'
                        },
                        room=str(admin_user.id)
                    )
      
        return jsonify({
            'success': True,
            'message': 'データの再申請が送信されました',
            # ✅ updated_dataを削除（フロントエンドで再取得）
            # 却下未処理数
            'reject_count': get_user_reject_count(current_user_id)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'再申請処理に失敗しました: {str(e)}'}), 500

# フィルター選択肢を取得するAPI
@worklog_history_bp.route('/worklog_history/filter_options', methods=['GET'])
@jwt_required()
def get_filter_options():
    """ユーザーの工数データからフィルター選択肢を取得する"""
    current_user_id = get_jwt_identity()
    
    try:
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'ユーザーが見つかりません'}), 404

        # ユーザーの全工数データから重複を除いた選択肢を取得
        models_query = db.session.query(WorkLog.model.distinct())\
                          .filter(WorkLog.employee_id == user.employee_id)\
                          .filter(WorkLog.model.isnot(None))\
                          .filter(WorkLog.model != '')\
                          .all()
        
        work_types_query = db.session.query(WorkLog.work_type.distinct())\
                             .filter(WorkLog.employee_id == user.employee_id)\
                             .filter(WorkLog.work_type.isnot(None))\
                             .filter(WorkLog.work_type != '')\
                             .all()
        
        # タプルから値を抽出してソート
        models = sorted([model[0] for model in models_query if model[0]])
        work_types = sorted([work_type[0] for work_type in work_types_query if work_type[0]])
        
        return jsonify({
            'models': models,
            'workTypes': work_types
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"フィルター選択肢取得エラー: {str(e)}")
        return jsonify({
            'models': [],
            'workTypes': []
        }), 200