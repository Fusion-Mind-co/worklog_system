def validate_worklog_data(data):
    """工数入力データのバリデーション
    
    Args:
        data (dict): リクエストデータ
    
    Returns:
        dict: バリデーション結果
    """
    # 必須フィールドのチェック
    if not data:
        return {'valid': False, 'message': 'データが提供されていません'}
    
    if 'workDate' not in data:
        return {'valid': False, 'message': '作業日付が必要です'}
    
    if 'workRows' not in data or not isinstance(data['workRows'], list):
        return {'valid': False, 'message': '工数データが必要です'}
    
    # 各行の必須フィールドをチェック
    for i, row in enumerate(data['workRows']):
        if not row.get('model'):
            return {'valid': False, 'message': f'行 {i+1}: MODELは必須です'}
        
        if not row.get('serialNumber'):
            return {'valid': False, 'message': f'行 {i+1}: 製造番号は必須です'}
        
        if not row.get('workOrder'):
            return {'valid': False, 'message': f'行 {i+1}: 工事番号は必須です'}

        if not row.get('partNumber'):
            return {'valid': False, 'message': f'行 {i+1}: P/Nは必須です'}
        
        if not row.get('orderNumber'):
            return {'valid': False, 'message': f'行 {i+1}: 注文番号は必須です'}
        
        # 数量が "N/A" の場合はスキップ（N工数対応）
        if row.get("quantity") != "N/A":
            try:
                quantity = int(row["quantity"])
                if quantity < 0:
                    return {'valid': False, 'message': f'行 {i+1}: 数量は0以上の整数である必要があります'}
            except (ValueError, TypeError):
                return {'valid': False, 'message': f'行 {i+1}: 数値フィールドには整数を入力してください'}


        if not row.get('unitName'):
            return {'valid': False, 'message': f'行 {i+1}: ユニット名は必須です'}
        
        if not row.get('workType'):
            return {'valid': False, 'message': f'行 {i+1}: 工事区分は必須です'}
        
        if not row.get('minutes'):
            return {'valid': False, 'message': f'行 {i+1}: 工数(分)は必須です'}
        
        
        # 数値フィールドの確認
        try:
            if row.get('minutes'):
                minutes = int(row['minutes'])
                if minutes <= 0:
                    return {'valid': False, 'message': f'行 {i+1}: 工数(分)は正の整数である必要があります'}
            # 重複バリデーションをコメントアウト
            # if row.get('quantity') and row['quantity']:
            #     quantity = int(row['quantity'])
                # if quantity < 0:
                #     return {'valid': False, 'message': f'行 {i+1}: 数量は0以上の整数である必要があります'}
        except ValueError:
            return {'valid': False, 'message': f'行 {i+1}: 数値フィールドには整数を入力してください'}
    
    return {'valid': True}