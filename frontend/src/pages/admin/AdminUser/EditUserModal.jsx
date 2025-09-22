// EditUserModal.jsx - 修正版
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EditUserModal = ({
  show,
  selectedUser,
  editForm,
  onChange,
  onUpdate,
  onClose,
  departments,
  positions,
  roleLevelDescriptions,
}) => {
  if (!show || !selectedUser) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{selectedUser.name}の情報編集</h3>
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
                value={editForm.employee_id}
                onChange={(e) => onChange("employee_id", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                氏名 <span className="text-red-500">*</span>
              </label>
              <Input
                value={editForm.name}
                onChange={(e) => onChange("name", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                部署 <span className="text-red-500">*</span>
              </label>
              <Select
                value={editForm.department_name}
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
                value={editForm.position}
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
              value={editForm.email}
              onChange={(e) => onChange("email", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              権限レベル <span className="text-red-500">*</span>
            </label>
            <Select
              value={editForm.role_level.toString()}
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

          <div className="pt-2 flex justify-between">
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button onClick={onUpdate}>更新</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
