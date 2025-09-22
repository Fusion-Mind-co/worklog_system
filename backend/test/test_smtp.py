import smtplib

try:
    server = smtplib.SMTP('smtp.gmail.com', 587, timeout=10)
    server.starttls()
    print("✅ SMTPサーバーに接続成功")
    server.quit()
except Exception as e:
    print("❌ 接続失敗:", e)
