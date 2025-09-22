import { useState } from "react";
import { z } from "zod"; // 入力バリデーション管理ツール
import { login, register } from "@/services/authService"; // 認証サービスのインポート
import ForgotPasswordModal from "@/components/ForgotPasswordModal"; // パスワード忘れモーダル

// UI コンポーネントのインポート
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Eye, EyeOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { departments, positions } from "@/constants/employees";

const Auth = ({ onLoginSuccess }) => {
  // ログインフォーム状態管理
  const [loginForm, setLoginForm] = useState({
    employeeId: "",
    password: "",
    rememberMe: false,
  });

  // アカウント登録フォーム状態管理
  const [signupForm, setSignupForm] = useState({
    employeeId: "",
    name: "",
    department: "",
    position: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // ローディング状態管理
  const [isSubmitting, setIsSubmitting] = useState(false);

  // エラー管理
  const [errors, setErrors] = useState({});

  // API エラーメッセージ管理
  const [apiError, setApiError] = useState("");

  // アクティブタブ管理
  const [activeTab, setActiveTab] = useState("login");

  // パスワード忘れモーダル表示管理
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // パスワード表示/非表示制御（ログイン：パスワード）
  const [showPassword, setShowPassword] = useState(false);

  // 登録用パスワード表示/非表示制御（新規登録：パスワード）
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // 確認パスワード表示/非表示制御（新規登録：確認用パスワード）
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ログイン入力バリデーション設定
  const loginSchema = z.object({
    // 修正: 社員IDは4桁の数字のみに制限
    employeeId: z
      .string()
      .length(4, "社員IDは4文字")
      .regex(/^\d+$/, "社員IDは数字のみで入力してください"),
    password: z.string().min(4, "パスワードは4文字以上"),
  });

  // アカウント登録入力バリデーション設定
  const signupSchema = z
    .object({
      // 修正: 社員IDは4桁の数字のみに制限
      employeeId: z
        .string()
        .length(4, "社員IDは4文字です")
        .regex(/^\d+$/, "社員IDは数字のみで入力してください"),
      name: z.string().min(1, "名前を入力してください"),
      department: z.string().min(1, "部署を入力してください"),
      position: z.string().min(1, "役職を入力してください"),
      // 追加: メールアドレス（空でもOK、入力時はフォーマット検証）
      email: z
        .string()
        .email("正しいメールアドレス形式で入力してください")
        .optional()
        .or(z.literal("")),
      password: z.string().min(4, "パスワードは4文字以上"),
      confirmPassword: z.string().min(4, "確認用パスワードも4文字以上"),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "パスワードが一致しません",
      path: ["confirmPassword"],
    });

  // フォーム状態更新
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target; // ✅ checked を追加

    // 入力開始時にAPIエラーをクリア
    if (apiError) {
      setApiError("");
    }

    if (activeTab === "login") {
      setLoginForm({
        ...loginForm,
        [name]: type === "checkbox" ? checked : value, // ✅ チェックボックス対応
      });
    } else {
      setSignupForm({ ...signupForm, [name]: value });
    }
  };

  // ログイン処理関数
  const handleLogin = async () => {
    const result = loginSchema.safeParse(loginForm);
    if (result.success) {
      setIsSubmitting(true);
      setErrors({});
      setApiError(""); // APIエラーをクリア

      try {
        // 実際のAPIを呼び出す
        const data = await login(loginForm);
        console.log("✅ ログインOK", data);

        // ログイン成功時にコールバックを呼び出し
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
      } catch (error) {
        console.error("ログイン処理中にエラーが発生しました", error);

        // エラーメッセージを設定
        if (error === "Invalid credentials") {
          setApiError("社員IDまたはパスワードが正しくありません");
        } else {
          setApiError(
            error || "ログインに失敗しました。もう一度お試しください。"
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setErrors(result.error.format());
    }
  };

  // アカウント登録処理関数
  const handleSignup = async () => {
    const result = signupSchema.safeParse(signupForm);
    if (result.success) {
      setIsSubmitting(true);
      setErrors({});
      setApiError(""); // APIエラーをクリア

      try {
        // 実際のAPIを呼び出す
        await register(signupForm);
        console.log("✅ アカウント登録OK");

        // 登録成功後ログインタブに切り替え
        setActiveTab("login");
        // フォームをリセット
        setSignupForm({
          employeeId: "",
          name: "",
          department: "",
          position: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
        // 成功メッセージを表示
        alert("アカウントが作成されました。ログインしてください。");
      } catch (error) {
        console.error("アカウント登録処理中にエラーが発生しました", error);

        // エラーメッセージを設定
        if (error === "Employee ID already exists") {
          setApiError("この社員IDはすでに使用されています");
        } else {
          setApiError(
            error ||
              "アカウント登録に失敗しました。入力内容を確認してください。"
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setErrors(result.error.format());
    }
  };

  // Enterキーでログインまたは登録を実行
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (activeTab === "login") {
        handleLogin();
      } else {
        handleSignup();
      }
    }
  };

  // パスワードリセットモーダルを開く
  const openPasswordResetModal = () => {
    setIsPasswordModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* パスワード忘れモーダル */}
      <ForgotPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      {/* 左側: 認証フォーム */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8 bg-white">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center font-bold text-primary">
              社内業務ツール
            </CardTitle>
            <CardDescription className="text-center">
              {activeTab === "login"
                ? "ログインして業務を開始してください"
                : "新しいアカウントを作成します"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="login"
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value);
                setApiError(""); // タブ切り替え時にAPIエラーをクリア
              }}
            >
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="login">ログイン</TabsTrigger>
                <TabsTrigger value="register">新規登録</TabsTrigger>
              </TabsList>

              {/* APIエラーメッセージ表示エリア */}
              {apiError && (
                <div
                  className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4"
                  role="alert"
                >
                  <p>{apiError}</p>
                </div>
              )}
              <TabsContent value="login">
                <div className="space-y-4">
                  {/* 社員ID入力欄（変更なし） */}
                  <div>
                    <label className="text-sm font-medium">社員ID</label>
                    <Input
                      type="text"
                      name="employeeId"
                      value={loginForm.employeeId}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      placeholder="例: 0123"
                      className="mt-1"
                    />
                    {errors.employeeId && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.employeeId._errors[0]}
                      </p>
                    )}
                  </div>

                  {/* パスワード入力欄（変更なし） */}
                  <div>
                    <label className="text-sm font-medium">パスワード</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={loginForm.password}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="パスワード"
                        className="mt-1 pr-10"
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
                      <p className="text-sm text-red-500 mt-1">
                        {errors.password._errors[0]}
                      </p>
                    )}
                  </div>

                  {/* ✅ 修正：ログイン状態保存チェックボックス */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="remember"
                        name="rememberMe" // ✅ name属性追加
                        checked={loginForm.rememberMe} // ✅ 状態と連動
                        onChange={handleChange} // ✅ ハンドラー追加
                        className="w-4 h-4 rounded-sm text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="remember" className="text-sm font-normal">
                        30日間ログイン状態を保存
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={openPasswordResetModal}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      パスワードをお忘れですか？
                    </button>
                  </div>

                  {/* ログインボタン（変更なし） */}
                  <Button
                    onClick={handleLogin}
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        処理中...
                      </>
                    ) : (
                      "ログイン"
                    )}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="register">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">社員ID</label>
                      <Input
                        type="text"
                        name="employeeId"
                        value={signupForm.employeeId}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="例: 0123"
                        className="mt-1"
                      />
                      {errors.employeeId && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.employeeId._errors[0]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">氏名</label>
                      <Input
                        type="text"
                        name="name"
                        value={signupForm.name}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="例: 田中 雄介"
                        className="mt-1"
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.name._errors[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">部署</label>
                    <Select
                      onValueChange={(value) =>
                        setSignupForm({ ...signupForm, department: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="部署を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department} value={department}>
                            {department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.department && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.department._errors[0]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">役職</label>
                    <Select
                      onValueChange={(value) =>
                        setSignupForm({ ...signupForm, position: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="役職を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.position && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.position._errors[0]}
                      </p>
                    )}
                  </div>

                  {/* 追加: メールアドレス入力欄 */}
                  <div>
                    <label className="text-sm font-medium">
                      メールアドレス（任意）
                    </label>
                    <Input
                      type="email"
                      name="email"
                      value={signupForm.email}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      placeholder="例: tanaka@example.com"
                      className="mt-1"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.email._errors[0]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">パスワード</label>
                    <div className="relative">
                      <Input
                        type={showSignupPassword ? "text" : "password"}
                        name="password"
                        value={signupForm.password}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="パスワード"
                        className="mt-1 pr-10"
                      />
                      <div
                        className="absolute inset-y-0 right-2 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500"
                        onClick={() =>
                          setShowSignupPassword(!showSignupPassword)
                        }
                      >
                        {showSignupPassword ? (
                          <Eye className="w-5 h-5" />
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.password._errors[0]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      パスワード（確認）
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={signupForm.confirmPassword}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="パスワード（確認）"
                        className="mt-1 pr-10"
                      />
                      <div
                        className="absolute inset-y-0 right-2 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
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
                        {errors.confirmPassword._errors[0]}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleSignup}
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        処理中...
                      </>
                    ) : (
                      "アカウント作成"
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            {activeTab === "login"
              ? "アカウントをお持ちでない場合は新規登録してください"
              : "すでにアカウントをお持ちの場合はログインしてください"}
          </CardFooter>
        </Card>
      </div>

      {/* 右側: 機能紹介 */}
      <div className="w-full md:w-1/2 bg-blue-600 text-white p-8 flex items-center justify-center">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold mb-6">社内業務ツール</h1>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="bg-white/10 p-2 rounded-full">
                <span className="text-xl">🕒</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">工数入力</h3>
                <p className="text-white/80">
                  作業時間・内容の記録と履歴確認が可能です
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-white/10 p-2 rounded-full">
                <span className="text-xl">💬</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">社内チャット</h3>
                <p className="text-white/80">
                  同僚とのコミュニケーションがスムーズに行えます
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
