import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Plus, Trash, PenSquare, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { 
  getAllUnitNames, 
  createUnitName, 
  updateUnitName, 
  deleteUnitName,
  getAllWorkTypes,
  createWorkType,
  updateWorkType,
  deleteWorkType 
} from "@/services/adminUnitService";

const AdminUnitName = () => {
  // 状態管理
  const [activeTab, setActiveTab] = useState("unitNames");
  const [unitNames, setUnitNames] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [newUnitName, setNewUnitName] = useState("");
  const [newWorkType, setNewWorkType] = useState("");
  const [searchText, setSearchText] = useState("");
  const [editMode, setEditMode] = useState({ unitName: null, workType: null });
  const [editText, setEditText] = useState("");
  const [selectedWorkTypes, setSelectedWorkTypes] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});

  // 通知関数
  const showNotification = (title, message) => {
    alert(`${title}: ${message}`);
  };

  // データ取得
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // ユニット名と工事区分を取得
      const unitNamesResponse = await getAllUnitNames();
      const workTypesResponse = await getAllWorkTypes();
      
      setUnitNames(unitNamesResponse.unit_names || []);
      setWorkTypes(workTypesResponse.work_types || []);
      
      // 選択済み工事区分の状態を初期化
      const selectedMap = {};
      unitNamesResponse.unit_names.forEach(unit => {
        selectedMap[unit.id] = unit.work_type_ids || [];
      });
      setSelectedWorkTypes(selectedMap);
    } catch (error) {
      showNotification("エラー", error.toString());
    }
  };

  // フィルタリング
  const filteredUnitNames = unitNames.filter(unit => 
    unit.name.toLowerCase().includes(searchText.toLowerCase())
  );
  
  const filteredWorkTypes = workTypes.filter(workType => 
    workType.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // ユニット名関連の処理
  const handleAddUnitName = async () => {
    if (!newUnitName.trim()) return;
    
    try {
      await createUnitName({ name: newUnitName, work_type_ids: [] });
      setNewUnitName("");
      await fetchData();
      showNotification("成功", "ユニット名が追加されました");
    } catch (error) {
      showNotification("エラー", error.toString());
    }
  };

  const handleUpdateUnitName = async (unitId) => {
    if (!editText.trim()) return;
    
    try {
      await updateUnitName(unitId, { 
        name: editText, 
        work_type_ids: selectedWorkTypes[unitId] || [] 
      });
      setEditMode({ ...editMode, unitName: null });
      setEditText("");
      await fetchData();
      showNotification("成功", "ユニット名が更新されました");
    } catch (error) {
      showNotification("エラー", error.toString());
    }
  };

  const handleDeleteUnitName = async (unitId) => {
    if (!confirm("このユニット名を削除してもよろしいですか？")) return;
    
    try {
      await deleteUnitName(unitId);
      await fetchData();
      showNotification("成功", "ユニット名が削除されました");
    } catch (error) {
      showNotification("エラー", error.toString());
    }
  };

  // 工事区分関連の処理
  const handleAddWorkType = async () => {
    if (!newWorkType.trim()) return;
    
    try {
      await createWorkType({ name: newWorkType });
      setNewWorkType("");
      await fetchData();
      showNotification("成功", "工事区分が追加されました");
    } catch (error) {
      showNotification("エラー", error.toString());
    }
  };

  const handleUpdateWorkType = async (workTypeId) => {
    if (!editText.trim()) return;
    
    try {
      await updateWorkType(workTypeId, { name: editText });
      setEditMode({ ...editMode, workType: null });
      setEditText("");
      await fetchData();
      showNotification("成功", "工事区分が更新されました");
    } catch (error) {
      showNotification("エラー", error.toString());
    }
  };

  const handleDeleteWorkType = async (workTypeId) => {
    if (!confirm("この工事区分を削除してもよろしいですか？")) return;
    
    try {
      await deleteWorkType(workTypeId);
      await fetchData();
      showNotification("成功", "工事区分が削除されました");
    } catch (error) {
      showNotification("エラー", error.toString());
    }
  };

  // 工事区分の選択状態を変更
  const toggleWorkType = async (unitId, workTypeId) => {
    const currentSelected = selectedWorkTypes[unitId] || [];
    let newSelected;
    
    if (currentSelected.includes(workTypeId)) {
      // 選択解除
      newSelected = currentSelected.filter(id => id !== workTypeId);
    } else {
      // 選択追加
      newSelected = [...currentSelected, workTypeId];
    }
    
    setSelectedWorkTypes({
      ...selectedWorkTypes,
      [unitId]: newSelected
    });
    
    try {
      const unitName = unitNames.find(unit => unit.id === unitId);
      await updateUnitName(unitId, { 
        name: unitName.name, 
        work_type_ids: newSelected 
      });
      // トグル操作後のリフレッシュは必要ないため、fetchDataを呼び出さない
    } catch (error) {
      showNotification("エラー", "工事区分の関連付けに失敗しました");
    }
  };

  // ユニットの展開・折りたたみを切り替え
  const toggleUnitExpand = (unitId) => {
    setExpandedUnits({
      ...expandedUnits,
      [unitId]: !expandedUnits[unitId]
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>ユニット・工事区分管理</CardTitle>
          <div className="flex items-center mb-4">
            <Search className="mr-2 h-4 w-4 opacity-50" />
            <Input
              placeholder="検索..."
              className="max-w-sm"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="unitNames">ユニット名</TabsTrigger>
              <TabsTrigger value="workTypes">工事区分</TabsTrigger>
            </TabsList>
            
            {/* ユニット名タブ */}
            <TabsContent value="unitNames">
              <div className="flex items-center mb-4">
                <Input
                  placeholder="新しいユニット名"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="mr-2"
                />
                <Button onClick={handleAddUnitName} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </div>
              
              <div className="space-y-2">
                {filteredUnitNames.map(unit => (
                  <div key={unit.id} className="border rounded overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer"
                      onClick={() => toggleUnitExpand(unit.id)}
                    >
                      <div className="flex items-center">
                        {expandedUnits[unit.id] ? 
                          <ChevronDown className="h-4 w-4 mr-2" /> : 
                          <ChevronRight className="h-4 w-4 mr-2" />
                        }
                        {editMode.unitName === unit.id ? (
                          <div className="flex items-center flex-1">
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="mr-2"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="mr-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateUnitName(unit.id);
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditMode({ ...editMode, unitName: null });
                                setEditText("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span>{unit.name}</span>
                        )}
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mr-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditMode({ ...editMode, unitName: unit.id });
                            setEditText(unit.name);
                          }}
                        >
                          <PenSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUnitName(unit.id);
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* 展開時に表示される工事区分の関連付け */}
                    {expandedUnits[unit.id] && (
                      <div className="p-3 bg-white border-t">
                        <div className="text-sm font-medium mb-2">関連する工事区分:</div>
                        <div className="grid grid-cols-3 gap-2">
                          {workTypes.map(workType => {
                            const isSelected = selectedWorkTypes[unit.id]?.includes(workType.id);
                            return (
                              <div
                                key={workType.id}
                                className={`flex items-center p-2 rounded cursor-pointer ${
                                  isSelected ? "bg-blue-100 border border-blue-300" : "bg-gray-100"
                                }`}
                                onClick={() => toggleWorkType(unit.id, workType.id)}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="mr-2"
                                />
                                <span className="text-sm">{workType.name}</span>
                              </div>
                            );
                          })}
                        </div>
                        {workTypes.length === 0 && (
                          <div className="text-gray-500 text-sm">
                            工事区分が登録されていません
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {filteredUnitNames.length === 0 && (
                  <div className="text-center p-4 text-gray-500">
                    ユニット名が見つかりません
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* 工事区分タブ */}
            <TabsContent value="workTypes">
              <div className="flex items-center mb-4">
                <Input
                  placeholder="新しい工事区分"
                  value={newWorkType}
                  onChange={(e) => setNewWorkType(e.target.value)}
                  className="mr-2"
                />
                <Button onClick={handleAddWorkType} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </div>
              
              <div className="space-y-2">
                {filteredWorkTypes.map(workType => (
                  <div key={workType.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    {editMode.workType === workType.id ? (
                      <div className="flex items-center flex-1">
                        <Input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="mr-2"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="mr-1"
                          onClick={() => handleUpdateWorkType(workType.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditMode({ ...editMode, workType: null });
                            setEditText("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div>{workType.name}</div>
                        <div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mr-1"
                            onClick={() => {
                              setEditMode({ ...editMode, workType: workType.id });
                              setEditText(workType.name);
                            }}
                          >
                            <PenSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteWorkType(workType.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {filteredWorkTypes.length === 0 && (
                  <div className="text-center p-4 text-gray-500">
                    工事区分が見つかりません
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
};

export default AdminUnitName;