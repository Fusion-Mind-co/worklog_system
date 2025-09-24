import axios from "axios";

const API_BASE_URL = "https://worklog-system.onrender.com/api";

// axiosインスタンスを作成し、他のモジュールに渡す
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// JWTトークンをヘッダーに付与するインターセプターを追加
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user")); // ← トークン保存形式に合わせて修正可
  const token = user?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
// axiosインスタンスもエクスポートして他のファイルでも使用可能に
