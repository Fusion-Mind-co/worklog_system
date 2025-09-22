import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

/**
 * 通知アラートコンポーネント
 * @param {string} message - 表示するメッセージ
 * @param {string} type - アラートのタイプ ('success' or 'error')
 * @param {Function} onClose - 閉じるボタン押下時のハンドラ
 * @param {boolean} autoClose - 自動で閉じるかどうか（true=閉じる、false=手動）
 */
const Alert = ({ message, type = "success", onClose, autoClose = true }) => {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  if (!message) return null;

  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded-md shadow-md z-50 flex items-center space-x-2 ${
        type === "success"
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      <AlertCircle size={20} className="mt-1" />
      <div className="flex-1 whitespace-pre-line">{message}</div>
      <button
        onClick={onClose}
        className="ml-2 text-black hover:text-gray-500 font-bold text-lg"
        aria-label="閉じる"
      >
        ×
      </button>
    </div>
  );
};

export default Alert;
