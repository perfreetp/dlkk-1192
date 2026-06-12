import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Calendar,
  Tag,
} from 'lucide-react';
import type { ErrorQuestion, Question, KnowledgePoint } from '@/types';
import { StatusBadge, ErrorReasonBadge, DifficultyBadge, QuestionTypeBadge, MasteryBadge } from '@/components/ui/Badge';
import { formatDate, daysUntil, isToday } from '@/utils/date';
import { useQuestionStore } from '@/store/useQuestionStore';
import { useKnowledgeStore } from '@/store/useKnowledgeStore';

interface ErrorCardProps {
  errorQuestion: ErrorQuestion;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onCorrect?: (id: string) => void;
  onMaster?: (id: string) => void;
  onReview?: (id: string, result: 'correct' | 'wrong') => void;
  compact?: boolean;
}

export const ErrorCard = ({
  errorQuestion,
  showCheckbox,
  isSelected,
  onSelect,
  onCorrect,
  onMaster,
  onReview,
  compact,
}: ErrorCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const question = useQuestionStore(s => s.getQuestionById(errorQuestion.questionId));
  const getKpById = useKnowledgeStore(s => s.getKnowledgePointById);
  const markCorrected = useQuestionStore(s => s.markCorrected);
  const markMastered = useQuestionStore(s => s.markMastered);
  const recordReview = useQuestionStore(s => s.recordReview);

  if (!question) return null;

  const knowledgePoints = question.knowledgePointIds
    .map(id => getKpById(id))
    .filter(Boolean) as KnowledgePoint[];

  const daysToReview = daysUntil(errorQuestion.nextReviewDate);
  const isReviewDue = isToday(errorQuestion.nextReviewDate) || daysToReview < 0;

  const handleCorrect = () => {
    if (showNoteInput && correctionNote.trim()) {
      markCorrected(errorQuestion.id, correctionNote);
      setShowNoteInput(false);
      setCorrectionNote('');
    } else {
      setShowNoteInput(true);
    }
  };

  return (
    <div
      className={`card relative ${isSelected ? 'ring-2 ring-accent-500' : ''} ${expanded ? 'shadow-card-hover' : ''} transition-all duration-300`}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect?.(errorQuestion.id)}
          className="absolute top-4 left-4 w-4 h-4 text-accent-600 rounded focus:ring-accent-500"
        />
      )}

      <div className={showCheckbox ? 'pl-8' : ''}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <QuestionTypeBadge type={question.type} />
            <DifficultyBadge difficulty={question.difficulty} />
            <StatusBadge status={errorQuestion.correctionStatus} />
            <MasteryBadge rate={errorQuestion.masteryRate} />
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
        </div>

        <div className="mb-3">
          <p className="text-gray-800 font-medium leading-relaxed">
            {question.content.length > 100 && !expanded
              ? `${question.content.slice(0, 100)}...`
              : question.content}
          </p>
        </div>

        {!compact && (
          <div className="flex flex-wrap gap-2 mb-3">
            {knowledgePoints.map(kp => (
              <span
                key={kp.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs"
              >
                <Tag className="w-3 h-3" />
                {kp.name}
              </span>
            ))}
            <ErrorReasonBadge reason={errorQuestion.errorReason} />
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(errorQuestion.errorDate)}
          </span>
          {errorQuestion.sourceExam && (
            <span className="text-gray-400">来自 {errorQuestion.sourceExam}</span>
          )}
          {isReviewDue && errorQuestion.correctionStatus !== 'mastered' && (
            <span className="flex items-center gap-1 text-warning-600">
              <Clock className="w-3.5 h-3.5" />
              待复习
            </span>
          )}
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fade-in">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                你的答案
              </p>
              <p className="text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm">
                {errorQuestion.wrongAnswer}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-600" />
                正确答案
              </p>
              <p className="text-accent-700 bg-accent-50 px-3 py-2 rounded-lg text-sm">
                {question.answer}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">解析</p>
              <p className="text-gray-600 bg-gray-50 px-3 py-2 rounded-lg text-sm leading-relaxed">
                {question.analysis}
              </p>
            </div>

            {errorQuestion.correctionNote && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary-600" />
                  订正笔记
                </p>
                <p className="text-gray-600 bg-primary-50 px-3 py-2 rounded-lg text-sm">
                  {errorQuestion.correctionNote}
                </p>
              </div>
            )}

            {showNoteInput && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">添加订正笔记</p>
                <textarea
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  placeholder="写下你的订正心得..."
                  className="input h-20 resize-none"
                />
              </div>
            )}

            {errorQuestion.correctionStatus === 'pending' && (
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={handleCorrect}
                  className="btn-accent text-sm py-1.5 px-3"
                >
                  {showNoteInput ? '确认订正' : '标记订正'}
                </button>
                <button
                  onClick={() => onMaster?.(errorQuestion.id)}
                  className="btn-primary text-sm py-1.5 px-3"
                >
                  标记已掌握
                </button>
              </div>
            )}

            {errorQuestion.correctionStatus !== 'pending' && errorQuestion.correctionStatus !== 'mastered' && (
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => onReview?.(errorQuestion.id, 'correct')}
                  className="btn-accent text-sm py-1.5 px-3"
                >
                  复习正确
                </button>
                <button
                  onClick={() => onReview?.(errorQuestion.id, 'wrong')}
                  className="btn-warning text-sm py-1.5 px-3"
                >
                  复习错误
                </button>
                <button
                  onClick={() => onMaster?.(errorQuestion.id)}
                  className="btn-primary text-sm py-1.5 px-3"
                >
                  标记已掌握
                </button>
              </div>
            )}

            {onCorrect && errorQuestion.correctionStatus === 'pending' && (
              <button
                onClick={() => onCorrect(errorQuestion.id)}
                className="btn-secondary w-full"
              >
                开始订正
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
