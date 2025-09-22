// CreateUserModal.jsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CreateUserModal = ({
  show,
  onClose,
  newUser,
  onChange,
  onCreate,
  departments,
  positions,
  roleLevelDescriptions,
}) => {
  if (!show) return null;

  // パスワード表示/非表示
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">新規アカウント作成</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                社員ID <span className="text-red-500">*</span>
              </label>
              <Input
                value={newUser.employee_id}
                onChange={(e) => onChange("employee_id", e.target.value)}
                placeholder="例: 0001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                氏名 <span className="text-red-500">*</span>
              </label>
              <Input
                value={newUser.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder="例: 山田太郎"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                部署 <span className="text-red-500">*</span>
              </label>
              <Select
                value={newUser.department_name}
                onValueChange={(value) => onChange("department_name", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="部署を選択" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                役職 <span className="text-red-500">*</span>
              </label>
              <Select
                value={newUser.position}
                onValueChange={(value) => onChange("position", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="役職を選択" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              メールアドレス
            </label>
            <Input
              type="email"
              value={newUser.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="例: yamada@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                パスワード <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newUser.password}
                  onChange={(e) => onChange("password", e.target.value)}
                  placeholder="4文字以上"
                  className="pr-10"
                />
                <div
                  className="absolute inset-y-0 right-2 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                パスワード（確認）<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={newUser.confirmPassword}
                  onChange={(e) => onChange("confirmPassword", e.target.value)}
                  placeholder="同じパスワードを入力"
                  className="pr-10"
                />
                <div
                  className="absolute inset-y-0 right-2 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              権限レベル <span className="text-red-500">*</span>
            </label>
            // 以下のように修正する必要があります
            <Select
              value={newUser.role_level.toString()}
              onValueChange={(value) => onChange("role_level", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="権限レベルを選択" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLevelDescriptions).map(([level, desc]) => (
                  <SelectItem
                    key={level}
                    value={level}
                  >{`レベル${level}: ${desc}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={onCreate}>アカウント作成</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateUserModal;
