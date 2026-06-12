import { create } from 'zustand';
import type { PracticeConfig, PracticePaper, Question } from '@/types';
import { useQuestionStore } from './useQuestionStore';
import { generateId } from '@/utils/calculation';

interface PracticeHistoryEntry {
  paperId: string;
  paperTitle: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  createdAt: string;
  finishedAt?: string;
  parentPaperId?: string;
  sourceType?: 'retry-wrong' | 'retry-similar' | 'retry-all' | 'original';
  sourceKpIds?: string[];
  sourceQuestionIndex?: number;
  masteryDeltaMap?: Record<string, number>;
  solvedQuestionIds?: string[];
  wrongQuestionIds?: string[];
}

interface PracticeState {
  config: PracticeConfig;
  setConfig: (config: PracticeConfig) => void;
  generatedPaper: PracticePaper | null;
  currentIndex: number;
  answers: (number | string | undefined)[];
  isStarted: boolean;
  isFinished: boolean;
  score: number;
  resultQuestions: { isCorrect: boolean }[];
  previousPractice: {
    paperId: string;
    paperTitle: string;
    score: number;
    totalQuestions: number;
    correctCount: number;
    sourceType: 'retry-wrong' | 'retry-similar' | 'retry-all';
    sourceQuestionIndex?: number;
    sourceKpIds?: string[];
    createdAt: string;
  } | null;
  practiceHistory: PracticeHistoryEntry[];
  generatePaper: (opts?: { strictKp?: boolean; titleHint?: string }) => void;
  startPractice: () => void;
  submitAnswer: (questionIndex: number, answer: number | string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  finishPractice: () => void;
  resetPractice: () => void;
  setPreviousPractice: (prev: PracticeState['previousPractice']) => void;
  clearPreviousPractice: () => void;
  getPracticeChain: (paperId: string) => PracticeHistoryEntry[];
}

const defaultConfig: PracticeConfig = {
  subjectId: 'sub-1',
  knowledgePointIds: [],
  questionCount: 10,
  difficulty: 'medium',
  questionTypes: ['choice', 'fill', 'answer'],
  includeErrors: true,
  studentId: 'stu-1',
};

const difficultyWeight: Record<string, number> = {
  easy: 0.2,
  medium: 0.5,
  hard: 0.3,
};

const difficultyScore: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const normalizeText = (text: string): string => {
  return text
    .replace(/\s+/g, '')
    .replace(/[，,。.；;：:（）()【】\[\]""''、]/g, '')
    .toLowerCase()
    .trim();
};

const isAnswerCorrect = (question: Question, userAnswer: number | string | undefined): boolean => {
  if (userAnswer === undefined || userAnswer === '') return false;

  const { type, correctAnswer, answer } = question;

  if (type === 'single' || type === 'choice') {
    return Number(userAnswer) === Number(correctAnswer);
  }

  if (type === 'fill') {
    if (typeof userAnswer !== 'string') return false;
    const normalized = normalizeText(userAnswer);
    const correctFromAnswer = normalizeText(answer);
    const correctFromField = typeof correctAnswer === 'string' ? normalizeText(correctAnswer) : '';
    return normalized === correctFromAnswer || normalized === correctFromField;
  }

  if (type === 'answer' || type === 'essay') {
    if (typeof userAnswer !== 'string') return false;
    const normalized = normalizeText(userAnswer);
    const keywordsFromAnswer = normalizeText(answer);
    const keywordsFromField = typeof correctAnswer === 'string' ? normalizeText(correctAnswer) : '';
    const analysis = question.analysis || '';
    const keywordsFromAnalysis = normalizeText(analysis).slice(0, 40);

    let matchCount = 0;
    const targetChunks: string[] = [];
    for (let i = 0; i + 4 <= keywordsFromAnswer.length; i += 2) {
      targetChunks.push(keywordsFromAnswer.slice(i, i + 4));
    }
    for (let i = 0; i + 4 <= keywordsFromField.length; i += 2) {
      targetChunks.push(keywordsFromField.slice(i, i + 4));
    }
    for (let i = 0; i + 4 <= keywordsFromAnalysis.length; i += 2) {
      targetChunks.push(keywordsFromAnalysis.slice(i, i + 4));
    }

    targetChunks.forEach(chunk => {
      if (normalized.includes(chunk)) matchCount++;
    });

    const required = Math.max(2, Math.floor(targetChunks.length * 0.3));
    return matchCount >= required;
  }

  return false;
};

const calculateWeightedScore = (q: Question, includeErrors: boolean, studentErrorIds: Set<string>): number => {
  const diffKey = typeof q.difficulty === 'string' ? q.difficulty : q.difficulty <= 1 ? 'easy' : q.difficulty <= 3 ? 'medium' : 'hard';
  const baseWeight = difficultyWeight[diffKey] || 0.5;
  const errorWeight = includeErrors && studentErrorIds.has(q.id) ? 2 : 1;
  return baseWeight * errorWeight * (difficultyScore[diffKey] || 2);
};

const errorReasonMap: Record<string, string[]> = {
  '概念不清': ['不理解', '概念错误', '定义混淆', '不知道'],
  '计算错误': ['算错', '计算失误', '加错', '乘错', '减错', '除错'],
  '审题失误': ['没看清', '理解错', '看错', '题目理解'],
  '方法不当': ['方法错误', '思路错', '解法不对', '不会做'],
  '知识遗忘': ['忘了', '不记得', '遗忘'],
};

const inferErrorReason = (question: Question, userAnswer: number | string | undefined): string => {
  if (!userAnswer || userAnswer === '') return '知识遗忘';
  if (typeof userAnswer !== 'string') return '概念不清';
  const normalized = normalizeText(userAnswer);
  for (const [reason, keywords] of Object.entries(errorReasonMap)) {
    if (keywords.some(k => normalized.includes(k))) return reason;
  }
  const ans = question.answer || '';
  const len = Math.min(ans.length, 6);
  let correctCount = 0;
  for (let i = 0; i < len; i++) {
    if (normalized.includes(normalizeText(ans[i]))) correctCount++;
  }
  if (correctCount >= Math.ceil(len * 0.7)) return '计算错误';
  if (correctCount >= Math.ceil(len * 0.4)) return '方法不当';
  if (correctCount >= 1) return '审题失误';
  return '概念不清';
};

export const usePracticeStore = create<PracticeState>((set, get) => ({
  config: defaultConfig,
  setConfig: (config) => set({ config }),
  generatedPaper: null,
  currentIndex: 0,
  answers: [],
  isStarted: false,
  isFinished: false,
  score: 0,
  resultQuestions: [],
  previousPractice: null,
  practiceHistory: [],
  setPreviousPractice: (prev) => set({ previousPractice: prev }),
  clearPreviousPractice: () => set({ previousPractice: null }),

  getPracticeChain: (paperId) => {
    const { practiceHistory } = get();
    const byId = new Map(practiceHistory.map(h => [h.paperId, h]));
    const chain: PracticeHistoryEntry[] = [];
    let cur: PracticeHistoryEntry | undefined = byId.get(paperId);
    while (cur) {
      chain.unshift({ ...cur });
      cur = cur.parentPaperId ? byId.get(cur.parentPaperId) : undefined;
    }
    const descendants: PracticeHistoryEntry[] = [];
    let seed = [paperId];
    while (seed.length > 0) {
      const found = practiceHistory.filter(h => h.parentPaperId && seed.includes(h.parentPaperId));
      if (found.length === 0) break;
      descendants.push(...found.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      seed = found.map(f => f.paperId);
    }
    const seenIds = new Set(chain.map(c => c.paperId));
    const extras = descendants.filter(d => !seenIds.has(d.paperId));
    return [...chain, ...extras];
  },

  generatePaper: (opts) => {
    const { config, previousPractice } = get();
    const { questions, errorQuestions } = useQuestionStore.getState();

    const studentErrorIds = new Set(
      errorQuestions
        .filter(eq => eq.studentId === config.studentId)
        .map(eq => eq.questionId)
    );

    const typeFilter: string[] = [];
    config.questionTypes.forEach(t => {
      typeFilter.push(t);
      if (t === 'choice') typeFilter.push('single');
      if (t === 'answer') typeFilter.push('essay');
    });

    const strictKp = opts?.strictKp || (previousPractice?.sourceType === 'retry-similar') || (previousPractice?.sourceType === 'retry-wrong');

    let pool = questions.filter(q => {
      const matchesSubject = q.subjectId === config.subjectId;
      const kpIds = q.knowledgePointIds || [q.knowledgePointId];
      const matchesKp = config.knowledgePointIds.length === 0
        || config.knowledgePointIds.includes(q.knowledgePointId)
        || kpIds.some(id => config.knowledgePointIds.includes(id));
      const matchesType = typeFilter.includes(q.type);
      return matchesSubject && matchesKp && matchesType;
    });

    if (!strictKp && pool.length === 0) {
      pool = questions.filter(q =>
        q.subjectId === config.subjectId && typeFilter.includes(q.type)
      );
    }

    const weightedPool = pool.map(q => ({
      question: q,
      weight: calculateWeightedScore(q, config.includeErrors, studentErrorIds),
    }));

    weightedPool.sort((a, b) => b.weight - a.weight + Math.random() - 0.5);

    const selectedQuestions = weightedPool
      .slice(0, Math.min(config.questionCount, pool.length))
      .map(w => w.question);

    const sourceType = previousPractice?.sourceType;
    const kpCount = config.knowledgePointIds.length;

    let title = '';
    if (opts?.titleHint) {
      title = opts.titleHint;
    } else if (sourceType === 'retry-similar' && previousPractice?.sourceQuestionIndex !== undefined) {
      title = `同类强化练习（围绕第 ${Number(previousPractice.sourceQuestionIndex + 1)} 题的同类题`;
    } else if (sourceType === 'retry-wrong') {
      title = `错题知识点强化 ${kpCount} 个专项练习`;
    } else if (kpCount > 0) {
      title = `${kpCount} 个知识点专项练习`;
    } else {
      title = '智能综合练习';
    }

    const now = new Date().toISOString();
    const paper: PracticePaper = {
      id: `paper-${Date.now()}`,
      title,
      questions: selectedQuestions,
      estimatedTime: selectedQuestions.length * 3,
      createdAt: now,
      sourceKpIds: config.knowledgePointIds.length > 0 ? [...config.knowledgePointIds] : undefined,
      parentPaperId: previousPractice?.paperId || undefined,
    };

    set(state => {
      const createdEntry: PracticeHistoryEntry = {
        paperId: paper.id,
        paperTitle: paper.title,
        score: 0,
        totalQuestions: paper.questions.length,
        correctCount: 0,
        createdAt: paper.createdAt,
        parentPaperId: paper.parentPaperId,
        sourceType: sourceType || 'original',
        sourceKpIds: paper.sourceKpIds,
        sourceQuestionIndex: previousPractice?.sourceQuestionIndex,
      };
      return {
        generatedPaper: paper,
        currentIndex: 0,
        answers: new Array(selectedQuestions.length).fill(undefined),
        resultQuestions: [],
        isStarted: false,
        isFinished: false,
        score: 0,
        practiceHistory: [...state.practiceHistory, createdEntry],
      };
    });
  },

  startPractice: () => {
    set({
      isStarted: true,
      isFinished: false,
      currentIndex: 0,
    });
  },

  submitAnswer: (questionIndex, answer) => {
    set(state => {
      const newAnswers = [...state.answers];
      newAnswers[questionIndex] = answer;
      return { answers: newAnswers };
    });
  },

  nextQuestion: () => {
    const { currentIndex, generatedPaper } = get();
    if (generatedPaper && currentIndex < generatedPaper.questions.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  prevQuestion: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  finishPractice: () => {
    const { answers, generatedPaper, config, previousPractice } = get();
    if (!generatedPaper) return;

    let correctCount = 0;
    const results = generatedPaper.questions.map((q, idx) => {
      const isCorrect = isAnswerCorrect(q, answers[idx]);
      if (isCorrect) correctCount++;
      return { isCorrect };
    });

    const solvedIds: string[] = [];
    const wrongIds: string[] = [];
    generatedPaper.questions.forEach((q, idx) => {
      if (results[idx].isCorrect) solvedIds.push(q.id); else wrongIds.push(q.id);
    });

    const { addErrorQuestion, getMasteryRate, getErrorQuestionById } = useQuestionStore.getState();

    generatedPaper.questions.forEach((q, idx) => {
      if (results[idx].isCorrect) return;
      const existing = useQuestionStore.getState().errorQuestions.find(
        eq => eq.studentId === config.studentId && eq.questionId === q.id
      );
      if (existing) {
        addErrorQuestion({
          studentId: config.studentId,
          questionId: q.id,
          knowledgePointId: q.knowledgePointId,
          wrongAnswer: typeof answers[idx] === 'number'
            ? (q.options ? q.options[answers[idx] as number] : String(answers[idx]))
            : String(answers[idx] || ''),
          errorReason: (q.errorReason || inferErrorReason(q, answers[idx])) as any,
          errorDate: new Date().toISOString().split('T')[0],
          correctionStatus: 'pending',
          nextReviewDate: new Date().toISOString().split('T')[0],
          reviewCount: existing.reviewCount,
          masteryRate: getMasteryRate(q.knowledgePointId, config.studentId),
          sourceExam: '专项练习',
        });
      } else {
        addErrorQuestion({
          studentId: config.studentId,
          questionId: q.id,
          knowledgePointId: q.knowledgePointId,
          wrongAnswer: typeof answers[idx] === 'number'
            ? (q.options ? q.options[answers[idx] as number] : String(answers[idx]))
            : String(answers[idx] || ''),
          errorReason: (q.errorReason || inferErrorReason(q, answers[idx])) as any,
          errorDate: new Date().toISOString().split('T')[0],
          correctionStatus: 'pending',
          nextReviewDate: new Date().toISOString().split('T')[0],
          reviewCount: 0,
          masteryRate: getMasteryRate(q.knowledgePointId, config.studentId),
          sourceExam: '专项练习',
        });
      }
    });

    const score = generatedPaper.questions.length > 0
      ? Math.round((correctCount / generatedPaper.questions.length) * 100)
      : 0;

    const finishedAt = new Date().toISOString();
    const kpIds = generatedPaper.sourceKpIds || [...new Set(generatedPaper.questions.map(q => q.knowledgePointId).filter(Boolean))];
    const masteryDeltaMap: Record<string, number> = {};
    kpIds.forEach(kpid => {
      const kpQs = generatedPaper.questions.filter(q => q.knowledgePointId === kpid);
      if (kpQs.length === 0) return;
      const kpCorrect = kpQs.filter((_, i) => results[generatedPaper.questions.indexOf(kpQs[0]) + i]?.isCorrect).length;
      masteryDeltaMap[kpid] = Math.round((kpCorrect / kpQs.length) * 100);
    });

    set(state => ({
      isFinished: true,
      score,
      resultQuestions: results,
      practiceHistory: state.practiceHistory.map(h =>
        h.paperId === generatedPaper.id
          ? { ...h, score, correctCount, finishedAt, solvedQuestionIds: solvedIds, wrongQuestionIds: wrongIds, masteryDeltaMap }
          : h
      ),
    }));
  },

  resetPractice: () => {
    set({
      generatedPaper: null,
      currentIndex: 0,
      answers: [],
      isStarted: false,
      isFinished: false,
      score: 0,
      resultQuestions: [],
      config: defaultConfig,
    });
  },
}));
