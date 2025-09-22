def validate_login_data(data):
    """ログイン入力データのバリデーション
    
    Args:
        data (dict): リクエストデータ
    
    Returns:
        dict: バリデーション結果
    """
    # 必須フィールドのチェック
    if not data:
        return {'valid': False, 'message': 'No data provided'}
    
    if 'employeeId' not in data or not data['employeeId']:
        return {'valid': False, 'message': 'Employee ID is required'}
    
    if 'password' not in data or not data['password']:
        return {'valid': False, 'message': 'Password is required'}
    
    # 社員IDのフォーマットチェック (4桁の数字)
    if not data['employeeId'].isdigit() or len(data['employeeId']) != 4:
        return {'valid': False, 'message': 'Employee ID must be a 4-digit number'}
    
    # パスワードの長さチェック
    if len(data['password']) < 4:
        return {'valid': False, 'message': 'Password must be at least 4 characters long'}
    
    return {'valid': True}

def validate_registration_data(data):
    """ユーザー登録データのバリデーション
    
    Args:
        data (dict): リクエストデータ
    
    Returns:
        dict: バリデーション結果
    """
    # 必須フィールドのチェック
    required_fields = ['employeeId', 'name', 'departmentName', 'position', 'password']
    for field in required_fields:
        if field not in data or not data[field]:
            return {'valid': False, 'message': f'{field} is required'}
    
    # 社員IDのフォーマットチェック (4桁の数字)
    if not data['employeeId'].isdigit() or len(data['employeeId']) != 4:
        return {'valid': False, 'message': 'Employee ID must be a 4-digit number'}
    
    # パスワードの長さチェック
    if len(data['password']) < 4:
        return {'valid': False, 'message': 'Password must be at least 4 characters long'}
    
    # パスワード確認チェック (存在する場合)
    if 'confirmPassword' in data and data['password'] != data['confirmPassword']:
        return {'valid': False, 'message': 'Passwords do not match'}
    
    # メールアドレス形式チェック (存在する場合)
    if 'email' in data and data['email']:
        import re
        email_pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        if not re.match(email_pattern, data['email']):
            return {'valid': False, 'message': 'Invalid email format'}
    
    # 権限レベルのチェック (存在する場合)
    if 'roleLevel' in data:
        try:
            role_level = int(data['roleLevel'])
            if role_level < 1 or role_level > 4:
                return {'valid': False, 'message': 'Role level must be between 1 and 4'}
        except ValueError:
            return {'valid': False, 'message': 'Role level must be a number'}
    
    return {'valid': True}

def validate_reset_request(data):
    """パスワードリセット要求のバリデーション
    
    Args:
        data (dict): リクエストデータ
    
    Returns:
        dict: バリデーション結果
    """
    # 必須フィールドのチェック
    if not data:
        return {'valid': False, 'message': 'No data provided'}
    
    if 'employeeId' not in data or not data['employeeId']:
        return {'valid': False, 'message': 'Employee ID is required'}
    
    if 'email' not in data or not data['email']:
        return {'valid': False, 'message': 'Email is required'}
    
    # 社員IDのフォーマットチェック (4桁の数字)
    if not data['employeeId'].isdigit() or len(data['employeeId']) != 4:
        return {'valid': False, 'message': 'Employee ID must be a 4-digit number'}
    
    # メールアドレス形式チェック
    import re
    email_pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if not re.match(email_pattern, data['email']):
        return {'valid': False, 'message': 'Invalid email format'}
    
    return {'valid': True}

def validate_reset_token(data):
    """パスワードリセットトークンのバリデーション
    
    Args:
        data (dict): リクエストデータ
    
    Returns:
        dict: バリデーション結果
    """
    # 必須フィールドのチェック
    if not data:
        return {'valid': False, 'message': 'No data provided'}
    
    if 'token' not in data or not data['token']:
        return {'valid': False, 'message': 'Token is required'}
    
    if 'newPassword' not in data or not data['newPassword']:
        return {'valid': False, 'message': 'New password is required'}
    
    # パスワードの長さチェック
    if len(data['newPassword']) < 4:
        return {'valid': False, 'message': 'Password must be at least 4 characters long'}
    
    return {'valid': True}