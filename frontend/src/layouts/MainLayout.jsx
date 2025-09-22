// MainLayout.jsx - 未読数管理修正版
import { useState, useEffect, useRef } from "react";
import { getStoredUser, logout } from "@/services/authService";

// ✅ 統一されたSocketサービスを使用
import {
  initializeSocket,
  disconnectSocket,
  getSocket,
} from "@/services/socketService";

import { getChatThreads } from "@/services/chatService";

import {
  getPendingCount,
  getDefaultUnit,
  updateSoundSetting,
} from "@/services/mainService";
import { getWorkLogHistory } from "@/services/workHistoryService";
import { playReceiveSound } from "@/lib/soundManager";
import api from "@/services/apiService";

const MainLayout = ({ children, activePage, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [isSoundOnState, setIsSoundOnState] = useState(true);

  // カウンター系の状態
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [pendingWorkCount, setPendingWorkCount] = useState(0);
  const [rejectWorkCount, setRejectWorkCount] = useState(0);
  const [defaultUnit, setDefaultUnit] = useState(null);

  const hasInitializedUnread = useRef(false);
  const prevUnreadCountRef = useRef(0);

  // ユーザー情報の取得とSocket初期化
  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);

      // サウンド設定を取得
      const soundSetting = storedUser.sound_enabled ?? true;
      localStorage.setItem("sound_enabled", JSON.stringify(soundSetting));
      setIsSoundOnState(soundSetting);

      // ✅ Socket接続を初期化（アプリ全体で1回のみ）
      const token = localStorage.getItem("token");
      if (token) {
        initializeSocket(token);
      }
    } else {
      onNavigate("login");
    }
  }, [onNavigate]);

  // Socket接続後のイベント登録
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    if (!socket) return;

    console.log("📡 Socketイベントを登録中...");

    // ✅ 修正：チャットメッセージ全履歴受信処理
    // MainLayout.jsx - デバッグ版

    socket.on("chat_messages_updated", async (data) => {
      console.log("MainLayoutでチャット履歴更新受信:", data);

      const isChatPageOpen = activePage === "chat";
      const currentChatUser = window.currentChatUser;
      const isChattingWithSender =
        currentChatUser &&
        parseInt(currentChatUser) === parseInt(data.chat_partner_id);

      // ✅ 詳細デバッグログ
      console.log("=== Socket受信デバッグ ===");
      console.log("activePage:", activePage);
      console.log("isChatPageOpen:", isChatPageOpen);
      console.log("currentChatUser:", currentChatUser);
      console.log("data.chat_partner_id:", data.chat_partner_id);
      console.log("isChattingWithSender:", isChattingWithSender);
      console.log(
        "window.handleChatMessagesUpdate:",
        !!window.handleChatMessagesUpdate
      );
      console.log("========================");

      playReceiveSound(); // 通知音を鳴らす

      // ✅ Chat画面でその相手とチャット中なら、Chat.jsxに処理を委譲
      if (isChatPageOpen && isChattingWithSender) {
        console.log("✅ 条件一致：Chat.jsxに履歴更新処理委譲");
        if (window.handleChatMessagesUpdate) {
          console.log("✅ handleChatMessagesUpdate実行開始");
          await window.handleChatMessagesUpdate(data);
          console.log("✅ handleChatMessagesUpdate実行完了");
        } else {
          console.error("❌ window.handleChatMessagesUpdateが存在しません");
        }
      } else {
        console.log("❌ 条件不一致：スレッド一覧のみ更新");
        console.log(`  - isChatPageOpen: ${isChatPageOpen}`);
        console.log(`  - isChattingWithSender: ${isChattingWithSender}`);

        // スレッド一覧のみ更新
        if (isChatPageOpen && window.updateChatThreads) {
          console.log("✅ スレッド一覧更新実行");
          window.updateChatThreads(data.threads);
        }
      }

      // 未読数を取得
      await fetchUnreadCount();
    });

    // 工数申請関連
    socket.on("worklog_request_added_with_data", (data) => {
      console.log("工数申請通知");
      if (!defaultUnit || data.unit_name === defaultUnit) {
        playReceiveSound();
        if (data.pending_count !== undefined) {
          setPendingWorkCount(data.pending_count.total);
        }
      }
    });

    // 却下通知関連
    socket.on("worklog_rejected_with_data", (data) => {
      console.log("却下通知受信:", data);
      if (data.reject_count !== undefined) {
        setRejectWorkCount(data.reject_count.total);
      }
      playReceiveSound();
    });

    socket.on("reject_socket", () => {
      console.log("却下通知受信");
      rejectCount();
      playReceiveSound();
    });

    return () => {
      socket.off("chat_messages_updated"); // ✅ 変更：イベント名更新
      socket.off("worklog_request_added_with_data");
      socket.off("reject_socket");
    };
  }, [user, defaultUnit, activePage]);

  // 初回データ取得（別のuseEffect）
  useEffect(() => {
    if (!user) return;

    // 初回データ取得
    fetchUnreadCount();
    rejectCount();

    if (user.roleLevel >= 2) {
      fetchDefaultUnitAndCount();
    }
  }, [user]);

  // デフォルトユニット取得と未処理カウント取得
  const fetchDefaultUnitAndCount = async () => {
    try {
      const unitName = await getDefaultUnit();
      setDefaultUnit(unitName);

      if (unitName !== null) {
        await fetchPendingCount(unitName);
      }
    } catch (error) {
      console.error("デフォルトユニット取得エラー:", error);
    }
  };

  // 未処理申請数を取得
  const fetchPendingCount = async (unitName = null) => {
    if (user && user.roleLevel >= 2) {
      try {
        const data = await getPendingCount(
          unitName === "all" ? null : unitName
        );
        setPendingWorkCount(data.total);
        return data;
      } catch (error) {
        console.error("未処理申請数取得エラー:", error);
        return null;
      }
    }

    return null;
  };

  // ✅ チャット未読数を取得（確実にAPIから最新情報を取得）
  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/chat/unread-count");
      const count = res.data.unread_count ?? 0;
      console.log("未読数取得:", count);
      setUnreadMessageCount(count);
    } catch (error) {
      console.error("未読件数の取得に失敗", error);
    }
  };

  // 却下件数を取得
  const rejectCount = async () => {
    try {
      const workLogData = await getWorkLogHistory();
      const rejectedStatuses = [
        "rejected_add",
        "rejected_delete",
        "rejected_edit",
      ];
      const rejectedCount = workLogData.workRows.filter((row) =>
        rejectedStatuses.includes(row.status)
      ).length;
      setRejectWorkCount(rejectedCount);
    } catch (error) {
      console.error("rejectCount関数エラー:", error);
    }
  };

  // グローバル関数の定義
  useEffect(() => {
    console.log("グローバル関数定義:", {
      updateUnreadCount: !!window.updateUnreadCount,
    });
    window.defaultUnitName = defaultUnit;
    window.updatePendingCount = setPendingWorkCount;
    window.fetchPendingCount = fetchPendingCount;
    window.updateDefaultUnit = setDefaultUnit;
    window.rejectCount = rejectCount;
    window.updateUnreadCount = setUnreadMessageCount;
    // ✅ 追加：未読数再取得用の関数
    window.refreshUnreadCount = fetchUnreadCount;

    return () => {
      delete window.defaultUnitName;
      delete window.updatePendingCount;
      delete window.fetchPendingCount;
      delete window.updateDefaultUnit;
      delete window.rejectCount;
      delete window.updateUnreadCount;
      delete window.refreshUnreadCount;
    };
  }, [defaultUnit]);

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("workLogRows");

      // ✅ Socket切断
      disconnectSocket();

      if (onNavigate) {
        onNavigate("login");
      }
    } catch (error) {
      console.error("Logout error:", error);
      if (onNavigate) {
        onNavigate("login");
      }
    }
  };

  // サウンドON/OFF切り替え
  const toggleSound = async () => {
    const newValue = !isSoundOnState;
    setIsSoundOnState(newValue);
    localStorage.setItem("sound_enabled", JSON.stringify(newValue));

    try {
      await updateSoundSetting(newValue);
      const updatedUser = { ...getStoredUser(), sound_enabled: newValue };
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      console.error("サウンド設定の保存に失敗しました", error);
    }
  };

  // ユーザー情報がロードされるまでローディング表示
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // メニュー項目（省略 - 元のコードと同じ）
  const menuItems = [
    { id: "worklog", name: "工数入力", icon: "🕒" },
    { id: "history", name: "工数履歴一覧", icon: "📋" },
    { id: "chat", name: "社内チャット", icon: "💬" },
  ];

  const adminItems = [
    { id: "admin-work", name: "工数管理", icon: "⚙️", minRoleLevel: 2 },
    { id: "admin-chat", name: "チャット管理", icon: "⚙️", minRoleLevel: 3 },
    {
      id: "admin-user",
      name: "従業員アカウント管理",
      icon: "⚙️",
      minRoleLevel: 3,
    },
    {
      id: "admin-unit-name",
      name: "ユニット名管理",
      icon: "⚙️",
      minRoleLevel: 3,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* サイドバー */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-20"
        } bg-blue-600 text-white transition-all duration-300 ease-in-out flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between border-b border-blue-500">
          <h2 className={`text-lg font-bold ${!isSidebarOpen && "hidden"}`}>
            業務ツール
          </h2>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded-full hover:bg-blue-500"
          >
            {isSidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="mt-6 flex-1">
          {/* メニュー項目の表示（省略 - 元のコードと同じ） */}
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center px-4 py-3 hover:bg-blue-500 ${
                activePage === item.id ? "bg-blue-500" : ""
              } relative`}
            >
              <span className="text-xl">{item.icon}</span>
              {isSidebarOpen && (
                <div className="ml-4 flex items-center justify-between w-full">
                  <span>{item.name}</span>
                  {/* 未読バッジ表示 */}
                  {item.id === "chat" && unreadMessageCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-2">
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    </span>
                  )}
                  {item.id === "history" && rejectWorkCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-2">
                      {rejectWorkCount > 99 ? "99+" : rejectWorkCount}
                    </span>
                  )}
                </div>
              )}
              {/* 省略時のバッジ表示 */}
              {!isSidebarOpen &&
                item.id === "chat" &&
                unreadMessageCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                  </span>
                )}
              {!isSidebarOpen &&
                item.id === "history" &&
                rejectWorkCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {rejectWorkCount > 9 ? "9+" : rejectWorkCount}
                  </span>
                )}
            </button>
          ))}

          {/* 管理者メニュー */}
          {adminItems
            .filter((item) => user.roleLevel >= item.minRoleLevel)
            .map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center px-4 py-3 hover:bg-blue-500 ${
                  activePage === item.id ? "bg-blue-500" : ""
                } relative`}
              >
                <span className="text-xl">{item.icon}</span>
                {isSidebarOpen && (
                  <div className="ml-4 flex items-center justify-between w-full">
                    <span>{item.name}</span>
                    {item.id === "admin-work" &&
                      defaultUnit !== null &&
                      pendingWorkCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-2">
                          {pendingWorkCount > 99 ? "99+" : pendingWorkCount}
                        </span>
                      )}
                  </div>
                )}
                {!isSidebarOpen &&
                  item.id === "admin-work" &&
                  defaultUnit !== null &&
                  pendingWorkCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {pendingWorkCount > 9 ? "9+" : pendingWorkCount}
                    </span>
                  )}
              </button>
            ))}
        </nav>

        {/* ユーザー情報 */}
        <div
          className={`p-4 border-t border-blue-500 ${
            !isSidebarOpen && "hidden"
          }`}
        >
          <div className="text-sm">
            <div className="font-semibold">{user.employee_id}</div>
            <div className="font-semibold">{user.name}</div>
            <div className="font-semibold">{user.email}</div>
            <div className="text-blue-200">
              {user.department_name} - {user.position}
            </div>
          </div>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">
              {[...menuItems, ...adminItems].find(
                (item) => item.id === activePage
              )?.name || "ホーム"}
            </h2>
            {activePage === "admin-work" && defaultUnit && (
              <p className="text-sm text-gray-500">
                デフォルトユニット: {defaultUnit}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* サウンドON/OFFボタン */}
            <button
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              onClick={toggleSound}
              title={`サウンド${isSoundOnState ? "ON" : "OFF"}`}
            >
              {/* アイコンは省略 */}
              {isSoundOnState ? "🔊" : "🔇"}
            </button>

            {/* ログアウトボタン */}
            <button
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              onClick={handleLogout}
            >
              ログアウト
            </button>
          </div>
        </header>

        {/* コンテンツエリア */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
