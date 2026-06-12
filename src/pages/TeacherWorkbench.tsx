import { useState, useMemo, useRef } from 'react';
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
  Upload,
  X,
  Check,
} from 'lucide-react';
import { StatusBadge, DifficultyBadge } from '@/components/ui/Badge';
import { ComparisonChart } from '@/components/charts/ComparisonChart';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuestionStore } from '@/store/useQuestionStore';
import { useKnowledgeStore } from '@/store/useKnowledgeStore';
import { useReportStore } from '@/store/useReportStore';
import { formatDate } from '@/utils/date';
import { generateParentReport } from '@/utils/export';
import { generateId } from '@/utils/calculation';
import type { ErrorReason, ErrorQuestion, Question, ImportDetailRecord } from '@/types';

const errorReasonKeywords: Record<ErrorReason, string[]> = {
  '概念不清': ['概念', '定义', '不理解', '混淆', '不知道'],
  '计算错误': ['计算', '算错', '加减', '乘除', '运算'],
  '审题失误': ['看错', '没看清', '题目', '理解错', '条件'],
  '方法不当': ['方法', '思路', '解法', '不会做', '技巧'],
  '知识遗忘': ['忘了', '不记得', '遗忘', '背错', '记错'],
  '其他': [],
};

const inferErrorReason = (text: string): ErrorReason => {
  for (const [reason, kws] of Object.entries(errorReasonKeywords)) {
    if (kws.some(kw => text.includes(kw))) return reason as ErrorReason;
  }
  return '概念不清';
};

const findKnowledgePointId = (text: string, kps: Array<{ id: string; name: string }>): string | undefined => {
  for (const kp of kps) {
    if (text.includes(kp.name)) return kp.id;
  }
  return undefined;
};

