// src/pages/Chat.jsx - 未読数管理修正版

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Edit2, Trash2, X, Check } from "lucide-react";

import {
  getChatThreads,
  getChatMessages,
  sendMessage,
  updateMessage,
  deleteMessage,
  handleExportChat,
} from "@/services/chatService";
import { getStoredUser } from "@/services/authService";
import api from "@/services/apiService";

const Chat = () => {
  // ユーザー情報
  const [currentUser, setCurrentUser] = useState(null);

  // チャット相手リスト
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // チャット履歴
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // 選択中のユーザー
  const [selectedUser, setSelectedUser] = useState(null);

  // 新しいメッセージ
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  // 編集中のメッセージ
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState("");

  // チャットエリアへの参照
  const chatContainerRef = useRef(null);
  const editInputRef = useRef(null);
  const inputRef = useRef(null);
  const editTextareaRef = useRef(null);

  // 処理済みメッセージのIDを追跡するためのref
  const processedMessageIds = useRef(new Set());

  // 高さを自動調整する関数
  const autoResize = (textarea, maxRows = 6) => {
    if (!textarea) return;
    textarea.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * maxRows;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  };

  // チャット相手一覧を取得
  const fetchChatThreads = async () => {
    setLoadingUsers(true);
    try {
      const threads = await getChatThreads();
      setUsers(threads || []);
    } catch (error) {
      console.error("チャット相手一覧の取得に失敗しました", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // 特定ユーザーとのチャット履歴を取得
  const fetchChatMessages = async (userId) => {
    if (!userId) return;

    setLoadingMessages(true);
    try {
      const messages = await getChatMessages(userId);
      setChatHistory(messages || []);

      // ✅ スレッド一覧の未読数をクリア
      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (user.id === userId) {
            return { ...user, unread: 0 };
          }
          return user;
        })
      );

      // ✅ MainLayoutの未読数を更新
      if (window.refreshUnreadCount) {
        await window.refreshUnreadCount();
      }

      // ✅ メッセージ取得後にスクロール（setTimeoutで確実に実行）
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error(
        `ユーザーID ${userId} とのチャット履歴取得に失敗しました`,
        error
      );
    } finally {
      setLoadingMessages(false);
    }
  };

  // ✅ MainLayoutから呼び出される関数：Chat画面でメッセージ受信時の処理
  const handleNewMessageInChat = async (data) => {
    console.log("Chat画面でメッセージ受信処理:", data);

    // チャット履歴にメッセージを追加
    setChatHistory((prev) => [...prev, data.message]);

    // スレッド情報を更新
    if (data.threads) {
      setUsers(data.threads);
    }

    // 現在選択中のユーザーからのメッセージなら既読処理
    if (selectedUser === data.message.sender_id) {
      try {
        await api.patch(`/chat/messages/${data.message.id}/read`);
        console.log("メッセージを既読にしました:", data.message.id);

        // ✅ 既読処理後にスレッド情報も更新
        setUsers((prevUsers) =>
          prevUsers.map((user) => {
            if (user.id === data.message.sender_id) {
              return { ...user, unread: Math.max(0, user.unread - 1) }; // 未読数を1減らす
            }
            return user;
          })
        );
      } catch (error) {
        console.error("既読処理に失敗:", error);
      }
    }

    // ✅ 状態更新後にスクロール処理（setTimeoutで確実に実行）
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  };

  // ✅ グローバル関数として登録
  useEffect(() => {
    window.handleNewMessageInChat = handleNewMessageInChat;
    return () => {
      delete window.handleNewMessageInChat;
    };
  }, [selectedUser]); // selectedUserが変わったら関数も更新

  // ✅ 現在チャット中のユーザーをグローバルに設定
  useEffect(() => {
    window.currentChatUser = selectedUser;
    console.log("現在チャット中のユーザー:", selectedUser);
    return () => {
      window.currentChatUser = null;
    };
  }, [selectedUser]);

  // コンポーネントマウント時の処理
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
      fetchChatThreads();
    }
  }, []);

  // ユーザーを選択したときの処理
  const selectUser = (userId) => {
    setSelectedUser(userId);
    fetchChatMessages(userId);
    cancelEdit();
  };

  // Chat.jsx - メッセージ受信処理修正版（抜粋）

  const handleChatMessagesUpdate = async (data) => {
    console.log("Chat画面でメッセージ履歴更新処理:", data);

    // ✅ デバッグログ追加
    console.log("=== 既読処理デバッグ ===");
    console.log("selectedUser:", selectedUser);
    console.log("data.chat_partner_id:", data.chat_partner_id);
    console.log("parseInt(selectedUser):", parseInt(selectedUser));
    console.log(
      "parseInt(data.chat_partner_id):",
      parseInt(data.chat_partner_id)
    );
    console.log(
      "条件一致:",
      parseInt(selectedUser) === parseInt(data.chat_partner_id)
    );

    // ✅ 受信したメッセージ履歴で置き換え（追加ではなく）
    setChatHistory(data.messages);

    // スレッド情報を更新
    if (data.threads) {
      setUsers(data.threads);
    }

    // ✅ 修正：現在選択中のユーザーからの未読メッセージを既読処理
    if (
      selectedUser &&
      parseInt(selectedUser) === parseInt(data.chat_partner_id)
    ) {
      console.log("✅ 既読処理条件一致");

      try {
        // 未読メッセージを既読にする
        const unreadMessages = data.messages.filter(
          (msg) =>
            parseInt(msg.sender_id) === parseInt(data.chat_partner_id) &&
            !msg.is_read
        );

        console.log("data.messages総数:", data.messages.length);
        console.log("既読処理対象メッセージ:", unreadMessages.length, "件");

        for (const msg of unreadMessages) {
          console.log(`既読処理実行中: メッセージID=${msg.id}`);
          await api.patch(`/chat/messages/${msg.id}/read`);
          console.log("メッセージを既読にしました:", msg.id);
        }

        // ✅ 既読処理後にスレッド情報も更新
        setUsers((prevUsers) =>
          prevUsers.map((user) => {
            if (parseInt(user.id) === parseInt(data.chat_partner_id)) {
              console.log(
                `スレッド未読数更新: ${user.name} の未読数を ${user.unread} → 0`
              );
              return { ...user, unread: 0 };
            }
            return user;
          })
        );

        // ✅ MainLayoutの未読数も更新
        if (window.refreshUnreadCount) {
          console.log("MainLayoutの未読数更新実行");
          await window.refreshUnreadCount();
        }
      } catch (error) {
        console.error("既読処理に失敗:", error);
      }
    } else {
      console.log("❌ 既読処理条件不一致");
    }

    console.log("======================");

    // ✅ 状態更新後にスクロール処理
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  };

  // ✅ MainLayoutから呼び出される関数：スレッド一覧のみ更新
  const updateChatThreads = (threads) => {
    console.log("スレッド一覧のみ更新:", threads);
    if (threads) {
      setUsers(threads);
    }
  };

  // ✅ グローバル関数として登録（関数名変更）
  useEffect(() => {
    window.handleChatMessagesUpdate = handleChatMessagesUpdate;
    window.updateChatThreads = updateChatThreads; // ✅ 追加
    return () => {
      delete window.handleChatMessagesUpdate;
      delete window.updateChatThreads; // ✅ 追加
    };
  }, [selectedUser]);

  // メッセージを送信（修正版）
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || sending) return;

    setSending(true);
    try {
      const response = await sendMessage(selectedUser, newMessage);

      // ✅ HTTP応答で全履歴を受信
      if (response.threads) {
        setUsers(response.threads);
      }

      // ✅ 送信した全メッセージ履歴でチャット履歴を更新
      if (response.messages) {
        setChatHistory(response.messages);
      }

      setNewMessage("");
      scrollToBottom();

      // 送信後にMainLayoutの未読数を更新
      if (window.refreshUnreadCount) {
        await window.refreshUnreadCount();
      }
    } catch (error) {
      console.error("メッセージ送信に失敗しました", error);
    } finally {
      setSending(false);
    }
  };

  // メッセージ編集モードを開始
  const startEdit = (message) => {
    setEditingMessageId(message.id);
    setEditingMessageText(message.message);

    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
      }
    }, 0);
  };

  // メッセージ編集をキャンセル
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingMessageText("");
  };

  // メッセージ編集を保存
  const saveEdit = async (messageId) => {
    if (!editingMessageText.trim()) {
      return;
    }

    try {
      const updatedMessage = await updateMessage(messageId, editingMessageText);

      cancelEdit();
    } catch (error) {
      console.error("メッセージ編集に失敗しました", error);
    }
  };

  // メッセージを削除
  const handleDeleteMessage = async (messageId) => {
    if (!confirm("このメッセージを削除しますか？")) {
      return;
    }

    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error("メッセージ削除に失敗しました", error);
    }
  };

  // チャット履歴が更新されたらスクロールダウン
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // 編集欄の高さを自動調整
  useEffect(() => {
    if (editTextareaRef.current) {
      autoResize(editTextareaRef.current);
    }
  }, [editingMessageId]);

  // チャット画面を最下部にスクロール
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  };

  // メッセージの日時をフォーマット
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "";

    const date = new Date(dateTimeStr);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 現在選択中のユーザー情報
  const selectedUserInfo = selectedUser
    ? users.find((u) => u.id === selectedUser)
    : null;

  return (
    <div className="h-full flex">
      {/* 左側：ユーザーリスト */}
      <div className="w-1/4 border-r overflow-y-auto">
        <div className="p-4 border-b">
          <Input
            placeholder="名前で検索..."
            className="w-full"
            onChange={(e) => {
              // TODO: チャット相手検索機能の実装
            }}
          />
        </div>

        {loadingUsers ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">読み込み中...</span>
          </div>
        ) : users.length > 0 ? (
          <div>
            {users.map((user) => (
              <div
                key={user.id}
                className={`p-3 border-b hover:bg-gray-100 cursor-pointer ${
                  selectedUser === user.id ? "bg-blue-50" : ""
                }`}
                onClick={() => selectUser(user.id)}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{user.name}</span>
                  {user.unread > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {user.unread}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {user.department_name} - {user.position}
                </div>
                <div className="text-sm truncate mt-1">
                  {user.lastMessage || "メッセージはありません"}
                </div>
                {user.lastMessageTime && (
                  <div className="text-xs text-gray-400 mt-1">
                    {formatDateTime(user.lastMessageTime)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            チャット相手が設定されていません。
            <br />
            管理者に連絡してください。
          </div>
        )}
      </div>

      {/* ======================================================================= */}

      {/* 右側：チャット画面 */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* ヘッダー */}
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-medium">{selectedUserInfo?.name}</h3>
                <p className="text-sm text-gray-500">
                  {selectedUserInfo?.department_name} -{" "}
                  {selectedUserInfo?.position}
                </p>
              </div>
              <Button
                onClick={() => {
                  handleExportChat(chatHistory, currentUser, users);
                }}
              >
                CSV出力
              </Button>
            </div>

            {/* メッセージエリア */}
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">
                  メッセージを読み込み中...
                </span>
              </div>
            ) : (
              <div
                ref={chatContainerRef}
                className="flex-1 p-4 space-y-4 overflow-y-auto"
              >
                {chatHistory.length > 0 ? (
                  chatHistory.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === currentUser?.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <Card
                        className={`${
                          message.sender_id === currentUser?.id
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100"
                        } max-w-md inline-block`}
                      >
                        <CardContent className="p-3 w-fit">
                          {editingMessageId === message.id ? (
                            <div className="flex flex-col space-y-2">
                              <textarea
                                ref={editTextareaRef}
                                value={editingMessageText}
                                onChange={(e) => {
                                  setEditingMessageText(e.target.value);
                                  autoResize(editTextareaRef.current);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    saveEdit(message.id);
                                  }
                                }}
                                className="w-full bg-white text-black border rounded px-2 py-1 resize-none overflow-y-auto"
                                rows={2}
                                autoFocus
                              />

                              <div className="flex justify-end space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-white text-gray-700 h-7 px-2"
                                  onClick={cancelEdit}
                                >
                                  <X size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600 h-7 px-2"
                                  onClick={() => saveEdit(message.id)}
                                >
                                  <Check size={14} />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="whitespace-pre-wrap break-words inline-block text-sm leading-relaxed">
                                {message.message.trimEnd()}
                              </div>

                              <div className="flex justify-between items-center">
                                <p
                                  className={`text-xs mt-1 ${
                                    message.sender_id === currentUser?.id
                                      ? "text-blue-100"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {formatDateTime(message.created_at)}
                                  {message.is_edited && " (編集済み)"}
                                  {message.is_read &&
                                    message.sender_id === currentUser?.id &&
                                    " 既読"}
                                </p>

                                {/* 自分のメッセージのみ編集・削除ボタンを表示 */}
                                {message.sender_id === currentUser?.id && (
                                  <div
                                    className={`flex space-x-1 ml-2 ${
                                      message.sender_id === currentUser?.id
                                        ? "text-blue-100"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEdit(message);
                                      }}
                                      className="hover:bg-blue-600 rounded p-1"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMessage(message.id);
                                      }}
                                      className="hover:bg-blue-600 rounded p-1"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    メッセージがありません。最初のメッセージを送信しましょう。
                  </div>
                )}
              </div>
            )}

            {/* 入力エリア */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    autoResize(inputRef.current);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 border rounded px-3 py-2 resize-none overflow-y-auto"
                  rows={2}
                  disabled={sending}
                />

                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      送信中
                    </>
                  ) : (
                    "送信"
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            左側からチャット相手を選択してください
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
