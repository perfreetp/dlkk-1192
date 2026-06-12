import { create } from 'zustand';
import type { Question, ErrorQuestion, ReviewRecord, ErrorReason, ImportHistoryRecord } from '@/types';
import { mockQuestions } from '@/data/mockQuestions';
import { mockErrorQuestions, mockReviewRecords } from '@/data/mockErrorQuestions';
import { generateId, getEbbinghausInterval, calculateMasteryRate } from '@/utils/calculation';
import { addDays } from '@/utils/date';
import { useKnowledgeStore } from './useKnowledgeStore';
import { saveToStorage, loadFromStorage } from '@/utils/persist';

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
  importHistory: ImportHistoryRecord[];
  addErrorQuestion: (eq: Omit<ErrorQuestion, 'id'>) => ErrorQuestion;
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
  batchImportErrorQuestions: (imports: Array<Omit<ErrorQuestion, 'id'>>) => ErrorQuestion[];
  addQuestion: (q: Omit<Question, 'id'> & { id?: string }) => Question;
  batchAddQuestions: (qs: Array<Omit<Question, 'id'> & { id?: string }>) => Question[];
  addImportHistory: (record: ImportHistoryRecord) => void;
  undoLastImport: () => ImportHistoryRecord | null;
}

const errorReasons: ErrorReason[] = ['概念不清', '计算错误', '审题失误', '方法不当', '知识遗忘', '其他'];

const persistQuestions = (data: Question[]) => saveToStorage('questions', data);
const persistErrorQuestions = (data: ErrorQuestion[]) => saveToStorage('errorQuestions', data);
const persistReviewRecords = (data: ReviewRecord[]) => saveToStorage('reviewRecords', data);
const persistImportHistory = (data: ImportHistoryRecord[]) => saveToStorage('importHistory', data);

export const useQuestionStore = create<QuestionState>((set, get) => ({
  questions: loadFromStorage('questions', mockQuestions),
  errorQuestions: loadFromStorage('errorQuestions', mockErrorQuestions),
  reviewRecords: loadFromStorage('reviewRecords', mockReviewRecords),
  importHistory: loadFromStorage('importHistory', []),

  getErrorReasons: () => errorReasons,

  addQuestion: (q) => {
    const newQ: Question = { ...q, id: q.id || generateId() } as Question;
    set(state => {
      const exists = state.questions.some(item => item.id === newQ.id);
      if (exists) return state;
      const updated = [...state.questions, newQ];
      persistQuestions(updated);
      return { questions: updated };
    });
    return newQ;
  },

  batchAddQuestions: (qs) => {
    const newQs: Question[] = [];
    set(state => {
      let updated = [...state.questions];
      qs.forEach(q => {
        const newQ: Question = { ...q, id: q.id || generateId() } as Question;
        if (!updated.some(item => item.id === newQ.id)) {
          updated.push(newQ);
          newQs.push(newQ);
        }
      });
      persistQuestions(updated);
      return { questions: updated };
    });
    return newQs;
  },

  addImportHistory: (record) => {
    set(state => {
      const updated = [record, ...state.importHistory];
      persistImportHistory(updated);
      return { importHistory: updated };
    });
  },

  undoLastImport: () => {
    const { importHistory } = get();
    if (importHistory.length === 0) return null;
    const last = importHistory[0];
    set(state => {
      const updatedEq = state.errorQuestions.filter(
        eq => !last.addedErrorQuestionIds.includes(eq.id)
      );
      const updatedQ = state.questions.filter(
        q => !last.addedQuestionIds.includes(q.id)
      );
      const updatedHistory = state.importHistory.slice(1);
      persistErrorQuestions(updatedEq);
      persistQuestions(updatedQ);
      persistImportHistory(updatedHistory);
      return {
        errorQuestions: updatedEq,
        questions: updatedQ,
        importHistory: updatedHistory,
      };
    });
    return last;
  },

  addErrorQuestion: (eq) => {
    const newEq: ErrorQuestion = { ...eq, id: generateId() };
    set(state => {
      const updated = [...state.errorQuestions, newEq];
      persistErrorQuestions(updated);
      return { errorQuestions: updated };
    });
    return newEq;
  },

  batchImportErrorQuestions: (imports) => {
    const newEqs = imports.map(eq => ({ ...eq, id: generateId() }));
    set(state => {
      const updated = [...state.errorQuestions, ...newEqs];
      persistErrorQuestions(updated);
      return { errorQuestions: updated };
    });
    return newEqs;
  },

  updateErrorQuestion: (id, updates) => {
    set(state => {
      const updated = state.errorQuestions.map(eq =>
        eq.id === id ? { ...eq, ...updates } : eq
      );
      persistErrorQuestions(updated);
      return { errorQuestions: updated };
    });
  },

  deleteErrorQuestion: (id) => {
    set(state => {
      const updated = state.errorQuestions.filter(eq => eq.id !== id);
      persistErrorQuestions(updated);
      return { errorQuestions: updated };
    });
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
    set(state => {
      const updated = [...state.reviewRecords, reviewRecord];
      persistReviewRecords(updated);
      return { reviewRecords: updated };
    });
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
    set(state => {
      const updated = state.errorQuestions.map(eq => {
        if (!eqIds.includes(eq.id)) return eq;
        const patch: Partial<ErrorQuestion> = {};
        if (updates.errorReason) patch.errorReason = updates.errorReason;
        return { ...eq, ...patch };
      });
      persistErrorQuestions(updated);
      return { errorQuestions: updated };
    });
  },
}));
