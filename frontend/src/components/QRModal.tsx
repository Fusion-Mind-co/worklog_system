// QRModal.tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { useState } from "react";

/**
 * QRコードモーダル
 * 入力されたQRコード文字列をパースして、WorkLog側にデータを送信する
 */
export function QRModal({ isOpen, onClose, onSubmitQR }) {
  // 入力欄の状態を管理
  const [inputValue, setInputValue] = useState("");

  // サンプルQRデータ（仮）
  const QRdata_kari = "$$$MODEL$S/N$工事番号$P/N$注文番号$数量$$$";

  // 仮データを入力欄に反映する関数
  const readQR_kari = () => {
    setInputValue(QRdata_kari);
  };

  // 「決定」ボタン押下時の処理
  const QRdataProcessing = () => {
    console.log(inputValue); // デバッグ用

    // $$$で囲まれた部分を取り除き、$で分割して各項目に代入
    const items = inputValue.replace(/\$\$\$/g, "").split("$");
    const [model, serialNumber, workOrder, partNumber, orderNumber, quantity] = items;

    // WorkLog.jsx側にQRデータを渡す
    onSubmitQR({ model, serialNumber, workOrder, partNumber, orderNumber, quantity });

    // モーダルを閉じる
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QRコードを入力</DialogTitle>
        </DialogHeader>

        {/* QRコード入力欄 */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full border px-3 py-2 rounded-md"
          placeholder="ここにQRコードを入力"
        />

        {/* 仮データ読み込みボタン */}
        <Button onClick={readQR_kari}>QR仮読み込み</Button>

        {/* QRコード処理・送信ボタン */}
        <Button onClick={QRdataProcessing}>決定</Button>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">キャンセル</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
