// API呼び出しサービス
import api from "./apiService";

/**
 * 工数データを保存する
 * @param {Object} workLogData - 工数データ
 * @returns {Promise} - APIレスポンス
 */
export const saveWorkLog = async (workLogData) => {
  console.log("workLogData:", workLogData);

  try {
    const response = await api.post("/worklog", workLogData);
    return response.data;
  } catch (error) {
    console.error("工数保存エラー:", error);
    throw (
      error.response?.data?.error || error.message || "工数の保存に失敗しました"
    );
  }
};

/**
 * 指定日の工数データを取得する
 * @param {string} date - 日付（ISO形式、省略時は当日）
 * @returns {Promise} - APIレスポンス
 */
export const getDailyWorkLog = async (date = null) => {
  try {
    const url = date ? `/worklog/daily?date=${date}` : "/worklog/daily";
    const response = await api.get(url);
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


/**
 * ユニット名と工事区分のマップを取得する
 * @returns {Promise} - APIレスポンス
 */
export const getUnitOptions = async () => {
  try {
    const response = await api.get("/worklog/unit-options");
    return response.data;
  } catch (error) {
    console.error("ユニットオプション取得エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "ユニットデータの取得に失敗しました"
    );
  }
};
