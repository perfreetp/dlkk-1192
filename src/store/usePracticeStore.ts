import { create } from 'zustand';
import type { PracticeConfig, PracticePaper, Question } from '@/types';
import { useQuestionStore } from './useQuestionStore';
import { generateId } from '@/utils/calculation';

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
    createdAt: string;
  } | null;
  generatePaper: () => void;
  startPractice: () => void;
  submitAnswer: (questionIndex: number, answer: number | string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  finishPractice: () => void;
  resetPractice: () => void;
  setPreviousPractice: (prev: PracticeState['previousPractice']) => void;
  clearPreviousPractice: () => void;
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
  setPreviousPractice: (prev) => set({ previousPractice: prev }),
  clearPreviousPractice: () => set({ previousPractice: null }),

  generatePaper: () => {
    const { config } = get();
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

    let pool = questions.filter(q => {
      const matchesSubject = q.subjectId === config.subjectId;
      const kpIds = q.knowledgePointIds || [q.knowledgePointId];
      const matchesKp = config.knowledgePointIds.length === 0
        || config.knowledgePointIds.includes(q.knowledgePointId)
        || kpIds.some(id => config.knowledgePointIds.includes(id));
      const matchesType = typeFilter.includes(q.type);
      return matchesSubject && matchesKp && matchesType;
    });

    if (pool.length === 0) {
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

    const paper: PracticePaper = {
      id: `paper-${Date.now()}`,
      title: `${config.knowledgePointIds.length} 个知识点专项练习`,
      questions: selectedQuestions,
      estimatedTime: selectedQuestions.length * 3,
      createdAt: new Date().toISOString(),
    };

    set({
      generatedPaper: paper,
      currentIndex: 0,
      answers: new Array(selectedQuestions.length).fill(undefined),
      resultQuestions: [],
      isStarted: false,
      isFinished: false,
      score: 0,
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
    const { answers, generatedPaper, config } = get();
    if (!generatedPaper) return;

    let correctCount = 0;
    const results = generatedPaper.questions.map((q, idx) => {
      const isCorrect = isAnswerCorrect(q, answers[idx]);
      if (isCorrect) correctCount++;
      return { isCorrect };
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

    set({
      isFinished: true,
      score,
      resultQuestions: results,
    });
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
