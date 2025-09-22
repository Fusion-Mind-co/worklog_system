import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUnitOptions } from "@/services/workHistoryService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Plus, Trash2, FileText } from "lucide-react";

import {
  getWorkLogHistory,
  submitWorkLogEdit,
  submitWorkLogAdd,
  submitWorkLogDelete,
  cancelWorkLogRequest,
  cancelRejectedAddRequest,
  cancelRejectedDeleteRequest,
} from "@/services/workHistoryService";

import EditWorkLogModal from "@/components/EditWorkLogModal";
import AddWorkLogModal from "@/components/AddWorkLogModal";
import DeleteWorkLogDialog from "@/components/DeleteWorkLogDialog";
import RemarksModal from "@/components/RemarksModal";
import StatusReasonModal from "@/components/StatusReasonModal";
import { statusMap, getStatusColorClass } from "@/constants/status";

// Socketサービス
import { getSocket } from "@/services/socketService";

const WorkHistory = () => {
  // localStorageの状態管理関数
  const saveStateToStorage = (key, value) => {
    try {
      localStorage.setItem(`workHistory_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error("状態保存エラー:", error);
    }
  };

  const loadStateFromStorage = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(`workHistory_${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.error("状態復元エラー:", error);
      return defaultValue;
    }
  };

  // デフォルト期間を計算（1ヶ月前～今日）
  const getDefaultDateRange = () => {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    return {
      startDate: oneMonthAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    };
  };

  // 履歴データ
  const [workLogs, setWorkLogs] = useState(() =>
    loadStateFromStorage("workLogs", [])
  );

  // フィルター状態（日付範囲を追加）
  const [filters, setFilters] = useState(() =>
    loadStateFromStorage("filters", {
      ...getDefaultDateRange(),
      model: "all",
      unitName: "all",
      workType: "all",
      status: "all",
    })
  );

  // ソート状態
  const [sortConfig, setSortConfig] = useState(() =>
    loadStateFromStorage("sortConfig", {
      key: "date",
      direction: "desc",
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

  // フィルター設定の表示/非表示
  const [isSetting, setIsSetting] = useState(() =>
    loadStateFromStorage("isSetting", true)
  );

  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "",
  });

  // モーダル関連の状態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWorkLog, setSelectedWorkLog] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [workLogToDelete, setWorkLogToDelete] = useState(null);

  // ユニット名/工事区分の状態管理
  const [unitOptions, setUnitOptions] = useState([]);
  const [unitWorkTypeMap, setUnitWorkTypeMap] = useState({});

  // 備考モーダル
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState("");
  const [selectedEditRemarks, setSelectedEditRemarks] = useState("");

  // ステータス理由モーダル用のstate
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatusData, setSelectedStatusData] = useState({
    status: "",
    editReason: "",
    rejectReason: "",
  });

  // 追加申請時の重複チェック背景色
  const [highlightedRowId, setHighlightedRowId] = useState(null);
  const highlightTimeoutRef = useRef(null);

  // ✅ Socket通知受信時は現在のページを再取得（パフォーマンス最適化）
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // ✅ 工数データ更新ハンドラー（承認・却下・申請時に受信）
    const handleWorklogUpdate = (data) => {
      console.log("【handleWorklogUpdate関数実行】");

      // ✅ 重いデータ処理を削除し、現在のページのみ再取得
      // data.worklog_dataは使用せず、fetchDataを呼び出して最新データを取得
      fetchData(pagination.currentPage, sortConfig.key, sortConfig.direction);

      // 却下数更新処理を追加
      if (data.reject_count !== undefined && window.rejectCount) {
        window.rejectCount();
      }
    };

    // Socketイベント登録（全て同じhandleWorklogUpdateを使用）
    socket.on("worklog_approved_with_data", handleWorklogUpdate); // 管理者承認時
    socket.on("worklog_rejected_with_data", handleWorklogUpdate); // 却下時も同じ関数で処理

    // クリーンアップ：コンポーネント終了時にイベント解除
    return () => {
      socket.off("worklog_approved_with_data", handleWorklogUpdate);
      socket.off("worklog_rejected_with_data", handleWorklogUpdate);
    };
  }, [pagination.currentPage, sortConfig.key, sortConfig.direction]); // ✅ 依存関係を追加

  // ページネーション関数
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
    fetchData(newPage);
  };

  // 検索ボタンハンドラー（新規追加）
  const handleSearch = async () => {
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

  // データベースから工数履歴データを取得（ページネーション・フィルタリング対応）
  const fetchData = async (
    page = 1,
    sortBy = sortConfig.key,
    sortDirection = sortConfig.direction
  ) => {
    setIsLoading(true);
    try {
      // フィルター条件をAPIに送信
      const response = await getWorkLogHistory(
        filters,
        page,
        100,
        sortBy,
        sortDirection
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
      const newSortConfig = { key: sortBy, direction: sortDirection };
      setSortConfig(newSortConfig);

      // 工数データを更新
      const newWorkLogs = response.workRows || [];
      const logsWithNames = newWorkLogs.map((log) => ({
        ...log,
        unitName: String(log.unitName ?? ""),
        workType: String(log.workType ?? ""),
      }));
      setWorkLogs(logsWithNames);

      // localStorageに状態保存
      saveStateToStorage("filters", filters);
      saveStateToStorage("pagination", newPagination);
      saveStateToStorage("sortConfig", newSortConfig);
      saveStateToStorage("workLogs", logsWithNames);
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

  // ✅ 編集処理（updated_dataレスポンス処理を削除）
  const handleSubmitWorkLogEdit = async (
    updatedWorkLog,
    refreshOnly = false,
    response = null
  ) => {
    try {
      if (!refreshOnly && !response) {
        response = await submitWorkLogEdit(updatedWorkLog);
      }

      // ✅ レスポンス処理を削除し、現在ページを再取得
      fetchData(pagination.currentPage, sortConfig.key, sortConfig.direction);

      // 却下数更新
      if (response?.reject_count !== undefined) {
        if (window.rejectCount) {
          window.rejectCount();
        }
      }

      setAlert({
        show: true,
        message: refreshOnly
          ? "工数データの再申請が完了しました"
          : "工数データの編集を申請しました",
        type: "success",
      });

      return { success: true };
    } catch (error) {
      console.error("編集申請エラー:", error);
      setAlert({
        show: true,
        message: typeof error === "string" ? error : "編集申請に失敗しました",
        type: "error",
      });
      return { success: false };
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

  // 各種申請時の日時表記を適切な表記に変換
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);

    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(1, "0");
    const day = String(date.getDate()).padStart(1, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  // 当日判定用ヘルパー関数
  const isToday = (dateString) => {
    const target = new Date(dateString);
    const today = new Date();
    return (
      target.getFullYear() === today.getFullYear() &&
      target.getMonth() === today.getMonth() &&
      target.getDate() === today.getDate()
    );
  };

  // ユニット名/工事区分のデータ取得（初期ロード）
  useEffect(() => {
    const fetchUnitOptions = async () => {
      try {
        const data = await getUnitOptions();
        console.log("✅ ユニット取得成功:", data);
        const options = data.map((item) => item.name);
        const map = {};
        data.forEach((item) => {
          map[item.name] = item.work_types;
        });

        setUnitOptions(options);
        setUnitWorkTypeMap(map);
      } catch (error) {
        console.error("ユニット・工事区分取得失敗:", error);
      }
    };

    fetchUnitOptions();
  }, []);

  // 初期データ取得
  useEffect(() => {
    // 初回は1ページ目のデータを取得
    fetchData(1);
  }, []);

  // フィルター変更ハンドラ
  const handleFilterChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value,
    });
  };

  // フィルターリセット処理
  const handleFilterReset = () => {
    // フィルター条件をリセット
    const resetFilters = {
      ...getDefaultDateRange(),
      model: "all",
      unitName: "all",
      workType: "all",
      status: "all",
    };
    setFilters(resetFilters);

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
      key: "date",
      direction: "desc",
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
  };

  // ソート処理
  const handleSort = (column) => {
    const newDirection =
      sortConfig.key === column && sortConfig.direction === "asc"
        ? "desc"
        : "asc";
    setSortConfig({ key: column, direction: newDirection });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchData(1, column, newDirection);
  };

  // 履歴の編集モーダルを開く
  const handleEdit = (workLog) => {
    setSelectedWorkLog(workLog);

    if (
      workLog.status === "rejected_add" ||
      workLog.status === "rejected_edit"
    ) {
      setSelectedWorkLog({
        ...workLog,
        isResubmission: true,
      });
    }

    setIsEditModalOpen(true);
  };

  // 削除ダイアログを開く
  const handleDelete = (workLog) => {
    setWorkLogToDelete(workLog);
    setIsDeleteDialogOpen(true);
  };

  // ✅ 履歴データの追加申請（updated_dataレスポンス処理を削除）
  const handleSubmitWorkLogAdd = async (newWorkLog) => {
    try {
      const response = await submitWorkLogAdd(newWorkLog);

      // ✅ APIレスポンスのupdated_data処理を削除し、現在ページを再取得
      fetchData(pagination.currentPage, sortConfig.key, sortConfig.direction);

      setAlert({
        show: true,
        message: "工数データの追加を申請しました",
        type: "success",
      });

      setTimeout(() => {
        setAlert({ show: false, message: "", type: "" });
      }, 3000);

      return response;
    } catch (error) {
      console.error("追加申請エラー:", error);
      setAlert({
        show: true,
        message: typeof error === "string" ? error : "追加申請に失敗しました",
        type: "error",
      });
      throw error;
    }
  };

  // ✅ 削除申請（updated_dataレスポンス処理を削除）
  const handleSubmitWorkLogDelete = async (deleteData) => {
    try {
      const response = await submitWorkLogDelete(deleteData);

      // ✅ APIレスポンスのupdated_data処理を削除し、現在ページを再取得
      fetchData(pagination.currentPage, sortConfig.key, sortConfig.direction);

      setAlert({
        show: true,
        message: "工数データの削除を申請しました",
        type: "success",
      });

      setTimeout(() => {
        setAlert({ show: false, message: "", type: "" });
      }, 3000);

      return response;
    } catch (error) {
      console.error("削除申請エラー:", error);
      setAlert({
        show: true,
        message: typeof error === "string" ? error : "削除申請に失敗しました",
        type: "error",
      });
      throw error;
    }
  };

  // ✅ 申請キャンセル処理（updated_dataレスポンス処理を削除）
  const handleCancelRequest = async (log) => {
    if (!window.confirm("申請を取り消しますか？")) return;

    try {
      let response;

      if (log.status === "pending_edit") {
        const editedLog = workLogs.find((item) => item.originalId === log.id);

        if (editedLog) {
          response = await cancelWorkLogRequest(editedLog);
        } else {
          response = await cancelWorkLogRequest(log);
        }
      } else if (log.status === "rejected_add") {
        response = await cancelRejectedAddRequest(log);
      } else if (log.status === "rejected_edit") {
        response = await cancelWorkLogRequest(log);
      } else if (log.status === "rejected_delete") {
        response = await cancelRejectedDeleteRequest(log);
      } else {
        response = await cancelWorkLogRequest(log);
      }

      // ✅ APIレスポンスのupdated_data処理を削除し、現在ページを再取得
      fetchData(pagination.currentPage, sortConfig.key, sortConfig.direction);

      // サイドメニューの却下件数更新
      if (typeof window.rejectCount === "function") {
        window.rejectCount();
      }

      setAlert({
        show: true,
        message: "申請を取り消しました",
        type: "success",
      });
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
    } catch (error) {
      console.error("申請取り消しエラー:", error);
      setAlert({
        show: true,
        message:
          typeof error === "string" ? error : "申請取り消しに失敗しました",
        type: "error",
      });
    }
  };

  // ステータス詳細を開く関数
  const openStatusModal = (log, editedLog = null) => {
    setSelectedStatusData({
      status: log.status,
      editReason: editedLog?.editReason || log.editReason || "",
      rejectReason: log.editReason || "", // WorkHistoryではrejectReasonもeditReasonに含まれる
    });
    setStatusModalOpen(true);
  };

  // ユニークなMODEL一覧（フィルター用）
  const models = [...new Set(workLogs.map((log) => log.model))].filter(Boolean);

  // ユニークな工事区分一覧（フィルター用）
  const workTypes = [...new Set(workLogs.map((log) => log.workType))].filter(
    Boolean
  );

  // アラート表示をクローズ
  const handleCloseAlert = () => {
    setAlert({ show: false, message: "", type: "" });
  };

  // ローディング中の表示
  if (isLoading && workLogs.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  // ローディング中の表示
  if (isLoading && workLogs.length === 0) {
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
            onClick={handleCloseAlert}
            className="ml-2 text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      )}

      {/* フィルター設定カード */}
      {isSetting ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>フィルター設定</CardTitle>
            <div className="flex gap-2">
              {pagination.totalItems}件
              <Button variant="outline" size="sm" onClick={handleFilterReset}>
                フィルターリセット
              </Button>
              <Button
                onClick={handleSearch}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                検索実行
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap gap-4 items-start">
              {/* 期間フィルター */}
              <div className="flex flex-col min-w-[350px] flex-1">
                <label className="text-sm font-medium mb-1">期間</label>
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

              {/* MODEL + 工事区分 + ステータス */}
              <div className="flex flex-col flex-1 min-w-[300px]">
                <div className="flex flex-row gap-4 flex-nowrap w-full overflow-x-auto">
                  {/* MODEL */}
                  <div className="flex-1 basis-0">
                    <label className="text-sm font-medium">MODEL</label>
                    <Select
                      value={filters.model}
                      onValueChange={(value) =>
                        handleFilterChange("model", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="全て" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全て</SelectItem>
                        {models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* ユニット名 */}
                  <div className="flex-1 basis-0">
                    <label className="text-sm font-medium">ユニット名</label>
                    <Select
                      value={filters.unitName}
                      onValueChange={(value) =>
                        handleFilterChange("unitName", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="全て" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全て</SelectItem>
                        {unitOptions.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* 工事区分 */}
                  <div className="flex-1 basis-0">
                    <label className="text-sm font-medium">工事区分</label>
                    <Select
                      value={filters.workType}
                      onValueChange={(value) =>
                        handleFilterChange("workType", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="全て" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全て</SelectItem>
                        {workTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ステータス */}
                  <div className="flex-1 basis-0">
                    <label className="text-sm font-medium">ステータス</label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) =>
                        handleFilterChange("status", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="全て" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全て</SelectItem>
                        <SelectItem value="draft">通常入力</SelectItem>
                        <SelectItem value="approved">承認済み</SelectItem>
                        <SelectItem value="pending_add">追加申請中</SelectItem>
                        <SelectItem value="pending_delete">
                          削除申請中
                        </SelectItem>
                        <SelectItem value="pending_edit">編集申請中</SelectItem>
                        <SelectItem value="rejected_add">追加却下</SelectItem>
                        <SelectItem value="rejected_edit">編集却下</SelectItem>
                        <SelectItem value="rejected_delete">
                          削除却下
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <div className="col-span-12 text-right px-4 pb-4">
            <button onClick={() => setIsSetting(false)}>
              フィルター設定を隠す　▲
            </button>
          </div>
        </Card>
      ) : (
        <div className="col-span-12 text-right px-4">
          <button onClick={() => setIsSetting(true)}>
            フィルター設定を開く　▼
          </button>
        </div>
      )}

      {/* 履歴表示カード */}
      <Card>
        <CardContent className="pt-4">
          {/* 追加ボタン */}
          <div className="pb-4">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-1 h-4 w-4" /> 追加
            </Button>
          </div>

          {/* テーブル表示 */}
          <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="bg-gray-100">
                  <th
                    className="px-4 py-2 text-center text-sm font-medium text-gray-600 border cursor-pointer"
                    onClick={() => handleSort("date")}
                  >
                    日付
                    {sortConfig.key === "date" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-600 border">
                    MODEL
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-600 border">
                    S/N
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-600 border">
                    工事番号
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-600 border">
                    P/N
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-600 border">
                    注文番号
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-600 border">
                    数量
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-600 border">
                    ユニット名
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-600 border">
                    工事区分
                  </th>
                  <th
                    className="px-4 py-2 text-center text-sm font-medium text-gray-600 border cursor-pointer"
                    onClick={() => handleSort("minutes")}
                  >
                    工数(分)
                    {sortConfig.key === "minutes" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-600 border w-16">
                    備考
                  </th>
                  <th
                    className="px-4 py-2 text-center text-sm font-medium text-gray-600 border cursor-pointer"
                    onClick={() => handleSort("status")}
                  >
                    ステータス
                    {sortConfig.key === "status" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-600 border">
                    操作
                  </th>
                </tr>
              </thead>

              <tbody>
                {workLogs.length > 0 ? (
                  (() => {
                    const editMap = {};
                    const editedRows = new Set();

                    workLogs.forEach((log) => {
                      if (log.originalId) {
                        editMap[log.originalId] = log;
                        editedRows.add(log.id);
                      }
                    });

                    const prioritizedWorkLogs = [
                      ...workLogs.filter((log) =>
                        [
                          "rejected_add",
                          "rejected_edit",
                          "rejected_delete",
                        ].includes(log.status)
                      ),
                      ...workLogs.filter(
                        (log) =>
                          ![
                            "rejected_add",
                            "rejected_edit",
                            "rejected_delete",
                          ].includes(log.status)
                      ),
                    ];

                    return prioritizedWorkLogs
                      .map((log) => {
                        if (editedRows.has(log.id)) {
                          return null;
                        }

                        const editedLog = editMap[log.id];
                        const isBeingEdited = !!editedLog;

                        return (
                          <tr
                            key={log.id}
                            id={`row-${log.id}`}
                            className={`${
                              log.id === highlightedRowId
                                ? "bg-red-100 border-red-400 border-y-4"
                                : [
                                    "rejected_add",
                                    "rejected_edit",
                                    "rejected_delete",
                                  ].includes(log.status)
                                ? "bg-red-50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            {/* 日付 */}
                            <td className="px-4 py-2 border text-center">
                              {formatDate(log.date)}
                              {isBeingEdited && editedLog.date !== log.date && (
                                <div className="text-xs mt-1 text-green-600">
                                  ⇩ <br />
                                  {formatDate(editedLog.date)}
                                </div>
                              )}
                            </td>

                            {/* MODEL */}
                            <td className="px-4 py-2 border text-center">
                              {log.model}
                              {isBeingEdited &&
                                editedLog.model !== log.model && (
                                  <div className="text-xs mt-1 text-green-600">
                                    ⇩ <br />
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
                                    ⇩ <br />
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
                                    ⇩ <br />
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
                                    ⇩ <br />
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
                                    ⇩ <br />
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
                                    ⇩ <br />
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
                                    ⇩ <br />
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
                                    ⇩ <br />
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
                                    ⇩ <br />
                                    {editedLog.minutes}
                                  </div>
                                )}
                            </td>

                            {/* 備考 */}
                            <td className="px-4 py-2 border text-center">
                              {log.remarks && log.remarks.trim() !== "" ? (
                                <button
                                  onClick={() => {
                                    setSelectedRemarks(log.remarks);
                                    setSelectedEditRemarks(
                                      editedLog?.remarks || ""
                                    );
                                    setRemarksModalOpen(true);
                                  }}
                                  className={
                                    editedLog?.remarks &&
                                    editedLog?.remarks !== log.remarks
                                      ? "text-green-600 hover:text-green-800"
                                      : "text-blue-600 hover:text-blue-800"
                                  }
                                  title="備考を表示"
                                >
                                  <FileText className="h-5 w-5 inline" />
                                </button>
                              ) : (
                                ""
                              )}
                            </td>

                            {/* ステータス */}
                            <td className="px-4 py-2 border text-center">
                              {(() => {
                                // 理由があるかどうかをチェック
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
                                    log.editReason);

                                if (hasReason) {
                                  return (
                                    <div>
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

                                      {/* 申請中/差戻し中の日時表示（既存のまま維持） */}
                                      {[
                                        "pending_add",
                                        "pending_edit",
                                        "pending_delete",
                                        "rejected_add",
                                        "rejected_edit",
                                        "rejected_delete",
                                      ].includes(log.status) &&
                                        log.updatedAt && (
                                          <div className="text-xs mt-1 text-gray-500">
                                            {formatDateTime(log.updatedAt)}
                                          </div>
                                        )}
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div>
                                      <span
                                        className={`px-2 py-1 rounded text-xs ${getStatusColorClass(
                                          log.status
                                        )}`}
                                      >
                                        {statusMap[log.status] || log.status}
                                      </span>

                                      {/* 申請中/差戻し中の日時表示（既存のまま維持） */}
                                      {[
                                        "pending_add",
                                        "pending_edit",
                                        "pending_delete",
                                        "rejected_add",
                                        "rejected_edit",
                                        "rejected_delete",
                                      ].includes(log.status) &&
                                        log.updatedAt && (
                                          <div className="text-xs mt-1 text-gray-500">
                                            {formatDateTime(log.updatedAt)}
                                          </div>
                                        )}
                                    </div>
                                  );
                                }
                              })()}
                            </td>

                            {/* 操作ボタン */}
                            <td className="px-4 py-2 border">
                              <div className="flex space-x-2">
                                {/* 通常状態の場合：「編集」「削除」ボタン */}
                                {(log.status === "draft" ||
                                  log.status === "approved") &&
                                  !isToday(log.date) && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(log)}
                                      >
                                        編集
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                                        onClick={() => handleDelete(log)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}

                                {/* 申請中の場合：「申請取り消し」ボタン */}
                                {[
                                  "pending_add",
                                  "pending_edit",
                                  "pending_delete",
                                ].includes(log.status) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50"
                                    onClick={() => handleCancelRequest(log)}
                                  >
                                    申請取り消し
                                  </Button>
                                )}

                                {/* 却下の場合：「申請取り消し」「編集して再申請」ボタン */}
                                {["rejected_add", "rejected_edit"].includes(
                                  log.status
                                ) && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50"
                                      onClick={() => handleCancelRequest(log)}
                                    >
                                      申請取り消し
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                                      onClick={() => handleEdit(log)}
                                    >
                                      編集して再申請
                                    </Button>
                                  </>
                                )}

                                {["rejected_delete"].includes(log.status) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50"
                                    onClick={() => handleCancelRequest(log)}
                                  >
                                    申請取り消し
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                      .filter(Boolean);
                  })()
                ) : (
                  <tr>
                    <td
                      colSpan="13"
                      className="px-4 py-4 text-center text-gray-500"
                    >
                      条件に一致する工数履歴がありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ページネーションUI */}
          <div className="mt-4 flex items-center justify-between">
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* モーダル類 */}
      <EditWorkLogModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        workLog={selectedWorkLog}
        onSubmit={handleSubmitWorkLogEdit}
        unitOptions={unitOptions}
        unitWorkTypeMap={unitWorkTypeMap}
      />

      <AddWorkLogModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSubmitWorkLogAdd}
        unitOptions={unitOptions}
        unitWorkTypeMap={unitWorkTypeMap}
        existingWorkLogs={workLogs}
        onDuplicate={(duplicateId) => {
          setHighlightedRowId(duplicateId);

          setTimeout(() => {
            const targetRow = document.getElementById(`row-${duplicateId}`);
            if (targetRow) {
              targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 300);

          if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
          }
          highlightTimeoutRef.current = setTimeout(() => {
            setHighlightedRowId(null);
          }, 5000);
        }}
      />

      <DeleteWorkLogDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        workLog={workLogToDelete}
        onConfirm={handleSubmitWorkLogDelete}
      />

      <RemarksModal
        isOpen={remarksModalOpen}
        onClose={() => setRemarksModalOpen(false)}
        remarks={selectedRemarks}
        editRemarks={selectedEditRemarks}
      />

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

export default WorkHistory;
