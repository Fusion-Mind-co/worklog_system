// adminChatService.js

import { useState, useEffect } from "react";
import api from "./apiService"; // ← axiosインスタンス（JWT自動付与）を読み込み

// カスタムフック：チャット許可ロジックを提供
export const useChatPermissionLogic = () => {
  const [employees, setEmployees] = useState([]); // 従業員一覧
  const [chatPermissions, setChatPermissions] = useState({}); // チャット許可マップ（user_id: [partner_id, ...]）
  const [selectedEmployee, setSelectedEmployee] = useState(null); // 選択中ユーザー
  const [loading, setLoading] = useState(true); // 初期ロード状態
  const [saving, setSaving] = useState(false); // 通信中フラグ

  // 初期データの取得（従業員一覧＋チャット許可設定）
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const employeesRes = await api.get("/users");
        const permissionsRes = await api.get("/admin/chat-pairs");

        const employeesData = employeesRes.data;
        const permissionsData = permissionsRes.data;

        // チャット許可データを user_id ごとの辞書形式に変換
        const map = {};
        permissionsData.forEach(({ user_id, partner_id }) => {
          if (!map[user_id]) map[user_id] = [];
          map[user_id].push(partner_id);
        });

        setEmployees(employeesData);
        setChatPermissions(map);

        // 最初の従業員を選択済みにしておく
        if (employeesData.length > 0) {
          setSelectedEmployee(employeesData[0]);
        }

        console.log("✅ データ取得成功", { employees: employeesData, permissions: map });
      } catch (error) {
        console.error("データ取得エラー:", error);
        alert("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData(); // useEffectで初回実行
  }, []);

  // チャット相手を追加（双方向）＋サーバーへPOST送信
  const addChatPartner = async (selectedId, targetId) => {
    setSaving(true);
    try {
      // フロント側の状態を更新（双方向に追加）
      const updated = { ...chatPermissions };

      if (!updated[selectedId]) updated[selectedId] = [];
      if (!updated[selectedId].includes(targetId)) {
        updated[selectedId] = [...updated[selectedId], targetId];
      }

      if (!updated[targetId]) updated[targetId] = [];
      if (!updated[targetId].includes(selectedId)) {
        updated[targetId] = [...updated[targetId], selectedId];
      }

      setChatPermissions(updated); // 状態反映

      // サーバーに送信（POST）
      await api.post("/admin/chat-pairs", {
        user_id: selectedId,
        partner_id: targetId,
      });

      console.log("✅ チャット相手追加成功");
    } catch (error) {
      console.error("追加エラー:", error);
      alert("チャット相手の追加に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // チャット相手を削除（双方向）＋サーバーへDELETE送信
  const removeChatPartner = async (selectedId, targetId) => {
    console.log("removeChatPartner");
    setSaving(true);
    try {
      // フロント側の状態を更新（双方向に削除）
      const updated = { ...chatPermissions };

      if (updated[selectedId]) {
        updated[selectedId] = updated[selectedId].filter(id => id !== targetId);
      }

      if (updated[targetId]) {
        updated[targetId] = updated[targetId].filter(id => id !== selectedId);
      }

      setChatPermissions(updated); // 状態反映

      // サーバーに送信（DELETE：bodyはdataとして渡す必要あり）
      await api.delete("/admin/chat-pairs", {
        data: {
          user_id: selectedId,
          partner_id: targetId,
        },
      });

      console.log("✅ チャット相手削除成功");
    } catch (error) {
      console.error("削除エラー:", error);
      alert("チャット相手の削除に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // 必要な状態と操作関数を返却
  return {
    employees,
    chatPermissions,
    selectedEmployee,
    setSelectedEmployee,
    addChatPartner,
    removeChatPartner,
    loading,
    saving,
  };
};
