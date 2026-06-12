import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Map,
  List,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Link2,
  ArrowRight,
} from 'lucide-react';
import { KnowledgeGraph } from '@/components/features/KnowledgeGraph';
import { KnowledgeTree } from '@/components/features/KnowledgeTree';
import { useAuthStore } from '@/store/useAuthStore';
import { useKnowledgeStore } from '@/store/useKnowledgeStore';
import { useQuestionStore } from '@/store/useQuestionStore';
import { getMasteryColor, getMasteryLabel } from '@/utils/calculation';

const KnowledgeMap = () => {
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const {
    subjects,
    knowledgePoints,
    selectedSubjectId,
    setSelectedSubjectId,
    addKnowledgePoint,
    updateKnowledgePoint,
    deleteKnowledgePoint,
    buildKnowledgeTree,
  } = useKnowledgeStore();
  const { getMasteryRate } = useQuestionStore();
  const { currentUser } = useAuthStore();

  const studentId = currentUser?.id || 'stu-1';

  const [viewMode, setViewMode] = useState<'graph' | 'tree'>('graph');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeLevel, setNewNodeLevel] = useState<1 | 2 | 3>(2);
  const [newNodeParentId, setNewNodeParentId] = useState<string | null>(null);
  const [newNodeDescription, setNewNodeDescription] = useState('');
  const [newNodePrerequisites, setNewNodePrerequisites] = useState<string[]>([]);
  const [editNodeName, setEditNodeName] = useState('');
  const [editNodeLevel, setEditNodeLevel] = useState<1 | 2 | 3>(2);
  const [editNodeParentId, setEditNodeParentId] = useState<string | null>(null);
  const [editNodeDescription, setEditNodeDescription] = useState('');
  const [editNodePrerequisites, setEditNodePrerequisites] = useState<string[]>([]);
  const [editNodeSuccessors, setEditNodeSuccessors] = useState<string[]>([]);

  const subjectKnowledgePoints = knowledgePoints.filter(
    kp => kp.subjectId === selectedSubjectId
  );

  const knowledgeTree = buildKnowledgeTree(selectedSubjectId);

  const selectedNode = selectedNodeId
    ? knowledgePoints.find(kp => kp.id === selectedNodeId)
    : null;

  const handleAddNode = () => {
    if (!newNodeName.trim() || !selectedSubjectId) return;

    const newKp = {
      id: `kp-${Date.now()}`,
      name: newNodeName.trim(),
      subjectId: selectedSubjectId,
      level: newNodeLevel,
      parentId: newNodeParentId,
      description: newNodeDescription.trim() || `${newNodeName}知识点`,
      prerequisites: newNodePrerequisites,
      successors: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addKnowledgePoint(newKp);

    setShowAddModal(false);
    setNewNodeName('');
    setNewNodeDescription('');
    setNewNodeParentId(null);
    setNewNodePrerequisites([]);
  };

  const editingNodeData = editingNode
    ? knowledgePoints.find(kp => kp.id === editingNode)
    : null;

  useEffect(() => {
    if (editingNode && editingNodeData) {
      setEditNodeName(editingNodeData.name);
      setEditNodeLevel(editingNodeData.level as 1 | 2 | 3);
      setEditNodeParentId(editingNodeData.parentId || null);
      setEditNodeDescription(editingNodeData.description);
      setEditNodePrerequisites(editingNodeData.prerequisites);
      setEditNodeSuccessors(editingNodeData.successors);
    }
  }, [editingNode, editingNodeData?.id]);

  const handleSaveEdit = () => {
    if (!editingNode || !editNodeName.trim()) return;

    if (editNodeParentId === editingNode) {
      alert('不能将自己设为父级知识点');
      return;
    }
    if (editNodePrerequisites.includes(editingNode)) {
      alert('不能将自己设为前置依赖');
      return;
    }
    if (editNodeSuccessors.includes(editingNode)) {
      alert('不能将自己设为后续依赖');
    }
    if (editNodePrerequisites.some(id => editNodeSuccessors.includes(id))) {
      alert('同一个知识点不能同时是前置和后续依赖');
      return;
    }

    const checkCircular = (nodeId: string, visited: Set<string>, direction: 'up' | 'down'): boolean => {
      if (visited.has(nodeId)) return true;
      visited.add(nodeId);
      const node = knowledgePoints.find(kp => kp.id === nodeId);
      if (!node) return false;
      const nextIds = direction === 'up' ? node.prerequisites : node.successors;
      return nextIds.some(id => checkCircular(id, new Set(visited), direction));
    };

    const tempPrereqs = editNodePrerequisites.filter(id => id !== editingNode);
    for (const preId of tempPrereqs) {
      const visited = new Set<string>([editingNode]);
      if (checkCircular(preId, visited, 'up')) {
        alert('存在循环依赖：前置知识形成了环形引用');
        return;
      }
    }

    const tempSuccessors = editNodeSuccessors.filter(id => id !== editingNode);
    for (const sucId of tempSuccessors) {
      const visited = new Set<string>([editingNode]);
      if (checkCircular(sucId, visited, 'down')) {
        alert('存在循环依赖：后续知识形成了环形引用');
        return;
      }
    }

    const oldPrereqs = editingNodeData?.prerequisites || [];
    const oldSuccessors = editingNodeData?.successors || [];

    updateKnowledgePoint(editingNode, {
      name: editNodeName.trim(),
      level: editNodeLevel,
      parentId: editNodeParentId,
      description: editNodeDescription.trim() || `${editNodeName}知识点`,
      prerequisites: editNodePrerequisites.filter(id => id !== editingNode),
      successors: editNodeSuccessors.filter(id => id !== editingNode),
    });

    const safePrereqs = editNodePrerequisites.filter(id => id !== editingNode);
    const safeSuccessors = editNodeSuccessors.filter(id => id !== editingNode);
    const addedPrereqs = safePrereqs.filter(id => !oldPrereqs.includes(id));
    const removedPrereqs = oldPrereqs.filter(id => !safePrereqs.includes(id));
    const addedSuccessors = safeSuccessors.filter(id => !oldSuccessors.includes(id));
    const removedSuccessors = oldSuccessors.filter(id => !safeSuccessors.includes(id));

    addedPrereqs.forEach(preId => {
      const preKp = knowledgePoints.find(kp => kp.id === preId);
      if (preKp && !preKp.successors.includes(editingNode)) {
        updateKnowledgePoint(preId, { successors: [...preKp.successors, editingNode] });
      }
    });
    removedPrereqs.forEach(preId => {
      const preKp = knowledgePoints.find(kp => kp.id === preId);
      if (preKp) {
        updateKnowledgePoint(preId, { successors: preKp.successors.filter(sid => sid !== editingNode) });
      }
    });
    addedSuccessors.forEach(sucId => {
      const sucKp = knowledgePoints.find(kp => kp.id === sucId);
      if (sucKp && !sucKp.prerequisites.includes(editingNode)) {
        updateKnowledgePoint(sucId, { prerequisites: [...sucKp.prerequisites, editingNode] });
      }
    });
    removedSuccessors.forEach(sucId => {
      const sucKp = knowledgePoints.find(kp => kp.id === sucId);
      if (sucKp) {
        updateKnowledgePoint(sucId, { prerequisites: sucKp.prerequisites.filter(pid => pid !== editingNode) });
      }
    });

    if (selectedNodeId === editingNode) {
      setSelectedNodeId(null);
      setTimeout(() => setSelectedNodeId(editingNode), 50);
    }

    setEditingNode(null);
    setEditNodeName('');
    setEditNodeDescription('');
    setEditNodeParentId(null);
    setEditNodePrerequisites([]);
    setEditNodeSuccessors([]);
  };

  const handleDeleteNode = (id: string) => {
    if (confirm('确定要删除这个知识点吗？相关的依赖关系也会被移除。')) {
      deleteKnowledgePoint(id);
      if (selectedNodeId === id) setSelectedNodeId(null);
    }
  };

  const handleStartPractice = () => {
    if (selectedNodeId) {
      navigate('/practice', { state: { selectedKpId: selectedNodeId } });
    } else {
      navigate('/practice');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">知识点地图</h1>
          <p className="text-gray-500 text-sm mt-1">
            点击节点查看详情，双击编辑，支持拖拽和缩放
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm ${
                viewMode === 'graph'
                  ? 'bg-primary-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Map className="w-4 h-4" />
              图谱视图
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm ${
                viewMode === 'tree'
                  ? 'bg-primary-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <List className="w-4 h-4" />
              目录视图
            </button>
          </div>
          {role === 'teacher' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加知识点
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {subjects.map(sub => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubjectId(sub.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              selectedSubjectId === sub.id
                ? 'bg-primary-900 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${selectedSubjectId === sub.id ? 'bg-accent-400' : 'bg-gray-300'}`}
            />
            <span className="font-medium">{sub.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              selectedSubjectId === sub.id ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {subjectKnowledgePoints.length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="card p-0 overflow-hidden" style={{ height: '600px' }}>
            {viewMode === 'graph' ? (
              <KnowledgeGraph
                nodes={subjectKnowledgePoints}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
                studentId={studentId}
              />
            ) : (
              <KnowledgeTree
                subjectId={selectedSubjectId}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          {selectedNode ? (
            <div className="card animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      Level {selectedNode.level}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-primary-100 text-primary-700">
                      {subjects.find(s => s.id === selectedNode.subjectId)?.name}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">{selectedNode.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {role === 'teacher' && (
                    <>
                      <button
                        onClick={() => setEditingNode(selectedNode.id)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNode(selectedNode.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">{selectedNode.description}</p>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">掌握度</span>
                  <span className={`font-semibold ${getMasteryColor(getMasteryRate(selectedNode.id, studentId))}`}>
                    {getMasteryRate(selectedNode.id, studentId)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      getMasteryRate(selectedNode.id, studentId) >= 80
                        ? 'bg-emerald-500'
                        : getMasteryRate(selectedNode.id, studentId) >= 60
                        ? 'bg-blue-500'
                        : getMasteryRate(selectedNode.id, studentId) >= 40
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${getMasteryRate(selectedNode.id, studentId)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {getMasteryLabel(getMasteryRate(selectedNode.id, studentId))}
                </p>
              </div>

              {selectedNode.prerequisites.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-blue-500" />
                    前置知识
                  </h4>
                  <div className="space-y-1.5">
                    {selectedNode.prerequisites.map(preId => {
                      const pre = knowledgePoints.find(kp => kp.id === preId);
                      if (!pre) return null;
                      return (
                        <button
                          key={preId}
                          onClick={() => setSelectedNodeId(preId)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-left transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="text-sm text-blue-800 truncate">{pre.name}</span>
                          <ArrowRight className="w-4 h-4 text-blue-400 ml-auto shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedNode.successors.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-emerald-500" />
                    后续知识
                  </h4>
                  <div className="space-y-1.5">
                    {selectedNode.successors.map(sucId => {
                      const suc = knowledgePoints.find(kp => kp.id === sucId);
                      if (!suc) return null;
                      return (
                        <button
                          key={sucId}
                          onClick={() => setSelectedNodeId(sucId)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-left transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-sm text-emerald-800 truncate">{suc.name}</span>
                          <ArrowRight className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={handleStartPractice} className="w-full btn-primary">
                开始专项练习
              </button>
            </div>
          ) : (
            <div className="card text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Brain className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 text-sm">点击左侧图谱中的节点查看详情</p>
            </div>
          )}

          <div className="card">
            <h3 className="font-bold text-gray-800 mb-3">掌握度图例</h3>
            <div className="space-y-2">
              {[
                { label: '未掌握', range: '0-39%', color: 'bg-red-500' },
                { label: '基础', range: '40-59%', color: 'bg-amber-500' },
                { label: '熟练', range: '60-79%', color: 'bg-blue-500' },
                { label: '精通', range: '80-100%', color: 'bg-emerald-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded ${item.color}`} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-xs text-gray-400 ml-auto">{item.range}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card bg-gradient-to-br from-primary-50 to-blue-50">
            <h3 className="font-bold text-primary-800 mb-2">学习建议</h3>
            <p className="text-sm text-primary-700">
              先掌握左侧的前置知识点，再学习右侧的后续知识点，循序渐进效果更好。
            </p>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-slide-up">
            <h2 className="text-xl font-bold text-gray-800 mb-4">添加知识点</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  知识点名称
                </label>
                <input
                  type="text"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  className="input"
                  placeholder="请输入知识点名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  描述
                </label>
                <textarea
                  value={newNodeDescription}
                  onChange={(e) => setNewNodeDescription(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="请输入知识点描述（可选）"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    层级
                  </label>
                  <select
                    value={newNodeLevel}
                    onChange={(e) => setNewNodeLevel(Number(e.target.value) as 1 | 2 | 3)}
                    className="select"
                  >
                    <option value={1}>Level 1 - 大概念</option>
                    <option value={2}>Level 2 - 知识点</option>
                    <option value={3}>Level 3 - 细分点</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    父知识点
                  </label>
                  <select
                    value={newNodeParentId || ''}
                    onChange={(e) => setNewNodeParentId(e.target.value || null)}
                    className="select"
                  >
                    <option value="">无父知识点</option>
                    {subjectKnowledgePoints
                      .filter(kp => kp.level < newNodeLevel)
                      .map(kp => (
                        <option key={kp.id} value={kp.id}>{kp.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  前置知识点（可多选）
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 border border-gray-200 rounded-lg">
                  {subjectKnowledgePoints
                    .filter(kp => kp.id !== editingNode)
                    .map(kp => (
                      <label
                        key={kp.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newNodePrerequisites.includes(kp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewNodePrerequisites([...newNodePrerequisites, kp.id]);
                            } else {
                              setNewNodePrerequisites(newNodePrerequisites.filter(id => id !== kp.id));
                            }
                          }}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{kp.name}</span>
                      </label>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewNodeName('');
                  setNewNodeDescription('');
                  setNewNodeParentId(null);
                  setNewNodePrerequisites([]);
                }}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleAddNode}
                disabled={!newNodeName.trim()}
                className="flex-1 btn-primary"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {editingNode && editingNodeData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">编辑知识点</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  知识点名称
                </label>
                <input
                  type="text"
                  value={editNodeName}
                  onChange={(e) => setEditNodeName(e.target.value)}
                  className="input"
                  placeholder="请输入知识点名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  描述
                </label>
                <textarea
                  value={editNodeDescription}
                  onChange={(e) => setEditNodeDescription(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="请输入知识点描述（可选）"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    层级
                  </label>
                  <select
                    value={editNodeLevel}
                    onChange={(e) => setEditNodeLevel(Number(e.target.value) as 1 | 2 | 3)}
                    className="select"
                  >
                    <option value={1}>Level 1 - 大概念</option>
                    <option value={2}>Level 2 - 知识点</option>
                    <option value={3}>Level 3 - 细分点</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    父知识点
                  </label>
                  <select
                    value={editNodeParentId || ''}
                    onChange={(e) => setEditNodeParentId(e.target.value || null)}
                    className="select"
                  >
                    <option value="">无父知识点</option>
                    {subjectKnowledgePoints
                      .filter(kp => kp.id !== editingNode && kp.level < editNodeLevel)
                      .map(kp => (
                        <option key={kp.id} value={kp.id}>{kp.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  前置知识点（可多选）
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 border border-gray-200 rounded-lg">
                  {subjectKnowledgePoints
                    .filter(kp => kp.id !== editingNode)
                    .map(kp => (
                      <label
                        key={kp.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editNodePrerequisites.includes(kp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditNodePrerequisites([...editNodePrerequisites, kp.id]);
                            } else {
                              setEditNodePrerequisites(editNodePrerequisites.filter(id => id !== kp.id));
                            }
                          }}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{kp.name}</span>
                      </label>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  后续知识点（可多选）
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 border border-gray-200 rounded-lg">
                  {subjectKnowledgePoints
                    .filter(kp => kp.id !== editingNode)
                    .map(kp => (
                      <label
                        key={kp.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editNodeSuccessors.includes(kp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditNodeSuccessors([...editNodeSuccessors, kp.id]);
                            } else {
                              setEditNodeSuccessors(editNodeSuccessors.filter(id => id !== kp.id));
                            }
                          }}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{kp.name}</span>
                      </label>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingNode(null);
                  setEditNodeName('');
                  setEditNodeDescription('');
                  setEditNodeParentId(null);
                  setEditNodePrerequisites([]);
                  setEditNodeSuccessors([]);
                }}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editNodeName.trim()}
                className="flex-1 btn-primary"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeMap;
