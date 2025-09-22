import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app, render_template

def send_email(recipients, subject, html_content, text_content=None):
    """
    メール送信関数（.envの中身をprintして確認しつつログインを試みる）

    Args:
        recipients (list or str): 送信先メールアドレス（リストまたは文字列）
        subject (str): 件名
        html_content (str): HTML本文
        text_content (str, optional): テキスト本文

    Returns:
        bool: 成功時True、失敗時False
    """
    # 設定の取得
    smtp_server = current_app.config.get('SMTP_SERVER', 'localhost')
    smtp_port = current_app.config.get('SMTP_PORT', 25)
    smtp_username = current_app.config.get('SMTP_USERNAME')
    smtp_password = current_app.config.get('SMTP_PASSWORD')
    sender_email = current_app.config.get('SENDER_EMAIL', 'no-reply@example.com')

    # printで確認
    print("----- SMTP設定確認 -----")
    print("SMTP_SERVER:", smtp_server)
    print("SMTP_PORT:", smtp_port)
    print("SMTP_USERNAME:", smtp_username)
    print("SMTP_PASSWORD:", '*' * len(smtp_password) if smtp_password else None)
    print("SENDER_EMAIL:", sender_email)
    print("--------------------------")

    # 宛先をリストに変換
    if isinstance(recipients, str):
        recipients = [recipients]

    # メッセージ構築
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = ', '.join(recipients)

    if text_content:
        msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_content, 'html', 'utf-8'))

    try:
        # SMTPサーバーに接続（ポート番号によって使い分け）
        if smtp_port == 465:
            print("➡ SSLモードで接続")
            server = smtplib.SMTP_SSL(smtp_server, smtp_port)
        else:
            print("➡ STARTTLSモードで接続")
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()

        # ログインテスト
        print("➡ ログイン試行中...")
        server.login(smtp_username, smtp_password)
        print("✅ ログイン成功")

        # メール送信
        server.sendmail(sender_email, recipients, msg.as_string())
        print("✅ メール送信成功")

        server.quit()
        return True

    except Exception as e:
        print("❌ エラー:", str(e))
        current_app.logger.error(f"Failed to send email: {str(e)}")
        return False


def send_password_reset_email(recipient_email, user_name, reset_url):
    """
    パスワードリセット用のメールを送信
    
    Args:
        recipient_email (str): 送信先メールアドレス
        user_name (str): ユーザー名
        reset_url (str): パスワードリセット用URL
    
    Returns:
        bool: 送信成功したらTrue
    """
    # メールの件名
    subject = "【社内業務ツール】パスワードリセットのご案内"
    
    # HTML本文
    html_content = render_template(
        'emails/password_reset.html',
        user_name=user_name,
        reset_url=reset_url
    )
    
    # プレーンテキスト版
    text_content = f"""
{user_name} 様

パスワードリセットのリクエストを受け付けました。

以下のURLにアクセスして、新しいパスワードを設定してください：
{reset_url}

このリンクは24時間有効です。

このメールに心当たりがない場合は、無視していただいて構いません。

社内業務ツール管理チーム
"""
    
    # メール送信
    return send_email(recipient_email, subject, html_content, text_content)

def send_admin_reset_notification(admin_emails, user_name, employee_id, note):
    """
    管理者向けパスワードリセット依頼通知メールを送信
    
    Args:
        admin_emails (list): 管理者メールアドレスのリスト
        user_name (str): ユーザー名
        employee_id (str): 社員ID
        note (str): 依頼理由
    
    Returns:
        bool: 送信成功したらTrue
    """
    # メールの件名
    subject = "【社内業務ツール】パスワードリセット依頼"
    
    # HTML本文
    html_content = render_template(
        'emails/admin_reset_notification.html',
        user_name=user_name,
        employee_id=employee_id,
        note=note
    )
    
    # プレーンテキスト版
    text_content = f"""
管理者各位

{user_name}（社員ID: {employee_id}）からパスワードリセットの依頼がありました。

【依頼理由】
{note}

管理者ツールからパスワードの再設定をお願いします。

社内業務ツール
"""
    
    # メール送信
    return send_email(admin_emails, subject, html_content, text_content)