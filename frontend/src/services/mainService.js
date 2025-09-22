// mainService.js - アプリケーション全体で共有される機能を提供するサービス
import api from "./apiService";

/**
 * 未処理申請数を取得する
 * @param {string|null} unitName - フィルタリングするユニット名（nullの場合は全て）
 * @returns {Promise} - APIレスポンス { total, pending_add, pending_edit, pending_delete }
 */
export const getPendingCount = async (unitName = null) => {
  try {
    let url = "admin_worklog/pending_count";
    if (unitName && unitName !== "all") {
      url += `?unit_name=${encodeURIComponent(unitName)}`;
    }
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("未処理申請数取得エラー:", error);
    return {
      total: 0,
      pending_add: 0,
      pending_edit: 0,
      pending_delete: 0
    };
  }
};

/**
 * デフォルトユニットを取得する
 * @returns {Promise} - APIレスポンス { defaultUnit }
 */
export const getDefaultUnit = async () => {
  try {
    const response = await api.get("admin_worklog/default_unit");
    return response.data.defaultUnit || null;
  } catch (error) {
    console.error("デフォルトユニット取得エラー:", error);
    return null;
  }
};

/**
 * サウンドON/OFF設定をサーバーに保存する
 * 
 * @param {boolean} enabled - true: サウンドON / false: サウンドOFF
 * @returns {Promise<object>} - APIのレスポンス
 */
export const updateSoundSetting = async (enabled) => {
  try {
    // サウンド状態をサーバーに送信（現在ログイン中のユーザーに紐づく）
    const response = await api.post("/users/sound", {
      sound_enabled: enabled,
    });

    // 正常に保存されたレスポンスを返す
    return response.data;
  } catch (error) {
    // エラーが発生した場合、内容をログに出力
    console.error("サウンド設定の保存に失敗しました:", error);
    throw error;
  }
};
