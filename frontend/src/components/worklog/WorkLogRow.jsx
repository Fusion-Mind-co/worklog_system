import { Input } from "@/components/ui/input";
import { Clock, CheckSquare, Square, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import ExpandableTextarea from "./ExpandableTextarea";

/**
 * 工数入力の1行を表示するコンポーネント
 * @param {Object} row - 行データ
 * @param {Function} handleFieldChange - フィールド変更ハンドラ
 * @param {Function} copyRow - 行コピーハンドラ
 * @param {Function} deleteRow - 行削除ハンドラ
 * @param {Function} openTimeSelector - 時間選択モーダルを開く関数
 * @param {Array} unitOptions - ユニット名の選択肢
//  * @param {Array} workTypeOptions - 工事区分の選択肢
 */
const WorkLogRow = ({
  row,
  handleFieldChange,
  copyRow,
  deleteRow,
  openTimeSelector,
  unitOptions,
  // workTypeOptions,
  unitWorkTypeMap,
  openRemarksInputModal,
}) => {
  const filteredWorkTypes = row.unitName
    ? unitWorkTypeMap[row.unitName] || []
    : [];
  // ユニット名の選択肢（履歴 + セパレータ + 通常一覧）
  let recentUnits = [];
  try {
    const stored = localStorage.getItem("recentUnits");
    if (stored) {
      recentUnits = JSON.parse(stored).filter((v) => unitOptions.includes(v));
    }
  } catch (e) {
    console.error("ユニット履歴取得失敗:", e);
  }

  // 履歴と通常選択肢を合成
  const uniqueUnitOptions = [
    ...recentUnits,
    ...(recentUnits.length > 0 ? ["---"] : []),
    ...unitOptions.filter((v) => !recentUnits.includes(v)),
  ];

  // 工事区分の選択肢（履歴 + セパレータ + 通常一覧）
  let recentWorkTypes = [];
  try {
    const stored = localStorage.getItem("recentWorkTypes");
    if (stored) {
      recentWorkTypes = JSON.parse(stored).filter((v) =>
        filteredWorkTypes.includes(v)
      );
    }
  } catch (e) {
    console.error("工事区分履歴取得失敗:", e);
  }

  // 履歴 + セパレータ + 通常選択肢（重複除外）
  const uniqueWorkTypeOptions = [
    ...recentWorkTypes,
    ...(recentWorkTypes.length > 0 ? ["---"] : []),
    ...filteredWorkTypes.filter((type) => !recentWorkTypes.includes(type)),
  ];

  return (
    // 工数反映後に入力データの背景色を変更
    <tr
      className={`
    ${row.submitted ? "hover:bg-blue-300 bg-blue-200" : "hover:bg-gray-50"}
    ${row.duplicate ? "bg-red-100" : ""}
  `}
    >
      <td className="px-1 py-2 border">
        <div className="flex items-center justify-center">
          <p>{row.id}</p>
        </div>
      </td>

      <td className="px-1 py-2 border">
        <div className="flex space-x-1">
          <button
            onClick={() => copyRow(row.id)}
            className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
            title="この行をコピーして新しい行を追加"
          >
            📋
          </button>
          <button
            onClick={() => deleteRow(row.id)}
            className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
            title="この行を削除"
          >
            🗑️
          </button>
        </div>
      </td>
      <td className="px-1 py-2 border">
        <Input
          value={row.model}
          onChange={(e) => handleFieldChange(row.id, "model", e.target.value)}
          placeholder="MODEL"
          // 編集禁止
          readOnly={row.lockedFields?.includes("model")}
          className={`h-8 px-1 text-center ${
            row.touched && !row.model ? "bg-teal-100" : ""
          }`}
        />
      </td>
      <td className="px-1 py-2 border">
        <Input
          value={row.serialNumber}
          onChange={(e) =>
            handleFieldChange(row.id, "serialNumber", e.target.value)
          }
          placeholder="S/N"
          readOnly={row.lockedFields?.includes("serialNumber")}
          className={`h-8 px-1 text-center ${
            row.touched && !row.serialNumber ? "bg-teal-100" : ""
          }`}
        />
      </td>
      <td className="px-1 py-2 border">
        <Input
          value={row.workOrder}
          onChange={(e) =>
            handleFieldChange(row.id, "workOrder", e.target.value)
          }
          placeholder="工事番号"
          readOnly={row.lockedFields?.includes("workOrder")}
          className={`h-8 px-1 text-center ${
            row.touched && !row.workOrder ? "bg-teal-100" : ""
          }`}
        />
      </td>
      <td className="px-1 py-2 border">
        <Input
          value={row.partNumber}
          onChange={(e) =>
            handleFieldChange(row.id, "partNumber", e.target.value)
          }
          placeholder="P/N"
          readOnly={row.lockedFields?.includes("partNumber")}
          className={`h-8 px-1 text-center ${
            row.touched && !row.partNumber ? "bg-teal-100" : ""
          }`}
        />
      </td>
      <td className="px-1 py-2 border">
        <Input
          value={row.orderNumber}
          onChange={(e) =>
            handleFieldChange(row.id, "orderNumber", e.target.value)
          }
          placeholder="注文番号"
          readOnly={row.lockedFields?.includes("orderNumber")}
          className={`h-8 px-1 text-center ${
            row.touched && !row.orderNumber ? "bg-teal-100" : ""
          }`}
        />
      </td>
      <td className="px-1 py-2 border">
        <Input
          type={row.quantity === "N/A" ? "text" : "number"}
          min={1}
          readOnly={row.quantity === "N/A"} // N/A の場合は編集不可にする
          value={row.quantity}
          onChange={(e) =>
            handleFieldChange(row.id, "quantity", e.target.value)
          }
          placeholder="数量"
          className={`h-8 px-1 text-center ${
            row.submitted &&
            row.touched &&
            row.quantity !== "N/A" &&
            (row.quantity === "" ||
              row.quantity === null ||
              row.quantity === undefined)
              ? "bg-teal-100"
              : row.submitted && row.modifiedFields?.quantity
              ? "bg-yellow-100"
              : ""
          }`}
        />
      </td>
      <td className="px-1 py-2 border">
        <Select
          value={row.unitName}
          onValueChange={(v) => handleFieldChange(row.id, "unitName", v)}
        >
          <SelectTrigger
            className={`h-8 px-1 text-center
            ${
              row.submitted && row.touched && !row.unitName ? "bg-teal-100" : ""
            }
            ${
              row.submitted && row.modifiedFields?.unitName
                ? "bg-yellow-100"
                : ""
            }
          `}
          >
            <SelectValue placeholder="選択" />
          </SelectTrigger>
          <SelectContent>
            {uniqueUnitOptions.map((unit, i) => (
              <SelectItem key={i} value={unit} disabled={unit === "---"}>
                {unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-1 py-2 border">
        <Select
          value={row.workType}
          onValueChange={(value) =>
            handleFieldChange(row.id, "workType", value)
          }
        >
          <SelectTrigger
            className={`h-8 px-1 text-center
              ${
                row.submitted && row.touched && !row.workType
                  ? "bg-teal-100"
                  : ""
              }
              ${
                row.submitted && row.modifiedFields?.workType
                  ? "bg-yellow-100"
                  : ""
              }
            `}
          >
            <SelectValue placeholder="選択" />
          </SelectTrigger>
          <SelectContent>
            {!row.unitName ? (
              <SelectItem value="---" disabled>
                ---
              </SelectItem>
            ) : uniqueWorkTypeOptions.length > 0 ? (
              uniqueWorkTypeOptions.map((type) => (
                <SelectItem key={type} value={type} disabled={type === "---"}>
                  {type}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="---" disabled>
                ---
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </td>
      <td className="px-1 py-2 border">
        <div className="flex items-center">
          <Input
            type="number"
            min={5}
            step={5}
            value={row.minutes}
            onChange={(e) =>
              handleFieldChange(row.id, "minutes", e.target.value)
            }
            placeholder="分"
            className={`h-8 px-1 text-center ${
              row.submitted && row.touched && !row.minutes
                ? "bg-teal-100"
                : row.submitted && row.modifiedFields?.minutes
                ? "bg-yellow-100"
                : ""
            }`}
          />
          <button
            onClick={() => openTimeSelector(row.id)}
            className="ml-1 p-1 text-blue-600 hover:text-blue-800"
            title="時間から工数を計算"
          >
            <Clock size={18} />
          </button>
        </div>
      </td>

      <td className="px-1 py-2 text-center border">
        <button
          onClick={() => openRemarksInputModal(row.id, row.remarks)}
          className={`hover:text-blue-800
          ${row.remarks ? "text-blue-600" : "text-gray-400"}
          ${row.submitted && row.modifiedFields?.remarks ? "bg-yellow-100" : ""}
        `}
          title="備考を編集"
        >
          <FileText className="h-5 w-5 inline" />
        </button>
      </td>
      <td className="px-1 py-2 border text-center">
        {row.model &&
        row.serialNumber &&
        row.workOrder &&
        row.partNumber &&
        row.orderNumber &&
        row.quantity &&
        row.unitName &&
        row.workType &&
        row.minutes ? (
          <CheckSquare className="text-green-600 inline" size={20} />
        ) : (
          <Square className="text-gray-400 inline" size={20} />
        )}
      </td>
    </tr>
  );
};

export default WorkLogRow;
