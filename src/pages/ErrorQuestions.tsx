import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Filter,
  Search,
  Calendar,
  Tag,
  RefreshCw,
  Settings,
  Download,
  CheckSquare,
  Square,
  Trash2,
} from 'lucide-react';
import { ErrorCard } from '@/components/features/ErrorCard';
import { ErrorReasonBadge, StatusBadge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuestionStore } from '@/store/useQuestionStore';
import { useKnowledgeStore } from '@/store/useKnowledgeStore';
import type { ErrorReason, CorrectionStatus } from '@/types';

const ErrorQuestions = () => {
  const location = useLocation();
  const { currentUser, role } = useAuthStore();
  const {
    filterErrorQuestions,
    getErrorReasons,
    batchUpdateTags,
    markCorrected,
    markMastered,
    recordReview,
    deleteErrorQuestion,
  } = useQuestionStore();
  const { subjects, knowledgePoints, selectedSubjectId, setSelectedSubjectId } = useKnowledgeStore();

  const studentId = currentUser?.id || 'stu-1';
  const initialStatus = (location.state as { status?: CorrectionStatus })?.status;

  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<CorrectionStatus | 'all'>(initialStatus || 'all');
  const [selectedReason, setSelectedReason] = useState<ErrorReason | 'all'>('all');
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchReason, setBatchReason] = useState<ErrorReason>('概念不清');

  const filters = useMemo(() => ({
    subjectId: selectedSubjectId !== 'all' ? selectedSubjectId : undefined,
    knowledgePointId: selectedKnowledgeId !== 'all' ? selectedKnowledgeId : undefined,
    errorReason: selectedReason !== 'all' ? selectedReason : undefined,
    correctionStatus: selectedStatus !== 'all' ? selectedStatus : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    searchText: searchText || undefined,
  }), [selectedSubjectId, selectedKnowledgeId, selectedReason, selectedStatus, startDate, endDate, searchText]);

  const errorQuestions = useMemo(() =>
    filterErrorQuestions(filters, studentId),
    [filters, filterErrorQuestions, studentId]
  );

  const subjectKnowledgePoints = useMemo(() =>
    selectedSubjectId !== 'all'
      ? knowledgePoints.filter(kp => kp.subjectId === selectedSubjectId)
      : [],
    [selectedSubjectId, knowledgePoints]
  );

  const handleSelectAll = () => {
    if (selectedIds.size === errorQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(errorQuestions.map(eq => eq.id)));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchUpdateReason = () => {
    if (selectedIds.size === 0) return;
    batchUpdateTags(Array.from(selectedIds), { errorReason: batchReason });
    setSelectedIds(new Set());
    setShowBatchPanel(false);
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`确定要删除选中的 ${selectedIds.size} 道错题吗？`)) {
      selectedIds.forEach(id => deleteErrorQuestion(id));
      setSelectedIds(new Set());
      setShowBatchPanel(false);
    }
  };

  const resetFilters = () => {
    setSearchText('');
    setSelectedStatus('all');
    setSelectedReason('all');
    setSelectedKnowledgeId('all');
    setStartDate('');
    setEndDate('');
  };

  const statusCounts = useMemo(() => {
    const all = filterErrorQuestions({}, studentId);
    return {
      all: all.length,
      pending: all.filter(eq => eq.correctionStatus === 'pending').length,
      corrected: all.filter(eq => eq.correctionStatus === 'corrected').length,
      mastered: all.filter(eq => eq.correctionStatus === 'mastered').length,
    };
  }, [filterErrorQuestions, studentId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">错题库</h1>
          <p className="text-gray-500 text-sm mt-1">
            共 {errorQuestions.length} 道错题，支持多维度筛选和批量管理
          </p>
        </div>
        <div className="flex gap-2">
          {role === 'teacher' && (
            <>
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={() => setShowBatchPanel(!showBatchPanel)}
              >
                <Settings className="w-4 h-4" />
                批量管理
              </button>
              <button className="btn-secondary flex items-center gap-2">
                <Download className="w-4 h-4" />
                导出
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {[
          { key: 'all', label: '全部', count: statusCounts.all },
          { key: 'pending', label: '待订正', count: statusCounts.pending },
          { key: 'corrected', label: '已订正', count: statusCounts.corrected },
          { key: 'mastered', label: '已掌握', count: statusCounts.mastered },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setSelectedStatus(item.key as CorrectionStatus | 'all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              selectedStatus === item.key
                ? 'bg-primary-900 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium">{item.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              selectedStatus === item.key ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-gray-700">筛选条件</span>
          <button
            onClick={resetFilters}
            className="ml-auto text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重置
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索题目内容..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedKnowledgeId('all');
              }}
              className="select"
            >
              <option value="all">全部科目</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedKnowledgeId}
              onChange={(e) => setSelectedKnowledgeId(e.target.value)}
              className="select"
            >
              <option value="all">全部知识点</option>
              {subjectKnowledgePoints.map(kp => (
                <option key={kp.id} value={kp.id}>{kp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value as ErrorReason | 'all')}
              className="select"
            >
              <option value="all">全部错因</option>
              {getErrorReasons().map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input flex-1"
              placeholder="开始日期"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input flex-1"
              placeholder="结束日期"
            />
          </div>
        </div>
      </div>

      {showBatchPanel && selectedIds.size > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary-600" />
              <span className="font-medium text-primary-800">
                已选择 {selectedIds.size} 道错题
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedIds(new Set());
                setShowBatchPanel(false);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              取消选择
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">批量修改错因：</span>
              <select
                value={batchReason}
                onChange={(e) => setBatchReason(e.target.value as ErrorReason)}
                className="select text-sm py-1 px-2"
              >
                {getErrorReasons().map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
              <button onClick={handleBatchUpdateReason} className="btn-accent text-sm py-1 px-3">
                应用
              </button>
            </div>
            <button
              onClick={handleBatchDelete}
              className="btn-warning text-sm py-1 px-3 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              删除选中
            </button>
          </div>
        </div>
      )}

      {errorQuestions.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Search className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">没有找到匹配的错题</h3>
          <p className="text-gray-500 mb-4">试试调整筛选条件，或者还没有收录错题</p>
          <button onClick={resetFilters} className="btn-primary">
            重置筛选条件
          </button>
        </div>
      ) : (
        <>
          {showBatchPanel && (
            <div className="flex items-center gap-3 py-2">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
              >
                {selectedIds.size === errorQuestions.length ? (
                  <CheckSquare className="w-4 h-4 text-primary-600" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                全选 ({selectedIds.size}/{errorQuestions.length})
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {errorQuestions.map((eq, index) => (
              <div
                key={eq.id}
                className={`animate-slide-up animate-stagger-${(index % 6) + 1}`}
              >
                <ErrorCard
                  errorQuestion={eq}
                  showCheckbox={showBatchPanel}
                  isSelected={selectedIds.has(eq.id)}
                  onSelect={handleSelect}
                  onMaster={markMastered}
                  onReview={recordReview}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ErrorQuestions;
