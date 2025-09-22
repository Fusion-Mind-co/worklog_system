import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "@/services/authService";

// UI コンポーネントのインポート
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ResetPassword = ({ onComplete, onCancel }) => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  // フォーム状態
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [countdown, setCountdown] = useState(5);

  // トークンはpropsから取得
  const tokenFromProps = token;

  // トークンがない場合はログインページにリダイレクト
  useEffect(() => {
    if (!tokenFromProps) {
      onCancel(); // 親コンポーネントでログイン画面に戻す
    }
  }, [tokenFromProps, onCancel]);

  // カウントダウンタイマー
  useEffect(() => {
    if (message.type === "success" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (message.type === "success" && countdown === 0) {
      navigate("/");
    }
  }, [message.type, countdown, navigate]);

  // パスワードリセット処理
  const handleResetPassword = async () => {
    // 入力検証
    if (!password || password.length < 4) {
      setMessage({
        type: "error",
        text: "パスワードは4文字以上で入力してください",
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({
        type: "error",
        text: "パスワードが一致しません",
      });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      await resetPassword(tokenFromProps, password);
      setMessage({
        type: "success",
        text: `パスワードが正常に変更されました。${countdown}秒後にログインページにリダイレクトします。`,
      });
      // カウントダウン完了後のコールバックを追加
      setTimeout(() => {
        onComplete(); // 親コンポーネントでログイン画面に戻す
      }, 5000);
    } catch (error) {
      console.error("パスワードリセットエラー:", error);
      setMessage({
        type: "error",
        text:
          typeof error === "string"
            ? error
            : "パスワードのリセットに失敗しました。ページを再読み込みするか、管理者に連絡してください。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-bold text-primary">
            社内業務ツール
          </CardTitle>
          <CardDescription className="text-center">
            新しいパスワードを設定してください
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {message.text && (
            <div
              className={`p-3 rounded ${
                message.type === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">新しいパスワード</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="4文字以上のパスワード"
              className="mt-1"
              disabled={isSubmitting || message.type === "success"}
            />
          </div>

          <div>
            <label className="text-sm font-medium">パスワード（確認）</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力してください"
              className="mt-1"
              disabled={isSubmitting || message.type === "success"}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            onClick={handleResetPassword}
            className="w-full"
            disabled={isSubmitting || message.type === "success"}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                処理中...
              </>
            ) : (
              "パスワードを変更する"
            )}
          </Button>

          <div className="text-center">
            <button
              onClick={onCancel}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ログインページに戻る
            </button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPassword;
