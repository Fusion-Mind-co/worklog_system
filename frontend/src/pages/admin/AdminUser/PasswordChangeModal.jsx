// PasswordChangeModal.jsx（追加）
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateUser } from "@/services/adminUserService"; // API呼び出し用
import { Eye, EyeOff } from "lucide-react";

const PasswordChangeModal = ({ show, user, onClose }) => {
  if (!show || !user) return null;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); //パスワード表示/非表示
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); //確認用パスワード表示/非表示
  // エラー状態管理
  const [errors, setErrors] = useState({
    password: "",
    confirmPassword: "",
  });

  //各種エラー
  const validate = () => {
    let valid = true;
    const newErrors = { password: "", confirmPassword: "" };

    if (!password) {
      newErrors.password = "パスワードを入力してください";
      valid = false;
    } else if (password.length < 4) {
      newErrors.password = "パスワードは4文字以上で入力してください";
      valid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "確認用パスワードを入力してください";
      valid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "パスワードが一致しません";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const confirmChange = window.confirm(
      "この内容でパスワードを変更してもよろしいですか？"
    );
    if (!confirmChange) return;

    try {
      // ✅ ここがパスワード更新の本体！
      await updateUser(user.id, {
        employee_id: user.employee_id,
        name: user.name,
        department_name: user.department_name,
        position: user.position,
        password: password,
      });

      alert(`${user.name} のパスワードを変更しました`);
      onClose(); // モーダルを閉じる
    } catch (error) {
      alert("パスワード変更中にエラーが発生しました: " + error);
    }
  };

  const handleCancel = () => {
    const confirmCancel = window.confirm(
      "内容を破棄して閉じてもよろしいですか？"
    );
    if (confirmCancel) {
      onClose(); // 親に閉じる指示
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{user.name}のパスワード変更</h3>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              新しいパスワード <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="新しいパスワード"
                className="pr-10"
              />
              <div
                className="absolute inset-y-0 right-2 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <Eye className="w-5 h-5" />
                ) : (
                  <EyeOff className="w-5 h-5" />
                )}
              </div>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              確認用パスワード <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="もう一度入力"
                className="pr-10"
              />
              <div
                className="absolute inset-y-0 right-2 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <Eye className="w-5 h-5" />
                ) : (
                  <EyeOff className="w-5 h-5" />
                )}
              </div>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500 mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              いいえ
            </Button>
            <Button onClick={handleSubmit}>はい</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
