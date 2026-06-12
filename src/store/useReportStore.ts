import { create } from 'zustand';
import type { CommentTask, ProgressDataPoint, ClassMasteryData, ErrorReason } from '@/types';
import { mockCommentTasks } from '@/data/mockErrorQuestions';
import { getRecentDays, formatShortDate } from '@/utils/date';
import { useQuestionStore } from './useQuestionStore';
import { useKnowledgeStore } from './useKnowledgeStore';
import { saveToStorage, loadFromStorage } from '@/utils/persist';
import { generateId } from '@/utils/calculation';

interface ReportState {
  commentTasks: CommentTask[];
  getClassMastery: (classId: string) => {
    avgMasteryRate: number;
    masteryData: ClassMasteryData[];
  };
  getClassComparison: () => ClassMasteryData[];
  getStudentProgress: (studentId: string, days: number) => ProgressDataPoint[];
  getStudentMastery: (studentId: string) => {
    knowledgePointId: string;
    knowledgePointName: string;
    masteryRate: number;
  }[];
  getErrorDistribution: (classId: string, type: 'reason' | 'knowledge' | 'difficulty') => Record<string, number>;
  getErrorReasonDistribution: (classId: string) => Record<string, number>;
  getCommentTasks: (teacherId: string) => CommentTask[];
  pushCommentTask: (teacherId: string, studentId: string, knowledgePointId: string, options?: Partial<CommentTask>) => CommentTask;
  batchPushCommentTasks: (teacherId: string, tasks: Array<{ studentId: string; knowledgePointId: string }>) => CommentTask[];
  completeCommentTask: (taskId: string, comment?: string) => void;
}

const persistCommentTasks = (data: CommentTask[]) => saveToStorage('commentTasks', data);

