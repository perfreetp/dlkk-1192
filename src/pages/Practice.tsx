import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  Play,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  Target,
  RefreshCw,
  Award,
  AlertCircle,
  BookOpen,
  BookmarkPlus,
  RotateCw,
  Eye,
  EyeOff,
  ArrowLeft,
  Link2,
} from 'lucide-react';
import { DifficultyBadge, QuestionTypeBadge, ErrorReasonBadge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/useAuthStore';
import { useKnowledgeStore } from '@/store/useKnowledgeStore';
import { usePracticeStore } from '@/store/usePracticeStore';
import { useQuestionStore } from '@/store/useQuestionStore';
import type { Difficulty, QuestionType, ErrorReason } from '@/types';

const Practice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { subjects, knowledgePoints, selectedSubjectId, setSelectedSubjectId } = useKnowledgeStore();
  const { addErrorQuestion, getMasteryRate } = useQuestionStore();
  const {
    config,
    setConfig,
    generatedPaper,
    currentIndex,
    answers,
    isStarted,
    isFinished,
    score,
    resultQuestions,
    previousPractice,
    generatePaper,
    startPractice,
    submitAnswer,
    nextQuestion,
    prevQuestion,
    finishPractice,
    resetPractice,
    setPreviousPractice,
    clearPreviousPractice,
  } = usePracticeStore();

  const studentId = currentUser?.id || 'stu-1';
  const initialKpId = (location.state as { selectedKpId?: string })?.selectedKpId;

  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>(
    initialKpId ? [initialKpId] : []
  );
  const [textInputs, setTextInputs] = useState<Record<number, string>>({});
  const [reportViewQuestion, setReportViewQuestion] = useState<number | null>(null);
  const [addedToReview, setAddedToReview] = useState<Set<number>>(new Set());
  const [previousSnapshot, setPreviousSnapshot] = useState<{
    paper: typeof generatedPaper;
    answers: typeof answers;
    resultQuestions: typeof resultQuestions;
    score: number;
    sourceType: 'retry-wrong' | 'retry-similar' | 'retry-all';
    sourceQuestionIndex?: number;
  } | null>(null);
  const [viewingPrevious, setViewingPrevious] = useState(false);

  const subjectKnowledgePoints = useMemo(() =>
    knowledgePoints.filter(kp => kp.subjectId === selectedSubjectId),
    [knowledgePoints, selectedSubjectId]
  );

  const displayPaper = viewingPrevious && previousSnapshot ? previousSnapshot.paper : generatedPaper;
  const displayAnswers = viewingPrevious && previousSnapshot ? previousSnapshot.answers : answers;
  const displayResults = viewingPrevious && previousSnapshot ? previousSnapshot.resultQuestions : resultQuestions;
  const displayScore = viewingPrevious && previousSnapshot ? previousSnapshot.score : score;

  const availableQuestions = generatedPaper?.questions || [];
  const currentQuestion = availableQuestions[currentIndex];

  const handleKnowledgeToggle = (kpId: string) => {
    setSelectedKnowledgeIds(prev =>
      prev.includes(kpId)
        ? prev.filter(id => id !== kpId)
        : [...prev, kpId]
    );
  };

  const handleSelectAllKnowledge = () => {
    if (selectedKnowledgeIds.length === subjectKnowledgePoints.length) {
      setSelectedKnowledgeIds([]);
    } else {
      setSelectedKnowledgeIds(subjectKnowledgePoints.map(kp => kp.id));
    }
  };

  const handleGenerate = () => {
    setConfig({
      subjectId: selectedSubjectId,
      knowledgePointIds: selectedKnowledgeIds,
      questionCount: config.questionCount,
      difficulty: config.difficulty,
      questionTypes: config.questionTypes,
      includeErrors: config.includeErrors,
      studentId,
    });
    generatePaper();
  };

  const handleStart = () => {
    if (!generatedPaper) return;
    setTextInputs({});
    startPractice();
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (isFinished) return;
    submitAnswer(currentIndex, optionIndex);
  };

  const handleTextInputChange = (value: string) => {
    if (isFinished) return;
    setTextInputs(prev => ({ ...prev, [currentIndex]: value }));
    submitAnswer(currentIndex, value);
  };

  const handleFinish = () => {
    Object.entries(textInputs).forEach(([idxStr, value]) => {
      const idx = Number(idxStr);
      if (answers[idx] === undefined || answers[idx] === '') {
        submitAnswer(idx, value);
      }
    });
    finishPractice();
  };

  const handleRetry = () => {
    setTextInputs({});
    resetPractice();
  };

  const getCurrentAnswer = () => answers[currentIndex];
  const isCurrentAnswered = getCurrentAnswer() !== undefined && getCurrentAnswer() !== '';
  const isCurrentCorrect = isFinished && currentQuestion
    ? resultQuestions[currentIndex]?.isCorrect ?? null
    : null;
  const currentTextInput = textInputs[currentIndex] ?? (typeof getCurrentAnswer() === 'number' ? '' : String(getCurrentAnswer() ?? ''));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">组卷练习</h1>
          <p className="text-gray-500 text-sm mt-1">
            根据知识点、难度和题型智能组卷，针对性强化练习
          </p>
        </div>
        {!isStarted && !generatedPaper && (
          <button onClick={handleRetry} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            重置
          </button>
        )}
      </div>

      {!isStarted && !generatedPaper && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary-500" />
                选择科目
              </h3>
              <div className="flex flex-wrap gap-2">
                {subjects.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubjectId(sub.id);
                      setSelectedKnowledgeIds([]);
                    }}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      selectedSubjectId === sub.id
                        ? 'bg-primary-900 text-white shadow-md'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent-500" />
                  选择知识点
                </h3>
                <button
                  onClick={handleSelectAllKnowledge}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {selectedKnowledgeIds.length === subjectKnowledgePoints.length
                    ? '取消全选'
                    : '全选'}
                </button>
              </div>
              {subjectKnowledgePoints.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  请先选择一个科目
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {subjectKnowledgePoints.map(kp => (
                    <label
                      key={kp.id}
                      className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedKnowledgeIds.includes(kp.id)
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedKnowledgeIds.includes(kp.id)}
                        onChange={() => handleKnowledgeToggle(kp.id)}
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {kp.name}
                        </p>
                        <p className="text-xs text-gray-500">Level {kp.level}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                组卷配置
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    题目数量
                  </label>
                  <select
                    value={config.questionCount}
                    onChange={(e) => setConfig({ ...config, questionCount: Number(e.target.value) })}
                    className="select"
                  >
                    {[5, 10, 15, 20, 30].map(n => (
                      <option key={n} value={n}>{n} 道</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    难度分布
                  </label>
                  <div className="flex gap-2">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                      <label
                        key={diff}
                        className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg cursor-pointer transition-all ${
                          config.difficulty === diff
                            ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                            : 'bg-gray-50 text-gray-600 border-2 border-transparent'
                        }`}
                      >
                        <input
                          type="radio"
                          name="difficulty"
                          checked={config.difficulty === diff}
                          onChange={() => setConfig({ ...config, difficulty: diff })}
                          className="hidden"
                        />
                        <span className="text-sm">
                          {diff === 'easy' ? '简单' : diff === 'medium' ? '中等' : '困难'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    题型偏好
                  </label>
                  <div className="space-y-1.5">
                    {(['choice', 'fill', 'answer'] as QuestionType[]).map(type => (
                      <label
                        key={type}
                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={config.questionTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfig({
                                ...config,
                                questionTypes: [...config.questionTypes, type],
                              });
                            } else {
                              setConfig({
                                ...config,
                                questionTypes: config.questionTypes.filter(t => t !== type),
                              });
                            }
                          }}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">
                          {type === 'choice' ? '选择题' : type === 'fill' ? '填空题' : '解答题'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                    <input
                      type="checkbox"
                      checked={config.includeErrors}
                      onChange={(e) => setConfig({ ...config, includeErrors: e.target.checked })}
                      className="rounded text-warning-600 focus:ring-warning-500"
                    />
                    <span className="text-sm text-gray-700">优先使用错题</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={selectedKnowledgeIds.length === 0 || config.questionTypes.length === 0}
                className="w-full btn-primary mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                智能组卷
              </button>
            </div>

            <div className="card bg-gradient-to-br from-accent-50 to-blue-50">
              <h4 className="font-bold text-accent-800 mb-2">组卷算法说明</h4>
              <ul className="text-sm text-accent-700 space-y-1">
                <li>• 简单题 20%、中等题 50%、困难题 30%</li>
                <li>• 错题优先级权重 × 2</li>
                <li>• 确保知识点覆盖平衡</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {!isStarted && generatedPaper && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">组卷结果预览</h3>
              <p className="text-sm text-gray-500 mt-1">
                共 {generatedPaper.questions.length} 道题目，预计 {generatedPaper.estimatedTime} 分钟
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRetry} className="btn-secondary">
                重新组卷
              </button>
              <button onClick={handleStart} className="btn-primary flex items-center gap-2">
                <Play className="w-4 h-4" />
                开始练习
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">
                {generatedPaper.questions.filter(q =>
                  q.difficulty === 'easy' || (typeof q.difficulty === 'number' && q.difficulty <= 1)
                ).length}
              </p>
              <p className="text-xs text-blue-500 mt-1">简单题</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-xl">
              <p className="text-2xl font-bold text-amber-600">
                {generatedPaper.questions.filter(q =>
                  q.difficulty === 'medium' || (typeof q.difficulty === 'number' && q.difficulty >= 2 && q.difficulty <= 3)
                ).length}
              </p>
              <p className="text-xs text-amber-500 mt-1">中等题</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <p className="text-2xl font-bold text-red-600">
                {generatedPaper.questions.filter(q =>
                  q.difficulty === 'hard' || (typeof q.difficulty === 'number' && q.difficulty >= 4)
                ).length}
              </p>
              <p className="text-xs text-red-500 mt-1">困难题</p>
            </div>
          </div>

          <div className="space-y-3">
            {generatedPaper.questions.map((q, index) => (
              <div
                key={q.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 mb-1">{q.content.slice(0, 80)}...</p>
                  <div className="flex items-center gap-2">
                    <QuestionTypeBadge type={q.type} />
                    <DifficultyBadge difficulty={q.difficulty} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isStarted && currentQuestion && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-900 text-white flex items-center justify-center font-bold">
                {currentIndex + 1}
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  第 {currentIndex + 1} / {availableQuestions.length} 题
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <QuestionTypeBadge type={currentQuestion.type} />
                  <DifficultyBadge difficulty={currentQuestion.difficulty} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="w-4 h-4" />
              <span className="text-sm">已答题 {answers.filter(a => a !== undefined && a !== '').length} 题</span>
            </div>
          </div>

          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-400 to-accent-500 transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / availableQuestions.length) * 100}%` }}
            />
          </div>

          <div className="card">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-800 leading-relaxed">
                {currentQuestion.content}
              </h2>
            </div>

            {(currentQuestion.type === 'choice' || currentQuestion.type === 'single') && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, optIndex) => {
                  const isSelected = getCurrentAnswer() === optIndex;
                  let optionClass = 'bg-gray-50 border-2 border-gray-100 hover:bg-gray-100';
                  const correctIdx = Number(currentQuestion.correctAnswer);

                  if (isFinished) {
                    if (optIndex === correctIdx) {
                      optionClass = 'bg-emerald-50 border-2 border-emerald-500';
                    } else if (isSelected && optIndex !== correctIdx) {
                      optionClass = 'bg-red-50 border-2 border-red-500';
                    } else {
                      optionClass = 'bg-gray-50 border-2 border-gray-100 opacity-50';
                    }
                  } else if (isSelected) {
                    optionClass = 'bg-primary-50 border-2 border-primary-500';
                  }

                  return (
                    <button
                      key={optIndex}
                      onClick={() => handleOptionSelect(optIndex)}
                      disabled={isFinished}
                      className={`w-full flex items-start gap-3 p-4 rounded-xl transition-all text-left ${optionClass}`}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isFinished
                          ? optIndex === correctIdx
                            ? 'bg-emerald-500 text-white'
                            : isSelected
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                          : isSelected
                          ? 'bg-primary-500 text-white'
                          : 'bg-white text-gray-600 border border-gray-200'
                      }`}>
                        {isFinished && optIndex === correctIdx ? (
                          <Check className="w-4 h-4" />
                        ) : isFinished && isSelected && optIndex !== correctIdx ? (
                          <X className="w-4 h-4" />
                        ) : (
                          String.fromCharCode(65 + optIndex)
                        )}
                      </span>
                      <span className="text-gray-700 pt-0.5">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'fill' && (
              <div>
                <input
                  type="text"
                  placeholder="请输入答案..."
                  className="input text-lg"
                  value={currentTextInput}
                  onChange={(e) => handleTextInputChange(e.target.value)}
                  disabled={isFinished}
                />
                {isFinished && (
                  <div className={`mt-4 p-4 rounded-xl ${
                    isCurrentCorrect ? 'bg-emerald-50' : 'bg-red-50'
                  }`}>
                    <p className={`text-sm ${
                      isCurrentCorrect ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      <span className="font-medium">
                        {isCurrentCorrect ? '回答正确！' : '回答错误。'} 正确答案：
                      </span>
                      {currentQuestion.answer}
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentQuestion.type === 'answer' || currentQuestion.type === 'essay' && (
              <div>
                <textarea
                  placeholder="请输入答案..."
                  rows={5}
                  className="input"
                  value={currentTextInput}
                  onChange={(e) => handleTextInputChange(e.target.value)}
                  disabled={isFinished}
                />
                {isFinished && (
                  <div className={`mt-4 p-4 rounded-xl ${
                    isCurrentCorrect ? 'bg-emerald-50' : 'bg-blue-50'
                  }`}>
                    <p className={`text-sm font-medium mb-1 ${
                      isCurrentCorrect ? 'text-emerald-700' : 'text-blue-700'
                    }`}>
                      {isCurrentCorrect ? '回答正确！' : '参考答案：'}
                    </p>
                    {!isCurrentCorrect && (
                      <p className="text-sm text-blue-600">{currentQuestion.answer}</p>
                    )}
                    <p className="text-sm text-blue-600 mt-2 pt-2 border-t border-blue-100">
                      解析：{currentQuestion.analysis}
                    </p>
                  </div>
                )}
              </div>
            )}

            {isFinished && !isCurrentCorrect && currentQuestion.errorReason && (
              <div className="mt-4 p-4 bg-warning-50 rounded-xl">
                <p className="text-sm text-warning-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  错因分析：
                  <ErrorReasonBadge reason={currentQuestion.errorReason} />
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={prevQuestion}
              disabled={currentIndex === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              上一题
            </button>

            <div className="flex gap-1 max-w-md overflow-x-auto pb-1">
              {availableQuestions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    while (currentIndex > idx) prevQuestion();
                    while (currentIndex < idx) nextQuestion();
                  }}
                  className={`w-8 h-8 shrink-0 rounded-lg text-sm font-medium transition-all ${
                    idx === currentIndex
                      ? 'bg-primary-900 text-white'
                      : answers[idx] !== undefined && answers[idx] !== ''
                      ? resultQuestions[idx]?.isCorrect
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {currentIndex < availableQuestions.length - 1 ? (
              <button
                onClick={nextQuestion}
                className="btn-primary flex items-center gap-2"
              >
                下一题
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="btn-accent flex items-center gap-2"
              >
                交卷
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {isFinished && generatedPaper && (
        <div className="max-w-4xl mx-auto space-y-6">
          {previousPractice && !previousSnapshot && (
            <div className="card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Link2 className="w-5 h-5 text-primary-500" />
                <div className="text-sm">
                  <span className="text-gray-500">本次试卷基于上一套练习生成：</span>
                  <span className="font-medium text-gray-800">{previousPractice.paperTitle}</span>
                  <span className="text-gray-400 mx-2">|</span>
                  <span className="text-accent-600 font-medium">{previousPractice.score}分</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-gray-500">{previousPractice.totalQuestions}题，答对 {previousPractice.correctCount}</span>
                  {previousPractice.sourceType === 'retry-similar' && previousPractice.sourceQuestionIndex !== undefined && (
                    <>
                      <span className="text-gray-400 mx-2">|</span>
                      <span className="text-xs text-gray-500">针对第 {previousPractice.sourceQuestionIndex + 1} 题的同类练习</span>
                    </>
                  )}
                  {previousPractice.sourceType === 'retry-wrong' && (
                    <>
                      <span className="text-gray-400 mx-2">|</span>
                      <span className="text-xs text-gray-500">基于错题知识点重新组卷</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setViewingPrevious(true);
                }}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                查看上一套报告
              </button>
            </div>
          )}
          {previousSnapshot && viewingPrevious && (
            <div className="card p-4 flex items-center justify-between gap-3 border-2 border-amber-300 bg-amber-50/30">
              <div className="flex items-center gap-3 flex-wrap">
                <ArrowLeft className="w-5 h-5 text-amber-600" />
                <div className="text-sm">
                  <span className="text-gray-600 font-medium">正在查看上一套练习报告：</span>
                  <span className="text-gray-800">{previousSnapshot.paper?.title}</span>
                  <span className="text-gray-400 mx-2">|</span>
                  <span className="text-accent-600 font-bold">{previousSnapshot.score}分</span>
                </div>
              </div>
              <button
                onClick={() => setViewingPrevious(false)}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors whitespace-nowrap"
              >
                返回当前报告
              </button>
            </div>
          )}

          <div className="card text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent-400 to-accent-500 text-white flex items-center justify-center">
              <Award className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {viewingPrevious ? '上一套练习结果' : '练习完成！'}
            </h2>

            <div className="text-6xl font-bold text-primary-900 mb-2">
              {displayScore}
              <span className="text-2xl text-gray-400">分</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600">
                  {displayResults.filter(r => r.isCorrect).length}
                </p>
                <p className="text-xs text-emerald-500 mt-1">答对</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl">
                <p className="text-2xl font-bold text-red-600">
                  {displayResults.filter(r => !r.isCorrect).length}
                </p>
                <p className="text-xs text-red-500 mt-1">答错</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-600">
                  {displayAnswers.filter(a => a === undefined || a === '').length}
                </p>
                <p className="text-xs text-gray-500 mt-1">未答</p>
              </div>
            </div>

            {displayResults.some(r => !r.isCorrect) && (
              <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  本次练习有 <strong>{displayResults.filter(r => !r.isCorrect).length}</strong> 道错题，
                  可在下方报告中逐一查看解析并加入复习计划
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                {viewingPrevious ? '上一套练习报告' : '练习报告'}
              </h3>
              {!viewingPrevious && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const wrongKpIds = [...new Set(
                        generatedPaper.questions
                          .filter((_, i) => !resultQuestions[i].isCorrect)
                          .map(q => q.knowledgePointId)
                      )];
                      if (wrongKpIds.length > 0) {
                        setPreviousSnapshot({
                          paper: generatedPaper,
                          answers: [...answers],
                          resultQuestions: [...resultQuestions],
                          score,
                          sourceType: 'retry-wrong',
                        });
                        setPreviousPractice({
                          paperId: generatedPaper.id,
                          paperTitle: generatedPaper.title,
                          score,
                          totalQuestions: generatedPaper.questions.length,
                          correctCount: resultQuestions.filter(r => r.isCorrect).length,
                          sourceType: 'retry-wrong',
                          createdAt: new Date().toISOString(),
                        });
                        setSelectedKnowledgeIds(wrongKpIds);
                        setConfig({ ...config, knowledgePointIds: wrongKpIds, subjectId: selectedSubjectId, studentId });
                        resetPractice();
                        setViewingPrevious(false);
                        setTimeout(() => generatePaper(), 100);
                      } else {
                        handleRetry();
                      }
                    }}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <RotateCw className="w-4 h-4" />
                    按错题知识点重新组卷
                  </button>
                  <button onClick={handleRetry} className="btn-secondary flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    再练一组
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {displayPaper?.questions.map((q, idx) => {
                const isCorrect = displayResults[idx]?.isCorrect ?? false;
                const userAnswer = displayAnswers[idx];
                const kp = knowledgePoints.find(k => k.id === q.knowledgePointId);
                const isExpanded = reportViewQuestion === idx;
                const isInReview = addedToReview.has(idx);

                const getUserAnswerDisplay = () => {
                  if (userAnswer === undefined || userAnswer === '') return '未作答';
                  if ((q.type === 'choice' || q.type === 'single') && q.options) {
                    const optIdx = Number(userAnswer);
                    return q.options[optIdx] ? `第${String.fromCharCode(65 + optIdx)}项：${q.options[optIdx]}` : String(userAnswer);
                  }
                  return String(userAnswer);
                };

                const getCorrectAnswerDisplay = () => {
                  if ((q.type === 'choice' || q.type === 'single') && q.options) {
                    const optIdx = Number(q.correctAnswer);
                    return q.options[optIdx] ? `第${String.fromCharCode(65 + optIdx)}项：${q.options[optIdx]}` : String(q.correctAnswer);
                  }
                  return q.answer || String(q.correctAnswer);
                };

                const getErrorReason = (): ErrorReason | null => {
                  if (isCorrect) return null;
                  if (q.errorReason) return q.errorReason;
                  const ua = String(userAnswer || '');
                  const keywords: Record<ErrorReason, string[]> = {
                    '概念不清': ['不理解', '概念', '混淆'],
                    '计算错误': ['算错', '计算', '运算'],
                    '审题失误': ['看错', '没看清', '理解错'],
                    '方法不当': ['方法', '思路', '不会'],
                    '知识遗忘': ['忘了', '不记得', '遗忘'],
                    '其他': [],
                  };
                  for (const [reason, kws] of Object.entries(keywords)) {
                    if (kws.some(k => ua.includes(k))) return reason as ErrorReason;
                  }
                  return '概念不清';
                };

                const handleAddToReview = () => {
                  if (isInReview) return;
                  const wrongAnswer = typeof userAnswer === 'number'
                    ? (q.options ? q.options[userAnswer] : String(userAnswer))
                    : String(userAnswer || '');
                  addErrorQuestion({
                    studentId,
                    questionId: q.id,
                    knowledgePointId: q.knowledgePointId,
                    wrongAnswer,
                    errorReason: getErrorReason() || '概念不清',
                    errorDate: new Date().toISOString().split('T')[0],
                    correctionStatus: 'pending',
                    nextReviewDate: new Date().toISOString().split('T')[0],
                    reviewCount: 0,
                    masteryRate: getMasteryRate(q.knowledgePointId, studentId),
                    sourceExam: '专项练习',
                  });
                  setAddedToReview(prev => new Set(prev).add(idx));
                };

                return (
                  <div
                    key={q.id}
                    className={`rounded-xl border-2 transition-all ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-red-200 bg-red-50/30'
                    }`}
                  >
                    <div
                      className="flex items-start gap-3 p-4 cursor-pointer"
                      onClick={() => setReportViewQuestion(isExpanded ? null : idx)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}>
                        {isCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 mb-1">
                          第 {idx + 1} 题
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {q.content.slice(0, 100)}{q.content.length > 100 ? '...' : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <QuestionTypeBadge type={q.type} />
                          <DifficultyBadge difficulty={q.difficulty} />
                          {!isCorrect && getErrorReason() && (
                            <ErrorReasonBadge reason={getErrorReason()!} />
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isExpanded ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className={`p-3 rounded-lg ${isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
                            <p className="text-xs font-medium text-gray-500 mb-1">你的答案</p>
                            <p className={`text-sm ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                              {getUserAnswerDisplay()}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-50">
                            <p className="text-xs font-medium text-gray-500 mb-1">正确答案</p>
                            <p className="text-sm text-blue-700">{getCorrectAnswerDisplay()}</p>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-gray-50">
                          <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            解析
                          </p>
                          <p className="text-sm text-gray-700">{q.analysis || q.answerExplanation || '暂无解析'}</p>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                          {kp && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Target className="w-3.5 h-3.5" />
                              关联知识点：{kp.name}
                            </span>
                          )}
                          {!isCorrect && getErrorReason() && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              错因：{getErrorReason()}
                            </span>
                          )}
                        </div>

                        {!isCorrect && !viewingPrevious && (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToReview();
                              }}
                              disabled={isInReview}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                                isInReview
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-accent-500 text-white hover:bg-accent-600'
                              }`}
                            >
                              <BookmarkPlus className="w-4 h-4" />
                              {isInReview ? '已加入复习计划' : '加入复习计划'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (q.knowledgePointId) {
                                  setPreviousSnapshot({
                                    paper: generatedPaper,
                                    answers: [...answers],
                                    resultQuestions: [...resultQuestions],
                                    score,
                                    sourceType: 'retry-similar',
                                    sourceQuestionIndex: idx,
                                  });
                                  setPreviousPractice({
                                    paperId: generatedPaper.id,
                                    paperTitle: generatedPaper.title,
                                    score,
                                    totalQuestions: generatedPaper.questions.length,
                                    correctCount: resultQuestions.filter(r => r.isCorrect).length,
                                    sourceType: 'retry-similar',
                                    sourceQuestionIndex: idx,
                                    createdAt: new Date().toISOString(),
                                  });
                                  setSelectedKnowledgeIds([q.knowledgePointId]);
                                  setConfig({ ...config, knowledgePointIds: [q.knowledgePointId], subjectId: selectedSubjectId, studentId });
                                  resetPractice();
                                  setViewingPrevious(false);
                                  setTimeout(() => generatePaper(), 100);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-primary-100 text-primary-700 hover:bg-primary-200 transition-all"
                            >
                              <RotateCw className="w-4 h-4" />
                              同类题再练
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-8">
              {!viewingPrevious && (
                <button onClick={handleRetry} className="flex-1 btn-secondary">
                  再练一组
                </button>
              )}
              <button
                onClick={() => {
                  resetPractice();
                  navigate('/error-questions');
                }}
                className="flex-1 btn-primary"
              >
                查看错题库
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Practice;
