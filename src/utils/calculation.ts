export const calculateMasteryRate = (
  totalQuestions: number,
  wrongCount: number,
  correctionCorrectRate: number
): number => {
  if (totalQuestions === 0) return 100;
  const baseRate = (1 - wrongCount / totalQuestions) * 60;
  const correctionRate = correctionCorrectRate * 40;
  return Math.round(Math.max(10, Math.min(100, baseRate + correctionRate)));
};

export const getEbbinghausInterval = (reviewCount: number, difficulty: number): number => {
  const baseIntervals = [1, 2, 4, 7, 15, 30];
  const difficultyFactor = 0.8 + (difficulty - 1) * 0.175;
  const index = Math.min(reviewCount, baseIntervals.length - 1);
  return Math.round(baseIntervals[index] * difficultyFactor);
};

export const getMasteryColor = (masteryRate: number): string => {
  if (masteryRate >= 80) return '#00d4aa';
  if (masteryRate >= 60) return '#3b82f6';
  if (masteryRate >= 40) return '#f59e0b';
  if (masteryRate >= 20) return '#f97316';
  return '#ef4444';
};

export const getMasteryLabel = (masteryRate: number): string => {
  if (masteryRate >= 80) return '熟练掌握';
  if (masteryRate >= 60) return '基本掌握';
  if (masteryRate >= 40) return '部分掌握';
  if (masteryRate >= 20) return '有待加强';
  return '需要重点关注';
};

export const getDifficultyLabel = (difficulty: number): string => {
  const labels = ['', '简单', '较易', '中等', '较难', '困难'];
  return labels[difficulty] || '中等';
};

export const getDifficultyColor = (difficulty: number): string => {
  const colors = ['', '#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];
  return colors[difficulty] || '#f59e0b';
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
