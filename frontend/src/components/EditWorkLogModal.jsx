import { useState, useEffect } from "react";
import { resubmitRejectedWorkLog } from "@/services/workHistoryService";

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

const EditWorkLogModal = ({
  isOpen,
  onClose,
  workLog,
  onSubmit,
  unitOptions,
  unitWorkTypeMap,
}) => {
  // 編集用のフォームデータの状態
  const [formData, setFormData] = useState({
    id: "",
    date: "",
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
    editReason: "",
  });

  // 送信中の状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  //モーダル内のキャンセル時の状態管理
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  //ユニット名/工事区分の状態管理
  const [workTypeOptions, setWorkTypeOptions] = useState([]); // ← 表示用の工事区分
  // タイトル用の状態変数を追加
  const [isResubmission, setIsResubmission] = useState(false);

  // workLogが変更されたときにフォームデータを更新
  useEffect(() => {
    if (workLog) {
      // 日付形式を変換 (ISO形式に変換)
      const formatDateForInput = (dateString) => {
        const date = new Date(dateString);
        return date.toISOString().split("T")[0];
      };

      // 再申請かどうかを判定
      const isRejected =
        workLog.status === "rejected_add" || workLog.status === "rejected_edit";
      setIsResubmission(isRejected);

      // 却下理由があれば、編集理由のデフォルト値に設定
      let defaultEditReason = "";
      if (isRejected && workLog.editReason) {
        defaultEditReason = `前回の却下理由: ${workLog.editReason}\n\n編集内容: `;
      }

      setFormData({
        id: workLog.id,
        date: formatDateForInput(workLog.date),
        model: workLog.model || "",
        serialNumber: workLog.serialNumber || "",
        workOrder: workLog.workOrder || "",
        partNumber: workLog.partNumber || "",
        orderNumber: workLog.orderNumber || "",
        quantity: workLog.quantity || "",
        unitName: workLog.unitName || "",
        workType: workLog.workType || "",
        minutes: workLog.minutes ? String(workLog.minutes) : "",
        remarks: workLog.remarks || "",
        editReason: defaultEditReason,
        // 元のステータスを保持
        originalStatus: workLog.status,
      });

      // 工事区分のプルダウンをユニット名に合わせて初期化
      if (workLog.unitName && unitWorkTypeMap[workLog.unitName]) {
        setWorkTypeOptions(unitWorkTypeMap[workLog.unitName]);
      } else {
        setWorkTypeOptions([]);
      }
    }
  }, [workLog, unitWorkTypeMap]);

  // 入力フィールドの変更ハンドラ
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Select コンポーネントの変更ハンドラ
  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (formData.unitName) {
      const options = unitWorkTypeMap[formData.unitName] || [];
      setWorkTypeOptions(options);

      // 既存の workType が options に含まれていなければリセット
      if (!options.includes(formData.workType)) {
        setFormData((prev) => ({ ...prev, workType: "" }));
      }
    }
  }, [formData.unitName, unitWorkTypeMap]);

  // 申請時の確認用アラート
  const [confirmOpen, setConfirmOpen] = useState(false);

  //申請時に内容変更がない場合の処理
  const hasChanges = () => {
    if (!workLog) return false;

    const original = {
      date: new Date(workLog.date).toISOString().split("T")[0],
      model: workLog.model || "",
      serialNumber: workLog.serialNumber || "",
      workOrder: workLog.workOrder || "",
      partNumber: workLog.partNumber || "",
      orderNumber: workLog.orderNumber || "",
      quantity: String(workLog.quantity || ""),
      unitName: workLog.unitName || "",
      workType: workLog.workType || "",
      minutes: String(workLog.minutes || ""),
      remarks: workLog.remarks || "",
    };

    const keys = Object.keys(original);
    return keys.some((key) => formData[key] !== original[key]);
  };
  //申請時　各種バリデーション
  const handleCheckBeforeConfirm = () => {
    if (
      !formData.date ||
      !formData.unitName ||
      !formData.workType ||
      !formData.minutes
    ) {
      alert("必須項目を入力してください。");
      return;
    }

    // ✅ 日付が未来かどうかをチェック
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 今日の00:00と比較する

    if (selectedDate > today) {
      alert("未来の日付は選択できません。");
      return;
    }

    // 数値の検証
    const minutes = parseInt(formData.minutes, 10);
    if (isNaN(minutes) || minutes <= 0) {
      alert("工数は正の数値で入力してください。");
      return;
    }

    // 編集理由の検証
    if (!formData.editReason.trim()) {
      alert("申請するには編集理由を入力してください。");
      return;
    }

    // 内容に変更があるか検証
    if (!hasChanges()) {
      alert("編集内容に変更がありません。確認してください。");
      return;
    }

    // すべてOKなら確認アラートを表示
    setConfirmOpen(true);
  };

  // 申請処理ハンドラの修正
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // 送信用データの作成
      const submitData = {
        ...formData,
        minutes: parseInt(formData.minutes, 10), // 数値型に変換
      };

      // 再申請の場合は専用の関数を呼び出す
      if (isResubmission) {
        // ✅ レスポンスを受け取る
        const response = await resubmitRejectedWorkLog(submitData);

        console.log("再申請return data")
        console.log(response.data);

        // ✅ レスポンスを親コンポーネントに渡す
        await onSubmit(submitData, true, response); // responseを追加
      } else {
        // 通常の編集申請
        await onSubmit(submitData);
      }

      // 入力内容の初期化
      resetForm();

      // モーダルを閉じる
      onClose();
    } catch (error) {
      console.error("申請処理エラー:", error);
      alert(`申請処理に失敗しました: ${error.message || "不明なエラー"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // モーダルを閉じた場合の編集内容の初期化処理
  const resetForm = () => {
    if (workLog) {
      const formatDateForInput = (dateString) => {
        const date = new Date(dateString);
        return date.toISOString().split("T")[0];
      };

      setFormData({
        id: workLog.id,
        date: formatDateForInput(workLog.date),
        model: workLog.model || "",
        serialNumber: workLog.serialNumber || "",
        workOrder: workLog.workOrder || "",
        partNumber: workLog.partNumber || "",
        orderNumber: workLog.orderNumber || "",
        quantity: workLog.quantity || "",
        unitName: workLog.unitName || "",
        workType: workLog.workType || "",
        minutes: workLog.minutes ? String(workLog.minutes) : "",
        remarks: workLog.remarks || "",
        editReason: "",
      });
    }
  };

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
          // 何か入力されている場合は確認アラートを出す
          if (
            formData.date !== "" ||
            formData.model ||
            formData.serialNumber ||
            formData.workOrder ||
            formData.partNumber ||
            formData.orderNumber ||
            formData.quantity ||
            formData.unitName ||
            formData.workType ||
            formData.minutes ||
            formData.remarks ||
            formData.editReason
          ) {
            setCancelConfirmOpen(true);
          } else {
            onClose();
          }
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
        aria-describedby="dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isResubmission ? "工数データ再申請" : "工数データ編集"}
          </DialogTitle>
          {/* アクセシビリティのための説明文を追加 */}
          <p id="dialog-description" className="sr-only">
            工数データの{isResubmission ? "再申請" : "編集"}フォーム
          </p>
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
              />
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
              />
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
              />
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
              />
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
              />
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
                min={1}
                value={formData.quantity}
                onChange={handleChange}
              />
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
                value={formData.unitName} // ✅ value を追加
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

          {/* 編集理由 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="editReason"
              className="text-right text-sm font-medium"
            >
              編集理由 <span className="text-red-500">*</span>
              <span className="block text-xs text-gray-500">申請時必須</span>
            </label>
            <div className="col-span-3">
              <Input
                id="editReason"
                name="editReason"
                value={formData.editReason}
                onChange={handleChange}
                placeholder="申請する場合は編集理由を入力してください"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setCancelConfirmOpen(true)}>
            キャンセル
          </Button>

          <Button onClick={handleCheckBeforeConfirm} disabled={isSubmitting}>
            {isSubmitting ? "申請中..." : isResubmission ? "再申請" : "申請"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* 申請時　確認アラート */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isResubmission
                ? "編集して再申請しますか？"
                : "編集を申請しますか？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isResubmission
                ? "却下された工数データを編集して再申請します。よろしいですか？"
                : "入力された工数データを編集申請します。よろしいですか？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                handleSubmit();
              }}
            >
              {isResubmission ? "再申請" : "申請"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/*キャンセル　確認アラート  */}
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
                resetForm();
                setCancelConfirmOpen(false);
                onClose();
              }}
            >
              破棄して閉じる
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default EditWorkLogModal;
