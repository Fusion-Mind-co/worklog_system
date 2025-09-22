import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// リファクタリングで分割した独自コンポーネント
import TimeSelector from "@/components/worklog/TimeSelector";
import WorkLogTable from "@/components/worklog/WorkLogTable";
import Alert from "@/components/ui/Alert";

// APIサービスをインポート
import { saveWorkLog, getDailyWorkLog } from "@/services/worklogService";
import { getStoredUser } from "@/services/authService";
import { getUnitOptions } from "@/services/worklogService";
import RemarksModal from "@/components/RemarksModal";
import RemarksInputWorkLogModal from "@/components/worklog/RemarksInputWorkLogModal";
import { QRModal } from "@/components/QRModal";
import { FileText, CheckCircle, Plus, XCircle } from "lucide-react";

const WorkLog = () => {
  // 今日の日付を取得（固定）
  const today = new Date().toISOString().slice(0, 10);

  // 空の行を取得する関数 - 先に宣言する
  const getEmptyRow = (id) => ({
    id,
    model: "N/A",
    serialNumber: "N/A",
    workOrder: "N/A",
    partNumber: "N/A",
    orderNumber: "N/A",
    quantity: "N/A",
    unitName: "",
    workType: "",
    minutes: "",
    remarks: "",
    submitted: false,
    // ✅ 編集禁止項目を最初から設定
    lockedFields: [
      "model",
      "serialNumber",
      "workOrder",
      "partNumber",
      "orderNumber",
    ],
    // バリデーションで背景色をつけるかどうかを、行ごとに制御
    touched: false,
  });

  // 状態管理
  const [workDate] = useState(today);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // 反映時間を取得（現在時刻）
  const [lastSubmittedAt, setLastSubmittedAt] = useState(null);
  const [dailyLogs, setDailyLogs] = useState([]);
  //ユニット名/工事区分の状態管理
  const [unitOptions, setUnitOptions] = useState([]);
  const [unitWorkTypeMap, setUnitWorkTypeMap] = useState({});
  //工数入力時の備考欄モーダル表示の状態管理
  const [remarksInputModalOpen, setRemarksInputModalOpen] = useState(false);
  const [remarksTargetRowId, setRemarksTargetRowId] = useState(null);
  const [tempRemarks, setTempRemarks] = useState("");
  //反映後の備考欄モーダル表示の状態管理
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState("");
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // 工数入力時の備考欄モーダルを開く関数
  const openRemarksInputModal = (rowId, currentRemarks) => {
    setRemarksTargetRowId(rowId);
    setTempRemarks(currentRemarks);
    setRemarksInputModalOpen(true);
  };
  // 工数入力時の備考欄モーダル「はい」ボタン押下時、保存処理関数
  const handleSaveRemarks = () => {
    if (remarksTargetRowId != null) {
      handleFieldChange(remarksTargetRowId, "remarks", tempRemarks);
    }
    setRemarksInputModalOpen(false);
  };

  // 反映後の備考欄モーダルを開く関数
  const openRemarksModal = (text) => {
    setSelectedRemarks(text);
    setRemarksModalOpen(true);
  };

  // 工数入力行の状態
  const [workRows, setWorkRows] = useState(() => {
    // ローカルストレージから初期データを取得
    const savedData = localStorage.getItem("workLogRows");
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // 保存された日付が今日と同じなら復元、違う日なら新規
        if (parsedData.date === today) {
          return parsedData.rows;
        }
      } catch (e) {
        console.error("工数データの復元中にエラーが発生しました", e);
      }
    }
    // データがない場合や別の日付の場合は空の1行を返す
    // return [getEmptyRow(1)];

    // データがない場合や別の日付の場合は１行も表示しない。
    return [];
  });

  const handleQrReadTentative = () => {
    const newId =
      workRows.length > 0 ? Math.max(...workRows.map((row) => row.id)) + 1 : 1;

    const newRow = {
      id: newId,
      model: "QR_MODEL",
      serialNumber: "QR_SN",
      workOrder: "QR_工事番号",
      partNumber: "QR_P/N",
      orderNumber: "QR_注文番号",
      quantity: "1",
      unitName: "",
      workType: "",
      minutes: "",
      remarks: "QRから取得(仮)",
      lockedFields: [
        "model",
        "serialNumber",
        "workOrder",
        "partNumber",
        "orderNumber",
      ],
    };

    setWorkRows([...workRows, newRow]);
  };

  // QRコードから受け取った情報で行を追加する関数（QRModalから呼ばれる）
  const handleQrSubmit = ({
    model,
    serialNumber,
    workOrder,
    partNumber,
    orderNumber,
    quantity,
  }) => {
    // 新しいIDを計算（既存の最大ID + 1）
    const newId =
      workRows.length > 0 ? Math.max(...workRows.map((row) => row.id)) + 1 : 1;

    // QRデータをもとに新しい行を作成
    const newRow = {
      id: newId,
      model, // QRコードから取得したモデル名
      serialNumber, // QRコードから取得したシリアル番号
      workOrder, // QRコードから取得した工事番号
      partNumber, // QRコードから取得した部品番号
      orderNumber, // QRコードから取得した注文番号
      quantity, // QRコードから取得した数量
      unitName: "", // ユニット名（未選択）
      workType: "", // 工事区分（未選択）
      minutes: "", // 工数（未入力）
      remarks: "QRから取得", // 備考（自動補足）
      lockedFields: [
        // 編集をロックするフィールド
        "model",
        "serialNumber",
        "workOrder",
        "partNumber",
        "orderNumber",
      ],
    };

    // 行を追加して状態を更新
    setWorkRows([...workRows, newRow]);
  };

  // 合計工数
  const [totalMinutes, setTotalMinutes] = useState(0);

  // 時間選択モーダル用の状態
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);

  // 通知アラート用の状態
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
    autoClose: true, // ✅ 追加
  });

  // 初期データのロード
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // DBデータ
        const response = await getDailyWorkLog(today);
        let submittedRows = [];

        if (response.workRows && response.workRows.length > 0) {
          submittedRows = response.workRows.map((row) => ({
            ...row,
            submitted: true,
            quantity:
              row.quantity === null ||
              row.quantity === undefined ||
              row.quantity === ""
                ? "N/A"
                : row.quantity,
          }));
        }

        // ローカルデータ
        const savedData = localStorage.getItem("workLogRows");
        let localRows = [];
        if (savedData) {
          try {
            const parsedData = JSON.parse(savedData);
            if (parsedData.date === today) {
              localRows = parsedData.rows;
            }
          } catch (e) {
            console.warn("ローカルデータのパースに失敗", e);
          }
        }

        // マージ：localの同一IDがあればそれを優先、なければDBの行
        const localRowMap = new Map(localRows.map((r) => [r.id, r]));
        const merged = [];

        // DB行をマージ
        for (const dbRow of submittedRows) {
          if (localRowMap.has(dbRow.id)) {
            merged.push(localRowMap.get(dbRow.id)); // ローカルの編集後データを使う
            localRowMap.delete(dbRow.id);
          } else {
            merged.push(dbRow); // DBだけにある場合
          }
        }

        // ローカルだけに存在する新規行（ID未使用のもの）を追加
        merged.push(...Array.from(localRowMap.values()));

        setDailyLogs(submittedRows); // DBそのまま表示用
        setWorkRows(merged); // 編集可能エリア用
        calculateTotal(merged);
      } catch (error) {
        console.error("データ取得エラー:", error);
        setAlert({
          show: true,
          message:
            typeof error === "string" ? error : "データの取得に失敗しました",
          type: "error",
          autoClose: true,
        });

        // ローカルのみ復元
        const savedData = localStorage.getItem("workLogRows");
        if (savedData) {
          try {
            const parsedData = JSON.parse(savedData);
            if (parsedData.date === today) {
              setWorkRows(parsedData.rows);
              calculateTotal(parsedData.rows);
            } else {
              setWorkRows([]);
            }
          } catch (e) {
            setWorkRows([]);
          }
        } else {
          setWorkRows([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [today]);

  //ユニット名/工事区分
  useEffect(() => {
    const fetchUnitOptions = async () => {
      try {
        const data = await getUnitOptions(); // ← API呼び出し
        const options = data.map((item) => item.name);
        const map = {};
        data.forEach((item) => {
          map[item.name] = item.work_types;
        });

        setUnitOptions(options);
        setUnitWorkTypeMap(map);
      } catch (error) {
        console.error("ユニット名・工事区分の取得に失敗しました", error);
      }
    };

    fetchUnitOptions();
  }, []);

  // 工数データ変更時にローカルストレージに保存
  useEffect(() => {
    if (!isLoading) {
      // 合計工数を再計算
      calculateTotal(workRows);

      // ローカルストレージに保存
      localStorage.setItem(
        "workLogRows",
        JSON.stringify({
          date: today,
          rows: workRows,
        })
      );
    }
  }, [workRows, today, isLoading]);

  // 行を追加
  const addRow = () => {
    const newId =
      workRows.length > 0 ? Math.max(...workRows.map((row) => row.id)) + 1 : 1;

    const newRow = getEmptyRow(newId);
    setWorkRows([...workRows, newRow]);
  };

  // 行を削除
  const deleteRow = (id) => {
    const updatedRows = workRows.filter((row) => row.id !== id);

    // 行がすべて削除された場合は空の行を追加
    // if (updatedRows.length === 0) {
    //   updatedRows.push(getEmptyRow(1));
    // }

    setWorkRows(updatedRows);
    calculateTotal(updatedRows);
  };

  // 行をコピー
  const copyRow = (id) => {
    const rowToCopy = workRows.find((row) => row.id === id);
    const newId = Math.max(...workRows.map((row) => row.id)) + 1;

    const newRow = {
      ...rowToCopy,
      id: newId,
      minutes: "", // 工数はコピーしない
      submitted: false, // ✅ 青背景を無効にする
      duplicate: false, // ✅ 赤背景もリセット
      touched: false, // ✅ バリデーション表示もリセット
    };

    setWorkRows([...workRows, newRow]);
  };

  // フィールド変更ハンドラ
  const handleFieldChange = (id, field, value) => {
    let updatedRows = workRows.map((row) => {
      if (row.id === id) {
        const isModified = row.submitted && row[field] !== value;

        const modifiedFields = {
          ...(row.modifiedFields || {}),
          [field]: isModified,
        };

        // ✅ 数量が "N/A" の場合は強制的に文字列として扱う
        if (field === "quantity" && value.toUpperCase?.() === "N/A") {
          return {
            ...row,
            quantity: "N/A",
            lockedFields: row.lockedFields || [],
          };
        }

        return {
          ...row,
          [field]: value,
          lockedFields: row.lockedFields || [],
          modifiedFields,
        };
      }
      return row;
    });

    // ✅ 「N工数」を選んだらその他の項目をN/Aにする
    if (field === "workType" && value === "N工数") {
      updatedRows = workRows.map((row) => {
        if (row.id === id) {
          return {
            ...row,
            workType: value,
            model: "N/A",
            serialNumber: "N/A",
            workOrder: "N/A",
            partNumber: "N/A",
            orderNumber: "N/A",
            quantity: "N/A",
            lockedFields: [
              "model",
              "serialNumber",
              "workOrder",
              "partNumber",
              "orderNumber",
            ],
          };
        }
        return row;
      });

      // 履歴保存
      const key = "recentWorkTypes";
      const saved = JSON.parse(localStorage.getItem(key)) || [];
      const newHistory = [value, ...saved.filter((v) => v !== value)];
      localStorage.setItem(key, JSON.stringify(newHistory.slice(0, 3)));

      setWorkRows(updatedRows);
      return;
    }

    // ✅ unitName 変更時に workType を自動チェック・リセット
    if (field === "unitName") {
      const availableWorkTypes = unitWorkTypeMap[value] || [];
      const currentRow = workRows.find((r) => r.id === id);
      const currentWorkType = currentRow?.workType || "";
      const resetWorkType = availableWorkTypes.includes(currentWorkType)
        ? currentWorkType
        : "";

      updatedRows = workRows.map((row) => {
        if (row.id === id) {
          const isModified = row.submitted && row.unitName !== value;

          const modifiedFields = {
            ...(row.modifiedFields || {}),
            unitName: isModified,
          };

          if (resetWorkType === "") {
            delete modifiedFields.workType;
          }

          return {
            ...row,
            unitName: value,
            workType: resetWorkType, // 不正なworkTypeはリセット
            modifiedFields,
            touched: resetWorkType === "" ? true : row.touched,
          };
        }
        return row;
      });

      // 履歴保存
      const key = "recentUnits";
      const saved = JSON.parse(localStorage.getItem(key)) || [];
      const newHistory = [value, ...saved.filter((v) => v !== value)];
      localStorage.setItem(key, JSON.stringify(newHistory.slice(0, 3)));

      setWorkRows(updatedRows);
      return;
    }

    // workType 選択時の履歴保存
    if (field === "workType") {
      const key = "recentWorkTypes";
      const saved = JSON.parse(localStorage.getItem(key)) || [];
      const newHistory = [value, ...saved.filter((v) => v !== value)];
      localStorage.setItem(key, JSON.stringify(newHistory.slice(0, 3)));
    }

    setWorkRows(updatedRows);

    if (field === "minutes") {
      calculateTotal(updatedRows);
    }
  };

  // 合計工数を計算
  const calculateTotal = (rows) => {
    const total = rows.reduce((sum, row) => {
      const minutes =
        row.minutes && row.minutes !== "N/A" ? parseInt(row.minutes) : 0;
      return sum + minutes;
    }, 0);
    setTotalMinutes(total);
  };

  // 全て削除
  const clearAll = () => {
    if (
      window.confirm("本日入力した工数をすべて削除します。よろしいですか？")
    ) {
      // 初期値は空の１行
      // const emptyRow = getEmptyRow(1);
      // setWorkRows([emptyRow]);

      setWorkRows([]);
      setTotalMinutes(0);
    }
  };

  // 時間選択ダイアログを開く
  const openTimeSelector = (rowId) => {
    setSelectedRowId(rowId);
    setTimeModalOpen(true);
  };

  // 時間選択結果を保存
  const saveTimeSelection = (minutes) => {
    if (selectedRowId) {
      handleFieldChange(selectedRowId, "minutes", minutes.toString());
    }
  };

  // 工数入力を送信
  const submitWorkLog = async () => {
    // ✅ 未入力バリデーション
    const validatedRows = workRows.map((row) => ({
      ...row,
      touched: true,
    }));
    setWorkRows(validatedRows);

    // 入力チェック
    const hasEmptyRequired = validatedRows.some(
      (row) =>
        !row.id ||
        !row.model ||
        !row.serialNumber ||
        !row.workOrder ||
        !row.partNumber ||
        !row.orderNumber ||
        row.quantity === "" ||
        row.quantity === undefined ||
        row.quantity === null ||
        !row.unitName ||
        !row.workType ||
        !row.minutes
    );

    if (hasEmptyRequired) {
      setAlert({
        show: true,
        message:
          "入力されていない項目があります。✅ マークのない行をご確認ください。",
        type: "error",
        autoClose: false,
      });

      return;
    }

    // 重複バリデーション（行/工数/備考欄を除く）
    const duplicateGroups = getDuplicateGroups();

    if (duplicateGroups.length > 0) {
      const allDupIds = new Set(duplicateGroups.flat());

      const messageLines = [
        "次の行で入力内容の重複があります。",
        "内容をご確認の上、必要に応じて修正してください：",
      ];
      duplicateGroups.forEach((ids) => {
        messageLines.push(`・行ID: ${ids.join("・")}`);
      });

      setAlert({
        show: true,
        message: messageLines.join("\n"),
        type: "error",
        autoClose: false, // バリデーション手動で閉じる
      });

      const marked = workRows.map((row) =>
        allDupIds.has(row.id)
          ? { ...row, duplicate: true }
          : { ...row, duplicate: false }
      );
      setWorkRows(marked);
      return;
    }

    try {
      setIsSaving(true);

      // APIにデータを送信
      const response = await saveWorkLog({
        workDate,
        workRows: workRows.filter(
          (row) => row.unitName && row.workType && row.minutes
        ),
      });

      // 成功通知を表示
      setAlert({
        show: true,
        message: "工数が正常に反映されました。",
        type: "success",
        autoClose: true,
      });

      // 反映済みの行（すべての必須項目が入力されている行）に submitted: true フラグを付けて、
      // 入力テーブル上で反映済みの行に識別用の背景色を付けられるようにする
      const updatedRows = workRows.map((row) => {
        if (row.unitName && row.workType && row.minutes) {
          const cleanedModifiedFields = { ...row.modifiedFields };
          // 入力が正しく行われた項目は色表示を戻す（削除する）
          ["unitName", "workType", "minutes", "quantity"].forEach((field) => {
            if (cleanedModifiedFields[field]) {
              const value = row[field];
              const isEmpty =
                value === undefined ||
                value === null ||
                value === "" ||
                value === "N/A";
              if (!isEmpty) {
                delete cleanedModifiedFields[field]; // ✅ 再反映成功 → yellow色を外す
              }
            }
          });

          return {
            ...row,
            submitted: true,
            duplicate: false,
            modifiedFields: cleanedModifiedFields,
          };
        }
        return row;
      });
      setWorkRows(updatedRows);

      //入力行データをlocalStorage に保存を追加！
      localStorage.setItem(
        "workLogRows",
        JSON.stringify({
          date: today,
          rows: updatedRows,
        })
      );

      //現在時刻を記録
      setLastSubmittedAt(new Date());

      // 最終更新日時を更新　※現在時刻表示に変更の為不要になったなった
      // if (response.updated_at) {
      //   setLastUpdated(response.updated_at);
      // }

      // 最新の日次工数データを取得
      try {
        const dailyData = await getDailyWorkLog(today);
        if (dailyData.workRows) {
          setDailyLogs(dailyData.workRows);
        }
      } catch (err) {
        console.error("日次データ取得エラー:", err);
      }
    } catch (error) {
      console.error("送信エラー:", error);
      setAlert({
        show: true,
        message:
          typeof error === "string" ? error : "工数の反映に失敗しました。",
        type: "error",
        autoClose: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 工数の重複入力防止　行/工数/備考以外が一致したデータが既にある場合
  // 重複している行をグループ単位で取得（3行以上も対応）
  const getDuplicateGroups = () => {
    const keyMap = new Map();

    for (const row of workRows) {
      const key = [
        row.model,
        row.serialNumber,
        row.workOrder,
        row.partNumber,
        row.orderNumber,
        row.quantity,
        row.unitName,
        row.workType,
      ].join("::");

      if (!keyMap.has(key)) {
        keyMap.set(key, []);
      }

      keyMap.get(key).push(row.id);
    }

    // 2件以上の同一キーがあるものだけを返す
    return Array.from(keyMap.values()).filter((group) => group.length >= 2);
  };

  return (
    <div className="space-y-1">
      {/* 日付選択＋ボタン群 */}
      {/* <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6"> */}
      <div
        className="
          flex flex-wrap items-center
          gap-x-4 gap-y-2
          justify-start
        "
      >
        {/* ── 上段: 日付（当日のみ）＋合計工数 ── */}
        <div className="flex items-center space-x-6">
          {/* 日付 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium whitespace-nowrap">
              日付（当日のみ）
            </span>
            <span className="text-sm py-2 px-3 bg-gray-100 border rounded-md h-9 flex items-center">
              {new Date(workDate).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </span>
          </div>

          {/* 合計工数 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium whitespace-nowrap">
              合計工数
            </span>
            <span className="text-sm h-9 flex items-center font-bold truncate">
              {totalMinutes} 分（{Math.floor(totalMinutes / 60)}時間{" "}
              {totalMinutes % 60}分）
            </span>
          </div>
        </div>
        {/* QR読み取りボタン（仮）*/}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-9 bg-blue-400 hover:bg-blue-500"
            onClick={() => setIsQrModalOpen(true)}
          >
            QR読み取り
          </Button>

          <Button
            variant="outline"
            className="h-9 bg-blue-400 hover:bg-blue-500"
            onClick={handleQrReadTentative}
          >
            (仮)QR読み取り
          </Button>

          <div className="flex items-center space-x-2">
            {/* 行追加 */}
            <Button
              className="bg-gray-100 hover:bg-gray-200 text-gray-800"
              variant="outline"
              onClick={addRow}
            >
              <Plus className="mr-2 w-4 h-4" />
              行追加
            </Button>

            {/* 全て削除 */}
            <Button
              className="bg-red-100 hover:bg-red-200 text-red-600"
              variant="outline"
              onClick={clearAll}
            >
              <XCircle className="mr-2 w-4 h-4" />
              全て削除
            </Button>
          </div>
        </div>

        {/* ─── 右寄せで工数反映 ─── */}
        <div className="ml-auto">
          <Button
            onClick={submitWorkLog}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white h-12 px-6 text-base font-semibold flex items-center"
          >
            <CheckCircle className="mr-2 w-5 h-5" />
            {isSaving ? "保存中..." : "工数反映"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <div
            style={{ maxHeight: "360px", minHeight: "360px" }}
            className="overflow-y-auto"
          >
            <WorkLogTable
              workRows={workRows}
              handleFieldChange={handleFieldChange}
              copyRow={copyRow}
              deleteRow={deleteRow}
              openTimeSelector={openTimeSelector}
              unitOptions={unitOptions}
              // workTypeOptions={workTypeOptions}
              dailyLogs={dailyLogs}
              unitWorkTypeMap={unitWorkTypeMap}
              openRemarksInputModal={openRemarksInputModal}
            />
          </div>
        </CardContent>
      </Card>

      {/* 本日の反映済み工数一覧 */}
      {workRows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-start gap-4">
              <CardTitle className="text-base">本日の反映済み工数</CardTitle>
              {lastSubmittedAt && (
                <p className="text-sm text-gray-500 whitespace-nowrap">
                  最終反映:{" "}
                  {lastSubmittedAt.toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="px-2 py-2 border whitespace-nowrap min-w-[20px] truncate">
                      No.
                    </th>
                    <th className="px-2 py-2 border whitespace-nowrap min-w-[80px] truncate">
                      MODEL
                    </th>
                    <th className="px-2 py-2 border whitespace-nowrap min-w-[45px] truncate">
                      S/N
                    </th>
                    <th className="px-2 py-2 border whitespace-nowrap min-w-[80px] truncate">
                      工事番号
                    </th>
                    <th className="px-2 py-2 border whitespace-nowrap min-w-[80px] truncate">
                      P/N
                    </th>
                    <th className="px-2 py-2 border whitespace-nowrap min-w-[80px] truncate">
                      注文番号
                    </th>
                    <th className="px-2 py-2 border whitespace-nowrap min-w-[45px] truncate">
                      数量
                    </th>
                    <th className="px-2 py-2 border whitespace-nowrap min-w-[100px] truncate">
                      ユニット名
                    </th>
                    <th className="px-2 py-2 border whitespace-nowrap min-w-[100px] truncate">
                      工事区分
                    </th>
                    <th className="px-2 py-2 border whitespace-nowrap min-w-[90px] truncate">
                      工数(分)
                    </th>
                    <th className="px-2 py-2 border whitespace-nowrap min-w-[40px] truncate">
                      備考
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dailyLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-2 py-2 border text-center">
                        <div className="max-w-full truncate">{log.id}</div>
                      </td>
                      <td className="px-2 py-2 border text-center">
                        <div className="max-w-full truncate">{log.model}</div>
                      </td>
                      <td className="px-2 py-2 border text-center">
                        <div className="max-w-full truncate">
                          {log.serialNumber}
                        </div>
                      </td>
                      <td className="px-2 py-2 border text-center">
                        <div className="max-w-full truncate">
                          {log.workOrder}
                        </div>
                      </td>
                      <td className="px-2 py-2 border text-center">
                        <div className="max-w-full truncate">
                          {log.partNumber}
                        </div>
                      </td>
                      <td className="px-2 py-2 border text-center">
                        <div className="max-w-full truncate">
                          {log.orderNumber}
                        </div>
                      </td>
                      <td className="px-2 py-2 border text-center">
                        {log.quantity?.toUpperCase?.() === "N/A" ||
                        !log.quantity
                          ? "N/A"
                          : log.quantity}
                      </td>
                      <td className="px-2 py-2 border text-center">
                        <div className="max-w-full truncate">
                          {log.unitName}
                        </div>
                      </td>
                      <td className="px-2 py-2 border text-center">
                        <div className="max-w-full truncate">
                          {log.workType}
                        </div>
                      </td>
                      <td className="px-2 py-2 border  text-center">
                        <div className="max-w-full truncate">{log.minutes}</div>
                      </td>
                      <td className="px-2 py-2 border text-center">
                        {log.remarks && log.remarks.length > 0 && (
                          <button
                            onClick={() => openRemarksModal(log.remarks)}
                            className="text-blue-600 hover:text-blue-800"
                            title="備考を表示"
                          >
                            <FileText className="h-5 w-5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 時間選択モーダル */}
      <TimeSelector
        isOpen={timeModalOpen}
        onClose={() => setTimeModalOpen(false)}
        onSave={saveTimeSelection}
        initialMinutes={
          selectedRowId
            ? parseInt(
                workRows.find((row) => row.id === selectedRowId)?.minutes || "0"
              )
            : 0
        }
      />

      {/* 通知アラート */}
      {alert.show && (
        <Alert
          message={alert.message}
          type={alert.type}
          autoClose={alert.autoClose}
          onClose={() => setAlert({ ...alert, show: false })}
        />
      )}
      {/* 備考欄入力モーダル  */}
      <RemarksInputWorkLogModal
        isOpen={remarksInputModalOpen}
        onClose={() => setRemarksInputModalOpen(false)}
        onSave={handleSaveRemarks}
        value={tempRemarks}
        onChange={(e) => setTempRemarks(e.target.value)}
      />

      {/* 備考欄モーダル */}
      <RemarksModal
        isOpen={remarksModalOpen}
        onClose={() => setRemarksModalOpen(false)}
        remarks={selectedRemarks}
      />

      {/* QRモーダル（QRコード読み取り用） */}
      <QRModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onSubmitQR={handleQrSubmit} // ← QRデータ送信先コールバックを追加
      />
    </div>
  );
};

export default WorkLog;
