import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChatPermissionLogic } from "@/services/adminChatService";

import { Loader2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

const AdminChat = () => {
  // カスタムフックから状態と操作関数を取得
  const {
    employees,
    chatPermissions,
    selectedEmployee,
    setSelectedEmployee,
    addChatPartner,
    removeChatPartner,
    loading,
    saving,
  } = useChatPermissionLogic();

  // 左の従業員リストのフィルター用ステート
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // 右下の新しい組み合わせ追加用ステート
  const [searchNewUser, setSearchNewUser] = useState("");
  const [sortNewUserBy, setSortNewUserBy] = useState("name");
  const [selectedNewPartnerId, setSelectedNewPartnerId] = useState(null);

  // 確認ダイアログの状態
  const [confirmDialogState, setConfirmDialogState] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
    variant: "default",
  });

  // ロード中表示
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">データを読み込み中...</span>
      </div>
    );
  }

  // 左の従業員リストの絞り込み
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      searchQuery === "" ||
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.employee_id?.includes(searchQuery);

    const matchesDepartment =
      departmentFilter === "all" ||
      employee.department_name === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  // 部署のユニークリスト
  const departments = [...new Set(employees.map((e) => e.department_name))];

  // 右下の追加対象ユーザーの絞り込み＆ソート
  const filteredSelectableUsers = employees
    .filter(
      (user) =>
        // 自分自身は除外
        user.id !== selectedEmployee?.id &&
        // すでに組み合わせにある相手は除外
        !chatPermissions[selectedEmployee?.id]?.includes(user.id) &&
        // 検索条件に一致
        (searchNewUser === "" ||
          user.name.toLowerCase().includes(searchNewUser.toLowerCase()) ||
          user.employee_id?.includes(searchNewUser))
    )
    .sort((a, b) => {
      if (sortNewUserBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortNewUserBy === "employee_id") {
        return a.employee_id.localeCompare(b.employee_id);
      } else if (sortNewUserBy === "department_name") {
        return a.department_name.localeCompare(b.department_name);
      }
      return 0;
    });
    
  // 組み合わせ追加時の確認ダイアログ表示（UI操作用）
  // - 対象ユーザーが選ばれているかをチェック
  // - ダイアログで確認メッセージを表示し、OK時に executeAddChatPartner を実行
  const handleAddChatPartnerConfirm = () => {
    if (!selectedEmployee || !selectedNewPartnerId) return;

    const targetUser = employees.find(
      (emp) => emp.id === parseInt(selectedNewPartnerId)
    );
    if (!targetUser) return;

    // 確認ダイアログの状態をセット
    setConfirmDialogState({
      isOpen: true,
      title: "チャット相手の追加",
      description: `${targetUser.name} を ${selectedEmployee.name} のチャット相手に追加しますか？この操作により、両者間でのチャットが可能になります。`,
      onConfirm: () =>
        executeAddChatPartner(
          selectedEmployee.id,
          parseInt(selectedNewPartnerId)
        ),
      variant: "default",
    });
  };

  // 実際の組み合わせ追加処理（データ操作用）
  // - 状態とサーバーに追加処理を実行
  // - UI上の選択や検索入力も初期化
  const executeAddChatPartner = async (selectedId, targetId) => {
    await addChatPartner(selectedId, targetId); // 双方向追加＋保存
    setSelectedNewPartnerId(null); // 選択をクリア
    setSearchNewUser(""); // 検索欄もクリア
  };

  // 組み合わせ削除時の確認ダイアログ表示
  const handleRemoveChatPartnerConfirm = (partnerId) => {
    if (!selectedEmployee) return;

    const partner = employees.find((emp) => emp.id === partnerId);
    if (!partner) return;

    setConfirmDialogState({
      isOpen: true,
      title: "チャット相手の削除",
      description: `${partner.name} を ${selectedEmployee.name} のチャット相手から削除しますか？この操作により、両者間でのチャットができなくなります。`,
      onConfirm: () => removeChatPartner(selectedEmployee.id, partnerId),
      variant: "destructive",
    });
  };

  // 現在選択中ユーザーのチャット許可相手一覧
  const currentPartners = selectedEmployee
    ? (chatPermissions[selectedEmployee.id] || [])
        .map((partnerId) => employees.find((emp) => emp.id === partnerId))
        .filter(Boolean)
    : [];

  return (
    <div className="flex flex-col gap-4">
      {/* 確認ダイアログ */}
      <ConfirmDialog
        open={confirmDialogState.isOpen}
        onOpenChange={(isOpen) =>
          setConfirmDialogState((prev) => ({ ...prev, isOpen }))
        }
        title={confirmDialogState.title}
        description={confirmDialogState.description}
        onConfirm={confirmDialogState.onConfirm}
        variant={confirmDialogState.variant}
      />

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold">チャット組み合わせ管理</h2>
        <div className="text-sm text-gray-500">変更は自動的に保存されます</div>
      </div>

      <div className="flex gap-4">
        {/* 左：全従業員リスト（フィルター付き） */}
        <Card className="w-1/2">
          <CardHeader>
            <CardTitle>従業員一覧</CardTitle>
            <div className="mt-2">
              <Input
                placeholder="名前または社員番号で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-2"
              />
              <Select
                value={departmentFilter}
                onValueChange={(value) => setDepartmentFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="部署で絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての部署</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className={`cursor-pointer p-2 rounded border ${
                    selectedEmployee?.id === employee.id
                      ? "bg-blue-100 border-blue-400"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => setSelectedEmployee(employee)}
                >
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-sm text-gray-600">
                    社員ID: {employee.employee_id} / 部署:{" "}
                    {employee.department_name}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center p-4">
                該当する従業員はいません
              </p>
            )}
          </CardContent>
        </Card>

        {/* 右：組み合わせと追加UI */}
        <Card className="w-1/2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span>
                {selectedEmployee
                  ? `${selectedEmployee.name} のチャット相手一覧`
                  : "左から従業員を選択してください"}
              </span>
              {saving && (
                <div className="flex items-center ml-2 text-sm text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  保存中...
                </div>
              )}
            </CardTitle>
          </CardHeader>
          {selectedEmployee ? (
            <CardContent className="space-y-4">
              {/* 現在の組み合わせ一覧 */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-gray-500">
                  現在の組み合わせ ({currentPartners.length}名)
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {currentPartners.length > 0 ? (
                    currentPartners.map((partner) => (
                      <div
                        key={partner.id}
                        className="flex justify-between items-center border p-2 rounded hover:bg-gray-50"
                      >
                        <div>
                          <div className="font-medium">{partner.name}</div>
                          <div className="text-sm text-gray-500">
                            {partner.employee_id} / {partner.department_name}
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={saving}
                          onClick={() =>
                            handleRemoveChatPartnerConfirm(partner.id)
                          }
                        >
                          削除
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center p-4">
                      チャット相手が設定されていません
                    </p>
                  )}
                </div>
              </div>

              {/* 新しい組み合わせ追加 */}
              <div className="border rounded-md p-4 bg-gray-50">
                <h3 className="text-md font-semibold mb-2">
                  新しいチャット相手を追加
                </h3>
                <Input
                  type="text"
                  placeholder="名前または社員番号で検索"
                  value={searchNewUser}
                  onChange={(e) => setSearchNewUser(e.target.value)}
                  className="mb-2"
                />
                <div className="flex gap-2 mb-2">
                  <Select
                    value={sortNewUserBy}
                    onValueChange={(value) => setSortNewUserBy(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="ソート順" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">名前順</SelectItem>
                      <SelectItem value="employee_id">社員番号順</SelectItem>
                      <SelectItem value="department_name">部署順</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 修正: 選択可能なユーザーがいる場合のみ表示 */}
                {filteredSelectableUsers.length > 0 ? (
                  <Select
                    value={selectedNewPartnerId || undefined}
                    onValueChange={(value) => setSelectedNewPartnerId(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="追加するユーザーを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSelectableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}（{user.employee_id} /{" "}
                          {user.department_name}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 text-center text-gray-500 border rounded bg-white">
                    追加可能なユーザーがいません
                  </div>
                )}

                <Button
                  onClick={handleAddChatPartnerConfirm}
                  disabled={
                    !selectedNewPartnerId ||
                    filteredSelectableUsers.length === 0 ||
                    saving
                  }
                  className="mt-2 w-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      追加中...
                    </>
                  ) : (
                    "チャット相手に追加"
                  )}
                </Button>
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <p className="text-gray-500 text-center p-8">
                左側から従業員を選択すると、そのユーザーのチャット相手を管理できます
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminChat;
