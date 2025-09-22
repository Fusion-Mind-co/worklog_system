// src/services/socketService.js
// 全アプリケーションで共有するSocket接続管理

import io from "socket.io-client";

// Socket接続の状態管理
let socket = null;

const SOCKET_URL = "http://localhost:5000";

/**
 * Socket接続を初期化（アプリ全体で1回のみ）
 * @param {string} token - 認証トークン
 * @returns {Socket} socket接続
 */
export const initializeSocket = (token) => {
  // 既存の接続があれば切断
  if (socket) {
    console.log("既存のSocket接続を切断します");
    socket.disconnect();
    socket = null;
  }

  // 新しいSocket接続を作成
  socket = io(SOCKET_URL, {
    extraHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  // 接続イベントの設定
  socket.on("connect", () => {
    console.log("✅ Socket接続成功");
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket接続エラー:", error);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Socket接続が切断されました");
  });

  return socket;
};

/**
 * 現在のSocket接続を取得
 * @returns {Socket|null} socket接続またはnull
 */
export const getSocket = () => {
  return socket;
};

/**
 * Socket接続を切断
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("🔌 Socket接続を切断しました");
  }
};