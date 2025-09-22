// API呼び出しサービス
import api from "./apiService";

/**
 * 工数履歴データを取得する
 * @param {Object} filters - フィルター条件
 * @param {string} filters.startDate - 開始日 (YYYY-MM-DD)
 * @param {string} filters.endDate - 終了日 (YYYY-MM-DD)
 * @param {string} filters.unitName - ユニット名
 * @param {string} filters.department - 部署名
 * @param {string} filters.employeeId - 社員ID
 * @param {string} filters.status - ステータス
 * @param {number} page - ページ番号
 * @param {number} perPage - 1ページあたりの件数
 * @param {string} sortBy - ソート対象カラム
 * @param {string} sortOrder - ソート順序 (asc/desc)
 * @returns {Promise} - APIレスポンス
 */
export const getAdminWorkLog = async (filters = {}, page = 1, perPage = 50, sortBy = 'date', sortOrder = 'desc') => {
  try {
    // クエリパラメータを構築
    const params = new URLSearchParams();
    
    // 日付範囲（必須）
    if (filters.startDate) {
      params.append('start_date', filters.startDate);
    }
    if (filters.endDate) {
      params.append('end_date', filters.endDate);
    }
    
    // ユニット名フィルター
    if (filters.unitName && filters.unitName !== 'all') {
      params.append('unit_name', filters.unitName);
    }
    
    // 部署フィルター
    if (filters.department && filters.department !== 'all') {
      params.append('department', filters.department);
    }
    
    // 社員IDフィルター
    if (filters.employeeId) {
      params.append('employee_id', filters.employeeId);
    }
    
    // ステータスフィルター
    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    
    // ページネーション
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    
    // ソートパラメータ
    params.append('sort_by', sortBy);
    params.append('sort_order', sortOrder);
    
    const response = await api.get(`admin_worklog?${params.toString()}`);
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
 * デフォルトユニットを保存する
 * @param {string|null} unitName - 保存するユニット名、nullの場合は解除
 * @returns {Promise} - APIレスポンス
 */
export const saveDefaultUnit = async (unitName) => {
  try {
    const response = await api.post("admin_worklog/save_default_unit", { 
      unit_name: unitName 
    });
    return response.data;
  } catch (error) {
    console.error("デフォルトユニット保存エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "デフォルトユニットの保存に失敗しました"
    );
  }
};

/**
 * デフォルトユニットのみを取得する（軽量版）
 * @returns {Promise} - APIレスポンス
 */
export const getDefaultUnit = async () => {
  try {
    const response = await api.get("admin_worklog/default_unit");
    return response.data;
  } catch (error) {
    console.error("デフォルトユニット取得エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "デフォルトユニットの取得に失敗しました"
    );
  }
};


/**
 * CSV出力用の件数を取得する（確認ダイアログ用）
 * @param {Object} filters - フィルター条件
 * @returns {Promise<number>} - 該当件数
 */
export const getWorkLogCount = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    // 日付範囲
    if (filters.startDate) {
      params.append('start_date', filters.startDate);
    }
    if (filters.endDate) {
      params.append('end_date', filters.endDate);
    }
    
    // フィルター条件
    if (filters.unitName && filters.unitName !== 'all') {
      params.append('unit_name', filters.unitName);
    }
    if (filters.department && filters.department !== 'all') {
      params.append('department', filters.department);
    }
    if (filters.employeeId) {
      params.append('employee_id', filters.employeeId);
    }
    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    
    // 件数取得専用フラグ
    params.append('count_only', 'true');
    
    const response = await api.get(`admin_worklog?${params.toString()}`);
    return response.data.count;
  } catch (error) {
    console.error("件数取得エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "件数の取得に失敗しました"
    );
  }
};

/**
 * CSV出力用の全データを取得する（ページネーションなし）
 * @param {Object} filters - フィルター条件
 * @param {string} sortBy - ソート対象カラム
 * @param {string} sortOrder - ソート順序 (asc/desc)
 * @returns {Promise} - APIレスポンス
 */
export const getWorkLogForCSV = async (filters = {}, sortBy = 'date', sortOrder = 'desc') => {
  try {
    const params = new URLSearchParams();
    
    // 日付範囲
    if (filters.startDate) {
      params.append('start_date', filters.startDate);
    }
    if (filters.endDate) {
      params.append('end_date', filters.endDate);
    }
    
    // フィルター条件
    if (filters.unitName && filters.unitName !== 'all') {
      params.append('unit_name', filters.unitName);
    }
    if (filters.department && filters.department !== 'all') {
      params.append('department', filters.department);
    }
    if (filters.employeeId) {
      params.append('employee_id', filters.employeeId);
    }
    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    
    // CSV出力用パラメータ
    params.append('csv_export', 'true'); // CSV出力専用フラグ
    params.append('sort_by', sortBy);
    params.append('sort_order', sortOrder);
    
    const response = await api.get(`admin_worklog?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("CSV用データ取得エラー:", error);
    throw (
      error.response?.data?.error ||
      error.message ||
      "CSV用データの取得に失敗しました"
    );
  }
};

/**
 * 工数データをCSV形式で生成・ダウンロードする
 * @param {Array} workLogs - 工数データ配列
 * @param {Object} filters - フィルター条件（ファイル名用）
 */
export const generateWorkLogCSV = (workLogs, filters) => {
  const BOM = "\uFEFF"; // Excel用BOM
  
  // CSVヘッダー
  const headers = [
    "日付",
    "社員ID", 
    "氏名",
    "部署",
    "MODEL",
    "S/N",
    "工事番号",
    "P/N", 
    "注文番号",
    "数量",
    "ユニット名",
    "工事区分",
    "工数(分)",
    "備考",
    "ステータス"
  ];
  
  // データ行の生成
  const rows = workLogs.map(log => [
    log.date || "",
    log.employeeId || "",
    log.employeeName || "",
    log.department || "",
    log.model || "",
    log.serialNumber || "",
    log.workOrder || "",
    log.partNumber || "",
    log.orderNumber || "",
    log.quantity || "",
    log.unitName || "",
    log.workType || "",
    log.minutes || "",
    (log.remarks || "").replace(/\n/g, " "), // 改行をスペースに変換
    log.status || ""
  ]);
  
  // CSV文字列の構築
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(field => `"${field}"`).join(","))
  ].join("\n");
  
  // ファイル名の生成
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  
  let filename = `工数データ_${timestamp}.csv`;
  
  // フィルター条件があればファイル名に追加
  if (filters.unitName && filters.unitName !== 'all') {
    filename = `工数データ_${filters.unitName}_${timestamp}.csv`;
  }
  
  // ファイルダウンロード
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;"
  });
  
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};