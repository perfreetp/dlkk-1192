export interface Student {
  id: string;
  name: string;
  classId: string;
  avatar?: string;
  joinDate: string;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  avatar?: string;
}

export interface Class {
  id: string;
  name: string;
  grade: string;
  subject: string;
  studentCount: number;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface KnowledgePoint {
  id: string;
  name: string;
  subjectId: string;
  parentId?: string;
  level: 1 | 2 | 3;
  description?: string;
  prerequisites: string[];
  successors: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type QuestionType = 'choice' | 'fill' | 'answer' | 'single' | 'essay';
export type Difficulty = 'easy' | 'medium' | 'hard' | number;

export interface Question {
  id: string;
  content: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string | number;
  answer: string;
  analysis: string;
  answerExplanation?: string;
  difficulty: Difficulty;
  knowledgePointId: string;
  knowledgePointIds: string[];
  subjectId: string;
  errorReason?: ErrorReason;
}

export type CorrectionStatus = 'pending' | 'corrected' | 'mastered';
export type ErrorReason = '概念不清' | '计算错误' | '审题失误' | '方法不当' | '知识遗忘' | '其他';

export interface ErrorQuestion {
  id: string;
  studentId: string;
  questionId: string;
  knowledgePointId?: string;
  wrongAnswer?: string;
  errorReason: ErrorReason;
  errorDate: string;
  correctionStatus: CorrectionStatus;
  correctionDate?: string;
  correctionNote?: string;
  nextReviewDate: string;
  reviewCount: number;
  masteryRate: number;
  sourceExam?: string;
  reviewRecords?: ReviewRecord[];
}

export interface ReviewRecord {
  id: string;
  errorQuestionId: string;
  reviewDate: string;
  result: 'correct' | 'wrong';
  note?: string;
}

export interface PracticeRecord {
  id: string;
  studentId: string;
  title: string;
  startTime: string;
  endTime?: string;
  totalQuestions: number;
  correctCount: number;
  knowledgePointIds: string[];
  status: 'ongoing' | 'finished';
}

export interface PracticeAnswer {
  id: string;
  practiceRecordId: string;
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
}

export type CommentTaskType = 'concept' | 'method' | 'habit' | 'other';
export type CommentTaskPriority = 'high' | 'medium' | 'low';

export interface CommentTask {
  id: string;
  teacherId: string;
  studentId: string;
  knowledgePointId?: string;
  questionId?: string;
  errorQuestionId?: string;
  type?: CommentTaskType;
  title?: string;
  description?: string;
  status: 'pending' | 'completed';
  priority?: CommentTaskPriority;
  createdAt?: string;
  createDate?: string;
  dueDate?: string;
  completedAt?: string;
  completeDate?: string;
  comment?: string;
}

export interface KnowledgeMastery {
  knowledgePointId: string;
  studentId: string;
  masteryRate: number;
  totalQuestions: number;
  wrongCount: number;
  lastPracticeDate: string;
}

export interface ProgressDataPoint {
  date: string;
  correctRate: number;
  masteryRate: number;
}

export interface ClassMasteryData {
  name: string;
  value: number;
  knowledgePoint?: string;
  [key: string]: any;
}

export interface ErrorDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface PracticeConfig {
  subjectId: string;
  knowledgePointIds: string[];
  questionCount: number;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  includeErrors: boolean;
  studentId: string;
}

export interface PracticePaper {
  id: string;
  title: string;
  questions: Question[];
  estimatedTime: number;
  createdAt: string;
}
