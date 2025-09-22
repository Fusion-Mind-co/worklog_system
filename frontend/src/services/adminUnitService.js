// ユニット名と工事区分の管理用サービス
import api from "./apiService";

/**
 * すべてのユニット名を取得する
 * @returns {Promise} - APIレスポンス
 */
export const getAllUnitNames = async () => {
  try {
    const response = await api.get("/admin/unit-names");
    return response.data;
  } catch (error) {
    console.error("ユニット名取得エラー:", error);
    throw (
      error.response?.data?.error || error.message || "ユニット名の取得に失敗しました"
    );
  }
};

/**
 * 新しいユニット名を作成する
 * @param {Object} unitData - ユニット名データ（name, work_type_ids）
 * @returns {Promise} - APIレスポンス
 */
export const createUnitName = async (unitData) => {
  try {
    const response = await api.post("/admin/unit-names", unitData);
    return response.data;
  } catch (error) {
    console.error("ユニット名作成エラー:", error);
    throw (
      error.response?.data?.error || error.message || "ユニット名の作成に失敗しました"
    );
  }
};

/**
 * ユニット名を更新する
 * @param {number} unitId - ユニット名ID
 * @param {Object} unitData - 更新データ（name, work_type_ids）
 * @returns {Promise} - APIレスポンス
 */
export const updateUnitName = async (unitId, unitData) => {
  try {
    const response = await api.put(`/admin/unit-names/${unitId}`, unitData);
    return response.data;
  } catch (error) {
    console.error("ユニット名更新エラー:", error);
    throw (
      error.response?.data?.error || error.message || "ユニット名の更新に失敗しました"
    );
  }
};

/**
 * ユニット名を削除する
 * @param {number} unitId - ユニット名ID
 * @returns {Promise} - APIレスポンス
 */
export const deleteUnitName = async (unitId) => {
  try {
    const response = await api.delete(`/admin/unit-names/${unitId}`);
    return response.data;
  } catch (error) {
    console.error("ユニット名削除エラー:", error);
    throw (
      error.response?.data?.error || error.message || "ユニット名の削除に失敗しました"
    );
  }
};

/**
 * すべての工事区分を取得する
 * @returns {Promise} - APIレスポンス
 */
export const getAllWorkTypes = async () => {
  try {
    const response = await api.get("/admin/work-types");
    return response.data;
  } catch (error) {
    console.error("工事区分取得エラー:", error);
    throw (
      error.response?.data?.error || error.message || "工事区分の取得に失敗しました"
    );
  }
};

/**
 * 新しい工事区分を作成する
 * @param {Object} workTypeData - 工事区分データ（name）
 * @returns {Promise} - APIレスポンス
 */
export const createWorkType = async (workTypeData) => {
  try {
    const response = await api.post("/admin/work-types", workTypeData);
    return response.data;
  } catch (error) {
    console.error("工事区分作成エラー:", error);
    throw (
      error.response?.data?.error || error.message || "工事区分の作成に失敗しました"
    );
  }
};

/**
 * 工事区分を更新する
 * @param {number} workTypeId - 工事区分ID
 * @param {Object} workTypeData - 更新データ（name）
 * @returns {Promise} - APIレスポンス
 */
export const updateWorkType = async (workTypeId, workTypeData) => {
  try {
    const response = await api.put(`/admin/work-types/${workTypeId}`, workTypeData);
    return response.data;
  } catch (error) {
    console.error("工事区分更新エラー:", error);
    throw (
      error.response?.data?.error || error.message || "工事区分の更新に失敗しました"
    );
  }
};

/**
 * 工事区分を削除する
 * @param {number} workTypeId - 工事区分ID
 * @returns {Promise} - APIレスポンス
 */
export const deleteWorkType = async (workTypeId) => {
  try {
    const response = await api.delete(`/admin/work-types/${workTypeId}`);
    return response.data;
  } catch (error) {
    console.error("工事区分削除エラー:", error);
    throw (
      error.response?.data?.error || error.message || "工事区分の削除に失敗しました"
    );
  }
};

/**
 * ユニットと工事区分のマッピングを取得する
 * @returns {Promise} - APIレスポンス
 */
export const getUnitWorkTypeMap = async () => {
  try {
    const response = await api.get("/admin/unit-work-type-map");
    return response.data;
  } catch (error) {
    console.error("マッピング取得エラー:", error);
    throw (
      error.response?.data?.error || error.message || "マッピングの取得に失敗しました"
    );
  }
};