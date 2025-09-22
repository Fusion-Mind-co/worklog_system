import { useState, useEffect } from "react";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword"; 

import MainLayout from "./layouts/MainLayout";

import WorkHistory from "./pages/WorkHistory";
import WorkLog from "./pages/WorkLog";
import Chat from "./pages/Chat";
import { updateLastActivePage, isAuthenticated, getStoredUser } from "./services/authService"; // ✅ getCurrentUserを削除

// 管理者ツールコンポーネントをインポート
import AdminWork from "./pages/admin/AdminWork";
import AdminChat from "./pages/admin/AdminChat";
import AdminUser from "./pages/admin/AdminUser/AdminUser";
import AdminUnitName from "./pages/admin/AdminUnitName";

function App() {
  // 認証状態
  const [isAuth, setIsAuth] = useState(false); // ✅ 名前を変更（isAuthenticatedと区別）
  // 現在のページ
  const [currentPage, setCurrentPage] = useState("dashboard");
  // パスワードリセットモード
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  // ✅ 追加：初期化状態
  const [isInitializing, setIsInitializing] = useState(true);

  // ✅ 追加：アプリ起動時にログイン状態を確認
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        // トークンが存在するかチェック
        if (isAuthenticated()) {
          const user = getStoredUser();
          if (user) {
            console.log("✅ 既存のログイン状態を復元:", user);
            setIsAuth(true);
            // last_active_page が存在すればそのページに遷移
            const lastPage = user.last_active_page || "chat";
            setCurrentPage(lastPage);
            console.log("表示ページ");
            console.log(lastPage);
          }
        }
      } catch (error) {
        console.error("ログイン状態復元エラー:", error);
        // エラーが発生した場合はログアウト状態にする
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuthStatus();
  }, []);

  // URLからリセットトークンを検出
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      setIsResetMode(true);
      setResetToken(token);
      setIsInitializing(false); // リセットモードの場合は初期化完了
    }
  }, []);

  // ログイン成功時の処理
  const handleLoginSuccess = (user) => {
    setIsAuth(true);
    // last_active_page が存在すればそのページに遷移。なければ "chat" を表示
    const lastPage = user.last_active_page || "chat";
    setCurrentPage(lastPage);
  };

  // ページ遷移処理
  const navigateTo = (page) => {
    if (page === "login") {
      setIsAuth(false);
      setIsResetMode(false);
    } else {
      setCurrentPage(page);
      updateLastActivePage(page); // ✅ ここでDBに保存
    }
  };

  // パスワードリセット完了処理
  const handleResetComplete = () => {
    setIsResetMode(false);
    setResetToken(null);
    // URLからトークンパラメータをクリア
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // ✅ 追加：初期化中はローディング画面を表示
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>アプリを初期化中...</p>
        </div>
      </div>
    );
  }

  // パスワードリセットモードの場合
  if (isResetMode) {
    return <ResetPassword token={resetToken} onComplete={handleResetComplete} onCancel={() => setIsResetMode(false)} />;
  }

  // 未認証の場合はログイン画面を表示
  if (!isAuth) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  // 認証済みの場合はメインレイアウトでコンテンツを表示
  return (
    <MainLayout activePage={currentPage} onNavigate={navigateTo}>
      {currentPage === "worklog" && <WorkLog />}
      {currentPage === "history" && <WorkHistory />}
      {currentPage === "chat" && <Chat />}
      {currentPage === "admin-work" && <AdminWork />}
      {currentPage === "admin-chat" && <AdminChat />}
      {currentPage === "admin-user" && <AdminUser />}
      {currentPage === "admin-unit-name" && <AdminUnitName />}
    </MainLayout>
  );
}

export default App;