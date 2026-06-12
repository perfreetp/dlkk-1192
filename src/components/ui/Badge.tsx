import { getDifficultyColor, getMasteryColor } from '@/utils/calculation';
import type { CorrectionStatus, ErrorReason, QuestionType } from '@/types';

interface StatusBadgeProps {
  status: CorrectionStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config: Record<CorrectionStatus, { label: string; className: string }> = {
    pending: { label: '待订正', className: 'bg-warning-100 text-warning-600' },
    corrected: { label: '已订正', className: 'bg-blue-100 text-blue-600' },
    mastered: { label: '已掌握', className: 'bg-accent-100 text-accent-600' },
  };
  return (
    <span className={`badge ${config[status].className}`}>
      {config[status].label}
    </span>
  );
};

interface ErrorReasonBadgeProps {
  reason: ErrorReason;
}

export const ErrorReasonBadge = ({ reason }: ErrorReasonBadgeProps) => {
  const colors: Record<ErrorReason, string> = {
    '概念不清': 'bg-red-100 text-red-600',
    '计算错误': 'bg-orange-100 text-orange-600',
    '审题失误': 'bg-amber-100 text-amber-600',
    '方法不当': 'bg-purple-100 text-purple-600',
    '知识遗忘': 'bg-blue-100 text-blue-600',
    '其他': 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`badge ${colors[reason]}`}>
      {reason}
    </span>
  );
};

interface DifficultyBadgeProps {
  difficulty: number | string;
}

export const DifficultyBadge = ({ difficulty }: DifficultyBadgeProps) => {
  const labels = ['', '简单', '较易', '中等', '较难', '困难'];
  let diffNum: number;
  if (typeof difficulty === 'number') {
    diffNum = difficulty;
  } else if (difficulty === 'easy') {
    diffNum = 1;
  } else if (difficulty === 'medium') {
    diffNum = 3;
  } else if (difficulty === 'hard') {
    diffNum = 5;
  } else {
    diffNum = 3;
  }
  const color = getDifficultyColor(diffNum);
  return (
    <span
      className="badge"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {labels[diffNum] || '中等'}
    </span>
  );
};

interface QuestionTypeBadgeProps {
  type: QuestionType;
}

export const QuestionTypeBadge = ({ type }: QuestionTypeBadgeProps) => {
  const config: Record<string, { label: string; className: string }> = {
    single: { label: '单选题', className: 'bg-indigo-100 text-indigo-600' },
    choice: { label: '选择题', className: 'bg-indigo-100 text-indigo-600' },
    fill: { label: '填空题', className: 'bg-cyan-100 text-cyan-600' },
    essay: { label: '解答题', className: 'bg-teal-100 text-teal-600' },
    answer: { label: '解答题', className: 'bg-teal-100 text-teal-600' },
  };
  const item = config[type] || { label: '其他', className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`badge ${item.className}`}>
      {item.label}
    </span>
  );
};

interface MasteryBadgeProps {
  rate: number;
}

export const MasteryBadge = ({ rate }: MasteryBadgeProps) => {
  const color = getMasteryColor(rate);
  return (
    <span
      className="badge font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      掌握度 {rate}%
    </span>
  );
};
