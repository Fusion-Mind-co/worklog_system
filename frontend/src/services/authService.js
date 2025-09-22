// API呼び出しサービス
import api from "./apiService";

// リクエストインターセプター（すべてのリクエストの前に実行）
api.interceptors.request.use(
  (config) => {
    // トークンがある場合は、リクエストヘッダーに追加
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（すべてのレスポンスの後に実行）
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 認証エラー（401）の場合、ログアウト状態にする
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(error);
  }
);

/**
 * ユーザーログイン
 * @param {Object} credentials - ログイン情報
 * @param {string} credentials.employeeId - 社員ID
 * @param {string} credentials.password - パスワード
 * @returns {Promise} - APIレスポンス
 */

export const login = async (credentials) => {
  try {
    const response = await api.post("/login", credentials); // ✅ rememberMeも送信される

    const user = response.data.user;
    user.roleLevel = user.role_level;

    // ユーザー情報をローカルストレージに保存
    localStorage.setItem("token", response.data.access_token);
    localStorage.setItem("user", JSON.stringify(user));

    // ✅ 追加：有効期限情報も保存
    if (response.data.expires_in) {
      const expiresAt = Date.now() + response.data.expires_in * 1000;
      localStorage.setItem("token_expires_at", expiresAt.toString());
      console.log(
        `✅ トークン有効期限設定: ${new Date(expiresAt).toLocaleString()}`
      );
    }

    return { ...response.data, user };
  } catch (error) {
    console.error("Login error:", error);
    throw error.response?.data?.error || error.message || "Login failed";
  }
};

/**
 * ユーザーがログイン済みかどうかを確認（有効期限チェック付き）
 * @returns {boolean} - ログイン状態
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  const expiresAt = localStorage.getItem("token_expires_at");

  if (!token) {
    return false;
  }

  // ✅ 有効期限チェック
  if (expiresAt) {
    const now = Date.now();
    const expires = parseInt(expiresAt);

    if (now >= expires) {
      console.log("❌ トークンの有効期限が切れています");
      // 期限切れの場合はトークンを削除
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("token_expires_at");
      return false;
    }
  }

  return true;
};

/**
 * ユーザー登録
 * @param {Object} userData - 登録情報
 * @returns {Promise} - APIレスポンス
 */
export const register = async (userData) => {
  try {
    // データ形式の変換（departmentをdepartmentNameに変更など）
    const apiData = {
      employeeId: userData.employeeId,
      name: userData.name,
      departmentName: userData.department, // キー名を変換
      position: userData.position,
      email: userData.email, // 追加: メールアドレス
      password: userData.password,
    };

    console.log("API送信データ:", apiData);

    const response = await api.post("/register", apiData);
    console.log("APIレスポンス:", response.data);

    return response.data;
  } catch (error) {
    console.error("Registration error:", error);
    throw error.response?.data?.error || error.message || "Registration failed";
  }
};

/**
 * ログアウト
 * @returns {Promise} - APIレスポンス
 */
export const logout = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      return { message: "Already logged out" };
    }

    const response = await api.post("/logout");

    // ローカルストレージからユーザー情報を削除
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return { message: "Logout successful" };
  } catch (error) {
    console.error("Logout error:", error);
    // エラーが発生してもローカルストレージは消去する
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    throw error.response?.data?.error || error.message || "Logout failed";
  }
};

/**
 * 現在のユーザー情報を取得
 * @returns {Promise} - ユーザー情報
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get("/users/me");

    // 最新のユーザー情報で更新
    localStorage.setItem("user", JSON.stringify(response.data.user));

    return response.data.user;
  } catch (error) {
    console.error("Get user error:", error);
    throw (
      error.response?.data?.error || error.message || "Failed to get user info"
    );
  }
};

/**
 * 現在のユーザー情報をローカルストレージから取得
 * @returns {Object|null} - ユーザー情報
 */
export const getStoredUser = () => {
  const userJson = localStorage.getItem("user");
  return userJson ? JSON.parse(userJson) : null;
};

/**
 * パスワードリセットメールの送信を要求
 * @param {string} employeeId - 社員ID
 * @param {string} email - メールアドレス
 * @returns {Promise} - APIレスポンス
 */
export const requestPasswordReset = async (employeeId, email) => {
  try {
    const response = await api.post("/password-reset-request", {
      employeeId,
      email,
    });
    return response.data;
  } catch (error) {
    console.error("Password reset request error:", error);
    if (error.response?.status === 404) {
      throw "指定された社員IDとメールアドレスに一致するアカウントが見つかりません";
    }
    throw (
      error.response?.data?.error ||
      error.message ||
      "パスワードリセット要求に失敗しました"
    );
  }
};

/**
 * 管理者へのパスワードリセット依頼
 * @param {string} employeeId - 社員ID
 * @param {string} note - 依頼理由
 * @returns {Promise} - APIレスポンス
 */
export const requestAdminPasswordReset = async (employeeId, note) => {
  try {
    const response = await api.post("/admin-password-reset-request", {
      employeeId,
      note,
    });
    return response.data;
  } catch (error) {
    console.error("Admin password reset request error:", error);
    if (error.response?.status === 404) {
      throw "指定された社員IDに一致するアカウントが見つかりません";
    }
    throw (
      error.response?.data?.error ||
      error.message ||
      "管理者へのパスワードリセット依頼に失敗しました"
    );
  }
};

/**
 * トークンによるパスワードリセット
 * @param {string} token - リセットトークン
 * @param {string} newPassword - 新しいパスワード
 * @returns {Promise} - APIレスポンス
 */
export const resetPassword = async (token, newPassword) => {
  try {
    const response = await api.post("/password-reset", {
      token,
      newPassword,
    });
    return response.data;
  } catch (error) {
    console.error("Password reset error:", error);
    if (error.response?.status === 400) {
      throw "トークンが無効か期限切れです";
    }
    throw (
      error.response?.data?.error ||
      error.message ||
      "パスワードリセットに失敗しました"
    );
  }
};

export const updateLastActivePage = async (page) => {
  try {
    // DBを更新
    await api.post("/users/last-page", { page });
    
    // ローカルストレージも同時に更新
    const user = getStoredUser();
    if (user) {
      user.last_active_page = page;
      localStorage.setItem("user", JSON.stringify(user));
      console.log("✅ ローカルストレージのlast_active_pageも更新:", page);
    }
  } catch (error) {
    console.error("last_active_page 更新エラー:", error);
  }
};

export default api;
