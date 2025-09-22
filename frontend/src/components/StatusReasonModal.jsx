import React from 'react';
import { X, AlertTriangle, FileEdit, Plus, Trash2 } from 'lucide-react';

const StatusReasonModal = ({ 
  isOpen, 
  onClose, 
  status, 
  editReason, 
  rejectReason,
  statusMap 
}) => {
  if (!isOpen) return null;

  const getReasonContent = () => {
    const reasons = [];
    
    // 編集理由
    if (status === "pending_edit" && editReason) {
      reasons.push({
        type: "edit",
        title: "編集理由",
        content: editReason,
        icon: <FileEdit className="h-4 w-4" />,
        color: "text-orange-600 bg-orange-50 border-orange-200"
      });
    }
    
    // 追加理由
    if (status === "pending_add" && editReason) {
      reasons.push({
        type: "add",
        title: "追加理由",
        content: editReason,
        icon: <Plus className="h-4 w-4" />,
        color: "text-blue-600 bg-blue-50 border-blue-200"
      });
    }
    
    // 削除理由
    if (status === "pending_delete" && editReason) {
      reasons.push({
        type: "delete",
        title: "削除理由",
        content: editReason,
        icon: <Trash2 className="h-4 w-4" />,
        color: "text-red-600 bg-red-50 border-red-200"
      });
    }
    
    // 差戻し理由（rejected、rejected_add、rejected_edit、rejected_delete）
    if ((status === "rejected" || status === "rejected_add" || status === "rejected_edit" || status === "rejected_delete") && (rejectReason || editReason)) {
      const reasonText = rejectReason || editReason;
      let title = "差戻し理由";
      
      // ステータスに応じたタイトル
      if (status === "rejected_add") title = "追加申請差戻し理由";
      else if (status === "rejected_edit") title = "編集申請差戻し理由";
      else if (status === "rejected_delete") title = "削除申請差戻し理由";
      
      reasons.push({
        type: "reject",
        title: title,
        content: reasonText,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: "text-red-600 bg-red-50 border-red-200"
      });
    }
    
    return reasons;
  };

  const reasons = getReasonContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">ステータス詳細</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 現在のステータス表示 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">現在のステータス</div>
          <div className="font-medium">
            {statusMap[status] || status}
          </div>
        </div>

        {/* 理由の表示 */}
        {reasons.length > 0 ? (
          <div className="space-y-3">
            {reasons.map((reason, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border ${reason.color}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {reason.icon}
                  <span className="font-medium text-sm">{reason.title}</span>
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {reason.content}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            理由の記載はありません
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusReasonModal;