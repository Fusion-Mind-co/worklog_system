// API呼び出しサービス
import api from "./apiService";

/**
 * 工数追加申請を承認する
 * @param {number} workLogId - 対象の工数ID
 * @returns {Promise} - APIレスポンス
 */
export const approveAddWorkLog = async (workLogId) => {
  try {
    const response = await api.post("approval_rejection/approve_add", {
      worklog_id: workLogId
    });
    return response.data;
  } catch (error) {
    console.error("追加承認エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "工数追加の承認に失敗しました"
    );
  }
};

/**
 * 工数追加申請を却下する
 * @param {number} workLogId - 対象の工数ID
 * @param {string} rejectReason - 却下理由
 * @returns {Promise} - APIレスポンス
 */
export const rejectAddWorkLog = async (workLogId, rejectReason) => {
  try {
    const response = await api.post("approval_rejection/reject_add", {
      worklog_id: workLogId,
      reject_reason: rejectReason
    });
    return response.data;
  } catch (error) {
    console.error("追加却下エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "工数追加の却下に失敗しました"
    );
  }
};

/**
 * 工数削除申請を承認する
 * @param {number} workLogId - 対象の工数ID
 * @returns {Promise} - APIレスポンス
 */
export const approveDeleteWorkLog = async (workLogId) => {
  try {
    const response = await api.post("approval_rejection/approve_delete", {
      worklog_id: workLogId
    });
    return response.data;
  } catch (error) {
    console.error("削除承認エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "工数削除の承認に失敗しました"
    );
  }
};

/**
 * 工数削除申請を却下する
 * @param {number} workLogId - 対象の工数ID
 * @param {string} rejectReason - 却下理由
 * @returns {Promise} - APIレスポンス
 */
export const rejectDeleteWorkLog = async (workLogId, rejectReason) => {
  try {
    const response = await api.post("approval_rejection/reject_delete", {
      worklog_id: workLogId,
      reject_reason: rejectReason
    });
    return response.data;
  } catch (error) {
    console.error("削除却下エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "工数削除の却下に失敗しました"
    );
  }
};

/**
 * 工数編集申請を承認する
 * @param {number} workLogId - 対象の工数ID（編集後のデータID）
 * @returns {Promise} - APIレスポンス
 */
export const approveEditWorkLog = async (workLogId) => {
  try {
    const response = await api.post("approval_rejection/approve_edit", {
      worklog_id: workLogId
    });
    return response.data;
  } catch (error) {
    console.error("編集承認エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "工数編集の承認に失敗しました"
    );
  }
};

/**
 * 工数編集申請を却下する
 * @param {number} workLogId - 対象の工数ID（編集後のデータID）
 * @param {string} rejectReason - 却下理由
 * @returns {Promise} - APIレスポンス
 */
export const rejectEditWorkLog = async (workLogId, rejectReason) => {
  try {
    const response = await api.post("approval_rejection/reject_edit", {
      worklog_id: workLogId,
      reject_reason: rejectReason
    });
    return response.data;
  } catch (error) {
    console.error("編集却下エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "工数編集の却下に失敗しました"
    );
  }
};