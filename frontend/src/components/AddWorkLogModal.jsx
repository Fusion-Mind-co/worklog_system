import { useState, useEffect } from "react";
import { QRModal } from "@/components/QRModal";
import { getUnitOptions } from "@/services/workHistoryService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { QrCode } from "lucide-react";

const AddWorkLogModal = ({
  isOpen,
  onClose,
  onSubmit,
  unitOptions,
  unitWorkTypeMap,
  existingWorkLogs = [],
  onDuplicate,
}) => {
  // 現在の日付をデフォルトにする
  const today = new Date().toISOString().split("T")[0];

  // フォームデータの状態
  const [formData, setFormData] = useState({
    date: today,
    model: "",
    serialNumber: "",
    workOrder: "",
    partNumber: "",
    orderNumber: "",
    quantity: "",
    unitName: "",
    workType: "",
    minutes: "",
    remarks: "",
    addReason: "", // 追加理由
    lockedFields: [], // ロックされたフィールド
  });

  // QRモーダル表示状態
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // 送信中の状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  //モーダル内のキャンセル時の状態管理
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  //ユニット名/工事区分の状態管理
  const [workTypeOptions, setWorkTypeOptions] = useState([]); // ← 表示用の工事区分

  // 入力フィールドの変更ハンドラ
  const handleChange = (e) => {
    const { name, value } = e.target;

    // ロックされたフィールドは変更不可
    if (formData.lockedFields && formData.lockedFields.includes(name)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Select コンポーネントの変更ハンドラ
  const handleSelectChange = (name, value) => {
    // ロックされたフィールドは変更不可
    if (formData.lockedFields && formData.lockedFields.includes(name)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (formData.unitName) {
      setWorkTypeOptions(unitWorkTypeMap[formData.unitName] || []);
      setFormData((prev) => ({ ...prev, workType: "" }));
    }
  }, [formData.unitName, unitWorkTypeMap]);

  // QR読み取り（仮）処理
  const handleQRScan = () => {
    // QR読み取りのシミュレーション
    const qrData = {
      model: "QR_MODEL",
      serialNumber: "QR_SN",
      workOrder: "QR_工事番号",
      partNumber: "QR_P/N",
      orderNumber: "QR_注文番号",
      quantity: "1",
      remarks: "QRから取得(仮)",
      // QRで読み取ったフィールドはロック
      lockedFields: [
        "model",
        "serialNumber",
        "workOrder",
        "partNumber",
        "orderNumber",
      ],
    };

    // フォームデータを更新（既存の値と統合）
    setFormData((prev) => ({
      ...prev,
      ...qrData,
      lockedFields: qrData.lockedFields,
    }));
  };

  // QRモーダルから受け取ったデータでフォームを更新
  const handleQRSubmit = ({
    model,
    serialNumber,
    workOrder,
    partNumber,
    orderNumber,
    quantity,
  }) => {
    setFormData((prev) => ({
      ...prev,
      model,
      serialNumber,
      workOrder,
      partNumber,
      orderNumber,
      quantity,
      remarks: "QRから取得", // 備考に自動記入
      lockedFields: [
        "model",
        "serialNumber",
        "workOrder",
        "partNumber",
        "orderNumber",
      ],
    }));
  };

  // モーダルが閉じられたときにフォームをリセット
  const handleReset = () => {
    setFormData({
      date: today,
      model: "",
      serialNumber: "",
      workOrder: "",
      partNumber: "",
      orderNumber: "",
      quantity: "",
      unitName: "",
      workType: "",
      minutes: "",
      remarks: "",
      addReason: "",
      lockedFields: [],
    });
  };

  const validateForm = () => {
    console.log("🪵 バリデーション中のformData.unitName:", formData.unitName);
    console.log("🪵 比較対象existingWorkLogs:", existingWorkLogs);

    // 入力データの検証
    if (
      !formData.date ||
      !formData.unitName ||
      !formData.workType ||
      !formData.minutes
    ) {
      alert("必須項目を入力してください");
      return false;
    }
    // 日付が未来か検証
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      alert("今日以降の日付は選択できません");
      return false;
    }
    // 数値の検証
    const minutes = parseInt(formData.minutes, 10);
    if (isNaN(minutes) || minutes <= 0) {
      alert("工数は正の数値で入力してください");
      return false;
    }
    // 追加理由の検証（必須）
    if (!formData.addReason.trim()) {
      alert("追加理由を入力してください");
      return false;
    }

    //日時を"YYYY-MM-DD"形式で比較
    const normalizeDate = (dateStr) => {
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    // 重複チェック
    const duplicatedLog = existingWorkLogs.find((log) => {
      return (
        normalizeDate(log.date) === normalizeDate(formData.date) &&
        String(log.model) === String(formData.model) &&
        String(log.serialNumber) === String(formData.serialNumber) &&
        String(log.workOrder) === String(formData.workOrder) &&
        String(log.partNumber) === String(formData.partNumber) &&
        String(log.orderNumber) === String(formData.orderNumber) &&
        String(log.quantity) === String(formData.quantity) &&
        String(log.unitName) === String(formData.unitName) &&
        String(log.workType) === String(formData.workType)
      );
    });

    if (duplicatedLog) {
      onDuplicate?.(duplicatedLog.id);
      alert("同じ作業内容の工数がすでにあります。");
      onClose();
      return false;
    }

    return true;
  };

  // 申請時の確認用アラート
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 申請処理ハンドラ
  const handleSubmit = async () => {
    // バリデーションチェック
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // 送信用データの作成
      const submitData = {
        ...formData,
        minutes: formData.minutes,
        editReason: formData.addReason,
        action: "add",
      };

      // 親コンポーネントのonSubmit関数を呼び出し
      await onSubmit(submitData);

      // フォームをリセット
      handleReset();

      // モーダルを閉じる
      onClose();
    } catch (error) {
      console.error("追加処理エラー:", error);
      alert(`追加処理に失敗しました: ${error.message || "不明なエラー"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // フィールドがロックされているかチェック
  const isFieldLocked = (fieldName) => {
    return formData.lockedFields && formData.lockedFields.includes(fieldName);
  };

  console.log("✅ AddWorkLogModal レンダリング");
  // unitOptionsが空なら表示しない
  if (!unitOptions || unitOptions.length === 0) {
    console.log("⏳ unitOptions未取得、return nullします");
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          // onClose() はモーダルを閉じたいときにだけ明示的に呼ぶ
          setCancelConfirmOpen(true); // 入力があってもなくてもアラートを表示
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex justify-between items-center">
            <span>工数データ追加</span>
            {/* 実QRモーダルを開くボタン */}
            <Button
              variant="outline"
              className="h-9 bg-green-500 hover:bg-green-600 text-white"
              onClick={() => setIsQrModalOpen(true)}
            >
              <QrCode className="mr-1 h-4 w-4" /> QR読み取り
            </Button>

            {/* QR読み取りボタン */}
            <Button
              variant="outline"
              className="h-9 bg-blue-400 hover:bg-blue-500 text-white"
              onClick={handleQRScan}
            >
              <QrCode className="mr-1 h-4 w-4" /> (仮)QR読み取り
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* 日付 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="date" className="text-right text-sm font-medium">
              日付 <span className="text-red-500">*</span>
            </label>
            <div className="col-span-3">
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* MODEL */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="model" className="text-right text-sm font-medium">
              MODEL
            </label>
            <div className="col-span-3">
              <Input
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className={isFieldLocked("model") ? "bg-gray-100" : ""}
                readOnly={isFieldLocked("model")}
              />
              {isFieldLocked("model") && (
                <p className="text-xs text-blue-600 mt-1">
                  QRから取得（編集不可）
                </p>
              )}
            </div>
          </div>

          {/* S/N */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="serialNumber"
              className="text-right text-sm font-medium"
            >
              S/N
            </label>
            <div className="col-span-3">
              <Input
                id="serialNumber"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                className={isFieldLocked("serialNumber") ? "bg-gray-100" : ""}
                readOnly={isFieldLocked("serialNumber")}
              />
              {isFieldLocked("serialNumber") && (
                <p className="text-xs text-blue-600 mt-1">
                  QRから取得（編集不可）
                </p>
              )}
            </div>
          </div>

          {/* 工事番号 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="workOrder"
              className="text-right text-sm font-medium"
            >
              工事番号
            </label>
            <div className="col-span-3">
              <Input
                id="workOrder"
                name="workOrder"
                value={formData.workOrder}
                onChange={handleChange}
                className={isFieldLocked("workOrder") ? "bg-gray-100" : ""}
                readOnly={isFieldLocked("workOrder")}
              />
              {isFieldLocked("workOrder") && (
                <p className="text-xs text-blue-600 mt-1">
                  QRから取得（編集不可）
                </p>
              )}
            </div>
          </div>

          {/* P/N */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="partNumber"
              className="text-right text-sm font-medium"
            >
              P/N
            </label>
            <div className="col-span-3">
              <Input
                id="partNumber"
                name="partNumber"
                value={formData.partNumber}
                onChange={handleChange}
                className={isFieldLocked("partNumber") ? "bg-gray-100" : ""}
                readOnly={isFieldLocked("partNumber")}
              />
              {isFieldLocked("partNumber") && (
                <p className="text-xs text-blue-600 mt-1">
                  QRから取得（編集不可）
                </p>
              )}
            </div>
          </div>

          {/* 注文番号 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="orderNumber"
              className="text-right text-sm font-medium"
            >
              注文番号
            </label>
            <div className="col-span-3">
              <Input
                id="orderNumber"
                name="orderNumber"
                value={formData.orderNumber}
                onChange={handleChange}
                className={isFieldLocked("orderNumber") ? "bg-gray-100" : ""}
                readOnly={isFieldLocked("orderNumber")}
              />
              {isFieldLocked("orderNumber") && (
                <p className="text-xs text-blue-600 mt-1">
                  QRから取得（編集不可）
                </p>
              )}
            </div>
          </div>

          {/* 数量 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="quantity"
              className="text-right text-sm font-medium"
            >
              数量
            </label>
            <div className="col-span-3">
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                className={isFieldLocked("quantity") ? "bg-gray-100" : ""}
                readOnly={isFieldLocked("quantity")}
              />
              {isFieldLocked("quantity") && (
                <p className="text-xs text-blue-600 mt-1">
                  QRから取得（編集不可）
                </p>
              )}
            </div>
          </div>

          {/* ユニット名 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="unitName"
              className="text-right text-sm font-medium"
            >
              ユニット名 <span className="text-red-500">*</span>
            </label>
            <div className="col-span-3">
              <Select
                value={formData.unitName}
                onValueChange={(value) => {
                  handleSelectChange("unitName", value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ユニット名を選択" />
                </SelectTrigger>
                <SelectContent>
                  {(unitOptions || []).map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 工事区分 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="workType"
              className="text-right text-sm font-medium"
            >
              工事区分 <span className="text-red-500">*</span>
            </label>
            <div className="col-span-3">
              <Select
                value={formData.workType}
                onValueChange={(value) => handleSelectChange("workType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="工事区分を選択" />
                </SelectTrigger>
                <SelectContent>
                  {(workTypeOptions || []).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 工数(分) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="minutes" className="text-right text-sm font-medium">
              工数(分) <span className="text-red-500">*</span>
            </label>
            <div className="col-span-3">
              <Input
                id="minutes"
                name="minutes"
                type="number"
                min={5}
                step={5}
                value={formData.minutes}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* 備考 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="remarks" className="text-right text-sm font-medium">
              備考
            </label>
            <div className="col-span-3">
              <Input
                id="remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* 追加理由 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="addReason"
              className="text-right text-sm font-medium"
            >
              追加理由 <span className="text-red-500">*</span>
            </label>
            <div className="col-span-3">
              <Input
                id="addReason"
                name="addReason"
                value={formData.addReason}
                onChange={handleChange}
                placeholder="追加理由を入力してください"
                required
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <DialogClose asChild>
            <Button
              variant="outline"
              onClick={() => setCancelConfirmOpen(true)}
            >
              キャンセル
            </Button>
          </DialogClose>
          <Button
            onClick={() => {
              if (validateForm()) {
                setConfirmOpen(true); // ← バリデーションOKなら確認モーダル表示
              }
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "申請中..." : "追加"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* 申請時　確認アラート */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>追加を確定しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              入力された工数データを追加申請します。よろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                handleSubmit(); // 既存の送信関数を呼び出す
              }}
            >
              申請
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* キャンセル時　確認アラート */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>入力内容を破棄しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              入力中の内容は保存されません。よろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                onClick={() => setCancelConfirmOpen(false)}
              >
                戻る
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleReset();
                setCancelConfirmOpen(false);
                onClose(); // モーダルを閉じる
              }}
            >
              破棄して閉じる
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* QRモーダル本体（画面外にあってOK） */}
      <QRModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onSubmitQR={handleQRSubmit}
      />
    </Dialog>
  );
};

export default AddWorkLogModal;