const TeacherWorkbench = () => {
  const { currentUser } = useAuthStore();
  const { classes, students, selectedClassId, setSelectedClassId, knowledgePoints } = useKnowledgeStore();
  const { errorQuestions, getQuestionById, getMasteryRate, batchUpdateTags, batchImportErrorQuestions, questions, addQuestion, batchAddQuestions, importHistory, addImportHistory, undoLastImport } = useQuestionStore();
  const {
    getClassMastery,
    getStudentMastery,
    getCommentTasks,
    completeCommentTask,
    getErrorDistribution,
    pushCommentTask,
    batchPushCommentTasks,
  } = useReportStore();

  const teacherId = currentUser?.id || 'tea-1';

  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'tasks' | 'import'>('overview');
  const [searchText, setSearchText] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [taskToast, setTaskToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [importPreview, setImportPreview] = useState<Array<{
    studentName: string;
    questionId: string;
    questionContent: string;
    studentAnswer: string;
    correctAnswer: string;
    score: number;
    fullScore: number;
    isWrong: boolean;
    errorReason: string;
    knowledgePointName: string;
  }>>([]);
  const [passThreshold, setPassThreshold] = useState(60);
  const [importResult, setImportResult] = useState<{ total: number; added: number; skipped: number; addedDetails: ImportDetailRecord[]; skippedDetails: ImportDetailRecord[] } | null>(null);
  const [lastImportFileName, setLastImportFileName] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pushModal, setPushModal] = useState<{ studentId: string; knowledgePointId: string } | null>(null);
  const [pushNote, setPushNote] = useState('');
  const [pushDueDate, setPushDueDate] = useState('');
  const [taskFilter, setTaskFilter] = useState<{ student: string; kp: string; status: string }>({ student: '', kp: '', status: '' });
  const [completeModal, setCompleteModal] = useState<string | null>(null);
  const [completeNote, setCompleteNote] = useState('');

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

  const filteredCommentTasks = useMemo(() => {
    let tasks = commentTasks;
    if (taskFilter.student) {
      const student = students.find(s => s.name.includes(taskFilter.student));
      if (student) tasks = tasks.filter(t => t.studentId === student.id);
    }
    if (taskFilter.kp) {
      tasks = tasks.filter(t => {
        const kp = knowledgePoints.find(k => k.id === t.knowledgePointId);
        return kp?.name.includes(taskFilter.kp);
      });
    }
    if (taskFilter.status) {
      tasks = tasks.filter(t => t.status === taskFilter.status);
    }
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return tasks.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });
  }, [commentTasks, taskFilter, students, knowledgePoints]);

  const isTaskNearDue = (task: typeof commentTasks[number]): 'overdue' | 'urgent' | 'soon' | 'normal' => {
    if (task.status === 'completed' || !task.dueDate) return 'normal';
    const diff = new Date(task.dueDate).getTime() - Date.now();
    if (diff < 0) return 'overdue';
    if (diff <= 24 * 60 * 60 * 1000) return 'urgent';
    if (diff <= 3 * 24 * 60 * 60 * 1000) return 'soon';
    return 'normal';
  };

  const selectedStudent = selectedStudentId
    ? students.find(s => s.id === selectedStudentId)
    : null;

  const selectedStudentErrors = selectedStudentId
    ? errorQuestions.filter(eq => eq.studentId === selectedStudentId)
    : [];

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setTaskToast({ type, message });
    setTimeout(() => setTaskToast(null), 3000);
  };

  const handlePushTask = (studentId: string, knowledgePointId: string) => {
    if (!knowledgePointId) {
      showToast('error', '缺少知识点信息，无法推送');
      return;
    }
    const existing = pendingTasks.find(
      t => t.studentId === studentId && t.knowledgePointId === knowledgePointId
    );
    if (existing) {
      showToast('info', '该学员此知识点已有待处理的讲评任务');
      return;
    }
    setPushModal({ studentId, knowledgePointId });
    setPushNote('');
    setPushDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  };

  const handleConfirmPush = () => {
    if (!pushModal) return;
    const task = pushCommentTask(teacherId, pushModal.studentId, pushModal.knowledgePointId, {
      description: pushNote || undefined,
      dueDate: pushDueDate || undefined,
    });
    showToast('success', `已推送给 ${students.find(s => s.id === pushModal.studentId)?.name}：${task.title}`);
    setPushModal(null);
    setPushNote('');
    setPushDueDate('');
  };

  const handleCompleteTask = (taskId: string) => {
    setCompleteModal(taskId);
    setCompleteNote('');
  };

  const handleConfirmComplete = () => {
    if (!completeModal) return;
    completeCommentTask(completeModal, completeNote);
    const studentName = students.find(s => s.id === commentTasks.find(t => t.id === completeModal)?.studentId)?.name;
    showToast('success', `${studentName} 的讲评任务已标记完成`);
    setCompleteModal(null);
    setCompleteNote('');
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
    showToast('success', `${student.name} 的家长报告已导出`);
  };

  const handleBatchPush = () => {
    const weakStudentsData: Array<{ studentId: string; knowledgePointId: string }> = [];
    classStudents.forEach(student => {
      const weakKps = knowledgePoints
        .filter(kp => kp.subjectId === useKnowledgeStore.getState().selectedSubjectId)
        .filter(kp => getMasteryRate(kp.id, student.id) < 50);
      weakKps.slice(0, 2).forEach(kp => {
        const exists = pendingTasks.some(
          t => t.studentId === student.id && t.knowledgePointId === kp.id
        );
        if (!exists) {
          weakStudentsData.push({ studentId: student.id, knowledgePointId: kp.id });
        }
      });
    });
    if (weakStudentsData.length === 0) {
      showToast('info', '没有需要批量推送的新任务');
      return;
    }
    const results = batchPushCommentTasks(teacherId, weakStudentsData);
    showToast('success', `批量推送完成：共 ${results.length} 条任务`);
  };

  const distributionData = useMemo(() => {
    const dist = getErrorDistribution(selectedClassId, 'knowledge');
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [getErrorDistribution, selectedClassId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLastImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        let parsed: any[] = [];

        if (file.name.endsWith('.json')) {
          parsed = JSON.parse(text);
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          const headers = lines[0].split(',').map(h => h.trim());
          parsed = lines.slice(1).map(line => {
            const values = line.split(',');
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
              obj[h] = (values[i] || '').trim();
            });
            return obj;
          });
        } else if (file.name.endsWith('.txt')) {
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          const headers = lines[0].split(/\t|  +/).map(h => h.trim());
          parsed = lines.slice(1).map(line => {
            const values = line.split(/\t|  +/);
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
              obj[h] = (values[i] || '').trim();
            });
            return obj;
          });
        } else {
          showToast('error', '不支持的文件格式，请使用 JSON/CSV/TXT');
          return;
        }

        const kpOptions = knowledgePoints.map(kp => ({ id: kp.id, name: kp.name }));

        const getField = (row: Record<string, any>, keys: string[]): any => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
          }
          const lowerKeys = Object.keys(row);
          for (const wantKey of keys) {
            const match = lowerKeys.find(k => k.toLowerCase() === wantKey.toLowerCase());
            if (match && row[match] !== undefined && row[match] !== null && row[match] !== '') return row[match];
          }
          return undefined;
        };

        const preview = parsed.map((row: any) => {
          const studentName = getField(row, ['学员姓名', 'studentName', 'student_name', '学生', '姓名', '学生姓名']) || '';
          const qId = getField(row, ['题目ID', 'questionId', 'question_id', '题目', '题目编号', '题号']) || generateId();
          const qContent = getField(row, ['题目内容', 'content', 'questionContent', 'question_content', '题目', '题干']) || `题目 ${qId}`;
          const sAnswer = getField(row, ['学生答案', 'studentAnswer', 'student_answer', '作答', '用户答案', '考生作答']) || '';
          const cAnswer = getField(row, ['正确答案', 'correctAnswer', 'correct_answer', '答案', '标准答案']) || '';
          const rawScore = getField(row, ['得分', 'score', '实得分', '原始分', '分数']);
          const rawTotal = getField(row, ['满分', 'totalScore', 'total_score', '总分', '题目分值', '满分值']);
          const hasExplicitScore = rawScore !== undefined;
          const hasExplicitTotal = rawTotal !== undefined;
          const score = hasExplicitScore ? Number(rawScore) : (String(sAnswer).trim() === String(cAnswer).trim() ? 1 : 0);
          const totalScore = hasExplicitTotal ? Number(rawTotal) : 1;
          const reason = getField(row, ['错因分析', 'errorReason', 'error_reason', '错因', '错误原因']) || inferErrorReason(qContent + ' ' + sAnswer);
          const kpName = getField(row, ['知识点标签', 'knowledgePoint', 'knowledge_point', '知识点', '考点']) || findKnowledgePointId(qContent, kpOptions) || '';
          const kp = kpOptions.find(k => k.name === kpName) || kpOptions.find(k => qContent.includes(k.name));
          let isWrong: boolean;
          if (hasExplicitScore && hasExplicitTotal && totalScore > 0) {
            isWrong = (score / totalScore) * 100 < passThreshold;
          } else if (hasExplicitScore && !hasExplicitTotal && score > 0) {
            isWrong = score < passThreshold;
          } else {
            isWrong = String(sAnswer).trim() !== String(cAnswer).trim();
          }

          return {
            studentName,
            questionId: String(qId),
            questionContent: qContent,
            studentAnswer: sAnswer,
            correctAnswer: cAnswer,
            score,
            fullScore: totalScore,
            isWrong,
            errorReason: reason,
            knowledgePointName: kp?.name || kpName,
          };
        });

        setImportPreview(preview);
        setImportResult(null);
        showToast('success', `文件解析完成：共 ${preview.length} 条记录`);
      } catch (err) {
        console.error(err);
        showToast('error', '文件解析失败，请检查格式');
      }
    };
    reader.readAsText(file, 'UTF-8');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    const wrongRecords = importPreview.filter(r => r.isWrong);
    const toImport: Array<Omit<ErrorQuestion, 'id'>> = [];
    const newQuestionsToAdd: Array<Omit<Question, 'id'>> = [];
    const addedDetails: ImportDetailRecord[] = [];
    const skippedDetails: ImportDetailRecord[] = [];

    wrongRecords.forEach(record => {
      const student = students.find(s => s.name === record.studentName);
      if (!student) {
        skippedDetails.push({
          studentName: record.studentName,
          questionId: record.questionId,
          questionContent: record.questionContent,
          score: record.score,
          fullScore: record.fullScore,
          reason: '未找到匹配的学员',
        });
        return;
      }

      let question = questions.find(q => q.id === record.questionId);
      const kp = knowledgePoints.find(k => k.name === record.knowledgePointName);

      if (!question) {
        const qKp = kp || knowledgePoints[0];
        question = {
          id: record.questionId,
          content: record.questionContent,
          type: 'fill',
          options: [],
          correctAnswer: record.correctAnswer,
          answer: record.correctAnswer,
          analysis: `参考答案：${record.correctAnswer}`,
          answerExplanation: record.correctAnswer,
          difficulty: 3,
          knowledgePointId: qKp.id,
          knowledgePointIds: [qKp.id],
          subjectId: qKp.subjectId,
        } as Question;
        newQuestionsToAdd.push(question);
      }

      const existing = errorQuestions.find(
        eq => eq.studentId === student.id && eq.questionId === record.questionId
      );
      if (existing) {
        skippedDetails.push({
          studentId: student.id,
          studentName: student.name,
          questionId: record.questionId,
          questionContent: record.questionContent,
          knowledgePointId: kp?.id,
          score: record.score,
          fullScore: record.fullScore,
          reason: '该学员此题已在错题库中',
        });
        return;
      }

      const eqPayload: Omit<ErrorQuestion, 'id'> = {
        studentId: student.id,
        questionId: question.id,
        knowledgePointId: kp?.id || question.knowledgePointId,
        wrongAnswer: record.studentAnswer,
        errorReason: (record.errorReason as any) || inferErrorReason(record.studentAnswer + ' ' + record.questionContent),
        errorDate: new Date().toISOString().split('T')[0],
        correctionStatus: 'pending',
        nextReviewDate: new Date().toISOString().split('T')[0],
        reviewCount: 0,
        masteryRate: kp ? getMasteryRate(kp.id, student.id) : 40,
        sourceExam: '导入考试',
      };
      toImport.push(eqPayload);
      addedDetails.push({
        studentId: student.id,
        studentName: student.name,
        questionId: question.id,
        questionContent: record.questionContent,
        knowledgePointId: kp?.id,
        score: record.score,
        fullScore: record.fullScore,
        reason: `得分率 ${record.fullScore > 0 ? Math.round((record.score / record.fullScore) * 100) : 0}%，低于阈值 ${passThreshold}%`,
      });
    });

    importPreview.filter(r => !r.isWrong).forEach(record => {
      skippedDetails.push({
        studentName: record.studentName,
        questionId: record.questionId,
        questionContent: record.questionContent,
        score: record.score,
        fullScore: record.fullScore,
        reason: `得分率 ${record.fullScore > 0 ? Math.round((record.score / record.fullScore) * 100) : 100}%，已达标（阈值 ${passThreshold}%）`,
      });
    });

    let addedQuestionIds: string[] = [];
    if (newQuestionsToAdd.length > 0) {
      const addedQs = batchAddQuestions(newQuestionsToAdd);
      addedQuestionIds = addedQs.map(q => q.id);
    }

    const addedEqs = batchImportErrorQuestions(toImport);
    const addedEqIds = addedEqs.map(eq => eq.id);

    addImportHistory({
      id: generateId(),
      fileName: lastImportFileName,
      importDate: new Date().toISOString(),
      totalRecords: importPreview.length,
      addedCount: toImport.length,
      skippedCount: skippedDetails.length,
      passThreshold,
      addedErrorQuestionIds: addedEqIds,
      addedQuestionIds,
      addedDetails,
      skippedDetails,
    });

    setImportResult({
      total: importPreview.length,
      added: toImport.length,
      skipped: skippedDetails.length,
      addedDetails,
      skippedDetails,
    });
    showToast('success', `导入完成：新增 ${toImport.length} 道错题`);
  };

  return (
    <div className="space-y-6 relative">
      {taskToast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg animate-slide-up ${
          taskToast.type === 'success' ? 'bg-emerald-500 text-white' :
          taskToast.type === 'info' ? 'bg-blue-500 text-white' :
          'bg-red-500 text-white'
        }`}>
          {taskToast.type === 'success' ? <Check className="w-5 h-5" /> :
           taskToast.type === 'error' ? <X className="w-5 h-5" /> :
           <Bell className="w-5 h-5" />}
          <span className="font-medium text-sm">{taskToast.message}</span>
        </div>
      )}

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
                              title="推送讲评任务"
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
                              title="推送讲评任务"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="card">
                  <h4 className="font-bold text-gray-800 mb-3">讲评记录</h4>
                  {commentTasks.filter(t => t.studentId === selectedStudent.id).length > 0 ? (
                    <div className="space-y-3">
                      {commentTasks.filter(t => t.studentId === selectedStudent.id).map(task => {
                        const kp = knowledgePoints.find(k => k.id === task.knowledgePointId);
                        return (
                          <div key={task.id} className={`p-3 rounded-lg ${
                            task.status === 'completed' ? 'bg-emerald-50' : 'bg-amber-50'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-800">{task.title}</span>
                              <StatusBadge status={task.status === 'pending' ? 'pending' : 'mastered'} />
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span>知识点：{kp?.name || '未指定'}</span>
                              {task.dueDate && <span>截止：{formatDate(task.dueDate)}</span>}
                              {task.completedAt && <span className="text-emerald-600">完成：{formatDate(task.completedAt)}</span>}
                            </div>
                            {task.description && task.description !== '请关注该知识点的掌握情况，及时进行针对性讲评' && (
                              <p className="text-xs text-gray-500 mt-1">备注：{task.description}</p>
                            )}
                            {task.comment && (
                              <p className="text-xs text-blue-600 mt-1">完成备注：{task.comment}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">暂无讲评记录</p>
                  )}
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
          <div className="flex items-center justify-between flex-wrap gap-4">
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
            <button
              onClick={handleBatchPush}
              className="btn-accent flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              批量推送薄弱学员任务
            </button>
          </div>

          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="按学员姓名筛选..."
              value={taskFilter.student}
              onChange={(e) => setTaskFilter({ ...taskFilter, student: e.target.value })}
              className="input w-44 text-sm"
            />
            <input
              type="text"
              placeholder="按知识点筛选..."
              value={taskFilter.kp}
              onChange={(e) => setTaskFilter({ ...taskFilter, kp: e.target.value })}
              className="input w-44 text-sm"
            />
            <select
              value={taskFilter.status}
              onChange={(e) => setTaskFilter({ ...taskFilter, status: e.target.value })}
              className="select w-32 text-sm"
            >
              <option value="">全部状态</option>
              <option value="pending">待处理</option>
              <option value="completed">已完成</option>
            </select>
            {(taskFilter.student || taskFilter.kp || taskFilter.status) && (
              <button
                onClick={() => setTaskFilter({ student: '', kp: '', status: '' })}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                清除筛选
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCommentTasks.map(task => {
              const student = students.find(s => s.id === task.studentId);
              const kp = knowledgePoints.find(k => k.id === task.knowledgePointId);
              const nearDue = isTaskNearDue(task);

              return (
                <div
                  key={task.id}
                  className={`card transition-all ${
                    task.status === 'completed' ? 'opacity-70' : ''
                  } ${
                    nearDue === 'overdue' ? 'ring-2 ring-red-400 bg-red-50/30' :
                    nearDue === 'urgent' ? 'ring-2 ring-orange-400 bg-orange-50/30' :
                    nearDue === 'soon' ? 'ring-1 ring-amber-300 bg-amber-50/10' : ''
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
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-gray-800">{task.title}</h4>
                        <div className="flex items-center gap-1.5">
                          {nearDue === 'overdue' && (
                            <span className="text-xs text-white bg-red-500 px-1.5 py-0.5 rounded">
                              已逾期
                            </span>
                          )}
                          {nearDue === 'urgent' && (
                            <span className="text-xs text-white bg-orange-500 px-1.5 py-0.5 rounded">
                              今日到期
                            </span>
                          )}
                          {nearDue === 'soon' && (
                            <span className="text-xs text-white bg-amber-500 px-1.5 py-0.5 rounded">
                              3天内到期
                            </span>
                          )}
                          <StatusBadge status={task.status === 'pending' ? 'pending' : 'mastered'} />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {student?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {kp?.name || '未指定'}
                    </span>
                    <span className={`flex items-center gap-1 ${
                      nearDue === 'overdue' ? 'text-red-600 font-medium' :
                      nearDue === 'urgent' ? 'text-orange-600 font-medium' :
                      nearDue === 'soon' ? 'text-amber-600 font-medium' : ''
                    }`}>
                      <Clock className="w-4 h-4" />
                      {task.dueDate ? formatDate(task.dueDate) : '无截止日期'}
                    </span>
                    {task.completedAt && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        {formatDate(task.completedAt)} 完成
                      </span>
                    )}
                  </div>

                  {task.comment && (
                    <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700">
                        <MessageSquare className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                        {task.status === 'completed' ? '完成备注' : '讲评备注'}：{task.comment}
                      </p>
                    </div>
                  )}

                  {task.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="flex-1 btn-accent flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        标记已完成
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStudentId(task.studentId);
                          setActiveTab('students');
                        }}
                        className="btn-secondary"
                      >
                        查看详情
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCommentTasks.length === 0 && (
              <div className="col-span-2 card text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bell className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-gray-500">
                  {taskFilter.student || taskFilter.kp || taskFilter.status
                    ? '没有匹配筛选条件的任务'
                    : '暂无讲评任务，可在学员列表推送任务'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">导入考试结果</h3>
          <p className="text-gray-500 mb-6">
            支持 Excel (CSV)、JSON、TXT 格式的考试结果导入，系统将自动归类错题并关联知识点。
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-gray-700 font-medium mb-2">点击或拖拽文件到此处</p>
            <p className="text-sm text-gray-400 mb-4">支持 .json, .csv, .txt 格式</p>
            <button
              className="btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              选择文件
            </button>
          </div>

          {importPreview.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h4 className="font-medium text-gray-700">
                    数据预览 ({importPreview.length} 条记录，
                    <span className="text-red-500"> 错题 {importPreview.filter(r => r.isWrong).length} 道</span>，
                    <span className="text-emerald-500"> 达标 {importPreview.filter(r => !r.isWrong).length} 道</span>)
                  </h4>
                  <div className="flex items-center gap-2 text-sm">
                    <label className="text-gray-500">错题阈值(%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={passThreshold}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(100, Number(e.target.value)));
                        setPassThreshold(val);
                        setImportPreview(prev => prev.map(r => ({
                          ...r,
                          isWrong: r.fullScore > 0 ? (r.score / r.fullScore) * 100 < val : r.studentAnswer !== r.correctAnswer,
                        })));
                      }}
                      className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-400 focus:outline-none"
                    />
                    <span className="text-gray-400 text-xs">低于此得分率视为错题</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setImportPreview([]);
                      setImportResult(null);
                    }}
                    className="btn-secondary"
                  >
                    取消
                  </button>
                  <button onClick={handleConfirmImport} className="btn-primary">
                    确认导入错题
                  </button>
                </div>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-gray-50 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="px-3 py-2 font-medium">学员</th>
                        <th className="px-3 py-2 font-medium">题目</th>
                        <th className="px-3 py-2 font-medium">学生答案</th>
                        <th className="px-3 py-2 font-medium">正确答案</th>
                        <th className="px-3 py-2 font-medium">得分/满分</th>
                        <th className="px-3 py-2 font-medium">结果</th>
                        <th className="px-3 py-2 font-medium">错因</th>
                        <th className="px-3 py-2 font-medium">知识点</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 30).map((row, i) => (
                        <tr key={i} className={`border-t ${row.isWrong ? 'bg-red-50' : 'bg-emerald-50/30'}`}>
                          <td className="px-3 py-2">{row.studentName}</td>
                          <td className="px-3 py-2 max-w-[200px] truncate">{row.questionContent.slice(0, 30)}...</td>
                          <td className="px-3 py-2">{row.studentAnswer.slice(0, 10)}</td>
                          <td className="px-3 py-2">{row.correctAnswer.slice(0, 10)}</td>
                          <td className="px-3 py-2">
                            <span className={row.isWrong ? 'text-red-600 font-medium' : 'text-emerald-600'}>
                              {row.score}/{row.fullScore}
                            </span>
                            <span className="ml-1 text-xs text-gray-400">
                              ({row.fullScore > 0 ? Math.round((row.score / row.fullScore) * 100) : 0}%)
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {row.isWrong ? (
                              <span className="text-red-600 font-medium">错误</span>
                            ) : (
                              <span className="text-emerald-600 font-medium">达标</span>
                            )}
                          </td>
                          <td className="px-3 py-2">{row.isWrong ? row.errorReason : '—'}</td>
                          <td className="px-3 py-2">{row.knowledgePointName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importPreview.length > 30 && (
                  <p className="text-xs text-gray-500 text-center py-2 bg-gray-50 border-t">
                    仅显示前 30 条，共 {importPreview.length} 条记录
                  </p>
                )}
              </div>
            </div>
          )}

          {importResult && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-emerald-700 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  导入完成
                </h4>
                <button
                  onClick={() => {
                    const undone = undoLastImport();
                    if (undone) {
                      setImportResult(null);
                      setImportPreview([]);
                      showToast('info', `已撤回导入「${undone.fileName}」，删除 ${undone.addedCount} 道错题`);
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  撤回本次导入
                </button>
              </div>
              <ul className="text-sm text-emerald-600 space-y-1 mb-3">
                <li>• 总记录数：{importResult.total} 条</li>
                <li>• 新增错题：{importResult.added} 道（可在错题库查看）</li>
                <li>• 跳过记录：{importResult.skipped} 条</li>
              </ul>
              {importResult.addedDetails.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-emerald-700 mb-1.5">新增错题明细：</p>
                  <div className="max-h-40 overflow-y-auto bg-white rounded-lg border border-emerald-100">
                    <table className="w-full text-xs">
                      <thead className="bg-emerald-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left text-emerald-600">学员</th>
                          <th className="px-2 py-1 text-left text-emerald-600">题目</th>
                          <th className="px-2 py-1 text-left text-emerald-600">得分</th>
                          <th className="px-2 py-1 text-left text-emerald-600">原因</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.addedDetails.map((d, i) => (
                          <tr key={i} className="border-t border-emerald-50">
                            <td className="px-2 py-1 text-gray-700">{d.studentName}</td>
                            <td className="px-2 py-1 text-gray-600 max-w-[180px] truncate">{(d.questionContent || '').slice(0, 20)}...</td>
                            <td className="px-2 py-1 text-gray-700">{d.score}/{d.fullScore}</td>
                            <td className="px-2 py-1 text-emerald-600">{d.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {importResult.skippedDetails.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">跳过敏细：</p>
                  <div className="max-h-40 overflow-y-auto bg-white rounded-lg border border-gray-200">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left text-gray-500">学员</th>
                          <th className="px-2 py-1 text-left text-gray-500">题目</th>
                          <th className="px-2 py-1 text-left text-gray-500">得分</th>
                          <th className="px-2 py-1 text-left text-gray-500">跳过原因</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.skippedDetails.map((d, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-2 py-1 text-gray-700">{d.studentName}</td>
                            <td className="px-2 py-1 text-gray-600 max-w-[180px] truncate">{(d.questionContent || '').slice(0, 20)}...</td>
                            <td className="px-2 py-1 text-gray-700">{d.score}/{d.fullScore}</td>
                            <td className="px-2 py-1 text-gray-500">{d.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {importHistory.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                导入历史 ({importHistory.length} 次)
              </h4>
              <div className="space-y-2">
                {importHistory.slice(0, 10).map(record => (
                  <div
                    key={record.id}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      expandedHistoryId === record.id
                        ? 'border-primary-300 bg-primary-50/30'
                        : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setExpandedHistoryId(expandedHistoryId === record.id ? null : record.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{record.fileName}</span>
                        <span className="text-xs text-gray-400">
                          {formatDate(record.importDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-emerald-600">+{record.addedCount} 新增</span>
                        <span className="text-gray-400">{record.skippedCount} 跳过</span>
                      </div>
                    </div>
                    {expandedHistoryId === record.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                          <div className="text-center p-2 bg-white rounded-lg">
                            <p className="text-lg font-bold text-gray-700">{record.totalRecords}</p>
                            <p className="text-xs text-gray-500">总记录</p>
                          </div>
                          <div className="text-center p-2 bg-emerald-50 rounded-lg">
                            <p className="text-lg font-bold text-emerald-600">{record.addedCount}</p>
                            <p className="text-xs text-emerald-500">新增错题</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <p className="text-lg font-bold text-gray-500">{record.skippedCount}</p>
                            <p className="text-xs text-gray-400">跳过</p>
                          </div>
                        </div>
                        {record.passThreshold !== undefined && (
                          <p className="text-xs text-gray-500 mb-2">错题阈值：低于 {record.passThreshold}% 视为错题</p>
                        )}
                        {record.addedDetails && record.addedDetails.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-700 mb-1.5">新增错题：</p>
                            <div className="max-h-36 overflow-y-auto bg-white rounded-lg border border-gray-100">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr>
                                    <th className="px-2 py-1 text-left text-gray-500">学员</th>
                                    <th className="px-2 py-1 text-left text-gray-500">题目</th>
                                    <th className="px-2 py-1 text-left text-gray-500">得分</th>
                                    <th className="px-2 py-1 text-left text-gray-500">原因</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {record.addedDetails.slice(0, 20).map((d, i) => (
                                    <tr key={i} className="border-t border-gray-100">
                                      <td className="px-2 py-1 text-gray-700">{d.studentName}</td>
                                      <td className="px-2 py-1 text-gray-600 max-w-[160px] truncate">{(d.questionContent || '').slice(0, 18)}...</td>
                                      <td className="px-2 py-1 text-gray-700">{d.score}/{d.fullScore}</td>
                                      <td className="px-2 py-1 text-emerald-600">{d.reason}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {record.addedDetails.length > 20 && (
                                <p className="text-xs text-gray-400 text-center py-1 border-t border-gray-100">...等 {record.addedDetails.length} 条</p>
                              )}
                            </div>
                          </div>
                        )}
                        {record.skippedDetails && record.skippedDetails.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-700 mb-1.5">跳过记录：</p>
                            <div className="max-h-36 overflow-y-auto bg-white rounded-lg border border-gray-100">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr>
                                    <th className="px-2 py-1 text-left text-gray-500">学员</th>
                                    <th className="px-2 py-1 text-left text-gray-500">题目</th>
                                    <th className="px-2 py-1 text-left text-gray-500">得分</th>
                                    <th className="px-2 py-1 text-left text-gray-500">跳过原因</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {record.skippedDetails.slice(0, 20).map((d, i) => (
                                    <tr key={i} className="border-t border-gray-100">
                                      <td className="px-2 py-1 text-gray-700">{d.studentName}</td>
                                      <td className="px-2 py-1 text-gray-600 max-w-[160px] truncate">{(d.questionContent || '').slice(0, 18)}...</td>
                                      <td className="px-2 py-1 text-gray-700">{d.score}/{d.fullScore}</td>
                                      <td className="px-2 py-1 text-gray-500">{d.reason}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {record.skippedDetails.length > 20 && (
                                <p className="text-xs text-gray-400 text-center py-1 border-t border-gray-100">...等 {record.skippedDetails.length} 条</p>
                              )}
                            </div>
                          </div>
                        )}
                        {importHistory[0]?.id === record.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const undone = undoLastImport();
                              if (undone) {
                                setImportResult(null);
                                setImportPreview([]);
                                showToast('info', `已撤回导入「${undone.fileName}」`);
                              }
                            }}
                            className="mt-3 text-xs text-red-600 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            撤回此导入
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <h4 className="font-medium text-gray-700 mb-2">导入模板说明</h4>
            <p className="text-xs text-gray-500 mb-3">
              文件首行作为表头，需包含以下字段（中英文均可）：
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
              <code className="bg-white px-2 py-1 rounded border">学员姓名</code>
              <code className="bg-white px-2 py-1 rounded border">题目ID</code>
              <code className="bg-white px-2 py-1 rounded border">题目内容</code>
              <code className="bg-white px-2 py-1 rounded border">学生答案</code>
              <code className="bg-white px-2 py-1 rounded border">正确答案</code>
              <code className="bg-white px-2 py-1 rounded border">得分</code>
              <code className="bg-white px-2 py-1 rounded border">满分</code>
              <code className="bg-white px-2 py-1 rounded border">知识点标签</code>
            </div>
            <ul className="text-sm text-gray-500 space-y-1 mt-3">
              <li>• 系统将自动根据得分低于满分60%判断错题</li>
              <li>• 根据题目内容关键词自动匹配知识点</li>
              <li>• 错因将根据内容和关键词智能推断</li>
              <li>• 未匹配的题目会创建新的题目记录</li>
            </ul>
          </div>
        </div>
      )}

      {pushModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-xl font-bold text-gray-800 mb-4">推送讲评任务</h2>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  学员：<strong>{students.find(s => s.id === pushModal.studentId)?.name}</strong>
                </p>
                <p className="text-sm text-gray-700">
                  知识点：<strong>{knowledgePoints.find(k => k.id === pushModal.knowledgePointId)?.name}</strong>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  讲评备注
                </label>
                <textarea
                  value={pushNote}
                  onChange={(e) => setPushNote(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="输入讲评备注（可选）"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  截止日期
                </label>
                <input
                  type="date"
                  value={pushDueDate}
                  onChange={(e) => setPushDueDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setPushModal(null); setPushNote(''); setPushDueDate(''); }}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button onClick={handleConfirmPush} className="flex-1 btn-primary">
                确认推送
              </button>
            </div>
          </div>
        </div>
      )}

      {completeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-xl font-bold text-gray-800 mb-4">标记讲评完成</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                完成备注
              </label>
              <textarea
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                className="input"
                rows={3}
                placeholder="输入完成备注（可选）"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setCompleteModal(null); setCompleteNote(''); }}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button onClick={handleConfirmComplete} className="flex-1 btn-primary">
                确认完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherWorkbench;
