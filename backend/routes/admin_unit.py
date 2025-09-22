from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from models import db, User, UnitName, WorkType, UnitWorkType

# Blueprintの作成
admin_unit_bp = Blueprint('admin_unit', __name__)

@admin_unit_bp.route('/admin/unit-names', methods=['GET'])
@jwt_required()
def get_unit_names():
    """ユニット名一覧を取得するエンドポイント"""
    # 管理者権限の確認
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role_level < 2:  
        return jsonify({'error': '管理者権限が必要です'}), 403
    
    try:
        unit_names = UnitName.query.all()
        
        result = []
        for unit in unit_names:
            unit_data = unit.to_dict()
            # 関連する工事区分のIDのみを抽出
            unit_data['work_type_ids'] = [wt.id for wt in unit.work_types]
            result.append(unit_data)
        
        return jsonify({
            'unit_names': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'ユニット名の取得に失敗しました: {str(e)}'}), 500

@admin_unit_bp.route('/admin/unit-names', methods=['POST'])
@jwt_required()
def create_unit_name():
    """ユニット名を新規作成するエンドポイント"""
    # 管理者権限の確認
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role_level < 2:
        return jsonify({'error': '管理者権限が必要です'}), 403
    
    data = request.get_json()
    
    # データの検証
    if not data or 'name' not in data:
        return jsonify({'error': 'ユニット名は必須です'}), 400
    
    try:
        # 既存のユニット名をチェック
        existing = UnitName.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({'error': 'このユニット名は既に存在します'}), 400
            
        # 新しいユニット名を作成
        unit_name = UnitName(name=data['name'])
        
        # 関連する工事区分があれば設定
        if 'work_type_ids' in data and isinstance(data['work_type_ids'], list):
            for work_type_id in data['work_type_ids']:
                work_type = WorkType.query.get(work_type_id)
                if work_type:
                    unit_name.work_types.append(work_type)
        
        db.session.add(unit_name)
        db.session.commit()
        
        return jsonify({
            'message': 'ユニット名が追加されました',
            'unit_name': unit_name.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'ユニット名の追加に失敗しました: {str(e)}'}), 500

@admin_unit_bp.route('/admin/unit-names/<int:unit_id>', methods=['PUT'])
@jwt_required()
def update_unit_name(unit_id):
    """ユニット名を更新するエンドポイント"""
    # 管理者権限の確認
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role_level < 2:
        return jsonify({'error': '管理者権限が必要です'}), 403
    
    data = request.get_json()
    
    # データの検証
    if not data:
        return jsonify({'error': '更新データがありません'}), 400
    
    try:
        unit_name = UnitName.query.get(unit_id)
        if not unit_name:
            return jsonify({'error': 'ユニット名が見つかりません'}), 404
            
        # 名前の更新
        if 'name' in data and data['name'] != unit_name.name:
            # 同名のユニットがないか確認
            existing = UnitName.query.filter_by(name=data['name']).first()
            if existing and existing.id != unit_id:
                return jsonify({'error': 'このユニット名は既に存在します'}), 400
            unit_name.name = data['name']
        
        # 工事区分の関連付けを更新
        if 'work_type_ids' in data and isinstance(data['work_type_ids'], list):
            # 現在の関連を全て削除
            UnitWorkType.query.filter_by(unit_id=unit_id).delete()
            
            # 新しい関連を設定
            for work_type_id in data['work_type_ids']:
                work_type = WorkType.query.get(work_type_id)
                if work_type:
                    unit_work_type = UnitWorkType(unit_id=unit_id, work_type_id=work_type_id)
                    db.session.add(unit_work_type)
        
        unit_name.updated_at = datetime.utcnow()
        db.session.commit()
        
        # 更新後のデータを取得
        updated_unit = UnitName.query.get(unit_id)
        return jsonify({
            'message': 'ユニット名が更新されました',
            'unit_name': updated_unit.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'ユニット名の更新に失敗しました: {str(e)}'}), 500

