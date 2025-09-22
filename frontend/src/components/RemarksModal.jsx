import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const RemarksModal = ({ isOpen, onClose, remarks, editRemarks }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>備考の全文表示</DialogTitle>
        </DialogHeader>

        <div className="whitespace-pre-wrap text-sm text-gray-800 mt-2">
          {remarks || "（備考が入力されていません）"}
        </div>

        {editRemarks && editRemarks !== remarks && (
          <div className="text-xs mt-1 text-green-600">
            ⇩ <br />
            {editRemarks || "（備考が入力されていません）"}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>閉じる</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RemarksModal;
