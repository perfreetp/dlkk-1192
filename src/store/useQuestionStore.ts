import { create } from 'zustand';
import type { Question, ErrorQuestion, ReviewRecord, ErrorReason } from '@/types';
import { mockQuestions } from '@/data/mockQuestions';
import { mockErrorQuestions, mockReviewRecords } from '@/data/mockErrorQuestions';
import { generateId, getEbbinghausInterval, calculateMasteryRate } from '@/utils/calculation';
import { addDays } from '@/utils/date';
import { useKnowledgeStore } from './useKnowledgeStore';

interface QuestionFilters {
  subjectId?: string;
  knowledgePointId?: string;
  errorReason?: ErrorReason;
  correctionStatus?: 'pending' | 'corrected' | 'mastered';
  startDate?: string;
  endDate?: string;
  searchText?: string;
}

interface QuestionState {
  questions: Question[];
  errorQuestions: ErrorQuestion[];
  reviewRecords: ReviewRecord[];
  addErrorQuestion: (eq: Omit<ErrorQuestion, 'id'>) => void;
  updateErrorQuestion: (id: string, updates: Partial<ErrorQuestion>) => void;
  deleteErrorQuestion: (id: string) => void;
  filterErrorQuestions: (filters: QuestionFilters, studentId: string) => ErrorQuestion[];
  getMasteryRate: (kpId: string, studentId: string) => number;
  getQuestionById: (id: string) => Question | undefined;
  getErrorQuestionById: (id: string) => ErrorQuestion | undefined;
  markCorrected: (eqId: string, note?: string) => void;
  markMastered: (eqId: string) => void;
  recordReview: (eqId: string, result: 'correct' | 'wrong', note?: string) => void;
  batchUpdateTags: (eqIds: string[], updates: { errorReason?: ErrorReason; knowledgePointIds?: string[] }) => void;
  getErrorReasons: () => ErrorReason[];
}

const errorReasons: ErrorReason[] = ['概念不清', '计算错误', '审题失误', '方法不当', '知识遗忘', '其他'];

export const useQuestionStore = create<QuestionState>((set, get) => ({
  questions: mockQuestions,
  errorQuestions: mockErrorQuestions,
  reviewRecords: mockReviewRecords,
  getErrorReasons: () => errorReasons,
  addErrorQuestion: (eq) => {
    const newEq: ErrorQuestion = { ...eq, id: generateId() };
    set(state => ({ errorQuestions: [...state.errorQuestions, newEq] }));
  },
  updateErrorQuestion: (id, updates) => {
    set(state => ({
      errorQuestions: state.errorQuestions.map(eq =>
        eq.id === id ? { ...eq, ...updates } : eq
      ),
    }));
  },
  deleteErrorQuestion: (id) => {
    set(state => ({
      errorQuestions: state.errorQuestions.filter(eq => eq.id !== id),
    }));
  },
  filterErrorQuestions: (filters, studentId) => {
    let result = get().errorQuestions.filter(eq => eq.studentId === studentId);
    if (filters.subjectId) {
      const subjectKpIds = useKnowledgeStore.getState()
        .getKnowledgeTree(filters.subjectId)
        .map(kp => kp.id);
      result = result.filter(eq => {
        const q = get().getQuestionById(eq.questionId);
        if (!q) return false;
        const kpIds = q.knowledgePointIds || [q.knowledgePointId];
        return kpIds.some(kpid => subjectKpIds.includes(kpid));
      });
    }
    if (filters.knowledgePointId) {
      result = result.filter(eq => {
        const q = get().getQuestionById(eq.questionId);
        if (!q) return false;
        const kpIds = q.knowledgePointIds || [q.knowledgePointId];
        return kpIds.includes(filters.knowledgePointId!);
      });
    }
    if (filters.errorReason) {
      result = result.filter(eq => eq.errorReason === filters.errorReason);
    }
    if (filters.correctionStatus) {
      result = result.filter(eq => eq.correctionStatus === filters.correctionStatus);
    }
    if (filters.startDate) {
      result = result.filter(eq => eq.errorDate >= filters.startDate!);
    }
    if (filters.endDate) {
      result = result.filter(eq => eq.errorDate <= filters.endDate!);
    }
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      result = result.filter(eq => {
        const q = get().getQuestionById(eq.questionId);
        return q && q.content.toLowerCase().includes(searchLower);
      });
    }
    return result.sort((a, b) => new Date(b.errorDate).getTime() - new Date(a.errorDate).getTime());
  },
  getMasteryRate: (kpId, studentId) => {
    const kpQuestions = get().questions.filter(q => {
      const kpIds = q.knowledgePointIds || [q.knowledgePointId];
      return kpIds.includes(kpId);
    });
    const kpErrors = get().errorQuestions.filter(
      eq => eq.studentId === studentId && kpQuestions.some(q => q.id === eq.questionId)
    );
    const reviewRecords = get().reviewRecords.filter(
      rr => kpErrors.some(eq => eq.id === rr.errorQuestionId)
    );
    const correctionCorrectRate = reviewRecords.length > 0
      ? reviewRecords.filter(rr => rr.result === 'correct').length / reviewRecords.length
      : 0;
    return calculateMasteryRate(kpQuestions.length, kpErrors.length, correctionCorrectRate);
  },
  getQuestionById: (id) => get().questions.find(q => q.id === id),
  getErrorQuestionById: (id) => get().errorQuestions.find(eq => eq.id === id),
  markCorrected: (eqId, note) => {
    const eq = get().getErrorQuestionById(eqId);
    if (!eq) return;
    const q = get().getQuestionById(eq.questionId);
    const diff = typeof q?.difficulty === 'number' ? q.difficulty : 3;
    const interval = getEbbinghausInterval(eq.reviewCount, diff);
    get().updateErrorQuestion(eqId, {
      correctionStatus: 'corrected',
      correctionDate: new Date().toISOString().split('T')[0],
      correctionNote: note,
      nextReviewDate: addDays(new Date().toISOString(), interval),
      masteryRate: Math.min(100, eq.masteryRate + 20),
    });
  },
  markMastered: (eqId) => {
    get().updateErrorQuestion(eqId, {
      correctionStatus: 'mastered',
      masteryRate: 100,
    });
  },
  recordReview: (eqId, result, note) => {
    const eq = get().getErrorQuestionById(eqId);
    if (!eq) return;
    const q = get().getQuestionById(eq.questionId);
    const reviewRecord: ReviewRecord = {
      id: generateId(),
      errorQuestionId: eqId,
      reviewDate: new Date().toISOString().split('T')[0],
      result,
      note,
    };
    set(state => ({ reviewRecords: [...state.reviewRecords, reviewRecord] }));
    const newReviewCount = eq.reviewCount + 1;
    const diff = typeof q?.difficulty === 'number' ? q.difficulty : 3;
    const interval = getEbbinghausInterval(newReviewCount, diff);
    const masteryDelta = result === 'correct' ? 15 : -10;
    get().updateErrorQuestion(eqId, {
      reviewCount: newReviewCount,
      nextReviewDate: addDays(new Date().toISOString(), interval),
      masteryRate: Math.max(10, Math.min(100, eq.masteryRate + masteryDelta)),
    });
  },
  batchUpdateTags: (eqIds, updates) => {
    set(state => ({
      errorQuestions: state.errorQuestions.map(eq => {
        if (!eqIds.includes(eq.id)) return eq;
        const updated: Partial<ErrorQuestion> = {};
        if (updates.errorReason) updated.errorReason = updates.errorReason;
        return { ...eq, ...updated };
      }),
    }));
  },
}));
