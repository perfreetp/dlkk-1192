import type { Student, ErrorQuestion, ProgressDataPoint, KnowledgePoint } from '@/types';
import { formatDate } from './date';
import { getMasteryLabel } from './calculation';

interface MasteryDataItem {
  knowledgePointId: string;
  knowledgePointName: string;
  masteryRate: number;
}

export const generateParentReport = (
  student: Student,
  errorQuestions: ErrorQuestion[],
  masteryData: MasteryDataItem[],
  progressData?: ProgressDataPoint[],
  knowledgePoints?: KnowledgePoint[]
): string => {
  const totalErrors = errorQuestions.length;
  const pendingCount = errorQuestions.filter(eq => eq.correctionStatus === 'pending').length;
  const correctedCount = errorQuestions.filter(eq => eq.correctionStatus === 'corrected').length;
  const masteredCount = errorQuestions.filter(eq => eq.correctionStatus === 'mastered').length;
  
  const weakPoints = masteryData
    .filter(m => m.masteryRate < 60)
    .sort((a, b) => a.masteryRate - b.masteryRate)
    .slice(0, 5)
    .map(m => ({ name: m.knowledgePointName, masteryRate: m.masteryRate }));

  const avgMastery = masteryData.length > 0
    ? Math.round(masteryData.reduce((sum, m) => sum + m.masteryRate, 0) / masteryData.length)
    : 0;

  const progressPoints = progressData && progressData.length > 0 
    ? progressData 
    : masteryData.slice(-7).map((m, i) => ({
        date: `第${i + 1}次`,
        correctRate: m.masteryRate,
        masteryRate: m.masteryRate,
      }));

  const report = `
╔══════════════════════════════════════════════════════════════╗
║                    学员学习情况报告                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  学员姓名：${student.name.padEnd(40)}║
║  报告日期：${formatDate(new Date()).padEnd(40)}║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                    一、总体学习情况                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  当前知识掌握度：${String(avgMastery).padEnd(2)}%  ${getMasteryLabel(avgMastery).padEnd(26)}║
║  累计错题数：${String(totalErrors).padEnd(38)}║
║  待订正：${String(pendingCount).padEnd(42)}║
║  已订正：${String(correctedCount).padEnd(42)}║
║  已掌握：${String(masteredCount).padEnd(42)}║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                    二、薄弱知识点分析                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
${weakPoints.length > 0 ? weakPoints.map((wp, i) => 
  `║  ${i + 1}. ${wp.name.padEnd(24)} 掌握度：${String(wp.masteryRate).padEnd(3)}%  ${getMasteryLabel(wp.masteryRate).padEnd(16)}║`
).join('\n') : '║  暂无薄弱知识点，继续保持！                                  ║'}
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                    三、学习建议                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  1. 请督促学员及时完成待订正的错题，共 ${pendingCount} 道。${' '.repeat(19)}║
║  2. 重点关注以上薄弱知识点，建议进行专项练习。              ║
║  3. 按照系统推荐的复习周期进行复习，提高记忆效果。          ║
║  4. 鼓励学员整理错题笔记，加深对知识点的理解。              ║
║  5. 定期查看学习报告，跟踪学习进度。                        ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                    四、近期学习趋势                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  日期        正确率   掌握度                                 ║
║  ─────────────────────────────                              ║
${progressPoints.slice(-7).map(d => 
  `║  ${d.date.padEnd(10)}  ${String(d.correctRate).padEnd(4)}%     ${String(d.masteryRate).padEnd(4)}%${' '.repeat(30)}║`
).join('\n')}
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `;

  return report;
};

export const downloadTextFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
