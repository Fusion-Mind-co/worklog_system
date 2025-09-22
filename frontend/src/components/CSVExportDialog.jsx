// components/CSVExportDialog.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, X } from "lucide-react";

const CSVExportDialog = ({ isOpen, onClose, onConfirm, itemCount, isProcessing }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FileDown className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold">CSV出力確認</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isProcessing}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700">
            現在のフィルター条件に該当する
            <span className="font-bold text-blue-600 mx-1">{itemCount}件</span>
            のデータをCSV出力しますか？
          </p>
          {itemCount === 0 && (
            <p className="text-red-600 text-sm mt-2">
              出力するデータがありません
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            キャンセル
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing || itemCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? "出力中..." : "CSV出力"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CSVExportDialog;
