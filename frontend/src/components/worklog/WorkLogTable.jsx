import WorkLogRow from "./WorkLogRow";

/**
 * 工数入力テーブルコンポーネント
 * @param {Array} workRows - 工数行のデータ配列
 * @param {Function} handleFieldChange - フィールド変更ハンドラ
 * @param {Function} copyRow - 行コピーハンドラ
 * @param {Function} deleteRow - 行削除ハンドラ
 * @param {Function} openTimeSelector - 時間選択モーダルを開く関数
 * @param {Array} unitOptions - ユニット名の選択肢
 *@param {Array} workTypeOptions - 工事区分の選択肢
 */
const WorkLogTable = ({
  workRows,
  handleFieldChange,
  copyRow,
  deleteRow,
  openTimeSelector,
  unitOptions,
  // workTypeOptions,
  dailyLogs,
  unitWorkTypeMap,
  openRemarksInputModal,
}) => {
  return (
    <div className="overflow-x-auto relative">
      <div
        style={{ maxHeight: "360px", minHeight: "360px" }}
        className="overflow-y-auto"
      >
        <table className="w-full table-auto border-collapse mt-2">
          <thead className="sticky top-[-1px] z-10 bg-white border-t border-gray-300">
            <tr className="bg-gray-100">
              <th className="px-1 py-2 w-10 whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[20px] truncate">
                No.
              </th>
              <th className="px-1 py-2 w-20 whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[40px] truncate">
                操作
              </th>
              <th className="px-1 py-2 whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[80px] truncate">
                MODEL
              </th>
              <th className="px-1 py-2 w-16 whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[50px] truncate">
                S/N
              </th>
              <th className="px-1 py-2 whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[80px] truncate">
                工事番号
              </th>
              <th className="px-1 py-2 whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[80px] truncate">
                P/N
              </th>
              <th className="px-1 py-2 whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[80px] truncate">
                注文番号
              </th>
              <th className="px-1 py-2 w-16 whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[50px] truncate">
                数量
              </th>
              <th className="px-1 py-2 w-[112px] whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[100px] truncate">
                ユニット名
              </th>
              <th className="px-1 py-2 w-[112px] whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[100px] truncate">
                工事区分
              </th>
              <th className="px-1 py-2 w-[112px] whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[90px] truncate">
                工数(分)
              </th>
              <th className="px-1 py-2 whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[40px] truncate">
                備考
              </th>
              <th className="px-1 py-2 w-10 whitespace-nowrap text-sm font-medium text-gray-600 border min-w-[20px] truncate">
                ✅
              </th>
            </tr>
          </thead>
          <tbody>
            {workRows.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  className="text-center text-gray-500 py-6 text-sm  border"
                >
                  <p>現在、入力されている工数はありません。</p>
                  <p>
                    ＋「行追加」または「QR読み取り」から入力を開始してください。
                  </p>
                </td>
              </tr>
            ) : (
              workRows.map((row) => (
                <WorkLogRow
                  key={row.id}
                  row={row}
                  handleFieldChange={handleFieldChange}
                  copyRow={copyRow}
                  deleteRow={deleteRow}
                  openTimeSelector={openTimeSelector}
                  unitOptions={unitOptions}
                  // workTypeOptions={workTypeOptions}
                  unitWorkTypeMap={unitWorkTypeMap}
                  openRemarksInputModal={openRemarksInputModal}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkLogTable;
