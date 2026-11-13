import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  Terminal,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Award,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Check,
  X,
  Download,
  FileDown,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  AlertCircle,
  CheckSquare,
  Square,
  GraduationCap,
  ListOrdered
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  CourseProject,
  CourseLesson,
  CoursePage,
  TextBlock,
  CalloutBlock,
  AccordionBlock,
  TabsBlock,
  FlashcardsBlock,
  CheckpointBlock,
  MediaBlock,
  MathBlock,
  ResourceBlock,
  PageRuntimeProgress,
  StudentProgressState,
  QuestionItem
} from '../../types/scorm';
import { MediaService } from '../../services/mediaService';
import { MathService } from '../../services/mathService';
import { CategoryService } from '../../services/categoryService';
import {
  NavigationService,
  DEFAULT_LESSON_NAV_CONFIG,
  createEmptyPageRuntime
} from '../../services/navigationService';
import { SafeRichContent } from '../questions/SafeRichContent';

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

const PREVIEW_SUSPEND_PREFIX = 'edubuilder_preview_suspend_';
const PREVIEW_SIDEBAR_PREF_KEY = 'edubuilder_preview_sidebar_open';

export const StudentPlayerPreview: React.FC<StudentPlayerPreviewProps> = ({
  project,
  onOpenBuilder
}) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem(PREVIEW_SIDEBAR_PREF_KEY);
      if (saved !== null) return saved === 'false';
    } catch (e) {}
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return true;
    }
    return false;
  });

  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    project.units.forEach(u => {
      map[u.id] = true;
    });
    return map;
  });

  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    project.units.forEach(u =>
      u.lessons.forEach(l => {
        map[l.id] = true;
      })
    );
    return map;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(PREVIEW_SIDEBAR_PREF_KEY, String(!isSidebarCollapsed));
    } catch (e) {}
  }, [isSidebarCollapsed]);

  // Flattened lessons list
  const allLessons: { unitTitle: string; lesson: CourseLesson }[] = [];
  project.units.forEach(u => {
    u.lessons.forEach(l => {
      allLessons.push({ unitTitle: u.title, lesson: l });
    });
  });

  const isScorm2004 = project.scormConfig.version.startsWith('2004');
  const suspendStorageKey = `${PREVIEW_SUSPEND_PREFIX}${project.id}`;

  // Initial state restoration from simulated LMS suspend_data
  const [progressState, setProgressState] = useState<StudentProgressState>(() => {
    try {
      const savedSuspend = sessionStorage.getItem(suspendStorageKey);
      const savedLoc = sessionStorage.getItem(`${suspendStorageKey}_loc`);
      if (savedSuspend || savedLoc) {
        return NavigationService.deserializeSuspendData(savedSuspend, savedLoc, project);
      }
    } catch (e) {}
    return NavigationService.deserializeSuspendData(null, null, project);
  });

  const [isAssessmentActive, setIsAssessmentActive] = useState(false);
  const [isCourseCompletedView, setIsCourseCompletedView] = useState(false);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string>(
    project.assessments[0]?.id || ''
  );

  // Local UI state for blocks (open accordion items, active tab, flipped card visuals)
  const [accordionState, setAccordionState] = useState<Record<string, boolean>>({});
  const [tabState, setTabState] = useState<Record<string, number>>({});
  const [flashcardFlipped, setFlashcardFlipped] = useState<Record<string, boolean>>({});
  const [navNotice, setNavNotice] = useState<string | null>(null);

  // Assessment Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [isPassed, setIsPassed] = useState<boolean | null>(null);
  const [assessmentSubmitted, setAssessmentSubmitted] = useState<boolean>(false);
  const [shuffleSeed, setShuffleSeed] = useState<number>(1);

  // Controlled checkpoint draft state per questionId
  const [draftBlank, setDraftBlank] = useState<Record<string, string>>({});
  const [draftMulti, setDraftMulti] = useState<Record<string, string[]>>({});
  const [draftMatch, setDraftMatch] = useState<Record<string, Record<string, string>>>({});

  // SCORM CMI Logs console
  const [scormLogs, setScormLogs] = useState<ScormLog[]>([]);
  const [showConsole, setShowConsole] = useState(true);
  const [, setMediaRevision] = useState<number>(() => MediaService.getRevision());

  useEffect(() => {
    return MediaService.subscribe(() => {
      setMediaRevision(MediaService.getRevision());
    });
  }, []);

  const contentScrollRef = useRef<HTMLDivElement>(null);

  const currentLessonData =
    allLessons.find(item => item.lesson.id === progressState.currentLessonId) || allLessons[0];
  const currentLesson = currentLessonData?.lesson;
  const currentPages = currentLesson?.pages || [];
  const currentPageIndex = Math.max(
    0,
    currentPages.findIndex(p => p.id === progressState.currentPageId)
  );
  const currentPage: CoursePage | undefined = currentPages[currentPageIndex] || currentPages[0];
  const lessonNav = currentLesson?.navigationConfig || DEFAULT_LESSON_NAV_CONFIG;

  const activeAssessment =
    project.assessments.find(a => a.id === activeAssessmentId) || project.assessments[0];

  const totalLessons = allLessons.length;
  const completedCount = Object.keys(progressState.completedLessons).filter(
    k => progressState.completedLessons[k]
  ).length;
  const overallPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // SCORM Logger helper
  const addScormLog = useCallback(
    (command: string, element: string, value?: string, result: string = 'true') => {
      const entry: ScormLog = {
        id: `log-${Date.now()}-${Math.random().toString().slice(-4)}`,
        time: new Date().toLocaleTimeString(),
        command,
        element,
        value,
        result
      };
      setScormLogs(prev => [entry, ...prev.slice(0, 49)]);
    },
    []
  );

  // Persist progress state into simulated LMS suspend_data & lesson_location
  const syncScormState = useCallback(
    (nextState: StudentProgressState, logSync: boolean = true) => {
      const suspendStr = NavigationService.serializeSuspendData(nextState, project);
      const locStr = `${nextState.currentLessonId}|${nextState.currentPageId}`;

      try {
        sessionStorage.setItem(suspendStorageKey, suspendStr);
        sessionStorage.setItem(`${suspendStorageKey}_loc`, locStr);
      } catch (e) {}

      if (logSync) {
        if (isScorm2004) {
          addScormLog('SetValue', 'cmi.location', locStr, 'true');
          addScormLog('SetValue', 'cmi.suspend_data', `${suspendStr.length} chars`, 'true');
          addScormLog('Commit', '""', undefined, 'true');
        } else {
          addScormLog('LMSSetValue', 'cmi.core.lesson_location', locStr, 'true');
          addScormLog('LMSSetValue', 'cmi.suspend_data', `${suspendStr.length}/4096 chars`, 'true');
          addScormLog('LMSCommit', '""', undefined, 'true');
        }
      }
    },
    [project, suspendStorageKey, isScorm2004, addScormLog]
  );

  // Initial LMS initialization log
  useEffect(() => {
    const savedAssessmentValues = Object.values(progressState.completedAssessments || {});
    const hasTerminal = savedAssessmentValues.length > 0 || (totalLessons > 0 && completedCount >= totalLessons);
    if (isScorm2004) {
      addScormLog('Initialize', '""', undefined, 'true');
      addScormLog('GetValue', 'cmi.learner_name', undefined, '"Estudiante Moodle"');
      addScormLog('GetValue', 'cmi.completion_status', undefined, hasTerminal ? '"completed"' : '"incomplete"');
    } else {
      addScormLog('LMSInitialize', '""', undefined, 'true');
      addScormLog('LMSGetValue', 'cmi.core.student_name', undefined, '"Estudiante Moodle"');
      const priorStatus = savedAssessmentValues.some(a => a.passed)
        ? 'passed'
        : savedAssessmentValues.length > 0
        ? 'failed'
        : (totalLessons > 0 && completedCount >= totalLessons)
        ? 'completed'
        : 'incomplete';
      addScormLog('LMSGetValue', 'cmi.core.lesson_status', undefined, `"${priorStatus}"`);
      if (!hasTerminal) {
        addScormLog('LMSSetValue', 'cmi.core.lesson_status', 'incomplete', 'true');
      }
    }
  }, [isScorm2004, addScormLog]);

  // Mark current page visited on page change and reset scroll to top
  useEffect(() => {
    if (!currentPage || isAssessmentActive || isCourseCompletedView) return;

    setProgressState(prev => {
      const existing = prev.pages[currentPage.id] || createEmptyPageRuntime();
      if (existing.visited) return prev;
      const updated: StudentProgressState = {
        ...prev,
        pages: {
          ...prev.pages,
          [currentPage.id]: {
            ...existing,
            visited: true
          }
        }
      };
      syncScormState(updated, false);
      return updated;
    });

    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
    setNavNotice(null);
  }, [currentPage?.id, isAssessmentActive, isCourseCompletedView]);

  // Helper to update runtime progress of the active page
  const updateCurrentPageRuntime = (
    updater: (prevRuntime: PageRuntimeProgress) => PageRuntimeProgress,
    logToScorm: boolean = true
  ) => {
    if (!currentPage) return;
    setProgressState(prev => {
      const currentRt = prev.pages[currentPage.id] || createEmptyPageRuntime();
      const updatedRt = updater(currentRt);

      // Evaluate if page condition is now met (note: we don't mark page completed just by visiting if rule isn't met)
      const pageEval = NavigationService.evaluatePageCondition(currentPage, updatedRt, project);
      if (pageEval.met && currentPage.navigationRule?.type !== 'button') {
        updatedRt.completed = true;
      }

      const nextState: StudentProgressState = {
        ...prev,
        pages: {
          ...prev.pages,
          [currentPage.id]: updatedRt
        }
      };
      syncScormState(nextState, logToScorm);
      return nextState;
    });
  };

  // Detect scrolling ONLY on the page content container
  const [isContentScrollable, setIsContentScrollable] = useState(false);

  useEffect(() => {
    const el = contentScrollRef.current;
    if (!el) return;
    const checkOverflow = () => {
      setIsContentScrollable(el.scrollHeight > el.clientHeight + 12);
    };
    checkOverflow();
    const timer = setTimeout(checkOverflow, 150);
    return () => clearTimeout(timer);
  }, [currentPage?.id, deviceMode, isSidebarCollapsed]);

  const handleContentScroll = () => {
    const el = contentScrollRef.current;
    if (!el || !currentPage) return;
    if (currentPage.navigationRule?.type !== 'scrolling') return;

    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 10) return; // Handled via explicit bottom confirmation so opening alone doesn't complete

    const pct = Math.min(100, Math.round((el.scrollTop / maxScroll) * 100));
    const threshold = currentPage.navigationRule.scrollThresholdPercent ?? 95;
    const reachedBottom = pct >= threshold || el.scrollTop + el.clientHeight >= el.scrollHeight - 16;

    const existing = progressState.pages[currentPage.id] || createEmptyPageRuntime();
    if (pct > existing.scrollPercent || (reachedBottom && !existing.scrolledToBottom)) {
      updateCurrentPageRuntime(
        rt => ({
          ...rt,
          scrollPercent: Math.max(rt.scrollPercent, reachedBottom ? 100 : pct),
          scrolledToBottom: rt.scrolledToBottom || reachedBottom
        }),
        reachedBottom && !existing.scrolledToBottom
      );
    }
  };

  const handleConfirmShortScroll = () => {
    updateCurrentPageRuntime(
      rt => ({
        ...rt,
        scrollPercent: 100,
        scrolledToBottom: true,
        completed: true
      }),
      true
    );
  };

  // Handle interactive element engagement (flashcards, accordion, tabs)
  const recordInteraction = (itemId: string) => {
    if (!itemId) return;
    updateCurrentPageRuntime(rt => {
      if (rt.interactedIds.includes(itemId)) return rt;
      return {
        ...rt,
        interactedIds: [...rt.interactedIds, itemId]
      };
    });
  };

  // Handle resource open / explicit confirm
  const handleOpenResource = (blockId: string) => {
    updateCurrentPageRuntime(rt => {
      if (rt.openedResourceIds.includes(blockId)) return rt;
      return {
        ...rt,
        openedResourceIds: [...rt.openedResourceIds, blockId]
      };
    });
  };

  const handleConfirmResource = (blockId: string) => {
    updateCurrentPageRuntime(rt => {
      if (rt.confirmedResourceIds.includes(blockId)) return rt;
      return {
        ...rt,
        confirmedResourceIds: [...rt.confirmedResourceIds, blockId]
      };
    });
  };

  // Handle question answer inside a page (checkpoint or page rule)
  const handleAnswerPageQuestion = (q: QuestionItem, answerValue: any) => {
    if (!currentPage) return;
    const rule = currentPage.navigationRule;
    const currentRt = progressState.pages[currentPage.id] || createEmptyPageRuntime();
    const attemptsUsed = currentRt.questionAttempts?.[q.id] || 0;
    const maxAttempts = rule?.type === 'question' ? (rule.maxAttempts || 0) : 0;

    if (maxAttempts > 0 && attemptsUsed >= maxAttempts) {
      setNavNotice(`Has alcanzado el límite de ${maxAttempts} intentos para esta pregunta.`);
      return;
    }

    if (rule?.type === 'question' && rule.allowRetry === false && attemptsUsed >= 1) {
      setNavNotice('Esta pregunta solo admite un intento.');
      return;
    }

    if (!NavigationService.hasValidAnswer(q, answerValue)) {
      setNavNotice('Completa tu respuesta antes de comprobar.');
      return;
    }

    const isCorrect = NavigationService.evaluateQuestionAnswer(q, answerValue);
    setNavNotice(null);

    addScormLog(
      isScorm2004 ? 'SetValue' : 'LMSSetValue',
      `cmi.interactions.${q.id}.result`,
      isCorrect ? 'correct' : (isScorm2004 ? 'incorrect' : 'wrong'),
      'true'
    );

    updateCurrentPageRuntime(rt => ({
      ...rt,
      questionAnswers: { ...(rt.questionAnswers || {}), [q.id]: answerValue },
      questionCorrect: { ...(rt.questionCorrect || {}), [q.id]: isCorrect },
      questionAttempts: { ...(rt.questionAttempts || {}), [q.id]: (rt.questionAttempts?.[q.id] || 0) + 1 }
    }));
  };

  // Navigate to a specific lesson & page
  const navigateTo = (lessonId: string, pageId?: string) => {
    const targetLessonObj = allLessons.find(item => item.lesson.id === lessonId);
    if (!targetLessonObj) return;
    const targetPageId = pageId || targetLessonObj.lesson.pages[0]?.id || '';

    setIsAssessmentActive(false);
    setIsCourseCompletedView(false);
    setProgressState(prev => {
      const next: StudentProgressState = {
        ...prev,
        currentLessonId: lessonId,
        currentPageId: targetPageId
      };
      syncScormState(next, true);
      return next;
    });
  };

  // Jump within current lesson pages using NavigationService
  const handleJumpToPageIndex = (targetIdx: number) => {
    if (!currentLesson || !currentPages[targetIdx]) return;
    const perm = NavigationService.canJumpToPage(
      currentLesson,
      targetIdx,
      currentPageIndex,
      progressState.pages
    );
    if (!perm.allowed) {
      setNavNotice(perm.reason || 'No puedes saltar a esta página todavía.');
      return;
    }
    navigateTo(currentLesson.id, currentPages[targetIdx].id);
  };

  // Advance with Next button (enforces current page condition!)
  const handleNextPage = () => {
    if (!currentLesson || !currentPage) return;
    const currentRt = progressState.pages[currentPage.id] || createEmptyPageRuntime();
    const evalRes = NavigationService.evaluatePageCondition(currentPage, currentRt, project);

    if (!evalRes.met) {
      setNavNotice(evalRes.instruction);
      return;
    }

    // Mark current page completed when advancing cleanly
    const updatedPages = {
      ...progressState.pages,
      [currentPage.id]: {
        ...currentRt,
        visited: true,
        completed: true
      }
    };

    if (currentPageIndex < currentPages.length - 1) {
      const nextPage = currentPages[currentPageIndex + 1];
      setProgressState(prev => {
        const next: StudentProgressState = {
          ...prev,
          currentPageId: nextPage.id,
          pages: updatedPages
        };
        syncScormState(next, true);
        return next;
      });
    }
  };

  const handlePrevPage = () => {
    if (!currentLesson || !currentPage) return;
    if (!lessonNav.allowBack || currentPage.allowBackOverride === false) {
      setNavNotice('El docente restringió regresar desde esta sección.');
      return;
    }
    if (currentPageIndex > 0) {
      navigateTo(currentLesson.id, currentPages[currentPageIndex - 1].id);
    }
  };

  // Mark lesson completed (validates pending requirements!)
  const handleCompleteLesson = (lesson: CourseLesson) => {
    const check = NavigationService.isLessonReadyForCompletion(
      lesson,
      progressState.pages,
      project
    );

    if (lessonNav.requireCompletionToAdvance && !check.ready) {
      setNavNotice(
        `No se puede completar la lección todavía. Faltan requisitos en: ${check.pendingPageTitles.join(', ')}`
      );
      return;
    }

    // Also mark current page completed if its condition is met
    setProgressState(prev => {
      const nextCompleted = { ...prev.completedLessons, [lesson.id]: true };
      const count = Object.keys(nextCompleted).filter(k => nextCompleted[k]).length;
      const pct = totalLessons > 0 ? Math.round((count / totalLessons) * 100) : 100;

      const curPageRt = currentPage ? prev.pages[currentPage.id] || createEmptyPageRuntime() : null;
      const nextPages = currentPage && curPageRt
        ? { ...prev.pages, [currentPage.id]: { ...curPageRt, completed: true } }
        : prev.pages;

      const nextState: StudentProgressState = {
        ...prev,
        completedLessons: nextCompleted,
        pages: nextPages
      };
      syncScormState(nextState, true);

      if (pct >= 100 && project.assessments.length === 0) {
        addScormLog(
          isScorm2004 ? 'SetValue' : 'LMSSetValue',
          isScorm2004 ? 'cmi.completion_status' : 'cmi.core.lesson_status',
          'completed',
          'true'
        );
      }
      return nextState;
    });
  };

  // Deterministic sort helper for reproducible option/question shuffling
  const seededSort = <T,>(items: T[], seedStr: string, getKey: (item: T) => string): T[] => {
    const hash = (s: string) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };
    return [...items].sort((a, b) => hash(seedStr + ':' + getKey(a)) - hash(seedStr + ':' + getKey(b)));
  };

  // Submit final assessment
  const handleSubmitQuiz = () => {
    if (!activeAssessment) return;
    const prevRecord = progressState.completedAssessments?.[activeAssessment.id];
    const attemptsUsed = prevRecord?.attempts ?? (prevRecord ? 1 : 0);
    if (activeAssessment.maxAttempts > 0 && attemptsUsed >= activeAssessment.maxAttempts) {
      setNavNotice(`Has alcanzado el límite de ${activeAssessment.maxAttempts} intentos en esta evaluación.`);
      return;
    }

    const questions = CategoryService.getAssessmentEffectiveQuestions(activeAssessment, project);
    let earned = 0;
    let total = 0;

    questions.forEach(q => {
      total += q.points;
      const userAns = quizAnswers[q.id];
      if (NavigationService.evaluateQuestionAnswer(q, userAns)) {
        earned += q.points;
      }
    });

    const scorePct = total > 0 ? Math.round((earned / total) * 100) : 100;
    setQuizScore(scorePct);
    const passed = scorePct >= activeAssessment.passingScore;
    setIsPassed(passed);
    setAssessmentSubmitted(true);

    const nextAttempts = attemptsUsed + 1;
    const criteria = project.scormConfig.completionCriteria || 'passed_incomplete';
    const reporting = project.scormConfig.reportingMode || 'score_and_status';

    setProgressState(prev => {
      const nextState: StudentProgressState = {
        ...prev,
        completedAssessments: {
          ...prev.completedAssessments,
          [activeAssessment.id]: { score: scorePct, passed, attempts: nextAttempts }
        }
      };
      syncScormState(nextState, false);
      return nextState;
    });

    if (reporting !== 'status_only') {
      if (isScorm2004) {
        addScormLog('SetValue', 'cmi.score.raw', String(scorePct), 'true');
        addScormLog('SetValue', 'cmi.score.scaled', (scorePct / 100).toFixed(2), 'true');
      } else {
        addScormLog('LMSSetValue', 'cmi.core.score.raw', String(scorePct), 'true');
        addScormLog('LMSSetValue', 'cmi.core.score.min', '0', 'true');
        addScormLog('LMSSetValue', 'cmi.core.score.max', '100', 'true');
      }
    }

    if (reporting !== 'score_only') {
      if (isScorm2004) {
        addScormLog('SetValue', 'cmi.success_status', passed ? 'passed' : 'failed', 'true');
        addScormLog('SetValue', 'cmi.completion_status', 'completed', 'true');
      } else {
        let status12 = passed ? 'passed' : 'failed';
        if (criteria === 'completed_incomplete') status12 = passed ? 'completed' : 'incomplete';
        else if (criteria === 'completed_failed') status12 = passed ? 'completed' : 'failed';
        addScormLog('LMSSetValue', 'cmi.core.lesson_status', status12, 'true');
      }
    }
    addScormLog(isScorm2004 ? 'Commit' : 'LMSCommit', '""', undefined, 'true');

    if (passed) {
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    }
  };

  // Reset simulation
  const handleReset = () => {
    try {
      sessionStorage.removeItem(suspendStorageKey);
      sessionStorage.removeItem(`${suspendStorageKey}_loc`);
    } catch (e) {}
    const fresh = NavigationService.deserializeSuspendData(null, null, project);
    setProgressState(fresh);
    setQuizAnswers({});
    setQuizScore(null);
    setIsPassed(null);
    setAssessmentSubmitted(false);
    setShuffleSeed(s => s + 1);
    setDraftBlank({});
    setDraftMulti({});
    setDraftMatch({});
    setAccordionState({});
    setTabState({});
    setFlashcardFlipped({});
    setScormLogs([]);
    setIsAssessmentActive(false);
    setIsCourseCompletedView(false);
    setNavNotice(null);
    addScormLog(isScorm2004 ? 'Initialize' : 'LMSInitialize', '""', undefined, 'true');
  };

  // Current page evaluation
  const currentRuntime = currentPage
    ? progressState.pages[currentPage.id] || createEmptyPageRuntime()
    : createEmptyPageRuntime();
  const currentConditionEval = currentPage
    ? NavigationService.evaluatePageCondition(currentPage, currentRuntime, project)
    : { met: true, label: 'Botón', instruction: '', completedMessage: '' };

  const currentLessonIndex = allLessons.findIndex(item => item.lesson.id === currentLesson?.id);
  const isLastPageOfLesson = currentPageIndex >= currentPages.length - 1;
  const completedPagesInLesson = currentPages.filter(p => {
    const rt = progressState.pages[p.id];
    return rt?.completed || p.id === currentPage?.id && currentConditionEval.met;
  }).length;
  const lessonProgressPct =
    currentPages.length > 0 ? Math.round((completedPagesInLesson / currentPages.length) * 100) : 100;

  // Check if rule references a question not explicitly placed as a checkpoint block
  const ruleQuestionNotInBlocks =
    currentPage?.navigationRule?.type === 'question' &&
    currentPage.navigationRule.questionId &&
    !currentPage.blocks.some(
      b => b.type === 'checkpoint' && (b as CheckpointBlock).questionId === currentPage.navigationRule.questionId
    )
      ? project.questionBank.find(q => q.id === currentPage.navigationRule.questionId)
      : undefined;

  const containerWidthClass = {
    desktop: 'w-full max-w-6xl',
    tablet: 'w-[768px] max-w-full',
    mobile: 'w-[420px] max-w-full'
  }[deviceMode];

  // Helper to render a page question (used both for checkpoint blocks & implicit rule questions)
  const renderInteractiveQuestion = (q: QuestionItem) => {
    const userAnswer = currentRuntime.questionAnswers?.[q.id];
    const isCorrect = !!currentRuntime.questionCorrect?.[q.id];
    const attempts = currentRuntime.questionAttempts?.[q.id] || 0;
    const isChecked = NavigationService.hasValidAnswer(q, userAnswer) && attempts > 0;
    const rule = currentPage?.navigationRule;
    const showFeedback = rule?.type === 'question' ? rule.showFeedback !== false : true;
    const maxAttempts = rule?.type === 'question' ? rule.maxAttempts || 0 : 0;
    const lockedByAttempts =
      (maxAttempts > 0 && attempts >= maxAttempts) ||
      (rule?.type === 'question' && rule.allowRetry === false && attempts >= 1);

    const currentMultiDraft: string[] = draftMulti[q.id] ?? (Array.isArray(userAnswer) ? userAnswer : []);
    const currentBlankDraft: string = draftBlank[q.id] ?? (typeof userAnswer === 'string' ? userAnswer : '');
    const currentMatchDraft: Record<string, string> =
      draftMatch[q.id] ?? (userAnswer && typeof userAnswer === 'object' && !Array.isArray(userAnswer) ? userAnswer : {});
    const shuffledRightOptions = q.matchingPairs
      ? seededSort(q.matchingPairs.map(p => p.right), `chk_${q.id}`, r => r)
      : [];

    return (
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-blue-800">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            <span>Comprobación de Aprendizaje</span>
          </span>
          {maxAttempts > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 bg-white rounded border border-blue-200">
              Intentos: {attempts}/{maxAttempts}
            </span>
          )}
        </div>

        <div className="text-xs font-bold text-slate-900">
          <SafeRichContent html={q.promptHtml} fallbackText={q.prompt} />
        </div>

        {!NavigationService.isQuestionAutoGradable(q) && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            Este tipo de pregunta ({q.type}) no admite autocorrección automática. Edita la página para vincular una pregunta compatible.
          </div>
        )}

        {q.type === 'multiple_choice' && (
          <div className="space-y-1.5">
            {q.options?.map(opt => {
              const isChosen = userAnswer === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={lockedByAttempts}
                  onClick={() => handleAnswerPageQuestion(q, opt.id)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs border transition-colors flex items-center justify-between cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    isChosen
                      ? isCorrect
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold'
                        : 'bg-rose-100 border-rose-400 text-rose-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{opt.text}</span>
                  {isChosen &&
                    (isCorrect ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <X className="w-4 h-4 text-rose-600" />
                    ))}
                </button>
              );
            })}
          </div>
        )}

        {q.type === 'multiple_response' && (
          <div className="space-y-2">
            <div className="space-y-1.5">
              {q.options?.map(opt => {
                const checked = currentMultiDraft.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg text-xs border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-blue-50 border-blue-400 text-blue-950 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    } ${lockedByAttempts ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      disabled={lockedByAttempts}
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...currentMultiDraft, opt.id]
                          : currentMultiDraft.filter(id => id !== opt.id);
                        setDraftMulti(prev => ({ ...prev, [q.id]: next }));
                      }}
                      className="rounded text-blue-600"
                    />
                    <span>{opt.text}</span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              disabled={lockedByAttempts || currentMultiDraft.length === 0}
              onClick={() => handleAnswerPageQuestion(q, currentMultiDraft)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg cursor-pointer disabled:cursor-not-allowed"
            >
              Comprobar selección
            </button>
          </div>
        )}

        {q.type === 'true_false' && (
          <div className="flex gap-2.5">
            {[
              { val: 'true', label: 'Verdadero' },
              { val: 'false', label: 'Falso' }
            ].map(item => {
              const isChosen = userAnswer === item.val;
              return (
                <button
                  key={item.val}
                  type="button"
                  disabled={lockedByAttempts}
                  onClick={() => handleAnswerPageQuestion(q, item.val)}
                  className={`flex-1 p-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    isChosen
                      ? isCorrect
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                        : 'bg-rose-100 border-rose-400 text-rose-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {(q.type === 'fill_blank' || q.type === 'numerical') && (
          <div className="flex gap-2">
            <input
              type="text"
              inputMode={q.type === 'numerical' ? 'decimal' : 'text'}
              value={currentBlankDraft}
              disabled={lockedByAttempts}
              onChange={(e) => setDraftBlank(prev => ({ ...prev, [q.id]: e.target.value }))}
              placeholder={
                q.type === 'numerical'
                  ? 'Ingresa tu respuesta numérica (ej. 3.14) y presiona Comprobar...'
                  : 'Escribe tu respuesta y presiona Comprobar...'
              }
              className="flex-1 text-xs p-2 border border-slate-300 rounded-lg bg-white disabled:opacity-60 font-mono"
            />
            <button
              type="button"
              disabled={lockedByAttempts || !currentBlankDraft.trim()}
              onClick={() => handleAnswerPageQuestion(q, currentBlankDraft)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg cursor-pointer disabled:cursor-not-allowed"
            >
              Comprobar
            </button>
          </div>
        )}

        {q.type === 'matching' && (
          <div className="space-y-2.5">
            <div className="space-y-2">
              {q.matchingPairs?.map(pair => (
                <div key={pair.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-800">{pair.left}</span>
                  <select
                    disabled={lockedByAttempts}
                    value={currentMatchDraft[pair.id] || ''}
                    onChange={(e) => {
                      const next = { ...currentMatchDraft, [pair.id]: e.target.value };
                      setDraftMatch(prev => ({ ...prev, [q.id]: next }));
                    }}
                    className="text-xs p-2 border border-slate-300 rounded-lg bg-slate-50 disabled:opacity-60"
                  >
                    <option value="">-- Selecciona correspondencia --</option>
                    {shuffledRightOptions.map((rText, idx) => (
                      <option key={`${pair.id}-${idx}`} value={rText}>
                        {rText}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={
                lockedByAttempts ||
                !(q.matchingPairs || []).every(p => (currentMatchDraft[p.id] || '').trim().length > 0)
              }
              onClick={() => handleAnswerPageQuestion(q, currentMatchDraft)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg cursor-pointer disabled:cursor-not-allowed"
            >
              Comprobar emparejamiento
            </button>
          </div>
        )}

        {isChecked && showFeedback && (
          <div
            className={`p-2.5 rounded-lg text-xs ${
              isCorrect ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
            }`}
          >
            <div className="font-bold">
              {isCorrect
                ? '¡Correcto! Has asimilado este concepto.'
                : 'Respuesta incorrecta.'}
            </div>
            {(q.explanationHtml || q.explanation) && (
              <div className="mt-1 text-[11px]">
                <SafeRichContent html={q.explanationHtml} fallbackText={q.explanation} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Simulation Controls Topbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer ${
                deviceMode === 'desktop'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Escritorio</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('tablet')}
              className={`p-1.5 rounded flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer ${
                deviceMode === 'tablet'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tableta</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer ${
                deviceMode === 'mobile'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Móvil</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reiniciar</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
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
            type="button"
            onClick={onOpenBuilder}
            className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
          >
            Volver al Editor
          </button>
        </div>
      </div>

      {/* Main Student Viewport Container */}
      <div className="flex justify-center">
        <div
          className={`${containerWidthClass} transition-all duration-300 bg-white rounded-2xl border border-slate-300 shadow-lg overflow-hidden flex flex-col h-[680px]`}
        >
          {/* SCORM Course Header */}
          <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(c => !c)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
                title={isSidebarCollapsed ? 'Mostrar menú del curso' : 'Contraer menú del curso'}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 truncate">{project.title}</h2>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>SCORM {project.scormConfig.version}</span>
                  <span>·</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Moodle API Activa
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:block text-[11px] text-slate-500 font-medium">
                Curso:
              </div>
              <div className="w-24 sm:w-32 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
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

          {/* Player Body: Collapsible Hierarchical Sidebar + Active Page Viewport */}
          <div className="flex flex-1 min-h-0 overflow-hidden relative">
            {/* Backdrop for Mobile / Phone Simulation Overlay */}
            {!isSidebarCollapsed && (
              <div
                onClick={() => setIsSidebarCollapsed(true)}
                className={`${
                  deviceMode === 'mobile' ? 'block' : 'md:hidden'
                } absolute inset-0 z-30 bg-slate-900/45 backdrop-blur-[1px] transition-opacity`}
                aria-hidden="true"
              />
            )}

            {/* Collapsible Units, Lessons & Pages Sidebar */}
            <aside
              aria-hidden={isSidebarCollapsed}
              className={`bg-slate-50/95 border-r border-slate-200 overflow-hidden flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
                deviceMode === 'mobile'
                  ? `absolute inset-y-0 left-0 z-40 shadow-2xl w-72 max-w-[85%] ${
                      isSidebarCollapsed ? '-translate-x-full pointer-events-none' : 'translate-x-0 pointer-events-auto'
                    }`
                  : `absolute md:static inset-y-0 left-0 z-40 shadow-2xl md:shadow-none ${
                      isSidebarCollapsed
                        ? 'w-72 max-w-[85vw] -translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:border-r-0 pointer-events-none'
                        : 'w-72 max-w-[85vw] translate-x-0 md:w-72 md:opacity-100 pointer-events-auto'
                    }`
              }`}
            >
              <div className="w-72 max-w-full flex flex-col h-full">
                {/* Sidebar Header with Explicit Close Button (important on mobile) */}
                <div className="px-3 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 truncate">
                    Contenido del Curso
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    title="Ocultar menú del curso"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {project.units.map(unit => {
                    const isUnitOpen = expandedUnits[unit.id] !== false;
                    return (
                      <div key={unit.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedUnits(prev => ({ ...prev, [unit.id]: !isUnitOpen }))
                          }
                          className="w-full px-2 py-1.5 rounded-lg hover:bg-slate-200/60 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
                        >
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                            {unit.title}
                          </span>
                          {isUnitOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                        </button>

                        {isUnitOpen && (
                          <div className="space-y-1.5 pl-1">
                            {unit.lessons.map(lesson => {
                              const isSelected =
                                !isAssessmentActive &&
                                !isCourseCompletedView &&
                                currentLesson?.id === lesson.id;
                              const isDone = !!progressState.completedLessons[lesson.id];
                              const isLessonOpen =
                                expandedLessons[lesson.id] !== undefined
                                  ? expandedLessons[lesson.id]
                                  : isSelected;
                              const pages = lesson.pages || [];

                              return (
                                <div key={lesson.id} className="space-y-1">
                                  <div
                                    className={`w-full rounded-lg text-xs flex items-center justify-between gap-1 transition-colors ${
                                      isSelected
                                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                        : 'text-slate-700 hover:bg-slate-200/70'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => navigateTo(lesson.id)}
                                      className="flex-1 text-left p-2 flex items-center gap-2 min-w-0 cursor-pointer"
                                    >
                                      <span
                                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
                                          isDone
                                            ? isSelected
                                              ? 'bg-white text-blue-600 border-white'
                                              : 'bg-emerald-600 text-white border-emerald-600'
                                            : isSelected
                                            ? 'border-white text-white'
                                            : 'border-slate-300 text-slate-400'
                                        }`}
                                      >
                                        {isDone ? '✓' : ''}
                                      </span>
                                      <span className="truncate">{lesson.title}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedLessons(prev => ({
                                          ...prev,
                                          [lesson.id]: !isLessonOpen
                                        }))
                                      }
                                      className={`px-2 py-2 flex items-center gap-1 text-[10px] shrink-0 cursor-pointer ${
                                        isSelected ? 'text-blue-100' : 'text-slate-400 hover:text-slate-700'
                                      }`}
                                      title={isLessonOpen ? 'Ocultar páginas' : 'Ver páginas'}
                                    >
                                      <span>{pages.length} pág</span>
                                      {isLessonOpen ? (
                                        <ChevronDown className="w-3 h-3" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>

                                  {/* Nested Pages / Sections */}
                                  {isLessonOpen && pages.length > 0 && (
                                    <div className="pl-4 space-y-0.5 border-l border-slate-200 ml-3">
                                      {pages.map((p, pIdx) => {
                                        const isPageActive =
                                          !isAssessmentActive &&
                                          !isCourseCompletedView &&
                                          currentPage?.id === p.id;
                                        const isPageDone = !!progressState.pages[p.id]?.completed;
                                        const canJump =
                                          lesson.id === currentLesson?.id
                                            ? NavigationService.canJumpToPage(
                                                lesson,
                                                pIdx,
                                                currentPageIndex,
                                                progressState.pages
                                              )
                                            : NavigationService.canJumpToPage(
                                                lesson,
                                                pIdx,
                                                0,
                                                progressState.pages
                                              );

                                        return (
                                          <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                              if (lesson.id === currentLesson?.id) {
                                                handleJumpToPageIndex(pIdx);
                                              } else if (canJump.allowed) {
                                                navigateTo(lesson.id, p.id);
                                              } else {
                                                setNavNotice(
                                                  canJump.reason ||
                                                    'Completa las páginas anteriores primero.'
                                                );
                                              }
                                            }}
                                            title={canJump.allowed ? p.title : canJump.reason}
                                            className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                                              isPageActive
                                                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                                                : isPageDone
                                                ? 'text-emerald-800 hover:bg-emerald-50'
                                                : canJump.allowed
                                                ? 'text-slate-600 hover:bg-slate-200/60'
                                                : 'text-slate-400 opacity-75'
                                            }`}
                                          >
                                            <span className="flex items-center gap-1.5 min-w-0">
                                              <span className="font-mono text-[10px] opacity-70 shrink-0">
                                                {pIdx + 1}.
                                              </span>
                                              <span className="truncate">{p.title}</span>
                                            </span>
                                            {isPageDone ? (
                                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                            ) : !canJump.allowed && !isPageActive ? (
                                              <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                            ) : null}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Assessment links */}
                  {project.assessments.map(exam => {
                    const isSelected = isAssessmentActive && activeAssessmentId === exam.id;
                    const savedExam = progressState.completedAssessments[exam.id];
                    return (
                      <div key={exam.id} className="pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAssessmentActive(true);
                            setIsCourseCompletedView(false);
                            setActiveAssessmentId(exam.id);
                            addScormLog(
                              isScorm2004 ? 'SetValue' : 'LMSSetValue',
                              isScorm2004 ? 'cmi.location' : 'cmi.core.lesson_location',
                              `exam_${exam.id}`,
                              'true'
                            );
                          }}
                          className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 font-semibold'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Award
                              className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-amber-500'}`}
                            />
                            <span className="truncate">{exam.title}</span>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-1 rounded ${
                              savedExam ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400'
                            }`}
                          >
                            {savedExam ? `${savedExam.score}%` : 'Test'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Right Main Viewport: Fixed Header + Isolated Scrollable Page Content + Fixed Footer Nav */}
            <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden transition-all duration-300">
              {!isAssessmentActive && !isCourseCompletedView && currentLessonData && currentPage ? (
                <>
                  {/* Lesson & Page Top Header + Optional Page Index */}
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 shrink-0 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-blue-600 truncate">
                          {currentLessonData.unitTitle} · {currentLesson.title}
                        </div>
                        <h1 className="text-lg font-extrabold text-slate-900 truncate mt-0.5">
                          {currentPage.title}
                        </h1>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-[11px] font-bold text-slate-700">
                            Página {currentPageIndex + 1} de {currentPages.length}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Progreso lección: {lessonProgressPct}%
                          </div>
                        </div>
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${lessonProgressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Page Index Bar (Controlled by lessonNav.showPageIndex & mode) */}
                    {lessonNav.showPageIndex && currentPages.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                        <ListOrdered className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
                        {currentPages.map((p, idx) => {
                          const isActive = p.id === currentPage.id;
                          const isCompleted = !!progressState.pages[p.id]?.completed;
                          const perm = NavigationService.canJumpToPage(
                            currentLesson,
                            idx,
                            currentPageIndex,
                            progressState.pages
                          );

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleJumpToPageIndex(idx)}
                              title={perm.allowed ? p.title : perm.reason}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap border transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : isCompleted
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : perm.allowed
                                  ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 opacity-75'
                              }`}
                            >
                              {!perm.allowed && !isActive && <Lock className="w-3 h-3" />}
                              {isCompleted && !isActive && <Check className="w-3 h-3 text-emerald-600" />}
                              <span>
                                {idx + 1}. {p.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ISOLATED SCROLLABLE PAGE CONTENT AREA (exclusively renders currentPage.blocks!) */}
                  <div
                    ref={contentScrollRef}
                    onScroll={handleContentScroll}
                    className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6"
                  >
                    {currentPage.blocks.map(block => (
                      <div key={block.id} className="space-y-2">
                        {block.title && (
                          <h3 className="text-sm font-bold text-slate-900">{block.title}</h3>
                        )}

                        {block.type === 'text' && (
                          <div
                            className="rich-content text-xs text-slate-800 leading-relaxed space-y-2"
                            dangerouslySetInnerHTML={{
                              __html: MathService.renderFormulasInHtml(
                                MediaService.hydrateRichHtmlForDisplay((block as TextBlock).content)
                              )
                            }}
                          />
                        )}

                        {block.type === 'callout' &&
                          (() => {
                            const v = (block as CalloutBlock).variant;
                            const variantConfig: Record<
                              string,
                              { bg: string; border: string; text: string; label: string; icon: string }
                            > = {
                              tip: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-950', label: 'Consejo Práctico', icon: '💡' },
                              warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-950', label: 'Advertencia Importante', icon: '⚠️' },
                              info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-950', label: 'Información Clave', icon: 'ℹ️' },
                              definition: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-950', label: 'Definición Teórica', icon: '📖' },
                              example: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-950', label: 'Ejemplo Resuelto', icon: '🔍' },
                              activity: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-950', label: 'Actividad de Aplicación', icon: '⚡' },
                              reflection: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-950', label: 'Pregunta de Reflexión', icon: '🤔' }
                            };
                            const cfg = variantConfig[v] || variantConfig.info;

                            return (
                              <div
                                className={`p-4 rounded-xl border text-xs leading-relaxed ${cfg.bg} ${cfg.border} ${cfg.text} shadow-2xs`}
                              >
                                <div className="font-bold mb-1.5 flex items-center gap-1.5 text-xs">
                                  <span>{cfg.icon}</span>
                                  <span>{cfg.label}</span>
                                </div>
                                <div
                                  className="leading-relaxed"
                                  dangerouslySetInnerHTML={{
                                    __html: MathService.renderFormulasInHtml(
                                      MediaService.hydrateRichHtmlForDisplay((block as CalloutBlock).content)
                                    )
                                  }}
                                />
                              </div>
                            );
                          })()}

                        {block.type === 'accordion' && (
                          <div className="space-y-2">
                            {(block as AccordionBlock).items.map(item => {
                              const isOpen = !!accordionState[item.id];
                              const wasInteracted = currentRuntime.interactedIds.includes(item.id);
                              return (
                                <div
                                  key={item.id}
                                  className={`rounded-xl border overflow-hidden bg-white ${
                                    wasInteracted ? 'border-emerald-300' : 'border-slate-200'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAccordionState(prev => ({ ...prev, [item.id]: !isOpen }));
                                      recordInteraction(item.id);
                                    }}
                                    className="w-full p-3.5 text-left font-bold text-xs text-slate-800 bg-slate-50 hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      {wasInteracted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                                      {item.title}
                                    </span>
                                    <ChevronDown
                                      className={`w-4 h-4 text-slate-400 transition-transform ${
                                        isOpen ? 'rotate-180' : ''
                                      }`}
                                    />
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
                                const wasInteracted = currentRuntime.interactedIds.includes(tab.id);
                                return (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                      setTabState(prev => ({ ...prev, [block.id]: tIdx }));
                                      recordInteraction(tab.id);
                                    }}
                                    className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                                      isTabActive
                                        ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    {wasInteracted && <Check className="w-3 h-3 text-emerald-600" />}
                                    <span>{tab.label}</span>
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
                              const wasInteracted = currentRuntime.interactedIds.includes(card.id);
                              return (
                                <div
                                  key={card.id}
                                  onClick={() => {
                                    setFlashcardFlipped(prev => ({ ...prev, [card.id]: !isFlipped }));
                                    recordInteraction(card.id);
                                  }}
                                  className={`min-h-[140px] p-5 rounded-xl border text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative ${
                                    isFlipped
                                      ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                                      : wasInteracted
                                      ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                                      : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
                                  }`}
                                >
                                  {wasInteracted && (
                                    <span
                                      className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                        isFlipped ? 'bg-blue-500 text-white' : 'bg-emerald-100 text-emerald-700'
                                      }`}
                                    >
                                      ✓ Explorada
                                    </span>
                                  )}
                                  {!isFlipped ? (
                                    <>
                                      <span className="font-bold text-xs text-slate-900 mb-1">
                                        {card.front}
                                      </span>
                                      {card.hint && (
                                        <span className="text-[11px] text-slate-500">
                                          💡 {card.hint}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-blue-600 font-semibold mt-3">
                                        Clic para voltear ↺
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-medium text-xs leading-relaxed text-blue-50">
                                        {card.back}
                                      </span>
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

                        {block.type === 'checkpoint' &&
                          (() => {
                            const q = project.questionBank.find(
                              item => item.id === (block as CheckpointBlock).questionId
                            );
                            return q ? renderInteractiveQuestion(q) : null;
                          })()}

                        {block.type === 'media' &&
                          (() => {
                            const mb = block as MediaBlock;
                            return (
                              <div className="my-4 text-center">
                                {mb.mediaType === 'image' && (
                                  <div>
                                    {mb.url ? (
                                      <img
                                        src={MediaService.resolveMediaUrl(mb.url)}
                                        alt={mb.altText || ''}
                                        className="max-w-full rounded-xl mx-auto shadow-xs border border-slate-200"
                                      />
                                    ) : (
                                      <div className="p-8 bg-slate-100 rounded-xl text-slate-400 text-xs italic">
                                        Imagen no configurada
                                      </div>
                                    )}
                                  </div>
                                )}
                                {mb.mediaType === 'audio' && (
                                  <div>
                                    {mb.url ? (
                                      <audio
                                        controls
                                        src={MediaService.resolveMediaUrl(mb.url)}
                                        className="w-full"
                                      />
                                    ) : (
                                      <div className="p-6 bg-slate-100 rounded-xl text-slate-400 text-xs italic">
                                        Audio no configurado
                                      </div>
                                    )}
                                  </div>
                                )}
                                {mb.mediaType === 'video_file' && (
                                  <div>
                                    {mb.url ? (
                                      <video
                                        controls
                                        src={MediaService.resolveMediaUrl(mb.url)}
                                        className="w-full max-h-[380px] rounded-xl bg-black border border-slate-200"
                                      />
                                    ) : (
                                      <div className="p-8 bg-slate-100 rounded-xl text-slate-400 text-xs italic">
                                        Video local no configurado
                                      </div>
                                    )}
                                  </div>
                                )}
                                {mb.mediaType === 'video_embed' && (
                                  <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-xl shadow-xs border border-slate-200">
                                    <iframe
                                      src={mb.url}
                                      className="absolute top-0 left-0 w-full h-full border-0"
                                      allowFullScreen
                                      title={mb.caption || 'Video'}
                                    />
                                  </div>
                                )}
                                {mb.caption && (
                                  <p className="text-xs text-slate-500 mt-2 font-medium">
                                    {mb.caption}
                                  </p>
                                )}
                              </div>
                            );
                          })()}

                        {block.type === 'math' && (
                          <div className="my-4 p-5 rounded-xl border border-teal-200 bg-teal-50/30 text-center">
                            <div
                              className="overflow-x-auto py-2 text-slate-900 inline-block max-w-full"
                              dangerouslySetInnerHTML={{
                                __html: MathService.renderLatexToHtml(
                                  (block as MathBlock).latex || '',
                                  (block as MathBlock).displayMode !== false
                                )
                              }}
                            />
                            {(block as MathBlock).caption && (
                              <p className="text-xs text-slate-500 mt-2 font-medium">
                                {(block as MathBlock).caption}
                              </p>
                            )}
                          </div>
                        )}

                        {block.type === 'resource' &&
                          (() => {
                            const rb = block as ResourceBlock;
                            const isOpened = currentRuntime.openedResourceIds.includes(rb.id);
                            const isConfirmed = currentRuntime.confirmedResourceIds.includes(rb.id);
                            const needsConfirm =
                              currentPage.navigationRule?.type === 'resource' &&
                              (currentPage.navigationRule.resourceBlockId === rb.id ||
                                !currentPage.navigationRule.resourceBlockId) &&
                              currentPage.navigationRule.resourceCriteria !== 'open_only';
                            const confirmLabel =
                              currentPage.navigationRule?.resourceCriteria === 'confirm_activity'
                                ? 'Confirmo que completé la actividad relacionada con este recurso'
                                : 'Confirmo que he revisado y comprendido este recurso';

                            return (
                              <div className="my-4 p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                  <div className="flex items-start gap-3">
                                    <div className="p-2.5 bg-purple-100 rounded-lg text-purple-700 shrink-0">
                                      <FileDown className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-900">
                                        {rb.title || rb.filename || 'Material Descargable'}
                                      </h4>
                                      {rb.description && (
                                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                          {rb.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-mono">
                                        <span>{rb.filename || 'Sin archivo'}</span>
                                        {!!rb.fileSize && (
                                          <span>• {Math.round(rb.fileSize / 1024)} KB</span>
                                        )}
                                        {isOpened && (
                                          <span className="text-blue-700 font-sans font-bold">
                                            · Archivo abierto
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {rb.relativePath ? (
                                    <a
                                      href={MediaService.resolveMediaUrl(rb.relativePath)}
                                      download={rb.filename}
                                      onClick={() => handleOpenResource(rb.id)}
                                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer"
                                    >
                                      <Download className="w-4 h-4" />
                                      <span>{isOpened ? 'Volver a abrir' : 'Abrir / Descargar'}</span>
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenResource(rb.id)}
                                      className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-white border border-purple-200 rounded-lg cursor-pointer"
                                    >
                                      Simular apertura de recurso
                                    </button>
                                  )}
                                </div>

                                {/* Explicit Review / Activity Confirmation */}
                                {needsConfirm && (
                                  <div className="pt-2 border-t border-purple-200/70">
                                    <button
                                      type="button"
                                      disabled={!isOpened}
                                      onClick={() => handleConfirmResource(rb.id)}
                                      className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                                        isConfirmed
                                          ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                                          : 'bg-white border-purple-200 text-purple-900 hover:bg-purple-100/50'
                                      }`}
                                    >
                                      {isConfirmed ? (
                                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                                      ) : (
                                        <Square className="w-4 h-4 text-purple-600" />
                                      )}
                                      <span>{confirmLabel}</span>
                                    </button>
                                    {!isOpened && (
                                      <p className="text-[10px] text-purple-700 mt-1">
                                        Primero abre o descarga el archivo para habilitar la confirmación.
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                      </div>
                    ))}

                    {/* Implicit Question Block if rule uses a question not explicitly inserted in page */}
                    {ruleQuestionNotInBlocks && renderInteractiveQuestion(ruleQuestionNotInBlocks)}

                    {/* Short non-scrollable fallback button for SCROLLING condition so opening alone never completes */}
                    {currentPage.navigationRule?.type === 'scrolling' &&
                      !isContentScrollable &&
                      !currentRuntime.scrolledToBottom && (
                        <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 flex items-center justify-between gap-3">
                          <span className="text-xs text-teal-900 font-medium">
                            Has llegado al final de esta lectura breve. Confirma para habilitar el avance.
                          </span>
                          <button
                            type="button"
                            onClick={handleConfirmShortScroll}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shrink-0 cursor-pointer"
                          >
                            Confirmar fin de lectura
                          </button>
                        </div>
                      )}
                  </div>

                  {/* Fixed Condition Prompt & Footer Navigation */}
                  <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 shrink-0 space-y-2.5">
                    {/* Notice if user tried locked action */}
                    {navNotice && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{navNotice}</span>
                      </div>
                    )}

                    {/* Specific Condition Status Banner */}
                    <div
                      className={`px-3.5 py-2 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                        currentConditionEval.configError
                          ? 'bg-rose-50 border-rose-300 text-rose-900'
                          : currentConditionEval.met
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        {currentConditionEval.configError ? (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : currentConditionEval.met ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                        <span>
                          {currentConditionEval.configError
                            ? currentConditionEval.configError
                            : currentConditionEval.met
                            ? currentConditionEval.completedMessage
                            : currentConditionEval.instruction}
                        </span>
                      </div>

                      {currentConditionEval.progressText && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white/80 border border-current/20">
                          {currentConditionEval.progressText}
                        </span>
                      )}
                    </div>

                    {/* Buttons: Anterior / Siguiente / Completar / Siguiente Lección / Evaluación */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={
                          currentPageIndex <= 0 ||
                          !lessonNav.allowBack ||
                          currentPage.allowBackOverride === false
                        }
                        onClick={handlePrevPage}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Anterior</span>
                      </button>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        {!isLastPageOfLesson ? (
                          <button
                            type="button"
                            disabled={!currentConditionEval.met}
                            onClick={handleNextPage}
                            className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                              currentConditionEval.met
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <span>Siguiente</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={!currentConditionEval.met}
                              onClick={() => handleCompleteLesson(currentLesson)}
                              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                                progressState.completedLessons[currentLesson.id]
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-pointer'
                                  : currentConditionEval.met
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>
                                {progressState.completedLessons[currentLesson.id]
                                  ? 'Lección Completada'
                                  : 'Marcar Lección Completada'}
                              </span>
                            </button>

                            {currentLessonIndex < allLessons.length - 1 ? (
                              <button
                                type="button"
                                disabled={!currentConditionEval.met}
                                onClick={() =>
                                  navigateTo(allLessons[currentLessonIndex + 1].lesson.id)
                                }
                                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg ${
                                  currentConditionEval.met
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                <span>Siguiente Lección</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            ) : project.assessments.length > 0 ? (
                              <button
                                type="button"
                                disabled={!currentConditionEval.met}
                                onClick={() => {
                                  setIsAssessmentActive(true);
                                  setActiveAssessmentId(project.assessments[0].id);
                                }}
                                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg ${
                                  currentConditionEval.met
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                <span>Ir a la Evaluación Final</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={!currentConditionEval.met}
                                onClick={() => {
                                  handleCompleteLesson(currentLesson);
                                  setIsCourseCompletedView(true);
                                }}
                                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg ${
                                  currentConditionEval.met
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                <span>Finalizar Curso</span>
                                <GraduationCap className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : isCourseCompletedView ? (
                /* Course Closing View when no final assessment exists */
                <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <GraduationCap className="w-9 h-9" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    ¡Has completado el recorrido del curso!
                  </h2>
                  <p className="text-xs text-slate-600 max-w-md leading-relaxed">
                    Completaste {completedCount} de {totalLessons} lecciones en{' '}
                    <strong>{project.title}</strong>. El estado de finalización ha sido registrado en la API SCORM.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigateTo(allLessons[0]?.lesson.id)}
                    className="px-5 py-2.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl cursor-pointer"
                  >
                    Volver al inicio del curso
                  </button>
                </div>
              ) : isAssessmentActive && activeAssessment ? (
                /* Assessment View */
                (() => {
                  const prevRecord = progressState.completedAssessments?.[activeAssessment.id];
                  const attemptsUsed = prevRecord?.attempts ?? (prevRecord ? 1 : 0);
                  const maxAtt = activeAssessment.maxAttempts || 0;
                  const attemptsExhausted = maxAtt > 0 && attemptsUsed >= maxAtt;
                  const baseQuestions = CategoryService.getAssessmentEffectiveQuestions(
                    activeAssessment,
                    project
                  );
                  const orderedQuestions = activeAssessment.shuffleQuestions
                    ? seededSort(baseQuestions, `q_${shuffleSeed}_${activeAssessment.id}`, q => q.id)
                    : baseQuestions;

                  return (
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                      <div className="pb-4 border-b border-slate-200">
                        <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                          Cuestionario Calificado SCORM
                        </span>
                        <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
                          {activeAssessment.title}
                        </h1>
                        <p className="text-xs text-slate-600 mt-1">{activeAssessment.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-2">
                          <span>
                            Mínimo requerido para aprobar:{' '}
                            <strong className="text-emerald-600">{activeAssessment.passingScore}%</strong>
                          </span>
                          <span>·</span>
                          <span>
                            Intentos:{' '}
                            <strong className="text-slate-700">
                              {maxAtt === 0 ? `${attemptsUsed} (Ilimitados)` : `${attemptsUsed} / ${maxAtt}`}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="space-y-5">
                        {orderedQuestions.map((q, idx) => {
                          const opts = q.options
                            ? (activeAssessment.shuffleOptions
                                ? seededSort(q.options, `opt_${shuffleSeed}_${q.id}`, o => o.id)
                                : q.options)
                            : [];
                          const rightOptions = q.matchingPairs
                            ? seededSort(q.matchingPairs.map(p => p.right), `match_${shuffleSeed}_${q.id}`, r => r)
                            : [];
                          const multiSel: string[] = Array.isArray(quizAnswers[q.id]) ? quizAnswers[q.id] : [];
                          const matchSel: Record<string, string> =
                            quizAnswers[q.id] && typeof quizAnswers[q.id] === 'object' && !Array.isArray(quizAnswers[q.id])
                              ? quizAnswers[q.id]
                              : {};
                          const isQCorrect = assessmentSubmitted
                            ? NavigationService.evaluateQuestionAnswer(q, quizAnswers[q.id])
                            : null;

                          return (
                            <div
                              key={q.id}
                              className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
                            >
                              <div className="font-bold text-xs text-slate-900 flex items-start gap-2">
                                <span className="text-slate-500 font-mono shrink-0">{idx + 1}.</span>
                                <div className="flex-1 min-w-0">
                                  <SafeRichContent html={q.promptHtml} fallbackText={q.prompt} />
                                </div>
                                <span className="font-mono text-slate-400 font-normal shrink-0">
                                  ({q.points} pts)
                                </span>
                              </div>

                              {q.type === 'multiple_choice' && (
                                <div className="space-y-1.5">
                                  {opts.map(opt => (
                                    <label
                                      key={opt.id}
                                      className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs cursor-pointer"
                                    >
                                      <input
                                        type="radio"
                                        disabled={attemptsExhausted}
                                        name={`exam_q_${q.id}`}
                                        checked={quizAnswers[q.id] === opt.id}
                                        onChange={() =>
                                          setQuizAnswers(prev => ({ ...prev, [q.id]: opt.id }))
                                        }
                                        className="text-blue-600"
                                      />
                                      <span>{opt.text}</span>
                                    </label>
                                  ))}
                                </div>
                              )}

                              {q.type === 'multiple_response' && (
                                <div className="space-y-1.5">
                                  {opts.map(opt => {
                                    const checked = multiSel.includes(opt.id);
                                    return (
                                      <label
                                        key={opt.id}
                                        className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          disabled={attemptsExhausted}
                                          checked={checked}
                                          onChange={(e) => {
                                            const next = e.target.checked
                                              ? [...multiSel, opt.id]
                                              : multiSel.filter(id => id !== opt.id);
                                            setQuizAnswers(prev => ({ ...prev, [q.id]: next }));
                                          }}
                                          className="rounded text-blue-600"
                                        />
                                        <span>{opt.text}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {q.type === 'true_false' && (
                                <div className="flex gap-3">
                                  <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold cursor-pointer">
                                    <input
                                      type="radio"
                                      disabled={attemptsExhausted}
                                      name={`exam_q_${q.id}`}
                                      checked={quizAnswers[q.id] === 'true'}
                                      onChange={() =>
                                        setQuizAnswers(prev => ({ ...prev, [q.id]: 'true' }))
                                      }
                                      className="text-blue-600"
                                    />
                                    <span>Verdadero</span>
                                  </label>
                                  <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold cursor-pointer">
                                    <input
                                      type="radio"
                                      disabled={attemptsExhausted}
                                      name={`exam_q_${q.id}`}
                                      checked={quizAnswers[q.id] === 'false'}
                                      onChange={() =>
                                        setQuizAnswers(prev => ({ ...prev, [q.id]: 'false' }))
                                      }
                                      className="text-blue-600"
                                    />
                                    <span>Falso</span>
                                  </label>
                                </div>
                              )}

                              {(q.type === 'fill_blank' || q.type === 'numerical') && (
                                <input
                                  type="text"
                                  inputMode={q.type === 'numerical' ? 'decimal' : 'text'}
                                  disabled={attemptsExhausted}
                                  value={quizAnswers[q.id] || ''}
                                  onChange={(e) =>
                                    setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))
                                  }
                                  placeholder={
                                    q.type === 'numerical'
                                      ? 'Ingresa tu respuesta numérica (ej. 3.14)...'
                                      : 'Escribe tu respuesta...'
                                  }
                                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50 disabled:opacity-60 font-mono"
                                />
                              )}

                              {q.type === 'matching' && (
                                <div className="space-y-2">
                                  {q.matchingPairs?.map(pair => (
                                    <div key={pair.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                                      <span className="text-xs font-semibold text-slate-800">{pair.left}</span>
                                      <select
                                        disabled={attemptsExhausted}
                                        value={matchSel[pair.id] || ''}
                                        onChange={(e) => {
                                          const next = { ...matchSel, [pair.id]: e.target.value };
                                          setQuizAnswers(prev => ({ ...prev, [q.id]: next }));
                                        }}
                                        className="text-xs p-2 border border-slate-300 rounded-lg bg-white disabled:opacity-60"
                                      >
                                        <option value="">-- Selecciona correspondencia --</option>
                                        {rightOptions.map((rText, rIdx) => (
                                          <option key={`${pair.id}-${rIdx}`} value={rText}>
                                            {rText}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {assessmentSubmitted && activeAssessment.showFeedback && (
                                <div
                                  className={`p-2.5 rounded-lg text-xs ${
                                    isQCorrect ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-rose-50 border border-rose-200 text-rose-900'
                                  }`}
                                >
                                  <div className="font-bold">
                                    {isQCorrect ? '✓ Respuesta correcta' : '✕ Respuesta incorrecta'}
                                  </div>
                                  {(q.explanationHtml || q.explanation) && (
                                    <div className="mt-1 text-[11px]">
                                      <SafeRichContent html={q.explanationHtml} fallbackText={q.explanation} />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <button
                          type="button"
                          disabled={attemptsExhausted}
                          onClick={handleSubmitQuiz}
                          className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          {attemptsExhausted
                            ? 'Límite de intentos alcanzado'
                            : 'Enviar Respuestas y Calificar en Moodle'}
                        </button>

                        {quizScore !== null && (
                          <div
                            className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                              isPassed
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-rose-50 border-rose-300 text-rose-800'
                            }`}
                          >
                            {isPassed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-rose-600" />
                            )}
                            <span>
                              {isPassed
                                ? `¡Aprobado con éxito! Calificación: ${quizScore}%`
                                : `Reprobado con ${quizScore}% (requerido ${activeAssessment.passingScore}%)`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
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
              <span className="font-bold text-xs text-white">
                Consola de Depuración SCORM {project.scormConfig.version} (Moodle Communication Monitor)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScormLogs([])}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => setShowConsole(false)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
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
                <div
                  key={log.id}
                  className="flex items-center gap-2 py-0.5 border-b border-slate-800/40"
                >
                  <span className="text-slate-500">{log.time}</span>
                  <span className="text-blue-400 font-semibold">{log.command}</span>
                  <span className="text-slate-300">
                    ({log.element}
                    {log.value !== undefined ? `, "${log.value}"` : ''})
                  </span>
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