export const useReportStore = create<ReportState>((set, get) => ({
  commentTasks: loadFromStorage('commentTasks', mockCommentTasks as CommentTask[]),

  getClassMastery: (classId) => {
    const { students, knowledgePoints, selectedSubjectId } = useKnowledgeStore.getState();
    const { getMasteryRate } = useQuestionStore.getState();

    const classStudents = students.filter(s => s.classId === classId);
    const subjectKps = knowledgePoints.filter(kp => kp.subjectId === selectedSubjectId);

    const masteryData: ClassMasteryData[] = subjectKps.map(kp => {
      const avgMastery = classStudents.length > 0
        ? Math.round(
            classStudents.reduce((sum, s) => sum + getMasteryRate(kp.id, s.id), 0) / classStudents.length
          )
        : 0;
      return {
        name: kp.name,
        value: avgMastery,
      };
    });

    const avgMasteryRate = masteryData.length > 0
      ? Math.round(masteryData.reduce((sum, item) => sum + item.value, 0) / masteryData.length)
      : 0;

    return { avgMasteryRate, masteryData };
  },

  getClassComparison: () => {
    const { classes, students, knowledgePoints, selectedSubjectId } = useKnowledgeStore.getState();
    const { getMasteryRate } = useQuestionStore.getState();

    const subjectKps = knowledgePoints.filter(kp => kp.subjectId === selectedSubjectId).slice(0, 5);

    return classes.map(cls => {
      const classStudents = students.filter(s => s.classId === cls.id);
      const avgMastery = classStudents.length > 0 && subjectKps.length > 0
        ? Math.round(
            subjectKps.reduce((sumKp, kp) => {
              const classAvg = classStudents.reduce((sumS, s) => sumS + getMasteryRate(kp.id, s.id), 0) / classStudents.length;
              return sumKp + classAvg;
            }, 0) / subjectKps.length
          )
        : 0;
      return {
        name: cls.name,
        value: avgMastery,
      };
    });
  },

  getStudentProgress: (studentId, days) => {
    const dates = getRecentDays(days);
    const { errorQuestions, reviewRecords } = useQuestionStore.getState();

    const studentErrors = errorQuestions.filter(eq => eq.studentId === studentId);
    const studentReviews = (reviewRecords || []).filter(rr =>
      studentErrors.some(eq => eq.id === rr.errorQuestionId)
    );

    return dates.map((date, idx) => {
      const reviewsToDate = studentReviews.filter(rr => rr.reviewDate <= date);
      const correctRate = reviewsToDate.length > 0
        ? Math.round(reviewsToDate.filter(rr => rr.result === 'correct').length / reviewsToDate.length * 100)
        : 60 + Math.min(idx * 2, 25);
      const errorsToDate = studentErrors.filter(eq => eq.errorDate <= date);
      const totalQuestions = 10 + idx * 2;
      const masteryRate = errorsToDate.length > 0
        ? Math.round((1 - Math.min(errorsToDate.length, totalQuestions) / totalQuestions) * 60 + correctRate * 0.4)
        : 70 + Math.min(idx * 2, 20);
      return {
        date: formatShortDate(date),
        correctRate,
        masteryRate,
      };
    });
  },

  getStudentMastery: (studentId) => {
    const { knowledgePoints, selectedSubjectId } = useKnowledgeStore.getState();
    const { getMasteryRate } = useQuestionStore.getState();

    return knowledgePoints
      .filter(kp => kp.subjectId === selectedSubjectId)
      .map(kp => ({
        knowledgePointId: kp.id,
        knowledgePointName: kp.name,
        masteryRate: getMasteryRate(kp.id, studentId),
      }));
  },

  getErrorDistribution: (classId, type) => {
    const { students } = useKnowledgeStore.getState();
    const { errorQuestions, questions } = useQuestionStore.getState();
    const { knowledgePoints } = useKnowledgeStore.getState();

    const classStudents = students.filter(s => s.classId === classId);
    const classStudentIds = new Set(classStudents.map(s => s.id));
    const classErrors = errorQuestions.filter(eq => classStudentIds.has(eq.studentId));

    if (type === 'knowledge') {
      const kpCounts: Record<string, number> = {};
      classErrors.forEach(eq => {
        const q = questions.find(q => q.id === eq.questionId);
        if (q) {
          const kp = knowledgePoints.find(k => k.id === q.knowledgePointId);
          if (kp) {
            kpCounts[kp.name] = (kpCounts[kp.name] || 0) + 1;
          }
        }
      });
      return kpCounts;
    } else if (type === 'reason') {
      const reasonCounts: Record<string, number> = {};
      classErrors.forEach(eq => {
        reasonCounts[eq.errorReason] = (reasonCounts[eq.errorReason] || 0) + 1;
      });
      return reasonCounts;
    } else {
      const diffCounts: Record<string, number> = {};
      classErrors.forEach(eq => {
        const q = questions.find(q => q.id === eq.questionId);
        if (q) {
          const label = q.difficulty === 'easy' ? '简单' : q.difficulty === 'medium' ? '中等' : '困难';
          diffCounts[label] = (diffCounts[label] || 0) + 1;
        }
      });
      return diffCounts;
    }
  },

  getErrorReasonDistribution: (classId) => {
    return get().getErrorDistribution(classId, 'reason');
  },

  getCommentTasks: (teacherId) => {
    return get().commentTasks
      .filter(ct => ct.teacherId === teacherId)
      .sort((a, b) => {
        const aDate = a.createdAt || a.createDate || '';
        const bDate = b.createdAt || b.createDate || '';
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
  },

  pushCommentTask: (teacherId, studentId, knowledgePointId, options = {}) => {
    const existing = get().commentTasks.find(
      ct => ct.teacherId === teacherId
        && ct.studentId === studentId
        && ct.knowledgePointId === knowledgePointId
        && ct.status === 'pending'
    );
    if (existing) return existing;

    const newTask: CommentTask = {
      id: generateId(),
      teacherId,
      studentId,
      knowledgePointId,
      type: 'concept',
      title: options.title || '知识点讲评',
      description: options.description || '请关注该知识点的掌握情况，及时进行针对性讲评',
      status: 'pending',
      priority: options.priority || 'medium',
      createdAt: new Date().toISOString(),
      dueDate: options.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ...options,
    };
    set(state => {
      const updated = [...state.commentTasks, newTask];
      persistCommentTasks(updated);
      return { commentTasks: updated };
    });
    return newTask;
  },

  batchPushCommentTasks: (teacherId, tasks) => {
    const results: CommentTask[] = [];
    set(state => {
      let updated = [...state.commentTasks];
      tasks.forEach(({ studentId, knowledgePointId }) => {
        const existing = updated.find(
          ct => ct.teacherId === teacherId
            && ct.studentId === studentId
            && ct.knowledgePointId === knowledgePointId
            && ct.status === 'pending'
        );
        if (existing) {
          results.push(existing);
          return;
        }
        const newTask: CommentTask = {
          id: generateId(),
          teacherId,
          studentId,
          knowledgePointId,
          type: 'concept',
          title: '知识点讲评',
          description: '请关注该知识点的掌握情况，及时进行针对性讲评',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        };
        updated.push(newTask);
        results.push(newTask);
      });
      persistCommentTasks(updated);
      return { commentTasks: updated };
    });
    return results;
  },

  completeCommentTask: (taskId, comment = '') => {
    set(state => {
      const updated = state.commentTasks.map(ct =>
        ct.id === taskId
          ? {
              ...ct,
              status: 'completed' as const,
              completedAt: new Date().toISOString(),
              completeDate: new Date().toISOString().split('T')[0],
              comment,
            }
          : ct
      );
      persistCommentTasks(updated);
      return { commentTasks: updated };
    });
  },
}));
