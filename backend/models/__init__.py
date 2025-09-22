from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# 初期化インスタンスだけ用意（循環回避）
db = SQLAlchemy()
migrate = Migrate()

# モデルのインポート（順番注意）
from .user import User
from .password_reset import PasswordResetRequest
from .worklog import WorkLog
from .chat_permission import ChatPermission
from .chat_message import ChatMessage
from .unit_name import UnitName
from .work_type import WorkType
from .unit_work_type import UnitWorkType