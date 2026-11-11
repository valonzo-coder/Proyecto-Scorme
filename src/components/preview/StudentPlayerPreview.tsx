import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  RotateCcw, 
  Terminal, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Award, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Info,
  AlertCircle,
  HelpCircle,
  Check,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CourseProject, CourseLesson, ContentBlock, TextBlock, CalloutBlock, AccordionBlock, TabsBlock, FlashcardsBlock, CheckpointBlock, QuestionItem } from '../../types/scorm';

interface StudentPlayerPreviewProps {
  project: CourseProject;
  onOpenBuilder: () => void;
}

interface ScormLog {
  id: string;
  time: string;
  command: string;
  element: string;
  value?: string;
  result: string;
}

export const StudentPlayerPreview: React.FC<StudentPlayerPreviewProps> = ({
  project,
  onOpenBuilder
}) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    project.units[0]?.lessons[0]?.id || ''
  );
  const [isAssessmentActive, setIsAssessmentActive] = useState<boolean>(false);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string>(
    project.assessments[0]?.id || ''
  );

  // Student progress state
  const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>({});
  const [accordionState, setAccordionState] = useState<Record<string, boolean>>({});
  const [tabState, setTabState] = useState<Record<string, number>>({});
  const [flashcardFlipped, setFlashcardFlipped] = useState<Record<string, boolean>>({});
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<string, string>>({});
  const [checkpointResults, setCheckpointResults] = useState<Record<string, boolean>>({});

  // Assessment Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [isPassed, setIsPassed] = useState<boolean | null>(null);

  // SCORM CMI Logs console
  const [scormLogs, setScormLogs] = useState<ScormLog[]>([]);
  const [showConsole, setShowConsole] = useState(true);

  // Flattened lessons list
  const allLessons: { unitTitle: string; lesson: CourseLesson }[] = [];
  project.units.forEach(u => {
    u.lessons.forEach(l => {
      allLessons.push({ unitTitle: u.title, lesson: l });
    });
  });

  const currentLessonData = allLessons.find(item => item.lesson.id === selectedLessonId) || allLessons[0];
  const activeAssessment = project.assessments.find(a => a.id === activeAssessmentId) || project.assessments[0];

  const totalLessons = allLessons.length;
  const completedCount = Object.keys(completedLessons).filter(k => completedLessons[k]).length;
  const overallPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Add a SCORM log entry
  const addScormLog = (command: string, element: string, value?: string, result: string = 'true') => {
    const entry: ScormLog = {
      id: `log-${Date.now()}-${Math.random().toString().slice(-4)}`,
      time: new Date().toLocaleTimeString(),
      command,
      element,
      value,
      result
    };
    setScormLogs(prev => [entry, ...prev.slice(0, 49)]);
  };

  // On mount: simulate LMSInitialize
  useEffect(() => {
    addScormLog('LMSInitialize', '""', undefined, 'true');
    addScormLog('LMSGetValue', 'cmi.core.student_name', undefined, '"Estudiante Moodle"');
    addScormLog('LMSSetValue', 'cmi.core.lesson_status', 'incomplete', 'true');
  }, []);

  // On lesson change: simulate lesson_location
  const handleSelectLesson = (lessonId: string) => {
    setIsAssessmentActive(false);
    setSelectedLessonId(lessonId);
    addScormLog('LMSSetValue', 'cmi.core.lesson_location', lessonId, 'true');
    addScormLog('LMSCommit', '""', undefined, 'true');
  };

  // Toggle mark lesson as completed
  const handleCompleteLesson = (lessonId: string) => {
    const newCompleted = { ...completedLessons, [lessonId]: true };
    setCompletedLessons(newCompleted);

    const count = Object.keys(newCompleted).filter(k => newCompleted[k]).length;
    const pct = Math.round((count / totalLessons) * 100);

    addScormLog('LMSSetValue', 'cmi.suspend_data', JSON.stringify({ completed: count, total: totalLessons }), 'true');
    if (pct >= 100) {
      addScormLog('LMSSetValue', 'cmi.core.lesson_status', 'completed', 'true');
    }
    addScormLog('LMSCommit', '""', undefined, 'true');
  };

  // Checkpoint option selection
  const handleSelectCheckpointOption = (qId: string, optId: string, isCorrect: boolean) => {
    setCheckpointAnswers(prev => ({ ...prev, [qId]: optId }));
    setCheckpointResults(prev => ({ ...prev, [qId]: isCorrect }));
    addScormLog('LMSSetValue', `cmi.interactions.${qId}.result`, isCorrect ? 'correct' : 'wrong', 'true');
  };

  // Submit final assessment
  const handleSubmitQuiz = () => {
    if (!activeAssessment) return;
    const questions = project.questionBank.filter(q => activeAssessment.questionIds.includes(q.id));
    let earned = 0;
    let total = 0;

    questions.forEach(q => {
      total += q.points;
      const userAns = quizAnswers[q.id];
      if (q.type === 'multiple_choice') {
        const correctOpt = q.options?.find(o => o.isCorrect);
        if (correctOpt && userAns === correctOpt.id) earned += q.points;
      } else if (q.type === 'true_false') {
        const expected = q.trueFalseAnswer ? 'true' : 'false';
        if (userAns === expected) earned += q.points;
      } else if (q.type === 'fill_blank') {
        if (userAns && userAns.trim().toLowerCase() === (q.blankAnswer || '').trim().toLowerCase()) {
          earned += q.points;
        }
      }
    });

    const scorePct = total > 0 ? Math.round((earned / total) * 100) : 100;
    setQuizScore(scorePct);
    const passed = scorePct >= activeAssessment.passingScore;
    setIsPassed(passed);

    addScormLog('LMSSetValue', 'cmi.core.score.raw', String(scorePct), 'true');
    addScormLog('LMSSetValue', 'cmi.core.score.min', '0', 'true');
    addScormLog('LMSSetValue', 'cmi.core.score.max', '100', 'true');

    if (passed) {
      addScormLog('LMSSetValue', 'cmi.core.lesson_status', 'passed', 'true');
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch(e) {}
    } else {
      addScormLog('LMSSetValue', 'cmi.core.lesson_status', 'failed', 'true');
    }
    addScormLog('LMSCommit', '""', undefined, 'true');
  };

  // Reset preview state
  const handleReset = () => {
    setCompletedLessons({});
    setQuizAnswers({});
    setQuizScore(null);
    setIsPassed(null);
    setScormLogs([]);
    setSelectedLessonId(allLessons[0]?.lesson.id || '');
    setIsAssessmentActive(false);
    addScormLog('LMSInitialize', '""', undefined, 'true');
  };

  // Device container width styling
  const containerWidthClass = {
    desktop: 'w-full max-w-5xl',
    tablet: 'w-[768px] max-w-full',
    mobile: 'w-[420px] max-w-full'
  }[deviceMode];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Simulation Controls Topbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer ${
                deviceMode === 'desktop' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista Computadora de Escritorio"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Escritorio</span>
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              className={`p-1.5 rounded flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer ${
                deviceMode === 'tablet' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista Tableta (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tableta</span>
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer ${
                deviceMode === 'mobile' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista Móvil (420px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Móvil</span>
            </button>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Reiniciar progreso del alumno y logs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reiniciar Simulación</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              showConsole 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Consola CMI ({scormLogs.length})</span>
          </button>

          <button
            onClick={onOpenBuilder}
            className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
          >
            Volver al Editor
          </button>
        </div>
      </div>

      {/* Main Student Viewport Container */}
      <div className="flex justify-center">
        <div className={`${containerWidthClass} transition-all duration-300 bg-white rounded-2xl border border-slate-300 shadow-lg overflow-hidden flex flex-col min-h-[640px]`}>
          {/* SCORM Course Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {project.title}
              </h2>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>SCORM {project.scormConfig.version}</span>
                <span>·</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Conectado a Moodle API
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="w-28 sm:w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${overallPercent}%` }}
                ></div>
              </div>
              <span className="text-xs font-bold text-slate-700 font-mono tabular-nums">
                {overallPercent}%
              </span>
            </div>
          </div>

          {/* Player Body: Sidebar + Content */}
          <div className="flex flex-col md:flex-row flex-1 min-h-[500px]">
            {/* Student Navigation Sidebar */}
            <div className="w-full md:w-72 bg-slate-50/80 border-r border-slate-200 p-3 overflow-y-auto space-y-3 shrink-0">
              {project.units.map(unit => (
                <div key={unit.id} className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {unit.title}
                  </div>
                  {unit.lessons.map(lesson => {
                    const isSelected = !isAssessmentActive && selectedLessonId === lesson.id;
                    const isDone = !!completedLessons[lesson.id];
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleSelectLesson(lesson.id)}
                        className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'text-slate-700 hover:bg-slate-200/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
                            isDone 
                              ? (isSelected ? 'bg-white text-blue-600 border-white' : 'bg-emerald-600 text-white border-emerald-600')
                              : (isSelected ? 'border-white text-white' : 'border-slate-300 text-slate-400')
                          }`}>
                            {isDone ? '✓' : ''}
                          </span>
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        <span className={`text-[10px] shrink-0 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {lesson.estimatedMinutes}m
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Assessment link */}
              {project.assessments.map(exam => {
                const isSelected = isAssessmentActive && activeAssessmentId === exam.id;
                const isDone = quizScore !== null;
                return (
                  <div key={exam.id} className="pt-2 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setIsAssessmentActive(true);
                        setActiveAssessmentId(exam.id);
                        addScormLog('LMSSetValue', 'cmi.core.lesson_location', `exam_${exam.id}`, 'true');
                      }}
                      className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Award className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                        <span className="truncate">{exam.title}</span>
                      </div>
                      <span className={`text-[10px] font-mono px-1 rounded ${
                        isDone ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400'
                      }`}>
                        {isDone ? `${quizScore}%` : 'Test'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Student Viewport Content Area */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto">
              {!isAssessmentActive && currentLessonData ? (
                /* Lesson view */
                <div className="space-y-6">
                  {/* Lesson header */}
                  <div className="pb-4 border-b border-slate-200">
                    <span className="text-xs text-blue-600 font-medium">{currentLessonData.unitTitle}</span>
                    <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
                      {currentLessonData.lesson.title}
                    </h1>
                    {currentLessonData.lesson.summary && (
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {currentLessonData.lesson.summary}
                      </p>
                    )}
                  </div>

                  {/* Render Lesson Blocks */}
                  <div className="space-y-6">
                    {currentLessonData.lesson.blocks.map(block => {
                      return (
                        <div key={block.id} className="space-y-2">
                          {block.title && (
                            <h3 className="text-sm font-bold text-slate-900">{block.title}</h3>
                          )}

                          {block.type === 'text' && (
                            <div 
                              className="text-xs text-slate-700 leading-relaxed space-y-2"
                              dangerouslySetInnerHTML={{ __html: (block as TextBlock).content }}
                            />
                          )}

                          {block.type === 'callout' && (
                            <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                              (block as CalloutBlock).variant === 'tip'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : (block as CalloutBlock).variant === 'warning'
                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                : 'bg-blue-50 border-blue-200 text-blue-900'
                            }`}>
                              <div className="font-bold mb-1 flex items-center gap-1.5">
                                {(block as CalloutBlock).variant === 'tip' && <span>💡 Consejo didáctico</span>}
                                {(block as CalloutBlock).variant === 'warning' && <span>⚠️ Atención importante</span>}
                                {(block as CalloutBlock).variant === 'info' && <span>ℹ️ Información clave</span>}
                              </div>
                              <div>{(block as CalloutBlock).content}</div>
                            </div>
                          )}

                          {block.type === 'accordion' && (
                            <div className="space-y-2">
                              {(block as AccordionBlock).items.map(item => {
                                const isOpen = !!accordionState[item.id];
                                return (
                                  <div key={item.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                                    <button
                                      onClick={() => setAccordionState(prev => ({ ...prev, [item.id]: !isOpen }))}
                                      className="w-full p-3.5 text-left font-bold text-xs text-slate-800 bg-slate-50 hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors"
                                    >
                                      <span>{item.title}</span>
                                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isOpen && (
                                      <div className="p-4 text-xs text-slate-600 bg-white border-t border-slate-100 leading-relaxed">
                                        {item.content}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {block.type === 'tabs' && (
                            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                              <div className="flex bg-slate-100 border-b border-slate-200 overflow-x-auto">
                                {(block as TabsBlock).tabs.map((tab, tIdx) => {
                                  const activeIndex = tabState[block.id] || 0;
                                  const isTabActive = activeIndex === tIdx;
                                  return (
                                    <button
                                      key={tab.id}
                                      onClick={() => setTabState(prev => ({ ...prev, [block.id]: tIdx }))}
                                      className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                                        isTabActive 
                                          ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-xs' 
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      {tab.label}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="p-4 text-xs text-slate-700 leading-relaxed">
                                {(block as TabsBlock).tabs[tabState[block.id] || 0]?.content}
                              </div>
                            </div>
                          )}

                          {block.type === 'flashcards' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(block as FlashcardsBlock).cards.map(card => {
                                const isFlipped = !!flashcardFlipped[card.id];
                                return (
                                  <div
                                    key={card.id}
                                    onClick={() => setFlashcardFlipped(prev => ({ ...prev, [card.id]: !isFlipped }))}
                                    className={`min-h-[140px] p-5 rounded-xl border text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                                      isFlipped 
                                        ? 'bg-blue-600 text-white border-blue-700 shadow-md rotate-y-180' 
                                        : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
                                    }`}
                                  >
                                    {!isFlipped ? (
                                      <>
                                        <span className="font-bold text-xs text-slate-900 mb-1">{card.front}</span>
                                        {card.hint && (
                                          <span className="text-[11px] text-slate-500">💡 {card.hint}</span>
                                        )}
                                        <span className="text-[10px] text-blue-600 font-semibold mt-3">
                                          Clic para voltear ↺
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="font-medium text-xs leading-relaxed text-blue-50">{card.back}</span>
                                        <span className="text-[10px] text-blue-200 mt-3">
                                          Clic para volver al frente
                                        </span>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {block.type === 'checkpoint' && (
                            (() => {
                              const q = project.questionBank.find(item => item.id === (block as CheckpointBlock).questionId);
                              if (!q) return null;
                              const selectedOpt = checkpointAnswers[q.id];
                              const isChecked = checkpointResults[q.id] !== undefined;

                              return (
                                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                                    <HelpCircle className="w-4 h-4" />
                                    <span>Comprobación Rápida de Aprendizaje</span>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-900">{q.prompt}</p>

                                  <div className="space-y-1.5">
                                    {q.options?.map(opt => {
                                      const isChosen = selectedOpt === opt.id;
                                      return (
                                        <button
                                          key={opt.id}
                                          onClick={() => handleSelectCheckpointOption(q.id, opt.id, opt.isCorrect)}
                                          className={`w-full text-left p-2.5 rounded-lg text-xs border transition-colors flex items-center justify-between cursor-pointer ${
                                            isChosen
                                              ? (opt.isCorrect ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold' : 'bg-rose-100 border-rose-400 text-rose-950')
                                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                          }`}
                                        >
                                          <span>{opt.text}</span>
                                          {isChosen && (opt.isCorrect ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-600" />)}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {isChecked && (
                                    <div className={`p-2.5 rounded-lg text-xs ${
                                      checkpointResults[q.id] ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {checkpointResults[q.id]
                                        ? '¡Correcto! Has asimilado bien este concepto.'
                                        : 'Respuesta incorrecta. Revisa el contenido anterior.'}
                                      {q.explanation && <div className="mt-1 text-[11px] font-normal">{q.explanation}</div>}
                                    </div>
                                  )}
                                </div>
                              );
                            })()
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Navigation footer */}
                  <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                    <button
                      onClick={() => handleCompleteLesson(currentLessonData.lesson.id)}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        completedLessons[currentLessonData.lesson.id]
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{completedLessons[currentLessonData.lesson.id] ? 'Lección Completada' : 'Marcar como Completada'}</span>
                    </button>

                    {allLessons.indexOf(currentLessonData) < allLessons.length - 1 ? (
                      <button
                        onClick={() => {
                          const nextIdx = allLessons.indexOf(currentLessonData) + 1;
                          handleSelectLesson(allLessons[nextIdx].lesson.id);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        <span>Siguiente Lección</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : project.assessments.length > 0 ? (
                      <button
                        onClick={() => {
                          setIsAssessmentActive(true);
                          setActiveAssessmentId(project.assessments[0].id);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                      >
                        <span>Ir a la Evaluación Final</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : isAssessmentActive && activeAssessment ? (
                /* Assessment / Exam View */
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-200">
                    <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Cuestionario Calificado SCORM</span>
                    <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{activeAssessment.title}</h1>
                    <p className="text-xs text-slate-600 mt-1">{activeAssessment.description}</p>
                    <div className="text-[11px] text-slate-500 mt-2">
                      Mínimo requerido para aprobar: <strong className="text-emerald-600">{activeAssessment.passingScore}%</strong>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="space-y-5">
                    {project.questionBank
                      .filter(q => activeAssessment.questionIds.includes(q.id))
                      .map((q, idx) => (
                        <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                          <div className="font-bold text-xs text-slate-900">
                            {idx + 1}. {q.prompt} <span className="font-mono text-slate-400 font-normal">({q.points} pts)</span>
                          </div>

                          {q.type === 'multiple_choice' && (
                            <div className="space-y-1.5">
                              {q.options?.map(opt => (
                                <label key={opt.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`exam_q_${q.id}`}
                                    checked={quizAnswers[q.id] === opt.id}
                                    onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                                    className="text-blue-600"
                                  />
                                  <span>{opt.text}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {q.type === 'true_false' && (
                            <div className="flex gap-3">
                              <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold cursor-pointer">
                                <input
                                  type="radio"
                                  name={`exam_q_${q.id}`}
                                  checked={quizAnswers[q.id] === 'true'}
                                  onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: 'true' }))}
                                  className="text-blue-600"
                                />
                                <span>Verdadero</span>
                              </label>
                              <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold cursor-pointer">
                                <input
                                  type="radio"
                                  name={`exam_q_${q.id}`}
                                  checked={quizAnswers[q.id] === 'false'}
                                  onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: 'false' }))}
                                  className="text-blue-600"
                                />
                                <span>Falso</span>
                              </label>
                            </div>
                          )}

                          {q.type === 'fill_blank' && (
                            <input
                              type="text"
                              value={quizAnswers[q.id] || ''}
                              onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Escribe tu respuesta..."
                              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50"
                            />
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Submission and score card */}
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button
                      onClick={handleSubmitQuiz}
                      className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      Enviar Respuestas y Calificar en Moodle
                    </button>

                    {quizScore !== null && (
                      <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                        isPassed 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                          : 'bg-rose-50 border-rose-300 text-rose-800'
                      }`}>
                        {isPassed ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
                        <span>
                          {isPassed ? `¡Aprobado con éxito! Calificación: ${quizScore}%` : `Reprobado con ${quizScore}% (requerido ${activeAssessment.passingScore}%)`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Floating SCORM CMI Console Drawer */}
      {showConsole && (
        <div className="bg-slate-900 text-slate-200 rounded-xl border border-slate-800 p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-xs text-white">Consola de Depuración SCORM API (Moodle Communication Monitor)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScormLogs([])}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Limpiar
              </button>
              <button
                onClick={() => setShowConsole(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto pr-1">
            {scormLogs.length === 0 ? (
              <span className="text-slate-500 italic">Esperando interacción del estudiante...</span>
            ) : (
              scormLogs.map(log => (
                <div key={log.id} className="flex items-center gap-2 py-0.5 border-b border-slate-800/40">
                  <span className="text-slate-500">{log.time}</span>
                  <span className="text-blue-400 font-semibold">{log.command}</span>
                  <span className="text-slate-300">({log.element}{log.value !== undefined ? `, "${log.value}"` : ''})</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-emerald-400 font-bold">{log.result}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
