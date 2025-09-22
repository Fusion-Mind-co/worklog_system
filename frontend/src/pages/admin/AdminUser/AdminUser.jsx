import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Trash, PenSquare, Key } from "lucide-react";
import { departments, positions } from "@/constants/employees";

import {
  getUsers,
  deleteUser,
  createUser,
  updateUser,
} from "@/services/adminUserService";

import CreateUserModal from "./CreateUserModal";
import EditUserModal from "./EditUserModal";
import PasswordChangeModal from "./PasswordChangeModal";

const AdminUser = () => {
  // 仮のユーザーデータ（API実装時に置き換え）
  const [users, setUsers] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false); // モーダルの表示状態
  const [userToChangePassword, setUserToChangePassword] = useState(null); // パスワード変更対象のユーザー

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
        console.log("data");
        console.log(data);
      } catch (error) {
        console.error("ユーザー取得エラー:", error);
      }
    };

    fetchUsers();
  }, []);

  // 検索フィルター
  const [searchQuery, setSearchQuery] = useState("");

  // 部署フィルター
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // 権限レベルフィルター
  const [roleLevelFilter, setRoleLevelFilter] = useState("all");

  // 新規ユーザーモーダル表示状態
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 編集モーダル表示状態
  const [showEditModal, setShowEditModal] = useState(false);

  // 選択されたユーザー（編集用）
  const [selectedUser, setSelectedUser] = useState(null);

  // 新規ユーザーフォーム
  const [newUser, setNewUser] = useState({
    employee_id: "",
    name: "",
    department_name: "",
    position: "",
    email: "",
    password: "",
    confirmPassword: "",
    role_level: 1,
  });

  // 編集フォーム
  const [editForm, setEditForm] = useState({
    id: null,
    employee_id: "",
    name: "",
    department_name: "",
    position: "",
    email: "",
    role_level: 1,
  });

  // 権限レベル説明
  const roleLevelDescriptions = {
    1: "一般（自分の入力・チャットのみ可能）",
    2: "係長以上（所属ユニットのデータ管理可能）",
    3: "最高権限（全社のデータ管理可能）",
  };

// ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
  // 社員IDソート
  const [sortConfig, setSortConfig] = useState({
    key: "employee_id",   // デフォルト：社員IDで
    direction: "asc",     // デフォルト：昇順
  });
// ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝

  // フィルタリングされたユーザーリスト
  const filteredUsers = users.filter((user) => {
    // 検索クエリでフィルタリング
    const matchesSearch =
      searchQuery === "" ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.employee_id.includes(searchQuery);

    // 部署でフィルタリング
    const matchesDepartment =
      departmentFilter === "all" || user.department_name === departmentFilter;

    // 権限レベルでフィルタリング
    const matchesRoleLevel =
      roleLevelFilter === "all" ||
      user.role_level === parseInt(roleLevelFilter);

    return matchesSearch && matchesDepartment && matchesRoleLevel;
  });

  // 編集モーダルを開く
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      department_name: user.department_name,
      position: user.position,
      email: user.email,
      role_level: user.role_level,
    });
    setShowEditModal(true);
  };

  // 新規ユーザーフォームの変更ハンドラ
  const handleNewUserChange = (field, value) => {
    setNewUser({
      ...newUser,
      [field]: value,
    });
  };

  // 編集フォームの変更ハンドラ
  const handleEditFormChange = (field, value) => {
    setEditForm({
      ...editForm,
      [field]: value,
    });
  };

  // ユーザー作成処理
  const handleCreateUser = async () => {
    // バリデーション
    if (
      !newUser.employee_id ||
      !newUser.name ||
      !newUser.department_name ||
      !newUser.position ||
      !newUser.password ||
      !newUser.confirmPassword
    ) {
      alert("必須項目をすべて入力してください");
      return;
    }

    if (newUser.employee_id.length !== 4) {
      alert("社員IDは4文字で入力してください");
      return;
    }

    if (newUser.password.length < 4) {
      alert("パスワードは4文字以上で入力してください");
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      alert("パスワードが一致しません");
      return;
    }
    try {
      // 🔽 APIでDBに登録
      const result = await createUser({
        employee_id: newUser.employee_id,
        name: newUser.name,
        department_name: newUser.department_name,
        position: newUser.position,
        email: newUser.email,
        password: newUser.password,
        role_level: parseInt(newUser.role_level),
      });

      // 🔽 ステートに追加
      setUsers([...users, result.user]);

      setShowCreateModal(false);
      setNewUser({
        employee_id: "",
        name: "",
        department_name: "",
        position: "",
        email: "",
        password: "",
        confirmPassword: "",
        role_level: 1,
      });

      alert(`${result.user.name}のアカウントを作成しました`);
    } catch (error) {
      alert(`作成に失敗しました: ${error}`);
    }
  };

  // ユーザー編集処理
  const handleUpdateUser = async () => {
    if (
      !editForm.employee_id ||
      !editForm.name ||
      !editForm.department_name ||
      !editForm.position
    ) {
      alert("必須項目をすべて入力してください");
      return;
    }

    try {
      // 🔽 API経由で更新を反映
      const updated = await updateUser(editForm.id, {
        employee_id: editForm.employee_id,
        name: editForm.name,
        department_name: editForm.department_name,
        position: editForm.position,
        email: editForm.email,
        role_level: parseInt(editForm.role_level),
      });

      // 🔽 フロント側の表示更新
      const updatedUsers = users.map((user) =>
        user.id === editForm.id ? updated.user : user
      );
      setUsers(updatedUsers);

      setShowEditModal(false);
      setSelectedUser(null);
      alert(`${editForm.name}の情報を更新しました`);
    } catch (error) {
      alert(`更新に失敗しました: ${error}`);
    }

    setUsers(updatedUsers);

    // モーダルを閉じる
    setShowEditModal(false);
    setSelectedUser(null);

    alert(`${editForm.name}の情報を更新しました`);
  };

  // ユーザー削除処理
  const handleDeleteUser = async (userId) => {
    const userToDelete = users.find((u) => u.id === userId);
    if (!window.confirm(`${userToDelete.name} を削除してもよろしいですか？`)) {
      return;
    }

    try {
      // 🔽 APIで削除
      await deleteUser(userId);

      // 🔽 ステート更新
      const updatedUsers = users.filter((user) => user.id !== userId);
      setUsers(updatedUsers);

      alert(`${userToDelete.name}のアカウントを削除しました`);
    } catch (error) {
      alert(`削除に失敗しました: ${error}`);
    }
  };
// ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
  // ソート処理（列クリックでasc⇄descトグル）
  const handleSort = (column) => {
    const newDirection =
      sortConfig.key === column && sortConfig.direction === "asc"
        ? "desc"
        : "asc";
    setSortConfig({ key: column, direction: newDirection });
  };

  // フィルタ後の users を、社員ID列のソート規則で並び替える
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aNum = Number(a.employee_id ?? 0);
    const bNum = Number(b.employee_id ?? 0);
    const cmp = aNum - bNum;                 // 昇順（しょうじゅん）
    return sortConfig.direction === "asc" ? cmp : -cmp; // 降順（こうじゅん）なら反転
  });

  
// ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">従業員アカウント管理</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規アカウント作成
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>フィルター設定</CardTitle>
          <span className="text-sm text-gray-500">
            【権限レベル】 1: 一般社員 | 2: 係長以上/工数管理 | 3: 全ての管理
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-4">
            {/* 検索 */}
            <div className="col-span-4">
              <label className="block text-sm font-medium mb-1">検索</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="名前または社員ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* 部署フィルター */}
            <div className="col-span-4">
              <label className="block text-sm font-medium mb-1">部署</label>
              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全ての部署" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全ての部署</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 権限レベルフィルター */}
            <div className="col-span-4">
              <label className="block text-sm font-medium mb-1">
                権限レベル
              </label>
              <Select
                value={roleLevelFilter}
                onValueChange={setRoleLevelFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全ての権限" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全ての権限</SelectItem>
                  <SelectItem value="1">レベル1</SelectItem>
                  <SelectItem value="2">レベル2</SelectItem>
                  <SelectItem value="3">レベル3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ユーザーアカウントリスト */}

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th
                  className="px-4 py-2 text-center text-sm font-medium text-gray-600 border cursor-pointer"
                  onClick={() => handleSort("employee_id")}
                  >
                  社員ID
                  {sortConfig.key === "employee_id" && (
                  <span className="ml-1">
                  {sortConfig.direction === "asc" ? "↑" : "↓"}
                  </span>
                  )}
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border">
                    氏名
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border">
                    部署
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border">
                    役職
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border">
                    メールアドレス
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border">
                    権限レベル
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* ユーザーデータはここに入る */}
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{user.employee_id}</td>
                    <td className="px-4 py-2 border">{user.name}</td>
                    <td className="px-4 py-2 border">{user.department_name}</td>
                    <td className="px-4 py-2 border">{user.position}</td>
                    <td className="px-4 py-2 border">{user.email || "-"}</td>
                    <td className="px-4 py-2 border">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          user.role_level === 3
                            ? "bg-blue-100 text-blue-800"
                            : user.role_level === 2
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        レベル{user.role_level}
                      </span>
                    </td>
                    <td className="px-4 py-2 border">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(user)}
                        >
                          <PenSquare className="h-4 w-4 mr-1" />
                          編集
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash className="h-4 w-4 mr-1" />
                          削除
                        </Button>
                        {/* ✅ パスワード変更ボタン（追加） */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUserToChangePassword(user);
                            setShowPasswordModal(true);
                          }}
                        >
                          <Key className="h-4 w-4 mr-1" />
                          パスワード変更
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 新規アカウント作成モーダル */}
      <CreateUserModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        newUser={newUser}
        onChange={handleNewUserChange}
        onCreate={handleCreateUser}
        departments={departments}
        positions={positions}
        roleLevelDescriptions={roleLevelDescriptions}
      />

      {/* 編集モーダル */}
      <EditUserModal
        show={showEditModal}
        selectedUser={selectedUser}
        editForm={editForm}
        onChange={handleEditFormChange}
        onUpdate={handleUpdateUser}
        onDelete={handleDeleteUser}
        onClose={() => setShowEditModal(false)}
        departments={departments}
        positions={positions}
        roleLevelDescriptions={roleLevelDescriptions}
      />

      {/* ✅ パスワード変更モーダルの呼び出し */}
      <PasswordChangeModal
        show={showPasswordModal}
        user={userToChangePassword}
        onClose={() => {
          setShowPasswordModal(false);
          setUserToChangePassword(null);
        }}
      />
    </div>
  );
};

export default AdminUser;
