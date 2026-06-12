import { create } from 'zustand';
import type { PracticeConfig, PracticePaper, Question } from '@/types';
import { useQuestionStore } from './useQuestionStore';

interface PracticeState {
  config: PracticeConfig;
  setConfig: (config: PracticeConfig) => void;
  generatedPaper: PracticePaper | null;
  currentIndex: number;
  answers: (number | undefined)[];
  isStarted: boolean;
  isFinished: boolean;
  score: number;
  generatePaper: () => void;
  startPractice: () => void;
  submitAnswer: (questionIndex: number, answer: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  finishPractice: () => void;
  resetPractice: () => void;
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

const difficultyWeight = {
  easy: 0.2,
  medium: 0.5,
  hard: 0.3,
};

const difficultyScore = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const calculateWeightedScore = (q: Question, includeErrors: boolean, studentErrorIds: Set<string>): number => {
  const baseWeight = difficultyWeight[q.difficulty] || 0.5;
  const errorWeight = includeErrors && studentErrorIds.has(q.id) ? 2 : 1;
  return baseWeight * errorWeight * difficultyScore[q.difficulty];
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

  generatePaper: () => {
    const { config } = get();
    const { questions, errorQuestions } = useQuestionStore.getState();

    const studentErrorIds = new Set(
      errorQuestions
        .filter(eq => eq.studentId === config.studentId)
        .map(eq => eq.questionId)
    );

    let pool = questions.filter(q =>
      q.subjectId === config.subjectId &&
      config.knowledgePointIds.includes(q.knowledgePointId) &&
      config.questionTypes.includes(q.type)
    );

    if (pool.length === 0) {
      pool = questions.filter(q =>
        q.subjectId === config.subjectId &&
        config.questionTypes.includes(q.type)
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
    const { answers, generatedPaper } = get();
    if (!generatedPaper) return;

    let correctCount = 0;
    const { addErrorQuestion, getMasteryRate } = useQuestionStore.getState();

    generatedPaper.questions.forEach((q, idx) => {
      const answer = answers[idx];
      if (answer === q.correctAnswer) {
        correctCount++;
      } else {
        const existing = useQuestionStore.getState().errorQuestions.find(
          eq => eq.studentId === get().config.studentId && eq.questionId === q.id
        );
        if (!existing) {
          addErrorQuestion({
            studentId: get().config.studentId,
            questionId: q.id,
            knowledgePointId: q.knowledgePointId,
            errorReason: q.errorReason || '概念不清',
            errorDate: new Date().toISOString().split('T')[0],
            correctionStatus: 'pending',
            nextReviewDate: new Date().toISOString().split('T')[0],
            reviewCount: 0,
            masteryRate: getMasteryRate(q.knowledgePointId, get().config.studentId),
          });
        }
      }
    });

    const score = Math.round((correctCount / generatedPaper.questions.length) * 100);

    set({
      isFinished: true,
      score,
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
      config: defaultConfig,
    });
  },
}));
