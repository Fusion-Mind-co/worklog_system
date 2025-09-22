import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * 再利用可能な確認ダイアログコンポーネント
 * @param {boolean} open - ダイアログの表示状態
 * @param {Function} onOpenChange - ダイアログの表示状態変更関数
 * @param {string} title - ダイアログのタイトル
 * @param {string|React.ReactNode} description - ダイアログの説明文
 * @param {string} confirmText - 確認ボタンのテキスト
 * @param {string} cancelText - キャンセルボタンのテキスト
 * @param {Function} onConfirm - 確認ボタンのクリック時のコールバック
 * @param {string} variant - 確認ボタンのバリアント (default, destructive など)
 * @returns {React.ReactElement}
 */
const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "はい",
  cancelText = "キャンセル",
  onConfirm,
  variant = "default",
}) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  // 確認ボタンのバリアントに基づいてスタイルを決定
  const getButtonStyle = () => {
    if (variant === "destructive") {
      return "bg-red-600 hover:bg-red-700 text-white"; // 削除用は赤色+白テキスト
    }
    return "bg-blue-600 hover:bg-blue-700 text-white"; // 通常は青色+白テキスト
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className={getButtonStyle()}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;