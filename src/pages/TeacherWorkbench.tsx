import { useState, useMemo } from 'react';
import {
  Users,
  FileText,
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  Download,
  Search,
  BookOpen,
  TrendingUp,
  BarChart3,
  MessageSquare,
} from 'lucide-react';
import { StatusBadge, DifficultyBadge } from '@/components/ui/Badge';
import { ComparisonChart } from '@/components/charts/ComparisonChart';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuestionStore } from '@/store/useQuestionStore';
import { useKnowledgeStore } from '@/store/useKnowledgeStore';
import { useReportStore } from '@/store/useReportStore';
import { formatDate } from '@/utils/date';
import { generateParentReport } from '@/utils/export';

const TeacherWorkbench = () => {
  const { currentUser } = useAuthStore();
  const { classes, students, selectedClassId, setSelectedClassId } = useKnowledgeStore();
  const { errorQuestions, getQuestionById, getMasteryRate, batchUpdateTags } = useQuestionStore();
  const {
    getClassMastery,
    getStudentMastery,
    getCommentTasks,
    completeCommentTask,
    getErrorDistribution,
  } = useReportStore();

  const teacherId = currentUser?.id || 'tea-1';

  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'tasks' | 'import'>('overview');
  const [searchText, setSearchText] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const classStudents = useMemo(() =>
    students.filter(s => s.classId === selectedClassId),
    [students, selectedClassId]
  );

  const filteredStudents = useMemo(() =>
    classStudents.filter(s =>
      s.name.toLowerCase().includes(searchText.toLowerCase())
    ),
    [classStudents, searchText]
  );

  const classMastery = getClassMastery(selectedClassId);
  const commentTasks = getCommentTasks(teacherId);
  const pendingTasks = commentTasks.filter(t => t.status === 'pending');
  const completedTasks = commentTasks.filter(t => t.status === 'completed');

  const selectedStudent = selectedStudentId
    ? students.find(s => s.id === selectedStudentId)
    : null;

  const selectedStudentErrors = selectedStudentId
    ? errorQuestions.filter(eq => eq.studentId === selectedStudentId)
    : [];

  const handlePushTask = (studentId: string, knowledgePointId: string) => {
    const newTask = {
      id: `task-${Date.now()}`,
      teacherId,
      studentId,
      knowledgePointId,
      type: 'concept' as const,
      title: '知识点讲评',
      description: '请关注该知识点的掌握情况，及时进行针对性讲评',
      status: 'pending' as const,
      priority: 'medium' as const,
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    alert('讲评任务已推送！');
  };

  const handleCompleteTask = (taskId: string) => {
    completeCommentTask(taskId);
  };

  const handleExportParentReport = (student: typeof selectedStudent) => {
    if (!student) return;
    const studentErrors = errorQuestions.filter(eq => eq.studentId === student.id);
    const masteryData = getStudentMastery(student.id);
    const reportText = generateParentReport(student, studentErrors, masteryData);

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.name}家长沟通报告.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchPush = () => {
    if (pendingTasks.length > 0) {
      alert(`已推送 ${pendingTasks.length} 条讲评任务！`);
    }
  };

  const distributionData = useMemo(() => {
    const dist = getErrorDistribution(selectedClassId, 'knowledge');
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [getErrorDistribution, selectedClassId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">教师工作台</h1>
          <p className="text-gray-500 text-sm mt-1">
            查看班级整体情况，管理讲评任务，与家长沟通
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedStudentId(null);
            }}
            className="select w-48"
          >
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'overview', label: '班级概览', icon: BarChart3 },
          { key: 'students', label: '学员列表', icon: Users },
          { key: 'tasks', label: '讲评任务', icon: Bell },
          { key: 'import', label: '导入错题', icon: FileText },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.key === 'tasks' && pendingTasks.length > 0 && (
              <span className="bg-warning-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingTasks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500">学员总数</p>
                  <p className="text-3xl font-bold text-gray-800">{classStudents.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="text-xs text-emerald-600">
                {classes.find(c => c.id === selectedClassId)?.name}
              </div>
            </div>

            <div className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500">班级错题总数</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {errorQuestions.filter(eq => classStudents.some(s => s.id === eq.studentId)).length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="text-xs text-orange-600">
                人均 {classStudents.length > 0
                  ? Math.round(errorQuestions.filter(eq =>
                      classStudents.some(s => s.id === eq.studentId)
                    ).length / classStudents.length)
                  : 0} 道
              </div>
            </div>

            <div className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500">班级平均掌握度</p>
                  <p className="text-3xl font-bold text-gray-800">{classMastery.avgMasteryRate}%</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${classMastery.avgMasteryRate}%` }}
                />
              </div>
            </div>

            <div className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500">待讲评任务</p>
                  <p className="text-3xl font-bold text-warning-600">{pendingTasks.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-warning-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-warning-600" />
                </div>
              </div>
              <div className="text-xs text-gray-500">
                已完成 {completedTasks.length} 条
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">班级知识点掌握度</h3>
              <ComparisonChart
                data={classMastery.masteryData}
                type="bar"
                height={300}
              />
            </div>

            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">错题分布</h3>
              <ComparisonChart
                data={distributionData}
                type="pie"
                height={300}
              />
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">薄弱学员 TOP 5</h3>
            <div className="space-y-3">
              {[...classStudents]
                .map(s => ({
                  ...s,
                  mastery: Math.round(
                    [...useKnowledgeStore.getState().knowledgePoints].reduce(
                      (sum, kp) => sum + getMasteryRate(kp.id, s.id), 0
                    ) / Math.max(useKnowledgeStore.getState().knowledgePoints.length, 1)
                  ),
                }))
                .sort((a, b) => a.mastery - b.mastery)
                .slice(0, 5)
                .map((s, index) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedStudentId(s.id);
                      setActiveTab('students');
                    }}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-red-500 text-white' :
                      index === 1 ? 'bg-orange-500 text-white' :
                      index === 2 ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 text-white flex items-center justify-center text-sm font-bold">
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-500">
                        {errorQuestions.filter(eq => eq.studentId === s.id).length} 道错题
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        s.mastery >= 80 ? 'text-emerald-600' :
                        s.mastery >= 60 ? 'text-blue-600' :
                        s.mastery >= 40 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {s.mastery}%
                      </p>
                      <p className="text-xs text-gray-500">掌握度</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportParentReport(s);
                      }}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索学员..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="input pl-10"
              />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredStudents.map(student => {
                const mastery = Math.round(
                  [...useKnowledgeStore.getState().knowledgePoints].reduce(
                    (sum, kp) => sum + getMasteryRate(kp.id, student.id), 0
                  ) / Math.max(useKnowledgeStore.getState().knowledgePoints.length, 1)
                );
                const studentErrors = errorQuestions.filter(eq => eq.studentId === student.id);

                return (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      selectedStudentId === student.id
                        ? 'bg-primary-50 border-2 border-primary-500'
                        : 'bg-white border-2 border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 text-white flex items-center justify-center font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{student.name}</p>
                        <p className="text-xs text-gray-500">
                          {studentErrors.length} 道错题 · 掌握度 {mastery}%
                        </p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        mastery >= 80 ? 'bg-emerald-500' :
                        mastery >= 60 ? 'bg-blue-500' :
                        mastery >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedStudent ? (
              <div className="space-y-6">
                <div className="card">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 text-white flex items-center justify-center text-2xl font-bold">
                        {selectedStudent.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h3>
                        <p className="text-gray-500">
                          {classes.find(c => c.id === selectedStudent.classId)?.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExportParentReport(selectedStudent)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      导出家长报告
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <p className="text-2xl font-bold text-blue-600">{selectedStudentErrors.length}</p>
                      <p className="text-xs text-blue-500 mt-1">累计错题</p>
                    </div>
                    <div className="text-center p-4 bg-emerald-50 rounded-xl">
                      <p className="text-2xl font-bold text-emerald-600">
                        {selectedStudentErrors.filter(eq => eq.correctionStatus === 'mastered').length}
                      </p>
                      <p className="text-xs text-emerald-500 mt-1">已掌握</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-xl">
                      <p className="text-2xl font-bold text-amber-600">
                        {Math.round([...useKnowledgeStore.getState().knowledgePoints].reduce(
                          (sum, kp) => sum + getMasteryRate(kp.id, selectedStudent.id), 0
                        ) / Math.max(useKnowledgeStore.getState().knowledgePoints.length, 1))}%
                      </p>
                      <p className="text-xs text-amber-500 mt-1">掌握度</p>
                    </div>
                  </div>

                  <h4 className="font-bold text-gray-800 mb-3">最近错题</h4>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {selectedStudentErrors.slice(0, 5).map(eq => {
                      const q = getQuestionById(eq.questionId);
                      return (
                        <div key={eq.id} className="p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-start gap-3">
                            <StatusBadge status={eq.correctionStatus} />
                            <div className="flex-1">
                              <p className="text-sm text-gray-700">{q?.content.slice(0, 80)}...</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {formatDate(eq.errorDate)}
                                </span>
                                {q && <DifficultyBadge difficulty={q.difficulty} />}
                              </div>
                            </div>
                            <button
                              onClick={() => handlePushTask(selectedStudent.id, eq.knowledgePointId)}
                              className="p-2 text-gray-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-colors"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {selectedStudentErrors.length === 0 && (
                      <p className="text-center text-gray-500 py-8">暂无错题</p>
                    )}
                  </div>
                </div>

                <div className="card">
                  <h4 className="font-bold text-gray-800 mb-4">知识点掌握情况</h4>
                  <div className="space-y-3">
                    {[...useKnowledgeStore.getState().knowledgePoints]
                      .filter(kp => kp.subjectId === useKnowledgeStore.getState().selectedSubjectId)
                      .map(kp => {
                        const mastery = getMasteryRate(kp.id, selectedStudent.id);
                        return (
                          <div key={kp.id} className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 w-24 truncate">{kp.name}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  mastery >= 80 ? 'bg-emerald-500' :
                                  mastery >= 60 ? 'bg-blue-500' :
                                  mastery >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${mastery}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium w-12 text-right ${
                              mastery >= 80 ? 'text-emerald-600' :
                              mastery >= 60 ? 'text-blue-600' :
                              mastery >= 40 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {mastery}%
                            </span>
                            <button
                              onClick={() => handlePushTask(selectedStudent.id, kp.id)}
                              className="p-1.5 text-gray-400 hover:text-accent-600 hover:bg-accent-50 rounded transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-gray-500">请从左侧选择一位学员查看详情</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                待处理 {pendingTasks.length} 条
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                已完成 {completedTasks.length} 条
              </span>
            </div>
            {pendingTasks.length > 0 && (
              <button
                onClick={handleBatchPush}
                className="btn-accent flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                批量推送
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {commentTasks.map(task => {
              const student = students.find(s => s.id === task.studentId);
              const kp = useKnowledgeStore.getState().knowledgePoints.find(k => k.id === task.knowledgePointId);

              return (
                <div
                  key={task.id}
                  className={`card transition-all ${
                    task.status === 'completed' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      task.priority === 'high' ? 'bg-red-100' :
                      task.priority === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      {task.priority === 'high' ? (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      ) : task.priority === 'medium' ? (
                        <Bell className="w-5 h-5 text-amber-600" />
                      ) : (
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-800">{task.title}</h4>
                        <StatusBadge status={task.status === 'pending' ? 'pending' : 'mastered'} />
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {student?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {kp?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(task.dueDate)}
                    </span>
                  </div>

                  {task.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="flex-1 btn-accent flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        标记已完成
                      </button>
                      <button className="btn-secondary">查看详情</button>
                    </div>
                  )}
                </div>
              );
            })}

            {commentTasks.length === 0 && (
              <div className="col-span-2 card text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bell className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-gray-500">暂无讲评任务</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">导入考试结果</h3>
          <p className="text-gray-500 mb-6">
            支持 Excel 格式的考试结果导入，系统将自动归类错题并关联知识点。
          </p>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-primary-400 transition-colors">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-gray-700 font-medium mb-2">点击或拖拽文件到此处</p>
            <p className="text-sm text-gray-400 mb-4">支持 .xlsx, .xls 格式</p>
            <button className="btn-primary">选择文件</button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <h4 className="font-medium text-gray-700 mb-2">导入模板说明</h4>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• 必须包含字段：学员姓名、题目ID、学生答案、正确答案、得分</li>
              <li>• 可选字段：错因分析、知识点标签</li>
              <li>• 系统将自动匹配现有题目和知识点</li>
              <li>• 未匹配的题目将创建新记录</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherWorkbench;