@admin_unit_bp.route('/admin/unit-names/<int:unit_id>', methods=['DELETE'])
@jwt_required()
def delete_unit_name(unit_id):
    """ユニット名を削除するエンドポイント"""
    # 管理者権限の確認
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role_level < 2:
        return jsonify({'error': '管理者権限が必要です'}), 403
    
    try:
        unit_name = UnitName.query.get(unit_id)
        if not unit_name:
            return jsonify({'error': 'ユニット名が見つかりません'}), 404
            
        db.session.delete(unit_name)
        db.session.commit()
        
        return jsonify({
            'message': 'ユニット名が削除されました'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'ユニット名の削除に失敗しました: {str(e)}'}), 500

# 工事区分に関するエンドポイント
@admin_unit_bp.route('/admin/work-types', methods=['GET'])
@jwt_required()
def get_work_types():
    """工事区分一覧を取得するエンドポイント"""
    # 管理者権限の確認
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role_level < 2:
        return jsonify({'error': '管理者権限が必要です'}), 403
    
    try:
        work_types = WorkType.query.all()
        
        result = [work_type.to_dict() for work_type in work_types]
        
        return jsonify({
            'work_types': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'工事区分の取得に失敗しました: {str(e)}'}), 500

@admin_unit_bp.route('/admin/work-types', methods=['POST'])
@jwt_required()
def create_work_type():
    """工事区分を新規作成するエンドポイント"""
    # 管理者権限の確認
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role_level < 2:
        return jsonify({'error': '管理者権限が必要です'}), 403
    
    data = request.get_json()
    
    # データの検証
    if not data or 'name' not in data:
        return jsonify({'error': '工事区分名は必須です'}), 400
    
    try:
        # 既存の工事区分をチェック
        existing = WorkType.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({'error': 'この工事区分は既に存在します'}), 400
            
        # 新しい工事区分を作成
        work_type = WorkType(name=data['name'])
        
        db.session.add(work_type)
        db.session.commit()
        
        return jsonify({
            'message': '工事区分が追加されました',
            'work_type': work_type.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'工事区分の追加に失敗しました: {str(e)}'}), 500

@admin_unit_bp.route('/admin/work-types/<int:work_type_id>', methods=['PUT'])
@jwt_required()
def update_work_type(work_type_id):
    """工事区分を更新するエンドポイント"""
    # 管理者権限の確認
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role_level < 2:
        return jsonify({'error': '管理者権限が必要です'}), 403
    
    data = request.get_json()
    
    # データの検証
    if not data or 'name' not in data:
        return jsonify({'error': '工事区分名は必須です'}), 400
    
    try:
        work_type = WorkType.query.get(work_type_id)
        if not work_type:
            return jsonify({'error': '工事区分が見つかりません'}), 404
            
        # 同名の工事区分がないか確認
        if data['name'] != work_type.name:
            existing = WorkType.query.filter_by(name=data['name']).first()
            if existing and existing.id != work_type_id:
                return jsonify({'error': 'この工事区分は既に存在します'}), 400
            
            work_type.name = data['name']
            work_type.updated_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({
            'message': '工事区分が更新されました',
            'work_type': work_type.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'工事区分の更新に失敗しました: {str(e)}'}), 500

@admin_unit_bp.route('/admin/work-types/<int:work_type_id>', methods=['DELETE'])
@jwt_required()
def delete_work_type(work_type_id):
    """工事区分を削除するエンドポイント"""
    # 管理者権限の確認
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role_level < 2:
        return jsonify({'error': '管理者権限が必要です'}), 403
    
    try:
        work_type = WorkType.query.get(work_type_id)
        if not work_type:
            return jsonify({'error': '工事区分が見つかりません'}), 404
            
        db.session.delete(work_type)
        db.session.commit()
        
        return jsonify({
            'message': '工事区分が削除されました'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'工事区分の削除に失敗しました: {str(e)}'}), 500

# ユニットの工事区分マッピングを取得するエンドポイント
@admin_unit_bp.route('/admin/unit-work-type-map', methods=['GET'])
@jwt_required()
def get_unit_work_type_map():
    """ユニットと工事区分のマッピングを取得するエンドポイント"""
    try:
        unit_names = UnitName.query.all()
        
        result = {}
        for unit in unit_names:
            result[unit.name] = [work_type.name for work_type in unit.work_types]
        
        return jsonify({
            'unit_work_type_map': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'マッピングの取得に失敗しました: {str(e)}'}), 500