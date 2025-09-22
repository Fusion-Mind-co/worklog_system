# routes/approval_rejection.py - パフォーマンス最適化版（完全版）

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, WorkLog
from datetime import datetime

approval_rejection_bp = Blueprint('approval_rejection', __name__)

# ✅ 軽量化されたpending_count取得関数
def get_admin_pending_count(unit_name=None):
    """管理者用の未処理申請数を取得するヘルパー関数（修正版）"""
    try:
        from sqlalchemy import or_
        
        query = WorkLog.query.filter(
            or_(
                WorkLog.status == 'pending_add',
                WorkLog.status == 'pending_delete',
                # ✅ pending_editはoriginal_idがnullのもののみカウント
                (WorkLog.status == 'pending_edit') & (WorkLog.original_id == None)
            )
        )
        
        if unit_name:
            query = query.filter(WorkLog.unit_name == unit_name)
        
        pending_add_count = query.filter(WorkLog.status == 'pending_add').count()
        # ✅ pending_editは編集前データのみカウント
        pending_edit_count = query.filter(
            WorkLog.status == 'pending_edit'
        ).filter(WorkLog.original_id == None).count()
        pending_delete_count = query.filter(WorkLog.status == 'pending_delete').count()
        
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

# 【追加承認】
@approval_rejection_bp.route('/approval_rejection/approve_add', methods=['POST'])
@jwt_required()
def approve_add_worklog():
   print('approve_add_worklog　関数実行')
   """✅ 最適化版：工数追加申請を承認する（軽量化Socket通知）"""
   data = request.get_json()
   worklog_id = data.get('worklog_id')
   
   if not worklog_id:
       return jsonify({'error': 'worklog_id が必要です'}), 400
   
   try:
       # 対象の工数データを取得
       worklog = WorkLog.query.get(worklog_id)
       if not worklog:
           return jsonify({'error': '指定された工数データが見つかりません'}), 404
       
       if worklog.status != 'pending_add':
           return jsonify({'error': '追加申請中のデータではありません'}), 400
       
       # ステータスを承認済みに変更
       worklog.status = 'approved'
       worklog.updated_at = datetime.utcnow()
       
       db.session.commit()

       # ✅ 現在のユーザーのデフォルトユニットを取得
       current_user_id = get_jwt_identity()
       current_user = User.query.get(current_user_id)
       default_unit = current_user.default_unit if current_user else None

       # ✅ Socket通知のみ（重いデータ取得は削除）
       socketio = current_app.config.get('socketio')
       if socketio:
           # ✅ 申請者に承認通知のみ送信（最小限のデータ）
           applicant_user = User.query.filter_by(employee_id=worklog.employee_id).first()
           if applicant_user:
               socketio.emit(
                   'worklog_approved_with_data',
                   {
                       'type': 'add',
                       'worklog_id': worklog_id,
                       'message': '追加申請が承認されました',
                       # ✅ worklog_dataを削除（フロントエンドで再取得）
                   },
                   room=str(applicant_user.id)
               )

       return jsonify({
           'success': True,
           'message': '追加申請を承認しました',
           'pending_count': get_admin_pending_count(default_unit) 
       }), 200
       
   except Exception as e:
       db.session.rollback()
       current_app.logger.error(f"追加承認エラー: {str(e)}")
       return jsonify({'error': f'承認処理に失敗しました: {str(e)}'}), 500

