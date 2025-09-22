// src/services/chatService.js 

import api from "./apiService";

/**
 * チャット相手一覧と最新メッセージを取得する
 */
export const getChatThreads = async () => {
  try {
    const response = await api.get("/chat/threads");
    return response.data;
  } catch (error) {
    console.error("チャット相手一覧の取得に失敗しました:", error);
    throw error;
  }
};

/**
 * 特定のユーザーとのチャット履歴を取得する
 * @param {number} userId - チャット相手のユーザーID
 */
export const getChatMessages = async (userId) => {
  try {
    const response = await api.get(`/chat/messages/${userId}`);
    return response.data;
  } catch (error) {
    console.error(
      `ユーザーID ${userId} とのチャット履歴取得に失敗しました:`,
      error
    );
    throw error;
  }
};

/**
 * 新しいメッセージを送信する
 * @param {number} receiverId - 受信者ID
 * @param {string} message - メッセージ本文
 */
export const sendMessage = async (receiverId, message) => {
  try {
    const response = await api.post("/chat/messages", {
      receiver_id: receiverId,
      message: message,
    });
    return response.data; // ✅ { messages: [...], threads: [...] } を返す
  } catch (error) {
    console.error("メッセージ送信に失敗しました:", error);
    throw error;
  }
};

/**
 * メッセージを編集する
 * @param {number} messageId - 編集するメッセージID
 * @param {string} newMessage - 新しいメッセージ本文
 */
export const updateMessage = async (messageId, newMessage) => {
  try {
    const response = await api.put(`/chat/messages/${messageId}`, {
      message: newMessage,
    });
    return response.data;
  } catch (error) {
    console.error(`メッセージID ${messageId} の編集に失敗しました:`, error);

    if (error.response) {
      console.error("エラーレスポンス:", error.response.data);
    }

    throw error;
  }
};

/**
 * メッセージを削除する
 * @param {number} messageId - 削除するメッセージID
 */
export const deleteMessage = async (messageId) => {
  try {
    const response = await api.delete(`/chat/messages/${messageId}`);
    return response.data;
  } catch (error) {
    console.error(`メッセージID ${messageId} の削除に失敗しました:`, error);
    throw error;
  }
};


// ====================【c s v】======================
// チャット履歴をCSVとしてエクスポートする関数
export const handleExportChat = (history, currentUser, users) => {
  const BOM = "\uFEFF";

  const findUserName = (id) => {
    if (id === currentUser.id) return currentUser.name;
    const user = users.find((u) => u.id === id);
    return user ? user.name : `ID:${id}`;
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
  };

  const rows = history.map((entry) => ({
    日時: formatDate(entry.created_at),
    送信者: findUserName(entry.sender_id),
    受信者: findUserName(entry.receiver_id),
    内容: entry.message.replace(/\n/g, " "),
  }));

  const header = Object.keys(rows[0]).join(",");
  const body = rows.map((r) => Object.values(r).join(",")).join("\n");
  const csvContent = header + "\n" + body;

  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(
    2,
    "0"
  )}${String(now.getMinutes()).padStart(2, "0")}`;

  const senderName = currentUser.name;
  const receiver = users.find(
    (u) =>
      u.id === history[0]?.receiver_id ||
      (u.id === history[0]?.sender_id && u.id !== currentUser.id)
  );
  const receiverName = receiver ? receiver.name : "相手不明";

  const filename = `${senderName}_${receiverName}_${timestamp}.csv`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};