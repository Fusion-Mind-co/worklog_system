import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

import { Input } from "@/components/ui/input";

const DeleteWorkLogDialog = ({ isOpen, onClose, workLog, onConfirm }) => {
  const [deleteReason, setDeleteReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 削除理由の変更ハンドラ
  const handleReasonChange = (e) => {
    setDeleteReason(e.target.value);
  };

  // 削除確定ハンドラ
  const handleConfirm = async () => {
    // 削除理由のバリデーション
    if (!deleteReason.trim()) {
      alert("削除理由を入力してください");
      return;
    }

    setIsSubmitting(true);

    try {
      // 削除データの準備
      const deleteData = {
        id: workLog.id,
        editReason: deleteReason,
        action: "delete", // 削除アクションを明示
      };

      // 親コンポーネントの確認ハンドラを呼び出し
      await onConfirm(deleteData);

      // ダイアログをクローズ
      resetAndClose();
    } catch (error) {
      console.error("削除処理エラー:", error);
      alert(`削除処理に失敗しました: ${error.message || "不明なエラー"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ダイアログをリセットして閉じる
  const resetAndClose = () => {
    setDeleteReason("");
    onClose();
  };

  // 申請時の確認用アラート
  const [confirmOpen, setConfirmOpen] = useState(false);

  //モーダル内のキャンセル時の状態管理
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  // 日付フォーマット関数
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}/${month}/${day}`;
  };

  if (!workLog) return null;

  return (
    <>
      {/* メイン削除フォームモーダル（Dialog） */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (deleteReason.trim()) {
              setCancelConfirmOpen(true);
            } else {
              resetAndClose();
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              工数データ削除
            </DialogTitle>
          </DialogHeader>

          {/* 工数データの概要表示 */}
          <div className="my-4 p-4 bg-gray-50 rounded-md text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">日付:</div>
              <div>{formatDate(workLog.date)}</div>

              <div className="font-medium">MODEL:</div>
              <div>{workLog.model || "-"}</div>

              <div className="font-medium">S/N:</div>
              <div>{workLog.serialNumber || "-"}</div>

              <div className="font-medium">工事番号:</div>
              <div>{workLog.workOrder || "-"}</div>

              <div className="font-medium">P/N:</div>
              <div>{workLog.partNumber || "-"}</div>

              <div className="font-medium">注文番号:</div>
              <div>{workLog.orderNumber || "-"}</div>

              <div className="font-medium">数量:</div>
              <div>{workLog.quantity || "-"}</div>

              <div className="font-medium">ユニット名:</div>
              <div>{workLog.unitName}</div>

              <div className="font-medium">工事区分:</div>
              <div>{workLog.workType}</div>

              <div className="font-medium">工数(分):</div>
              <div>{workLog.minutes}</div>

              <div className="font-medium">備考:</div>
              <div>{workLog.remarks || "-"}</div>
            </div>
          </div>

          {/* 削除理由入力 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              削除理由 <span className="text-red-500">*</span>
            </label>
            <Input
              value={deleteReason}
              onChange={handleReasonChange}
              placeholder="削除理由を入力してください"
              required
            />
          </div>

          <DialogFooter className="flex justify-between">
            <DialogClose asChild>
              <Button
                variant="outline"
                onClick={() => setCancelConfirmOpen(true)}
              >
                キャンセル
              </Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (!deleteReason.trim()) {
                  alert("削除理由を入力してください");
                  return;
                }
                setConfirmOpen(true);
              }}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? "処理中..." : "削除申請"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 確認アラートモーダル（AlertDialog） */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除申請しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              削除申請してもよろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                handleConfirm();
              }}
              disabled={isSubmitting}
            >
              はい、削除します
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>

        {/*キャンセル　確認アラート  */}
        <AlertDialog
          open={cancelConfirmOpen}
          onOpenChange={setCancelConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>削除申請を破棄しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                入力中の削除理由は破棄されます。よろしいですか？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button
                  variant="outline"
                  onClick={() => setCancelConfirmOpen(false)}
                >
                  戻る
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setCancelConfirmOpen(false);
                  resetAndClose();
                }}
              >
                破棄して閉じる
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AlertDialog>
    </>
  );
};

export default DeleteWorkLogDialog;