# 【追加却下】
@approval_rejection_bp.route('/approval_rejection/reject_add', methods=['POST'])
@jwt_required()
def reject_add_worklog():
    print('【追加却下】')
    data = request.get_json()
    worklog_id = data.get('worklog_id')
    reject_reason = data.get('reject_reason')
    
    if not worklog_id or not reject_reason:
        return jsonify({'error': 'worklog_id と reject_reason が必要です'}), 400
    
    try:
        worklog = WorkLog.query.get(worklog_id)
        if not worklog:
            return jsonify({'error': '指定された工数データが見つかりません'}), 404
        
        if worklog.status != 'pending_add':
            return jsonify({'error': '追加申請中のデータではありません'}), 400
        
        # ステータスを却下に変更
        worklog.status = 'rejected_add'
        worklog.edit_reason = reject_reason
        worklog.updated_at = datetime.utcnow()
        
        db.session.commit()

        # ✅ 現在のユーザーのデフォルトユニットを取得
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        default_unit = current_user.default_unit if current_user else None

        # ✅ Socket通知のみ（重いデータ取得は削除）
        socketio = current_app.config.get('socketio')
        if socketio:
            # ✅ 申請者に却下通知のみ送信（最小限のデータ）
            applicant_user = User.query.filter_by(employee_id=worklog.employee_id).first()
            if applicant_user:
                socketio.emit(
                    'worklog_rejected_with_data',
                    {
                        'type': 'add',
                        'worklog_id': worklog_id,
                        'reject_reason': reject_reason,
                        'message': f'追加申請が却下されました: {reject_reason}',
                        # ✅ worklog_dataを削除（フロントエンドで再取得）
                        'reject_count': get_user_reject_count(applicant_user.id)
                    },
                    room=str(applicant_user.id)
                )
        
        return jsonify({
            'success': True,
            'message': '追加申請を却下しました',
            'pending_count': get_admin_pending_count(default_unit)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"追加却下エラー: {str(e)}")
        return jsonify({'error': f'却下処理に失敗しました: {str(e)}'}), 500

# 【編集承認】
@approval_rejection_bp.route('/approval_rejection/approve_edit', methods=['POST'])
@jwt_required()
def approve_edit_worklog():
    """✅ 最適化版：工数編集申請を承認する（軽量化Socket通知）"""
    data = request.get_json()
    worklog_id = data.get('worklog_id')
    
    if not worklog_id:
        return jsonify({'error': 'worklog_id が必要です'}), 400
    
    try:
        # 編集データを取得
        edited_worklog = WorkLog.query.get(worklog_id)
        if not edited_worklog:
            return jsonify({'error': '指定された工数データが見つかりません'}), 404
        
        if edited_worklog.status != 'pending_edit':
            return jsonify({'error': '編集申請中のデータではありません'}), 400
        
        # 元のデータを取得
        original_worklog = WorkLog.query.get(edited_worklog.original_id)
        if not original_worklog:
            return jsonify({'error': '編集元のデータが見つかりません'}), 404
        
        # 元のデータを編集データで更新
        original_worklog.date = edited_worklog.date
        original_worklog.model = edited_worklog.model
        original_worklog.serial_number = edited_worklog.serial_number
        original_worklog.work_order = edited_worklog.work_order
        original_worklog.part_number = edited_worklog.part_number
        original_worklog.order_number = edited_worklog.order_number
        original_worklog.quantity = edited_worklog.quantity
        original_worklog.unit_name = edited_worklog.unit_name
        original_worklog.work_type = edited_worklog.work_type
        original_worklog.minutes = edited_worklog.minutes
        original_worklog.remarks = edited_worklog.remarks
        original_worklog.status = 'approved'
        original_worklog.edit_reason = None
        original_worklog.updated_at = datetime.utcnow()
        
        # 編集データを削除
        db.session.delete(edited_worklog)
        db.session.commit()

        # ✅ 現在のユーザーのデフォルトユニットを取得
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        default_unit = current_user.default_unit if current_user else None

        # ✅ Socket通知のみ（重いデータ取得は削除）
        socketio = current_app.config.get('socketio')
        if socketio:
            # ✅ 申請者に承認通知のみ送信（最小限のデータ）
            applicant_user = User.query.filter_by(employee_id=original_worklog.employee_id).first()
            if applicant_user:
                socketio.emit(
                    'worklog_approved_with_data',
                    {
                        'type': 'edit',
                        'worklog_id': worklog_id,
                        'message': '編集申請が承認されました',
                        # ✅ worklog_dataを削除（フロントエンドで再取得）
                    },
                    room=str(applicant_user.id)
                )
        
        return jsonify({
            'success': True,
            'message': '編集申請を承認しました',
            'pending_count': get_admin_pending_count(default_unit) 
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"編集承認エラー: {str(e)}")
        return jsonify({'error': f'承認処理に失敗しました: {str(e)}'}), 500
    
# 【編集却下】
@approval_rejection_bp.route('/approval_rejection/reject_edit', methods=['POST'])
@jwt_required()
def reject_edit_worklog():
    data = request.get_json()
    worklog_id = data.get('worklog_id')
    reject_reason = data.get('reject_reason')
    
    if not worklog_id or not reject_reason:
        return jsonify({'error': 'worklog_id と reject_reason が必要です'}), 400
    
    try:
        edited_worklog = WorkLog.query.get(worklog_id)
        if not edited_worklog:
            return jsonify({'error': '指定された工数データが見つかりません'}), 404
        
        if edited_worklog.status != 'pending_edit':
            return jsonify({'error': '編集申請中のデータではありません'}), 400
        
        original_worklog = WorkLog.query.get(edited_worklog.original_id)
        if not original_worklog:
            return jsonify({'error': '編集元のデータが見つかりません'}), 404
        
        # 元のデータのステータスを却下に変更
        original_worklog.status = 'rejected_edit'
        original_worklog.edit_reason = reject_reason
        original_worklog.updated_at = datetime.utcnow()
        
        # 編集データを削除
        db.session.delete(edited_worklog)
        db.session.commit()

        # ✅ 現在のユーザーのデフォルトユニットを取得
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        default_unit = current_user.default_unit if current_user else None

        # ✅ Socket通知のみ（重いデータ取得は削除）
        socketio = current_app.config.get('socketio')
        if socketio:
            # ✅ 申請者に却下通知のみ送信（最小限のデータ）
            applicant_user = User.query.filter_by(employee_id=original_worklog.employee_id).first()
            if applicant_user:
                socketio.emit(
                    'worklog_rejected_with_data',
                    {
                        'type': 'edit',
                        'worklog_id': worklog_id,
                        'reject_reason': reject_reason,
                        'message': f'編集申請が却下されました: {reject_reason}',
                        # ✅ worklog_dataを削除（フロントエンドで再取得）
                        'reject_count': get_user_reject_count(applicant_user.id)
                    },
                    room=str(applicant_user.id)
                )
        
        return jsonify({
            'success': True,
            'message': '編集申請を却下しました',
            'pending_count': get_admin_pending_count(default_unit)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"編集却下エラー: {str(e)}")
        return jsonify({'error': f'却下処理に失敗しました: {str(e)}'}), 500

# 【削除承認】
@approval_rejection_bp.route('/approval_rejection/approve_delete', methods=['POST'])
@jwt_required()
def approve_delete_worklog():
    """✅ 最適化版：工数削除申請を承認する（軽量化Socket通知）"""
    data = request.get_json()
    worklog_id = data.get('worklog_id')
    
    if not worklog_id:
        return jsonify({'error': 'worklog_id が必要です'}), 400
    
    try:
        worklog = WorkLog.query.get(worklog_id)
        if not worklog:
            return jsonify({'error': '指定された工数データが見つかりません'}), 404
        
        if worklog.status != 'pending_delete':
            return jsonify({'error': '削除申請中のデータではありません'}), 400
        
        employee_id = worklog.employee_id
        
        # データを削除
        db.session.delete(worklog)
        db.session.commit()

        # ✅ 現在のユーザーのデフォルトユニットを取得
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        default_unit = current_user.default_unit if current_user else None
    
        # ✅ Socket通知のみ（重いデータ取得は削除）
        socketio = current_app.config.get('socketio')
        if socketio:
            # ✅ 申請者に承認通知のみ送信（最小限のデータ）
            applicant_user = User.query.filter_by(employee_id=employee_id).first()
            if applicant_user:
                socketio.emit(
                    'worklog_approved_with_data',
                    {
                        'type': 'delete',
                        'worklog_id': worklog_id,
                        'message': '削除申請が承認されました',
                        # ✅ worklog_dataを削除（フロントエンドで再取得）
                    },
                    room=str(applicant_user.id)
                )
        
        return jsonify({
            'success': True,
            'message': '削除申請を承認しました',
            'pending_count': get_admin_pending_count(default_unit) 
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"削除承認エラー: {str(e)}")
        return jsonify({'error': f'承認処理に失敗しました: {str(e)}'}), 500

# 【削除却下】
@approval_rejection_bp.route('/approval_rejection/reject_delete', methods=['POST'])
@jwt_required()
def reject_delete_worklog():
    data = request.get_json()
    worklog_id = data.get('worklog_id')
    reject_reason = data.get('reject_reason')
    
    if not worklog_id or not reject_reason:
        return jsonify({'error': 'worklog_id と reject_reason が必要です'}), 400
    
    try:
        worklog = WorkLog.query.get(worklog_id)
        if not worklog:
            return jsonify({'error': '指定された工数データが見つかりません'}), 404
        
        if worklog.status != 'pending_delete':
            return jsonify({'error': '削除申請中のデータではありません'}), 400
        
        # ステータスを却下に変更
        worklog.status = 'rejected_delete'
        worklog.edit_reason = reject_reason
        worklog.updated_at = datetime.utcnow()
        
        db.session.commit()

        # ✅ 現在のユーザーのデフォルトユニットを取得
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        default_unit = current_user.default_unit if current_user else None

        # ✅ Socket通知のみ（重いデータ取得は削除）
        socketio = current_app.config.get('socketio')
        if socketio:
            # ✅ 申請者に却下通知のみ送信（最小限のデータ）
            applicant_user = User.query.filter_by(employee_id=worklog.employee_id).first()
            if applicant_user:
                socketio.emit(
                    'worklog_rejected_with_data',
                    {
                        'type': 'delete',
                        'worklog_id': worklog_id,
                        'reject_reason': reject_reason,
                        'message': f'削除申請が却下されました: {reject_reason}',
                        # ✅ worklog_dataを削除（フロントエンドで再取得）
                        'reject_count': get_user_reject_count(applicant_user.id)
                    },
                    room=str(applicant_user.id)
                )
        
        return jsonify({
            'success': True,
            'message': '削除申請を却下しました',
            'pending_count': get_admin_pending_count(default_unit)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"削除却下エラー: {str(e)}")
        return jsonify({'error': f'却下処理に失敗しました: {str(e)}'}), 500