import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * 時間選択モーダルコンポーネント
 * @param {boolean} isOpen - モーダルが開いているかどうか
 * @param {Function} onClose - モーダルを閉じる関数
 * @param {Function} onSave - 時間を保存する関数
 * @param {number} initialMinutes - 初期表示する分数
 */
const TimeSelector = ({ isOpen, onClose, onSave, initialMinutes = 0 }) => {
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");
  const [calculatedMinutes, setCalculatedMinutes] = useState(initialMinutes);
  
  // 時間と分の選択肢
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  
  // 初期値の設定（既存の分数から時間を逆算）
  useEffect(() => {
    if (initialMinutes > 0) {
      const totalMinutes = initialMinutes;
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      
      // 終了時間を開始時間 + 計算した時間に設定
      const startH = 9; // デフォルト開始時間（9時）
      const startM = 0;
      
      const endH = startH + hours;
      const endM = startM + mins;
      
      // 分が60を超える場合の処理
      const adjustedEndH = endH + Math.floor(endM / 60);
      const adjustedEndM = endM % 60;
      
      setStartHour(String(startH).padStart(2, '0'));
      setStartMinute(String(startM).padStart(2, '0'));
      setEndHour(String(adjustedEndH).padStart(2, '0'));
      setEndMinute(String(adjustedEndM).padStart(2, '0'));
    }
  }, [initialMinutes, isOpen]);
  
  // 時間計算
  useEffect(() => {
    const start = new Date();
    start.setHours(parseInt(startHour, 10), parseInt(startMinute, 10), 0);
    
    const end = new Date();
    end.setHours(parseInt(endHour, 10), parseInt(endMinute, 10), 0);
    
    let diffMinutes = (end - start) / (1000 * 60);
    
    // 負の値の場合は24時間を超えたと見なす
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }
    
    setCalculatedMinutes(diffMinutes);
  }, [startHour, startMinute, endHour, endMinute]);
  
  // 保存処理
  const handleSave = () => {
    onSave(calculatedMinutes);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h3 className="text-lg font-medium mb-4">作業時間の入力</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">開始時間</label>
            <div className="flex space-x-2">
              <Select value={startHour} onValueChange={setStartHour}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="時" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={`start-hour-${hour}`} value={hour}>{hour}時</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={startMinute} onValueChange={setStartMinute}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="分" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={`start-minute-${minute}`} value={minute}>{minute}分</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">終了時間</label>
            <div className="flex space-x-2">
              <Select value={endHour} onValueChange={setEndHour}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="時" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={`end-hour-${hour}`} value={hour}>{hour}時</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={endMinute} onValueChange={setEndMinute}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="分" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={`end-minute-${minute}`} value={minute}>{minute}分</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm">計算された時間: <span className="font-bold">{calculatedMinutes}分</span></p>
            <p className="text-sm">({Math.floor(calculatedMinutes / 60)}時間 {calculatedMinutes % 60}分)</p>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={onClose}>キャンセル</Button>
            <Button onClick={handleSave}>確定</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeSelector;