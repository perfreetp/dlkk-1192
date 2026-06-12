import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  AlertCircle,
  ChevronRight,
  Play,
  Target,
  Brain,
} from 'lucide-react';
import { StatCard, MasteryCard } from '@/components/ui/StatCard';
import { ProgressChart } from '@/components/charts/ProgressChart';
import { StatusBadge, ErrorReasonBadge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuestionStore } from '@/store/useQuestionStore';
import { useKnowledgeStore } from '@/store/useKnowledgeStore';
import { useReportStore } from '@/store/useReportStore';
import { isToday, isPast, formatDate } from '@/utils/date';
import { getMasteryColor } from '@/utils/calculation';

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser, role } = useAuthStore();
  const { errorQuestions, getQuestionById, filterErrorQuestions, getMasteryRate, markMastered } = useQuestionStore();
  const { knowledgePoints, getKnowledgePointById } = useKnowledgeStore();
  const { getStudentProgress } = useReportStore();

  const studentId = currentUser?.id || 'stu-1';

  const allErrors = filterErrorQuestions({}, studentId);
  const pendingCount = allErrors.filter(eq => eq.correctionStatus === 'pending').length;
  const correctedCount = allErrors.filter(eq => eq.correctionStatus === 'corrected').length;
  const masteredCount = allErrors.filter(eq => eq.correctionStatus === 'mastered').length;

  const today = new Date().toISOString().split('T')[0];
  const dueForReview = allErrors.filter(eq =>
    eq.correctionStatus !== 'mastered' && (isToday(eq.nextReviewDate) || isPast(eq.nextReviewDate))
  );

  const thisWeekErrors = allErrors.filter(eq => {
    const errorDate = new Date(eq.errorDate);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return errorDate >= weekAgo;
  });

  const avgMastery = knowledgePoints.length > 0
    ? Math.round(knowledgePoints.reduce((sum, kp) => sum + getMasteryRate(kp.id, studentId), 0) / knowledgePoints.length)
    : 0;

  const weakPoints = [...knowledgePoints]
    .map(kp => ({
      id: kp.id,
      name: kp.name,
      masteryRate: getMasteryRate(kp.id, studentId),
    }))
    .sort((a, b) => a.masteryRate - b.masteryRate)
    .slice(0, 5);

  const progressData = getStudentProgress(studentId, 30);

  const handleStartReview = () => {
    navigate('/error-questions');
  };

  const handlePracticeWeakPoint = (kpId: string) => {
    navigate('/practice', { state: { selectedKpId: kpId } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            欢迎回来，{currentUser?.name}
          </h1>
          <p className="text-gray-500">今天也要加油，错题已为你整理好了</p>
        </div>
        <div className="flex gap-2">
          <span className="badge bg-primary-100 text-primary-700">
            {role === 'student' ? '学员模式' : '教师模式'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="错题总数"
          value={allErrors.length}
          subtitle="累计收录错题"
          icon={BookOpen}
          gradient="bg-gradient-to-r from-blue-500 to-blue-600"
          trend={{ value: 12, isPositive: false }}
          delay={50}
          onClick={() => navigate('/error-questions')}
        />
        <StatCard
          title="待订正"
          value={pendingCount}
          subtitle="需要及时订正"
          icon={AlertCircle}
          gradient="bg-gradient-to-r from-orange-400 to-orange-500"
          delay={100}
          onClick={() => navigate('/error-questions', { state: { status: 'pending' } })}
        />
        <StatCard
          title="待复习"
          value={dueForReview.length}
          subtitle="今天到期"
          icon={Clock}
          gradient="bg-gradient-to-r from-amber-400 to-amber-500"
          delay={150}
        />
        <StatCard
          title="知识掌握度"
          value={`${avgMastery}%`}
          subtitle="综合评估"
          icon={TrendingUp}
          gradient="bg-gradient-to-r from-emerald-400 to-emerald-500"
          trend={{ value: 5, isPositive: true }}
          delay={200}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent-500" />
                学习进步趋势
              </h2>
              <div className="flex gap-2">
                <button className="text-xs px-3 py-1 bg-accent-100 text-accent-700 rounded-full">
                  近30天
                </button>
              </div>
            </div>
            <ProgressChart data={progressData} height={280} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary-500" />
              薄弱知识点
            </h2>
            <div className="space-y-3">
              {weakPoints.map((wp, index) => (
                <MasteryCard
                  key={wp.id}
                  name={wp.name}
                  masteryRate={wp.masteryRate}
                  onClick={() => handlePracticeWeakPoint(wp.id)}
                />
              ))}
            </div>
            <button
              onClick={() => navigate('/knowledge-map')}
              className="w-full mt-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              查看全部知识点
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {dueForReview.length > 0 && (
            <div className="bg-gradient-to-br from-warning-50 to-orange-50 rounded-xl p-5 border border-warning-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-warning-500" />
                    今日待复习
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    有 {dueForReview.length} 道错题到了复习时间
                  </p>
                </div>
                <span className="text-3xl font-bold text-warning-500">
                  {dueForReview.length}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {dueForReview.slice(0, 3).map(eq => {
                  const q = getQuestionById(eq.questionId);
                  return (
                    <div
                      key={eq.id}
                      className="bg-white rounded-lg p-3 text-sm flex items-start gap-3"
                    >
                      <StatusBadge status={eq.correctionStatus} />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 truncate">
                          {q?.content.slice(0, 30)}...
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <ErrorReasonBadge reason={eq.errorReason} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleStartReview}
                className="w-full btn-warning flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                开始复习
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              本周错题统计
            </h2>
            <span className="text-sm text-gray-500">{thisWeekErrors.length} 道新错题</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-800">{pendingCount}</p>
              <p className="text-xs text-gray-500 mt-1">待订正</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">{correctedCount}</p>
              <p className="text-xs text-blue-500 mt-1">已订正</p>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-xl">
              <p className="text-2xl font-bold text-emerald-600">{masteredCount}</p>
              <p className="text-xs text-emerald-500 mt-1">已掌握</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">订正完成率</span>
              <span className="font-semibold text-gray-800">
                {allErrors.length > 0 ? Math.round(((correctedCount + masteredCount) / allErrors.length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-400 to-accent-500 rounded-full transition-all duration-500"
                style={{
                  width: `${allErrors.length > 0 ? ((correctedCount + masteredCount) / allErrors.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              学习成就
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-500 text-white flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-xl font-bold text-blue-700">{allErrors.length}</p>
              <p className="text-xs text-blue-600">累计错题</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <p className="text-xl font-bold text-emerald-700">{masteredCount}</p>
              <p className="text-xs text-emerald-600">已掌握</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-purple-500 text-white flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <p className="text-xl font-bold text-purple-700">{avgMastery}%</p>
              <p className="text-xs text-purple-600">掌握度</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-xl font-bold text-amber-700">
                {allErrors.reduce((sum, eq) => sum + eq.reviewCount, 0)}
              </p>
              <p className="text-xs text-amber-600">总复习次数</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
