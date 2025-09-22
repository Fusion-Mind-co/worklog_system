// AdminWork.jsx

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAdminWorkLog,
  saveDefaultUnit,
  getDefaultUnit,
  getWorkLogCount,
  getWorkLogForCSV,
  generateWorkLogCSV,
} from "@/services/adminWorkService";
import CSVExportDialog from "@/components/CSVExportDialog";
import { statusMap, getStatusColorClass } from "@/constants/status";

import { getSocket } from "@/services/socketService";

import {
  approveAddWorkLog,
  rejectAddWorkLog,
  approveDeleteWorkLog,
  rejectDeleteWorkLog,
  approveEditWorkLog,
  rejectEditWorkLog,
} from "@/services/approvalRejectionService";

import RejectReasonDialog from "@/components/RejectReasonDialog";
import { getPendingCount } from "@/services/mainService";
import { getAllUnitNames } from "@/services/adminUnitService";
import { AlertCircle, FileText } from "lucide-react";
import RemarksModal from "@/components/RemarksModal";
import StatusReasonModal from "@/components/StatusReasonModal";
import { getStoredUser } from "@/services/authService";

const AdminWork = () => {
  // localStorage保存
  const saveStateToStorage = (key, value) => {
    try {
      localStorage.setItem(`adminWork_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error("状態保存エラー:", error);
    }
  };

  // localStorage復元
  const loadStateFromStorage = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(`adminWork_${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.error("状態復元エラー:", error);
      return defaultValue;
    }
  };

  // デフォルト期間を計算（1ヶ月前〜今日）
  const getDefaultDateRange = () => {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    return {
      startDate: oneMonthAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    };
  };

  // 却下理由入力用ダイアログの状態
  const [rejectDialog, setRejectDialog] = useState({
    isOpen: false,
    workLogId: null,
    type: "",
    reason: "",
  });

  // 処理中フラグ
  const [isProcessing, setIsProcessing] = useState(false);

  // ユニット設定及びフィルター設定の表示/非表示
  const [isSetting, setIsSetting] = useState(() =>
    loadStateFromStorage("isSetting", true)
  );

  // 備考モーダル
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState("");
  const [selectedEditRemarks, setSelectedEditRemarks] = useState("");

  // 申請理由モーダル
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatusData, setSelectedStatusData] = useState({
    status: "",
    editReason: "",
    rejectReason: "",
  });

  // 工数データ一覧
  const [workLogs, setWorkLogs] = useState(() =>
    loadStateFromStorage("workLogs", [])
  );

  // ユニット名一覧
  const [unitOptions, setUnitOptions] = useState([]);

  // 選択中のユニット名
  const [selectedUnitName, setSelectedUnitName] = useState("all");

  // 設定したユニット名
  const [defaultUnitName, setDefaultUnitName] = useState(null);

  // ローディングアニメーションの状態
  const [isLoading, setIsLoading] = useState(false);

  // 保存中フラグ
  const [isSaving, setIsSaving] = useState(false);

  // 申請中データ表示モード用の状態を追加
  const [isPendingMode, setIsPendingMode] = useState(false);
  const [pendingFilters, setPendingFilters] = useState(null);

  // アラートの状態
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "",
  });

  // フィルター状態（日付範囲を追加）
  const [filters, setFilters] = useState(() =>
    loadStateFromStorage("filters", {
      ...getDefaultDateRange(),
      department: "all",
      unitName: "all",
      employeeId: "",
      status: "all",
    })
  );

  // ページネーション状態管理
  const [pagination, setPagination] = useState(() =>
    loadStateFromStorage("pagination", {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      perPage: 100,
      hasNext: false,
      hasPrev: false,
    })
  );

  // ソート状態
  const [sortConfig, setSortConfig] = useState(() =>
    loadStateFromStorage("sortConfig", {
      sortBy: "date",
      sortOrder: "desc",
    })
  );

  // csv出力用状態管理
  const [csvDialog, setCsvDialog] = useState({
    isOpen: false,
    itemCount: 0,
    isProcessing: false,
  });

  //ページネーション関数
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));

    if (isPendingMode && pendingFilters) {
      // 申請中モードの場合は専用フィルター条件を使用
      fetchDataWithCustomFilters(newPage, pendingFilters);
    } else {
      // 通常モードの場合は通常のフィルター条件を使用
      fetchData(newPage);
    }
  };

  // データベースからdefaultUnitNameを取得
  const initializeDefaultUnit = async () => {
    try {
      const response = await getDefaultUnit();
      if (response.defaultUnit) {
        setDefaultUnitName(response.defaultUnit);

        // デフォルトユニットがある場合、selectedUnitNameも同期
        setSelectedUnitName(response.defaultUnit);
        setFilters((prev) => ({
          ...prev,
          unitName: response.defaultUnit,
        }));
      } else {
        setDefaultUnitName(null);
      }
    } catch (error) {
      console.error("デフォルトユニット初期化エラー:", error);
      // エラーが発生してもアプリの動作は継続
    }
  };

  // 専用フィルター条件でのデータ取得関数
  const fetchDataWithCustomFilters = async (
    page = 1,
    customFilters,
    sortBy = sortConfig.sortBy,
    sortOrder = sortConfig.sortOrder
  ) => {
    setIsLoading(true);
    try {
      const response = await getAdminWorkLog(
        customFilters,
        page,
        100,
        sortBy,
        sortOrder
      );

      // ページネーション情報を更新
      let newPagination = pagination;
      if (response.pagination) {
        newPagination = {
          currentPage: response.pagination.current_page,
          totalPages: response.pagination.total_pages,
          totalItems: response.pagination.total_items,
          perPage: response.pagination.per_page,
          hasNext: response.pagination.has_next,
          hasPrev: response.pagination.has_prev,
        };
        setPagination(newPagination);
      }

      // ソート設定を更新
      const newSortConfig = { sortBy, sortOrder };
      setSortConfig(newSortConfig);

      // 工数データを更新
      const newWorkLogs = response.workRows || [];
      setWorkLogs(newWorkLogs);

      // デフォルトユニットが設定されている場合は表示
      if (response.defaultUnit) {
        setDefaultUnitName(response.defaultUnit);
      }
    } catch (error) {
      console.error("データ取得エラー:", error);
      setAlert({
        show: true,
        message:
          typeof error === "string" ? error : "データの取得に失敗しました",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 初期データ取得
  useEffect(() => {
    fetchUnitNames();
    initializeDefaultUnit(); // defaultUnitNameのみ軽量取得
  }, []);

  // ✅ Socket接続とイベント登録（管理者画面用）
  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;

    const socket = getSocket();
    if (!socket) return;

    // ユーザーからの工数申請通知ハンドラー（worklog_history.py発）
    const handleWorklogRequestAdded = (data) => {
      console.log("工数申請通知受信:", data);

      // フィルタリング：自分のデフォルトユニットまたは選択中のユニットに関連する申請のみ処理
      const shouldProcess =
        !defaultUnitName || // デフォルトユニット未設定なら全て
        data.unit_name === defaultUnitName || // デフォルトユニットと一致
        selectedUnitName === "all" || // "全て"選択中
        data.unit_name === selectedUnitName; // 選択中ユニットと一致

      if (shouldProcess && data.admin_data?.workRows) {
        // 管理者画面の工数一覧を更新
        setWorkLogs(data.admin_data.workRows);
      }
    };

    // 他の管理者による承認・却下処理通知ハンドラー（approval_rejection.py発）
    const handleAdminWorklogUpdated = (data) => {
      console.log("管理者工数更新通知受信:", data);

      if (data.admin_data?.workRows) {
        // 管理者画面の工数一覧を更新
        setWorkLogs(data.admin_data.workRows);
      }
    };

    // Socketイベント登録
    socket.on("worklog_request_added_with_data", handleWorklogRequestAdded); // ユーザー申請時

    // クリーンアップ：コンポーネント終了時にイベント解除
    return () => {
      socket.off("worklog_request_added_with_data", handleWorklogRequestAdded);
    };
  }, [defaultUnitName, selectedUnitName]); // ユニット設定変更時に再登録

  // 申請中データのみ抽出する処理
  const handleFilterPendingData = async () => {
    if (!defaultUnitName) {
      setAlert({
        show: true,
        message: "担当ユニットが設定されていません",
        type: "error",
      });
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
      return;
    }

    // 申請中データ用のフィルター条件
    const pendingFiltersData = {
      startDate: "",
      endDate: "",
      department: "all",
      unitName: defaultUnitName,
      employeeId: "",
      status: "pending",
    };

    // 申請中モードを有効化し、専用フィルター条件を保存
    setIsPendingMode(true);
    setPendingFilters(pendingFiltersData);

    // ページネーションをリセット
    setPagination((prev) => ({ ...prev, currentPage: 1 }));

    // 専用フィルターでデータを取得
    try {
      const response = await getAdminWorkLog(
        pendingFiltersData,
        1,
        100,
        sortConfig.sortBy,
        sortConfig.sortOrder
      );

      // 取得したデータでworkLogsのみ更新
      const newWorkLogs = response.workRows || [];
      setWorkLogs(newWorkLogs);

      // ページネーション情報も更新
      if (response.pagination) {
        const newPagination = {
          currentPage: response.pagination.current_page,
          totalPages: response.pagination.total_pages,
          totalItems: response.pagination.total_items,
          perPage: response.pagination.per_page,
          hasNext: response.pagination.has_next,
          hasPrev: response.pagination.has_prev,
        };
        setPagination(newPagination);
      }

      setAlert({
        show: true,
        message: `${defaultUnitName}の申請中データ（全期間）を表示しています`,
        type: "success",
      });
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
    } catch (error) {
      console.error("申請中データ取得エラー:", error);
      setAlert({
        show: true,
        message: "申請中データの取得に失敗しました",
        type: "error",
      });
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
    }
  };

  // 検索ボタンハンドラー（新規追加）
  const handleSearch = async () => {
    // 申請中モードを解除
    setIsPendingMode(false);
    setPendingFilters(null);

    // 日付範囲バリデーション
    if (!filters.startDate || !filters.endDate) {
      setAlert({
        show: true,
        message: "検索期間を指定してください",
        type: "error",
      });
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
      return;
    }

    if (new Date(filters.startDate) > new Date(filters.endDate)) {
      setAlert({
        show: true,
        message: "開始日は終了日以前を指定してください",
        type: "error",
      });
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
      return;
    }

    // ページリセット
    setPagination((prev) => ({ ...prev, currentPage: 1 }));

    // 1ページ目から開始
    await fetchData(1);
  };

  // データの取得
  const fetchData = async (
    page = 1,
    sortBy = sortConfig.sortBy,
    sortOrder = sortConfig.sortOrder
  ) => {
    setIsLoading(true);
    try {
      // フィルター条件をAPIに送信
      const response = await getAdminWorkLog(
        filters,
        page,
        100,
        sortBy,
        sortOrder
      );

      // ページネーション情報を更新
      let newPagination = pagination; // デフォルト値として現在の状態を使用
      if (response.pagination) {
        newPagination = {
          currentPage: response.pagination.current_page,
          totalPages: response.pagination.total_pages,
          totalItems: response.pagination.total_items,
          perPage: response.pagination.per_page,
          hasNext: response.pagination.has_next,
          hasPrev: response.pagination.has_prev,
        };
        setPagination(newPagination);
      }

      // ソート設定を更新
      const newSortConfig = { sortBy, sortOrder };
      setSortConfig(newSortConfig);

      // 工数データを更新
      const newWorkLogs = response.workRows || [];
      setWorkLogs(newWorkLogs);

      // デフォルトユニットが設定されている場合は表示
      if (response.defaultUnit) {
        setDefaultUnitName(response.defaultUnit);

        // デフォルトユニットがある場合、そのユニットのpendingカウントを取得して表示
        const pendingData = await fetchPendingCount(response.defaultUnit);
        if (typeof window.updatePendingCount === "function" && pendingData) {
          window.updatePendingCount(pendingData.total);
        }
      } else {
        setDefaultUnitName(null);
        // デフォルトユニットがない場合は全ユニットのpendingカウントを取得
        const pendingData = await fetchPendingCount("all");
        if (typeof window.updatePendingCount === "function" && pendingData) {
          window.updatePendingCount(pendingData.total);
        }
      }

      // ③ 保存タイミング：fetchData完了後に状態をlocalStorageに保存
      saveStateToStorage("filters", filters);
      saveStateToStorage("pagination", newPagination);
      saveStateToStorage("sortConfig", newSortConfig);
      saveStateToStorage("workLogs", newWorkLogs);
      saveStateToStorage("isSetting", isSetting);
    } catch (error) {
      console.error("データ取得エラー:", error);
      setAlert({
        show: true,
        message:
          typeof error === "string" ? error : "データの取得に失敗しました",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ユニット名一覧データの取得
  const fetchUnitNames = async () => {
    try {
      const response = await getAllUnitNames();
      console.log("✅ ユニット取得成功:", response);

      if (
        response &&
        response.unit_names &&
        Array.isArray(response.unit_names)
      ) {
        setUnitOptions(response.unit_names.map((unit) => unit.name));
      } else if (Array.isArray(response)) {
        setUnitOptions(response.map((unit) => unit.name));
      } else {
        console.error("予期しないユニットデータ形式:", response);
        setUnitOptions([]);
      }
    } catch (error) {
      console.error("ユニット名取得エラー:", error);
      setAlert({
        show: true,
        message:
          typeof error === "string" ? error : "ユニット名の取得に失敗しました",
        type: "error",
      });
    }
  };

  // ユニット選択変更ハンドラ
  const handleUnitChange = (value) => {
    setSelectedUnitName(value);
    handleFilterChange("unitName", value);
  };

  // 未処理申請数を取得
  const fetchPendingCount = async (unitName = null) => {
    try {
      const data = await getPendingCount(unitName);
      if (typeof window.updatePendingCount === "function") {
        window.updatePendingCount(data.total);
      }
      return data;
    } catch (error) {
      console.error("未処理申請数取得エラー:", error);
      return {
        total: 0,
        pending_add: 0,
        pending_edit: 0,
        pending_delete: 0,
      };
    }
  };

  // デフォルトユニットの保存
  const handleSaveDefaultUnit = async () => {
    if (selectedUnitName === "all") {
      setAlert({
        show: true,
        message: "保存するユニットを選択してください",
        type: "error",
      });
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
      return;
    }

    setIsSaving(true);
    try {
      const response = await saveDefaultUnit(selectedUnitName);
      setDefaultUnitName(selectedUnitName);

      if (typeof window.updateDefaultUnit === "function") {
        window.updateDefaultUnit(selectedUnitName);
      }

      if (typeof window.fetchPendingCount === "function") {
        await window.fetchPendingCount(selectedUnitName);
      }

      setAlert({
        show: true,
        message: "デフォルトユニットを保存しました",
        type: "success",
      });

      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
    } catch (error) {
      console.error("ユニット保存エラー:", error);
      setAlert({
        show: true,
        message:
          typeof error === "string" ? error : "ユニットの保存に失敗しました",
        type: "error",
      });
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // デフォルトユニットの解除
  const handleClearDefaultUnit = async () => {
    setIsSaving(true);
    try {
      const response = await saveDefaultUnit(null);
      setDefaultUnitName(null);

      if (typeof window.updateDefaultUnit === "function") {
        window.updateDefaultUnit(null);
      }

      if (typeof window.fetchPendingCount === "function") {
        await window.fetchPendingCount("all");
      }

      setAlert({
        show: true,
        message: "デフォルトユニットを解除しました",
        type: "success",
      });
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
    } catch (error) {
      console.error("ユニット解除エラー:", error);
      setAlert({
        show: true,
        message:
          typeof error === "string" ? error : "ユニットの解除に失敗しました",
        type: "error",
      });
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // 日付の表記を適切な表記に変換
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear() % 100; // 2025 → 25
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}/${month}/${day}`;
  };

  // フィルター変更ハンドラ
  const handleFilterChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value,
    });
  };

  // フィルターリセット処理
  const handleFilterReset = () => {
    // 申請中モードを解除
    setIsPendingMode(false);
    setPendingFilters(null);

    // フィルター条件をリセット
    const resetFilters = {
      ...getDefaultDateRange(),
      department: "all",
      unitName: "all", // フィルター表示用は "all" にリセット
      employeeId: "",
      status: "all",
    };
    setFilters(resetFilters);

    // ユニット選択をリセット（担当ユニットがあればそれに、なければ "all"）
    const resetUnitName = defaultUnitName || "all";
    setSelectedUnitName(resetUnitName);

    // ページネーションをリセット
    const resetPagination = {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      perPage: 100,
      hasNext: false,
      hasPrev: false,
    };
    setPagination(resetPagination);

    // ソート設定をリセット
    const resetSortConfig = {
      sortBy: "date",
      sortOrder: "desc",
    };
    setSortConfig(resetSortConfig);

    // 表示データをクリア
    setWorkLogs([]);

    // ローカルストレージをリセット
    saveStateToStorage("filters", resetFilters);
    saveStateToStorage("pagination", resetPagination);
    saveStateToStorage("sortConfig", resetSortConfig);
    saveStateToStorage("workLogs", []);
    saveStateToStorage("isSetting", isSetting); // isSettingは保持

    // 🔧 修正: 担当ユニット設定に応じてpendingカウントを更新
    if (defaultUnitName) {
      // 担当ユニットが設定されている場合は、そのユニットの件数を取得
      fetchPendingCount(defaultUnitName);
    } else {
      // 担当ユニットが設定されていない場合のみ全ユニットの件数を取得
      fetchPendingCount("all");
    }
  };

  // ソートハンドラー
  const handleSort = (column) => {
    const newOrder =
      sortConfig.sortBy === column && sortConfig.sortOrder === "asc"
        ? "desc"
        : "asc";
    setSortConfig({ sortBy: column, sortOrder: newOrder });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));

    if (isPendingMode && pendingFilters) {
      // 申請中モードの場合は専用フィルター条件を使用
      fetchDataWithCustomFilters(1, pendingFilters, column, newOrder);
    } else {
      // 通常モードの場合
      fetchData(1, column, newOrder);
    }
  };

  // 申請理由モーダルの開閉
  const openStatusModal = (log, editedLog = null) => {
    setSelectedStatusData({
      status: log.status,
      editReason: editedLog?.editReason || log.editReason || "",
      rejectReason: log.rejectReason || "",
    });
    setStatusModalOpen(true);
  };

  // 承認ハンドラ
  const handleApprove = async (workLogId, type) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let response;

      switch (type) {
        case "add":
          response = await approveAddWorkLog(workLogId);
          break;
        case "edit":
          response = await approveEditWorkLog(workLogId);
          break;
        case "delete":
          response = await approveDeleteWorkLog(workLogId);
          break;
        default:
          throw new Error("無効な操作タイプです");
      }

      // ✅ 処理成功後、現在の条件でデータを再取得
      if (isPendingMode && pendingFilters) {
        await fetchDataWithCustomFilters(
          pagination.currentPage,
          pendingFilters
        );
      } else {
        await fetchData(pagination.currentPage);
      }

      // ✅ MainLayoutの未処理数を更新
      if (response.pending_count !== undefined && window.updatePendingCount) {
        window.updatePendingCount(response.pending_count.total);
      }

      setAlert({
        show: true,
        message: response.message || "承認処理が完了しました",
        type: "success",
      });
    } catch (error) {
      console.error("承認処理エラー:", error);
      setAlert({
        show: true,
        message: typeof error === "string" ? error : "承認処理に失敗しました",
        type: "error",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
    }
  };

  // 却下ダイアログを開く
  const openRejectDialog = (workLogId, type) => {
    setRejectDialog({
      isOpen: true,
      workLogId,
      type,
      reason: "",
    });
  };

  // 却下ダイアログを閉じる
  const closeRejectDialog = () => {
    setRejectDialog({
      isOpen: false,
      workLogId: null,
      type: "",
      reason: "",
    });
  };

  // 却下理由の入力
  const handleReasonChange = (e) => {
    setRejectDialog({
      ...rejectDialog,
      reason: e.target.value,
    });
  };

  // 却下処理実行
  const handleReject = async () => {
    if (isProcessing || !rejectDialog.reason.trim()) return;
    setIsProcessing(true);

    try {
      let response;

      switch (rejectDialog.type) {
        case "add":
          response = await rejectAddWorkLog(
            rejectDialog.workLogId,
            rejectDialog.reason
          );
          break;
        case "edit":
          response = await rejectEditWorkLog(
            rejectDialog.workLogId,
            rejectDialog.reason
          );
          break;
        case "delete":
          response = await rejectDeleteWorkLog(
            rejectDialog.workLogId,
            rejectDialog.reason
          );
          break;
        default:
          throw new Error("無効な操作タイプです");
      }

      // ✅ 処理成功後、現在の条件でデータを再取得
      if (isPendingMode && pendingFilters) {
        await fetchDataWithCustomFilters(
          pagination.currentPage,
          pendingFilters
        );
      } else {
        await fetchData(pagination.currentPage);
      }

      // ✅ MainLayoutの未処理数を更新
      if (response.pending_count !== undefined && window.updatePendingCount) {
        window.updatePendingCount(response.pending_count.total);
      }

      setAlert({
        show: true,
        message: response.message || "却下処理が完了しました",
        type: "success",
      });

      closeRejectDialog();
    } catch (error) {
      console.error("却下処理エラー:", error);
      setAlert({
        show: true,
        message: typeof error === "string" ? error : "却下処理に失敗しました",
        type: "error",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
    }
  };

  // バックエンドでソート済みのデータをそのまま使用
  const displayWorkLogs = workLogs;

  // CSV出力開始処理
  const handleExportCSV = async () => {
    try {
      // 現在のフィルター条件で件数を取得
      const count = await getWorkLogCount(filters);

      // 確認ダイアログを表示
      setCsvDialog({
        isOpen: true,
        itemCount: count,
        isProcessing: false,
      });
    } catch (error) {
      console.error("件数取得エラー:", error);
      setAlert({
        show: true,
        message: typeof error === "string" ? error : "件数の取得に失敗しました",
        type: "error",
      });
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
    }
  };

  // CSV出力実行処理
  const handleConfirmCSVExport = async () => {
    setCsvDialog((prev) => ({ ...prev, isProcessing: true }));

    try {
      // フィルター条件でデータを全件取得
      const response = await getWorkLogForCSV(
        filters,
        sortConfig.sortBy,
        sortConfig.sortOrder
      );

      // CSV生成・ダウンロード
      generateWorkLogCSV(response.workRows || [], filters);

      // 成功メッセージ
      setAlert({
        show: true,
        message: `${csvDialog.itemCount}件のデータをCSV出力しました`,
        type: "success",
      });

      // ダイアログを閉じる
      setCsvDialog({
        isOpen: false,
        itemCount: 0,
        isProcessing: false,
      });
    } catch (error) {
      console.error("CSV出力エラー:", error);
      setAlert({
        show: true,
        message: typeof error === "string" ? error : "CSV出力に失敗しました",
        type: "error",
      });

      setCsvDialog((prev) => ({ ...prev, isProcessing: false }));
    } finally {
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
    }
  };

  // CSV出力キャンセル処理
  const handleCancelCSVExport = () => {
    setCsvDialog({
      isOpen: false,
      itemCount: 0,
      isProcessing: false,
    });
  };

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {alert.show && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-md shadow-md z-50 flex items-center space-x-2 ${
            alert.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          <AlertCircle size={20} />
          <p>{alert.message}</p>
          <button
            onClick={() => setAlert({ show: false, message: "", type: "" })}
            className="ml-2 text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      )}
      {/* 上部のカードを左右に配置（4:6の比率） */}
      {isSetting ? (
        <Card className="md:col-span-4">
          <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
            {/* 左側: ユニット選択 */}
            <div className="md:col-span-4">
              <CardHeader className="space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <CardTitle>ユニット選択</CardTitle>
                    {defaultUnitName && (
                      <p className="text-sm text-gray-600 mt-1">
                        現在の担当ユニット :{" "}
                        <span className="font-medium">{defaultUnitName}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* 担当ユニット解除ボタン（担当ユニットが設定されている場合のみ表示） */}
                    {defaultUnitName && (
                      <Button
                        variant="outline"
                        onClick={handleClearDefaultUnit}
                        disabled={isSaving}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        size="sm"
                      >
                        担当ユニット解除
                      </Button>
                    )}

                    {/* 申請中データ抽出ボタン（担当ユニットが設定されている場合のみ表示） */}
                    {defaultUnitName && (
                      <Button
                        variant="outline"
                        onClick={handleFilterPendingData}
                        disabled={isLoading}
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        size="sm"
                      >
                        各種申請中データのみ表示
                      </Button>
                    )}

                    {/* 担当設定ボタン（担当ユニットが設定されていない場合のみ表示） */}
                    {!defaultUnitName && (
                      <Button
                        onClick={handleSaveDefaultUnit}
                        disabled={isSaving || selectedUnitName === "all"}
                        className="bg-blue-600 hover:bg-blue-700"
                        size="sm"
                      >
                        {isSaving
                          ? "保存中..."
                          : "選択中のユニットを担当にする"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12">
                    <label className="block text-sm font-medium mb-1">
                      ユニット名
                    </label>
                    <Select
                      value={defaultUnitName || selectedUnitName}
                      onValueChange={handleUnitChange}
                      disabled={!!defaultUnitName} // 担当ユニットが設定されている場合は無効化
                    >
                      <SelectTrigger
                        className={defaultUnitName ? "bg-gray-100" : ""}
                      >
                        <SelectValue>
                          {defaultUnitName
                            ? defaultUnitName
                            : selectedUnitName === "all"
                            ? "全てのユニット"
                            : selectedUnitName}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全てのユニット</SelectItem>
                        {unitOptions.map((unitName) => (
                          <SelectItem key={unitName} value={unitName}>
                            {unitName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-600 mt-1">
                      {defaultUnitName
                        ? "担当ユニットが設定されています。変更するには担当ユニットを解除してください。"
                        : "担当ユニットを設定すると、そのユニットの申請通知を受け取ることができます"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </div>

            {/* 右側: フィルター設定 */}
            <div className="md:col-span-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  フィルター設定
                  {isPendingMode && (
                    <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                      申請中データ表示モード
                    </span>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  {pagination.totalItems}件
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFilterReset}
                  >
                    フィルターリセット
                  </Button>
                  <Button
                    onClick={handleSearch}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    検索実行
                  </Button>
                  <Button
                    onClick={handleExportCSV}
                    variant="outline"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    CSV出力
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-12 gap-4">
                  {/* 期間フィルター */}
                  <div className="col-span-12">
                    <label className="block text-sm font-medium mb-1">
                      期間
                    </label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) =>
                          handleFilterChange("startDate", e.target.value)
                        }
                        className="min-w-[140px]"
                      />
                      <span className="text-gray-500">～</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) =>
                          handleFilterChange("endDate", e.target.value)
                        }
                        className="min-w-[140px]"
                      />
                    </div>
                  </div>

                  {/* 部署選択 */}
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-sm font-medium mb-1">
                      部署
                    </label>
                    <Select
                      value={filters.department}
                      onValueChange={(value) =>
                        handleFilterChange("department", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="全ての部署" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全ての部署</SelectItem>
                        <SelectItem value="製造部">製造部</SelectItem>
                        <SelectItem value="業務部">業務部</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 社員ID入力 */}
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-sm font-medium mb-1">
                      社員ID
                    </label>
                    <Input
                      type="text"
                      placeholder="4桁数字"
                      value={filters.employeeId}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, "");
                        const trimmedValue = value.slice(0, 4);
                        handleFilterChange("employeeId", trimmedValue);
                      }}
                    />
                  </div>

                  {/* ステータス選択 */}
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-sm font-medium mb-1">
                      ステータス
                    </label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) =>
                        handleFilterChange("status", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="全てのステータス" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全てのステータス</SelectItem>
                        {Object.entries(statusMap).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </div>
            <div className="col-span-12 text-right px-4">
              <button onClick={() => setIsSetting(false)}>
                フィルター設定を隠す　▲
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="col-span-12 text-right px-4">
          <button onClick={() => setIsSetting(true)}>
            フィルター設定を開く　▼
          </button>
        </div>
      )}
      {/*  データ表示テーブル  */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100">
                  <th
                    className="px-4 py-2 text-left text-sm font-medium text-gray-600 border cursor-pointer hover:bg-gray-200 sticky top-0 bg-gray-100"
                    onClick={() => handleSort("date")}
                  >
                    日付{" "}
                    {sortConfig.sortBy === "date" &&
                      (sortConfig.sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-4 py-2 text-left text-sm font-medium text-gray-600 border cursor-pointer hover:bg-gray-200 sticky top-0 bg-gray-100"
                    onClick={() => handleSort("employee_id")}
                  >
                    社員ID{" "}
                    {sortConfig.sortBy === "employee_id" &&
                      (sortConfig.sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border sticky top-0 bg-gray-100">
                    氏名
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border sticky top-0 bg-gray-100">
                    部署
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border sticky top-0 bg-gray-100">
                    MODEL
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border sticky top-0 bg-gray-100">
                    S/N
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border sticky top-0 bg-gray-100">
                    工事番号
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border sticky top-0 bg-gray-100">
                    P/N
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border sticky top-0 bg-gray-100">
                    注文番号
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border sticky top-0 bg-gray-100">
                    数量
                  </th>
                  <th
                    className="px-4 py-2 text-left text-sm font-medium text-gray-600 border cursor-pointer hover:bg-gray-200 sticky top-0 bg-gray-100"
                    onClick={() => handleSort("unit_name")}
                  >
                    ユニット名{" "}
                    {sortConfig.sortBy === "unit_name" &&
                      (sortConfig.sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-4 py-2 text-left text-sm font-medium text-gray-600 border cursor-pointer hover:bg-gray-200 sticky top-0 bg-gray-100"
                    onClick={() => handleSort("work_type")}
                  >
                    工事区分{" "}
                    {sortConfig.sortBy === "work_type" &&
                      (sortConfig.sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-4 py-2 text-left text-sm font-medium text-gray-600 border cursor-pointer hover:bg-gray-200 sticky top-0 bg-gray-100"
                    onClick={() => handleSort("minutes")}
                  >
                    工数(分){" "}
                    {sortConfig.sortBy === "minutes" &&
                      (sortConfig.sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border sticky top-0 bg-gray-100">
                    備考
                  </th>
                  <th
                    className="px-4 py-2 text-left text-sm font-medium text-gray-600 border cursor-pointer hover:bg-gray-200 sticky top-0 bg-gray-100"
                    onClick={() => handleSort("status")}
                  >
                    ステータス{" "}
                    {sortConfig.sortBy === "status" &&
                      (sortConfig.sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border sticky top-0 bg-gray-100">
                    操作
                  </th>
                </tr>
              </thead>

              <tbody>
                {displayWorkLogs.length > 0 ? (
                  (() => {
                    // ✅ WorkHistory.jsxと同じ編集データマッピング処理を追加
                    const editMap = {};
                    const editedRows = new Set();

                    displayWorkLogs.forEach((log) => {
                      if (log.originalId) {
                        editMap[log.originalId] = log;
                        editedRows.add(log.id);
                      }
                    });

                    return displayWorkLogs
                      .map((log) => {
                        // ✅ 編集後データは単独で表示しない
                        if (editedRows.has(log.id)) {
                          return null;
                        }

                        // ✅ 編集前データに対応する編集後データを取得
                        const editedLog = editMap[log.id];
                        const isBeingEdited = !!editedLog;

                        return (
                          <tr
                            key={log.id}
                            id={`row-${log.id}`}
                            className={`${
                              [
                                "pending_add",
                                "pending_edit",
                                "pending_delete",
                              ].includes(log.status)
                                ? "bg-red-50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            {/* 日付 */}
                            <td className="px-4 py-2 border text-center">
                              {formatDate(log.date)}
                              {/* ✅ 編集後データがある場合は変更内容を表示 */}
                              {isBeingEdited && editedLog.date !== log.date && (
                                <div className="text-xs mt-1 text-green-600">
                                  ⇩<br />
                                  {formatDate(editedLog.date)}
                                </div>
                              )}
                            </td>

                            {/* 社員ID */}
                            <td className="px-4 py-2 border text-center">
                              {log.employeeId}
                              {/* 編集後データでemployeeIdが変わることは通常ないが、念のため */}
                              {isBeingEdited &&
                                editedLog.employeeId !== log.employeeId && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩<br />
                                    {editedLog.employeeId}
                                  </div>
                                )}
                            </td>

                            {/* 氏名 */}
                            <td className="px-4 py-2 border text-center">
                              {log.employeeName}
                              {isBeingEdited &&
                                editedLog.employeeName !== log.employeeName && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩<br />
                                    {editedLog.employeeName}
                                  </div>
                                )}
                            </td>

                            {/* 部署 */}
                            <td className="px-4 py-2 border text-center">
                              {log.department}
                              {isBeingEdited &&
                                editedLog.department !== log.department && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩<br />
                                    {editedLog.department}
                                  </div>
                                )}
                            </td>

                            {/* MODEL */}
                            <td className="px-4 py-2 border text-center">
                              {log.model}
                              {isBeingEdited &&
                                editedLog.model !== log.model && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩<br />
                                    {editedLog.model}
                                  </div>
                                )}
                            </td>

                            {/* S/N */}
                            <td className="px-4 py-2 border text-center">
                              {log.serialNumber}
                              {isBeingEdited &&
                                editedLog.serialNumber !== log.serialNumber && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩<br />
                                    {editedLog.serialNumber}
                                  </div>
                                )}
                            </td>

                            {/* 工事番号 */}
                            <td className="px-4 py-2 border text-center">
                              {log.workOrder}
                              {isBeingEdited &&
                                editedLog.workOrder !== log.workOrder && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩<br />
                                    {editedLog.workOrder}
                                  </div>
                                )}
                            </td>

                            {/* P/N */}
                            <td className="px-4 py-2 border text-center">
                              {log.partNumber}
                              {isBeingEdited &&
                                editedLog.partNumber !== log.partNumber && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩<br />
                                    {editedLog.partNumber}
                                  </div>
                                )}
                            </td>

                            {/* 注文番号 */}
                            <td className="px-4 py-2 border text-center">
                              {log.orderNumber}
                              {isBeingEdited &&
                                editedLog.orderNumber !== log.orderNumber && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩<br />
                                    {editedLog.orderNumber}
                                  </div>
                                )}
                            </td>

                            {/* 数量 */}
                            <td className="px-4 py-2 border text-center">
                              {log.quantity}
                              {isBeingEdited &&
                                editedLog.quantity !== log.quantity && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩<br />
                                    {editedLog.quantity}
                                  </div>
                                )}
                            </td>

                            {/* ユニット名 */}
                            <td className="px-4 py-2 border text-center">
                              {log.unitName}
                              {isBeingEdited &&
                                editedLog.unitName !== log.unitName && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩<br />
                                    {editedLog.unitName}
                                  </div>
                                )}
                            </td>

                            {/* 工事区分 */}
                            <td className="px-4 py-2 border text-center">
                              {log.workType}
                              {isBeingEdited &&
                                editedLog.workType !== log.workType && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩<br />
                                    {editedLog.workType}
                                  </div>
                                )}
                            </td>

                            {/* 工数(分) */}
                            <td className="px-4 py-2 border text-center">
                              {log.minutes}
                              {isBeingEdited &&
                                editedLog.minutes !== log.minutes && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩<br />
                                    {editedLog.minutes}
                                  </div>
                                )}
                            </td>

                            {/* 備考 */}
                            <td className="px-2 py-2 text-center border">
                              {log.remarks ? (
                                <FileText
                                  className={`h-5 w-5 cursor-pointer mx-auto ${
                                    editedLog?.remarks &&
                                    editedLog?.remarks !== log.remarks
                                      ? "text-green-600 hover:text-green-800"
                                      : "text-blue-600 hover:text-blue-800"
                                  }`}
                                  onClick={() => {
                                    setSelectedRemarks(log.remarks);
                                    setSelectedEditRemarks(
                                      editedLog?.remarks || ""
                                    );
                                    setRemarksModalOpen(true);
                                  }}
                                />
                              ) : (
                                "-"
                              )}
                            </td>

                            {/* ステータス */}
                            <td className="px-4 py-2 border text-center">
                              {(() => {
                                // 理由があるかどうかをチェック（rejected系のステータスを正しく判定）
                                const hasReason =
                                  (isBeingEdited && editedLog.editReason) ||
                                  (log.status === "pending_add" &&
                                    log.editReason) ||
                                  (log.status === "pending_delete" &&
                                    log.editReason) ||
                                  ([
                                    "rejected_add",
                                    "rejected_edit",
                                    "rejected_delete",
                                  ].includes(log.status) &&
                                    (log.rejectReason || log.editReason));

                                if (hasReason) {
                                  return (
                                    <button
                                      onClick={() =>
                                        openStatusModal(
                                          log,
                                          isBeingEdited ? editedLog : null
                                        )
                                      }
                                      className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${getStatusColorClass(
                                        log.status
                                      )}`}
                                    >
                                      {statusMap[log.status] || log.status}
                                      <span className="ml-1">📋</span>
                                    </button>
                                  );
                                } else {
                                  return (
                                    <span
                                      className={`px-2 py-1 rounded text-xs ${getStatusColorClass(
                                        log.status
                                      )}`}
                                    >
                                      {statusMap[log.status] || log.status}
                                    </span>
                                  );
                                }
                              })()}
                            </td>

                            {/* 操作 */}
                            <td className="px-4 py-2 border text-center">
                              {/* 申請中の場合のみ承認・却下ボタンを表示 */}
                              {[
                                "pending_add",
                                "pending_edit",
                                "pending_delete",
                              ].includes(log.status) ? (
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => {
                                      const type = log.status.replace(
                                        "pending_",
                                        ""
                                      );
                                      // ✅ edit操作の場合は編集後データのIDを使用
                                      const targetId =
                                        type === "edit"
                                          ? editMap[log.id]?.id || log.id
                                          : log.id;
                                      handleApprove(targetId, type);
                                    }}
                                    disabled={isProcessing}
                                  >
                                    承認
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => {
                                      const type = log.status.replace(
                                        "pending_",
                                        ""
                                      );
                                      // ✅ edit操作の場合は編集後データのIDを使用
                                      const targetId =
                                        type === "edit"
                                          ? editMap[log.id]?.id || log.id
                                          : log.id;
                                      openRejectDialog(targetId, type);
                                    }}
                                    disabled={isProcessing}
                                  >
                                    却下
                                  </Button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })
                      .filter(Boolean); // nullを除外
                  })()
                ) : (
                  <tr>
                    <td
                      colSpan="16"
                      className="px-4 py-4 text-center text-gray-500 border"
                    >
                      条件に一致するデータがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* ページネーションUI */}
          <div className="text-sm text-gray-700">
            全{pagination.totalItems}件
            {pagination.totalPages > 1 && (
              <>
                中 {(pagination.currentPage - 1) * pagination.perPage + 1}～
                {Math.min(
                  pagination.currentPage * pagination.perPage,
                  pagination.totalItems
                )}
                件を表示
              </>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrev || isLoading}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                >
                  前へ
                </Button>

                <Select
                  value={pagination.currentPage.toString()}
                  onValueChange={(value) => handlePageChange(parseInt(value))}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      { length: pagination.totalPages },
                      (_, i) => i + 1
                    ).map((page) => (
                      <SelectItem key={page} value={page.toString()}>
                        {page}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm">/ {pagination.totalPages}</span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNext || isLoading}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* 却下理由入力モーダル */}
      <RejectReasonDialog
        isOpen={rejectDialog.isOpen}
        reason={rejectDialog.reason}
        onClose={closeRejectDialog}
        onChange={handleReasonChange}
        onConfirm={handleReject}
        isProcessing={isProcessing}
      />
      {/* 備考モーダル */}
      <RemarksModal
        isOpen={remarksModalOpen}
        onClose={() => setRemarksModalOpen(false)}
        remarks={selectedRemarks}
        editRemarks={selectedEditRemarks}
      />
      {/* csvエクスポートモーダル */}
      <CSVExportDialog
        isOpen={csvDialog.isOpen}
        onClose={handleCancelCSVExport}
        onConfirm={handleConfirmCSVExport}
        itemCount={csvDialog.itemCount}
        isProcessing={csvDialog.isProcessing}
      />
      {/* ステータス理由モーダル */}
      <StatusReasonModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        status={selectedStatusData.status}
        editReason={selectedStatusData.editReason}
        rejectReason={selectedStatusData.rejectReason}
        statusMap={statusMap}
      />
    </div>
  );
};

export default AdminWork;
