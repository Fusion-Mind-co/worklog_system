// RejectReasonDialog.jsx
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "@/components/ui/dialog";
  import { Textarea } from "@/components/ui/textarea";
  import { Button } from "@/components/ui/button";
  
  const RejectReasonDialog = ({ isOpen, reason, onClose, onChange, onConfirm, isProcessing }) => {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>却下理由の入力</DialogTitle>
            <DialogDescription>
              この申請を却下する理由を入力してください。この内容は申請者に表示されます。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="却下理由を入力してください"
              value={reason}
              onChange={onChange}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              キャンセル
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isProcessing || !reason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "処理中..." : "却下する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  export default RejectReasonDialog;
  