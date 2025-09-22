import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Tailwindベースのテキストエリア

/**
 * 備考編集用モーダル（工数入力行）
 *
 * @param {boolean} isOpen - モーダルを開くかどうか
 * @param {function} onClose - モーダルを閉じる処理（✕またはキャンセル）
 * @param {function} onSave - 保存ボタン押下時に呼び出す処理
 * @param {string} value - 現在の備考テキスト
 * @param {function} onChange - 入力変更時の処理
 */
const RemarksInputWorkLogModal = ({ isOpen, onClose, onSave, value, onChange }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>備考を編集</DialogTitle>
        </DialogHeader>

        <Textarea
          className="w-full text-sm mt-2"
          placeholder="ここに備考を入力してください"
          rows={6}
          value={value}
          onChange={onChange}
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            いいえ
          </Button>
          <Button onClick={onSave}>はい</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RemarksInputWorkLogModal;
