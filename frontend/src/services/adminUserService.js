// API呼び出しサービス
import api from "./apiService";



/**
 * 工数履歴データを取得する
 * @returns {Promise} - APIレスポンス
 */
export const getUsers = async () => {
    try {
      const response = await api.get("admin_users");
      return response.data;
    } catch (error) {
      console.error("工数取得エラー:", error);
      throw (
        error.response?.data?.error ||
        error.message ||
        "工数データの取得に失敗しました"
      );
    }
  };

// ユーザー削除
export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`admin_users/${userId}`);
    return response.data;
  } catch (error) {
    console.error("ユーザー削除エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "ユーザーの削除に失敗しました"
    );
  }
};

// 新規アカウント作成
export const createUser = async (userData) => {
  try {
    const response = await api.post("admin_users", userData);
    return response.data;
  } catch (error) {
    console.error("ユーザー作成エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "アカウントの作成に失敗しました"
    );
  }
};

// ユーザーアカウント編集
export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`admin_users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error("ユーザー更新エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "ユーザー情報の更新に失敗しました"
    );
  }
};