// ステータスに応じた表示名
export const statusMap = {
  draft: "通常入力",
  approved: "承認済み",
  rejected_add: "追加却下",
  rejected_edit: "編集却下",
  rejected_delete: "削除却下",
  pending_add: "追加申請中",
  pending_delete: "削除申請中",
  pending_edit: "編集申請中",
};

// ステータスに応じた色クラス
export const getStatusColorClass = (status) => {
  switch (status) {
    case "draft":
      return "bg-gray-200 text-gray-800";
    case "pending_edit":
      return "bg-yellow-100 text-yellow-800";
    case "pending_add":
      return "bg-blue-100 text-blue-800";
    case "pending_delete":
    case "rejected_add":
    case "rejected_edit":
    case "rejected_delete":
      return "bg-red-100 text-red-800";
    case "approved":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-200 text-gray-800";
  }
};
