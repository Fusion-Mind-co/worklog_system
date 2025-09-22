// API呼び出しサービス - パフォーマンス最適化版（レスポンス処理軽量化）
import api from "./apiService";

/**
 * 工数履歴データを取得する（新旧両対応）
 * @param {Object} filters - フィルター条件（新方式のみ）
 * @param {string} filters.startDate - 開始日 (YYYY-MM-DD)
 * @param {string} filters.endDate - 終了日 (YYYY-MM-DD)
 * @param {string} filters.model - MODEL
 * @param {string} filters.unitName - ユニット名
 * @param {string} filters.workType - 工事区分
 * @param {string} filters.status - ステータス
 * @param {number} page - ページ番号（新方式のみ）
 * @param {number} perPage - 1ページあたりの件数（新方式のみ）
 * @param {string} sortBy - ソート対象カラム（新方式のみ）
 * @param {string} sortOrder - ソート順序 (asc/desc)（新方式のみ）
 * @returns {Promise} - APIレスポンス
 */
export const getWorkLogHistory = async (
  filters = {},
  page = 1,
  perPage = 100,
  sortBy = "date",
  sortOrder = "desc"
) => {
  try {
    // パラメータが指定されている場合は新方式、そうでなければ従来方式
    const useNewApi =
      filters &&
      (filters.startDate ||
        filters.endDate ||
        filters.model !== "all" ||
        filters.unitName !== "all" ||
        filters.workType !== "all" ||
        filters.status !== "all" ||
        page !== 1 ||
        perPage !== 100);

    if (useNewApi) {
      // 新方式：ページネーション・フィルタリング対応
      const params = new URLSearchParams();

      // 日付範囲
      if (filters.startDate) {
        params.append("start_date", filters.startDate);
      }
      if (filters.endDate) {
        params.append("end_date", filters.endDate);
      }

      // MODELフィルター
      if (filters.model && filters.model !== "all") {
        params.append("model", filters.model);
      }
      // ユニット名フィルター
      if (filters.unitName && filters.unitName !== "all") {
        params.append("unit_name", filters.unitName);
      }
      // 工事区分フィルター
      if (filters.workType && filters.workType !== "all") {
        params.append("work_type", filters.workType);
      }

      // ステータスフィルター
      if (filters.status && filters.status !== "all") {
        params.append("status", filters.status);
      }

      // ページネーション
      if (page !== 1) params.append("page", page.toString());
      if (perPage !== 100) params.append("per_page", perPage.toString());

      // ソートパラメータ
      if (sortBy !== "date") params.append("sort_by", sortBy);
      if (sortOrder !== "desc") params.append("sort_order", sortOrder);

      const response = await api.get(`worklog_history?${params.toString()}`);
      return response.data;
    } else {
      // 従来方式：全データ取得
      const response = await api.get("worklog_history");
      return response.data;
    }
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
 * フィルター選択肢を取得する（新機能）
 * @returns {Promise} - APIレスポンス
 */
export const getFilterOptions = async () => {
  try {
    const response = await api.get("worklog_history/filter_options");
    return response.data;
  } catch (error) {
    console.error("フィルター選択肢取得エラー:", error);
    // エラーが発生しても空配列を返して継続
    return {
      models: [],
      workTypes: [],
    };
  }
};

/**
 * ✅ 工数データの編集申請を送信する（レスポンス処理軽量化）
 * @param {Object} workLogData - 編集された工数データ
 * @returns {Promise} - APIレスポンス
 */
export const submitWorkLogEdit = async (workLogData) => {
  try {
    const response = await api.post("worklog_history/edit", workLogData);
    // ✅ updated_dataレスポンス処理を削除（フロントエンドで再取得）
    return response.data;
  } catch (error) {
    console.error("工数編集申請エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "工数データの編集申請に失敗しました"
    );
  }
};

/**
 * ✅ 工数データの追加申請を送信する（レスポンス処理軽量化）
 * @param {Object} workLogData - 追加する工数データ
 * @returns {Promise} - APIレスポンス
 */
export const submitWorkLogAdd = async (workLogData) => {
  try {
    const response = await api.post("worklog_history/add", workLogData);
    // ✅ updated_dataレスポンス処理を削除（フロントエンドで再取得）
    return response.data;
  } catch (error) {
    console.error("工数追加申請エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "工数データの追加申請に失敗しました"
    );
  }
};

/**
 * ✅ 工数データの削除申請を送信する（レスポンス処理軽量化）
 * @param {Object} deleteData - 削除する工数データの情報
 * @returns {Promise} - APIレスポンス
 */
export const submitWorkLogDelete = async (deleteData) => {
  try {
    const response = await api.post("worklog_history/delete", deleteData);
    // ✅ updated_dataレスポンス処理を削除（フロントエンドで再取得）
    return response.data;
  } catch (error) {
    console.error("工数削除申請エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "工数データの削除申請に失敗しました"
    );
  }
};

/**
 * ✅ 工数申請を取り消す（レスポンス処理軽量化）
 * @param {Object} log - 取り消す対象の工数データ
 * @returns {Promise} - APIレスポンス
 */
export const cancelWorkLogRequest = async (log) => {
  try {
    const response = await api.post("worklog_history/cancel", {
      id: log.id,
      originalId: log.originalId, // 編集後データの originalId が編集前データの id を示す
      status: log.status,
    });
    // ✅ updated_dataレスポンス処理を削除（フロントエンドで再取得）
    return response.data;
  } catch (error) {
    console.error("申請取り消しエラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "申請取り消しに失敗しました"
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

/**
 * ✅ 却下された追加申請のデータを取り消す（削除する）（レスポンス処理軽量化）
 * @param {Object} log - 取り消す対象の工数データ
 * @returns {Promise} - APIレスポンス
 */
export const cancelRejectedAddRequest = async (log) => {
  try {
    const response = await api.post("worklog_history/cancel_rejected_add", {
      id: log.id,
    });
    // ✅ updated_dataレスポンス処理を削除（フロントエンドで再取得）
    return response.data;
  } catch (error) {
    console.error("却下済み追加申請の取り消しエラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "却下済み追加申請の取り消しに失敗しました"
    );
  }
};

/**
 * ✅ 却下された工数データを編集して再申請する（レスポンス処理軽量化）
 * @param {Object} workLogData - 更新後の工数データ
 * @returns {Promise} - APIレスポンス
 */
export const resubmitRejectedWorkLog = async (workLogData) => {
  console.log("resubmitRejectedWorkLog 編集して再申請関数");
  try {
    const response = await api.post("worklog_history/resubmit", workLogData);
    console.log("再申請return data");
    console.log(response.data);
    // ✅ updated_dataレスポンス処理を削除（フロントエンドで再取得）
    return response.data;
  } catch (error) {
    console.error("再申請エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "工数データの再申請に失敗しました"
    );
  }
};

/**
 * ✅ 却下された削除申請のデータを取り消す（削除する）（レスポンス処理軽量化）
 * @param {Object} log - 取り消す対象の工数データ
 * @returns {Promise} - APIレスポンス
 */
export const cancelRejectedDeleteRequest = async (log) => {
  try {
    const response = await api.post("worklog_history/cancel_rejected_delete", {
      id: log.id,
    });
    // ✅ updated_dataレスポンス処理を削除（フロントエンドで再取得）
    return response.data;
  } catch (error) {
    console.error("却下済み削除申請の取り消しエラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "却下済み削除申請の取り消しに失敗しました"
    );
  }
};
