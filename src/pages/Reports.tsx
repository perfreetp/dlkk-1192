import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Download,
  Calendar,
  Users,
  BookOpen,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from 'lucide-react';
import { ProgressChart } from '@/components/charts/ProgressChart';
import { ComparisonChart } from '@/components/charts/ComparisonChart';
import { StatCard } from '@/components/ui/StatCard';
import { useAuthStore } from '@/store/useAuthStore';
import { useKnowledgeStore } from '@/store/useKnowledgeStore';
import { useQuestionStore } from '@/store/useQuestionStore';
import { useReportStore } from '@/store/useReportStore';
import { formatDate } from '@/utils/date';
import { generateParentReport } from '@/utils/export';

const Reports = () => {
  const { currentUser, role } = useAuthStore();
  const { classes, students, knowledgePoints, selectedClassId, setSelectedClassId } = useKnowledgeStore();
  const { errorQuestions, getMasteryRate } = useQuestionStore();
  const {
    getClassMastery,
    getClassComparison,
    getStudentProgress,
    getErrorDistribution,
    getErrorReasonDistribution,
  } = useReportStore();

  const studentId = currentUser?.id || 'stu-1';
  const [reportType, setReportType] = useState<'personal' | 'class'>('personal');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [compareClassIds, setCompareClassIds] = useState<string[]>([selectedClassId]);

  const classStudents = useMemo(() =>
    students.filter(s => s.classId === selectedClassId),
    [students, selectedClassId]
  );

  const studentErrors = errorQuestions.filter(eq => eq.studentId === studentId);
  const classMastery = getClassMastery(selectedClassId);
  const progressData = getStudentProgress(studentId, Number(dateRange));
  const errorDistribution = getErrorDistribution(selectedClassId, 'knowledge');
  const reasonDistribution = getErrorReasonDistribution(selectedClassId);
  const classComparison = getClassComparison();

  const distributionData = useMemo(() =>
    Object.entries(errorDistribution).map(([name, value]) => ({ name, value })),
    [errorDistribution]
  );

  const reasonData = useMemo(() =>
    Object.entries(reasonDistribution).map(([name, value]) => ({ name, value })),
    [reasonDistribution]
  );

  const handleExportStudentReport = () => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const masteryData = knowledgePoints.map(kp => ({
      knowledgePointId: kp.id,
      knowledgePointName: kp.name,
      masteryRate: getMasteryRate(kp.id, studentId),
    }));

    const reportText = generateParentReport(student, studentErrors, masteryData);
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.name}_学习报告_${formatDate(new Date())}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportClassReport = () => {
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) return;

    let report = `\n${'='.repeat(60)}\n`;
    report += `  ${cls.name} - 班级学习报告\n`;
    report += `  生成时间：${formatDate(new Date())}\n`;
    report += `${'='.repeat(60)}\n\n`;

    report += `一、班级概况\n`;
    report += `  • 学员总数：${classStudents.length} 人\n`;
    report += `  • 平均掌握度：${classMastery.avgMasteryRate}%\n`;
    report += `  • 错题总数：${errorQuestions.filter(eq => classStudents.some(s => s.id === eq.studentId)).length} 道\n\n`;

    report += `二、知识点掌握度\n`;
    classMastery.masteryData.forEach(item => {
      report += `  • ${item.name}：${item.value}%\n`;
    });
    report += `\n`;

    report += `三、学员详情\n`;
    classStudents.forEach((student, idx) => {
      const studentMastery = Math.round(
        knowledgePoints.reduce((sum, kp) => sum + getMasteryRate(kp.id, student.id), 0) / knowledgePoints.length
      );
      const studentErrCount = errorQuestions.filter(eq => eq.studentId === student.id).length;
      report += `  ${idx + 1}. ${student.name}\n`;
      report += `     掌握度：${studentMastery}% | 错题数：${studentErrCount} 道\n`;
    });
    report += `\n`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cls.name}_班级报告_${formatDate(new Date())}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const avgMastery = knowledgePoints.length > 0
    ? Math.round(knowledgePoints.reduce((sum, kp) => sum + getMasteryRate(kp.id, studentId), 0) / knowledgePoints.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">统计报表</h1>
          <p className="text-gray-500 text-sm mt-1">
            多维度数据分析，全面掌握学习情况
          </p>
        </div>
        <div className="flex items-center gap-3">
          {role === 'teacher' && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="select w-48"
            >
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          )}

          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setReportType('personal')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all ${
                reportType === 'personal'
                  ? 'bg-primary-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              个人报告
            </button>
            {role === 'teacher' && (
              <button
                onClick={() => setReportType('class')}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all ${
                  reportType === 'class'
                    ? 'bg-primary-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                班级报告
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="select w-32"
            >
              <option value="7">近7天</option>
              <option value="30">近30天</option>
              <option value="90">近90天</option>
            </select>
          </div>

          <button
            onClick={reportType === 'personal' ? handleExportStudentReport : handleExportClassReport}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>

      {reportType === 'personal' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="累计错题"
              value={studentErrors.length}
              subtitle="道题目"
              icon={BookOpen}
              gradient="bg-gradient-to-r from-blue-500 to-blue-600"
              delay={50}
            />
            <StatCard
              title="已掌握"
              value={studentErrors.filter(eq => eq.correctionStatus === 'mastered').length}
              subtitle="道题目"
              icon={Target}
              gradient="bg-gradient-to-r from-emerald-400 to-emerald-500"
              delay={100}
            />
            <StatCard
              title="知识掌握度"
              value={`${avgMastery}%`}
              subtitle="综合评估"
              icon={TrendingUp}
              gradient="bg-gradient-to-r from-purple-400 to-purple-500"
              trend={{ value: 5, isPositive: true }}
              delay={150}
            />
            <StatCard
              title="复习次数"
              value={studentErrors.reduce((sum, eq) => sum + eq.reviewCount, 0)}
              subtitle="累计"
              icon={BarChart3}
              gradient="bg-gradient-to-r from-amber-400 to-amber-500"
              delay={200}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent-500" />
                  学习进步趋势
                </h3>
              </div>
              <ProgressChart data={progressData} height={300} />
            </div>

            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-500" />
                知识点掌握度分布
              </h3>
              <ComparisonChart
                data={classMastery.masteryData}
                type="bar"
                height={300}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">错题类型分布</h3>
              <ComparisonChart
                data={reasonData}
                type="pie"
                height={250}
              />
            </div>

            <div className="lg:col-span-2 card">
              <h3 className="font-bold text-gray-800 mb-4">知识点掌握详情</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {knowledgePoints
                  .filter(kp => kp.subjectId === selectedClassId || role === 'student')
                  .map(kp => {
                    const mastery = getMasteryRate(kp.id, studentId);
                    const kpErrors = studentErrors.filter(eq => eq.knowledgePointId === kp.id);
                    return (
                      <div key={kp.id} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-28 truncate">{kp.name}</span>
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
                        <span className="text-xs text-gray-400 w-12 text-right">
                          {kpErrors.length} 错题
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">学习建议</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-800">待加强知识点</h4>
                    <p className="text-sm text-red-600 mt-1">
                      {[...knowledgePoints]
                        .map(kp => ({ ...kp, mastery: getMasteryRate(kp.id, studentId) }))
                        .filter(kp => kp.mastery < 40)
                        .slice(0, 3)
                        .map(kp => kp.name)
                        .join('、') || '暂无'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-800">进步明显</h4>
                    <p className="text-sm text-emerald-600 mt-1">
                      近{dateRange}天掌握度提升了 5%，继续保持！
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-800">复习建议</h4>
                    <p className="text-sm text-amber-600 mt-1">
                      有 {studentErrors.filter(eq => eq.correctionStatus !== 'mastered').length} 道错题需要复习，
                      建议按照艾宾浩斯复习周期进行。
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-800">重点错因</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      {reasonData.length > 0 ? `${reasonData[0].name} 占比最高，建议针对性加强练习。` : '暂无数据'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="学员总数"
              value={classStudents.length}
              subtitle="人"
              icon={Users}
              gradient="bg-gradient-to-r from-blue-500 to-blue-600"
              delay={50}
            />
            <StatCard
              title="班级错题总数"
              value={errorQuestions.filter(eq => classStudents.some(s => s.id === eq.studentId)).length}
              subtitle="道"
              icon={BookOpen}
              gradient="bg-gradient-to-r from-orange-400 to-orange-500"
              delay={100}
            />
            <StatCard
              title="平均掌握度"
              value={`${classMastery.avgMasteryRate}%`}
              subtitle="综合"
              icon={TrendingUp}
              gradient="bg-gradient-to-r from-emerald-400 to-emerald-500"
              delay={150}
            />
            <StatCard
              title="人均错题"
              value={classStudents.length > 0
                ? Math.round(errorQuestions.filter(eq =>
                    classStudents.some(s => s.id === eq.studentId)
                  ).length / classStudents.length)
                : 0}
              subtitle="道/人"
              icon={Target}
              gradient="bg-gradient-to-r from-purple-400 to-purple-500"
              delay={200}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-500" />
                班级对比分析
              </h3>
              <ComparisonChart
                data={classComparison}
                type="bar"
                height={300}
              />
            </div>

            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-accent-500" />
                错题知识点分布
              </h3>
              <ComparisonChart
                data={distributionData}
                type="pie"
                height={300}
              />
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">班级掌握度排名</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">排名</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">学员</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">错题数</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">已订正</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">已掌握</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">掌握度</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {[...classStudents]
                    .map(s => ({
                      ...s,
                      mastery: Math.round(
                        knowledgePoints.reduce((sum, kp) => sum + getMasteryRate(kp.id, s.id), 0) / Math.max(knowledgePoints.length, 1)
                      ),
                      errors: errorQuestions.filter(eq => eq.studentId === s.id),
                    }))
                    .sort((a, b) => b.mastery - a.mastery)
                    .map((s, index) => {
                      const errCount = s.errors.length;
                      const corrected = s.errors.filter(e => e.correctionStatus === 'corrected').length;
                      const mastered = s.errors.filter(e => e.correctionStatus === 'mastered').length;

                      return (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' :
                              index === 1 ? 'bg-gray-100 text-gray-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 text-white flex items-center justify-center text-sm font-bold">
                                {s.name.charAt(0)}
                              </div>
                              <span className="font-medium text-gray-800">{s.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{errCount}</td>
                          <td className="py-3 px-4 text-blue-600">{corrected}</td>
                          <td className="py-3 px-4 text-emerald-600">{mastered}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    s.mastery >= 80 ? 'bg-emerald-500' :
                                    s.mastery >= 60 ? 'bg-blue-500' :
                                    s.mastery >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${s.mastery}%` }}
                                />
                              </div>
                              <span className={`font-medium ${
                                s.mastery >= 80 ? 'text-emerald-600' :
                                s.mastery >= 60 ? 'text-blue-600' :
                                s.mastery >= 40 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {s.mastery}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => {
                                const masteryData = knowledgePoints.map(kp => ({
                                  knowledgePointId: kp.id,
                                  knowledgePointName: kp.name,
                                  masteryRate: getMasteryRate(kp.id, s.id),
                                }));
                                const reportText = generateParentReport(s, s.errors, masteryData);
                                const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${s.name}家长沟通报告.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                            >
                              导出报告
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
