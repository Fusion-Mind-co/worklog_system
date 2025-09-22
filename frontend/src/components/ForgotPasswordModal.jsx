import { useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/services/authService";

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const emailSchema = z.object({
    employeeId: z.string().length(4, "社員IDは4文字").regex(/^\d+$/, "社員IDは数字のみで入力してください"),
    email: z.string().email("有効なメールアドレスを入力してください"),
  });

  const resetForm = () => {
    setEmployeeId("");
    setEmail("");
    setMessage({ type: "", text: "" });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleEmailReset = async () => {
    try {
      const result = emailSchema.safeParse({ employeeId, email });
      if (!result.success) {
        const errorMsg = Object.values(result.error.format()).find(
          (item) => item._errors && item._errors.length > 0
        )._errors[0];
        setMessage({ type: "error", text: errorMsg });
        return;
      }

      setIsSubmitting(true);
      setMessage({ type: "", text: "" });

      await requestPasswordReset(employeeId, email);
      setMessage({
        type: "success",
        text: "パスワード再設定用のメールを送信しました。メールを確認してください。",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      setMessage({
        type: "error",
        text: typeof error === "string" 
          ? error 
          : "パスワード再設定メールの送信に失敗しました。入力内容を確認してください。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>パスワードをお忘れですか？</DialogTitle>
          <DialogDescription>
            パスワードを再設定するためメールを送信します
          </DialogDescription>
        </DialogHeader>

        {message.text && (
          <div
            className={`mt-4 p-3 rounded ${
              message.type === "error"
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">社員ID</label>
            <Input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="例: 0123"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">登録済みのメールアドレス</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="例: tanaka@example.com"
              className="mt-1"
            />
          </div>
          <p className="text-sm text-gray-500">
            ※登録したメールアドレスにパスワード再設定用のリンクを送信します
          </p>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleEmailReset} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                送信中...
              </>
            ) : (
              "送信"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal;
