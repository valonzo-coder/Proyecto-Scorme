import {
  CourseProject,
  CourseLesson,
  CoursePage,
  LessonNavigationConfig,
  PageNavigationRule,
  PageRuntimeProgress,
  QuestionItem,
  ResourceBlock,
  StudentProgressState
} from '../types/scorm';

export interface EngineInteractiveTarget {
  blockId: string;
  blockTitle: string;
  blockType: 'flashcards' | 'accordion' | 'tabs';
  items: { id: string; label: string }[];
}

export interface EngineConditionEvaluationResult {
  met: boolean;
  label: string;
  instruction: string;
  completedMessage: string;
  progressText?: string;
  progressPercent?: number;
  configError?: string;
}

export interface NavigationEngineInstance {
  DEFAULT_LESSON_NAV_CONFIG: LessonNavigationConfig;
  DEFAULT_PAGE_NAV_RULE: PageNavigationRule;
  createEmptyPageRuntime(): PageRuntimeProgress;
  getPageInteractiveTargets(page: CoursePage): EngineInteractiveTarget[];
  getPageResourceBlocks(page: CoursePage): ResourceBlock[];
  getPageCheckpointQuestionIds(page: CoursePage): string[];
  isQuestionAutoGradable(q: QuestionItem | null | undefined): boolean;
  isQuestionValid(q: QuestionItem | null | undefined): boolean;
  hasValidAnswer(q: QuestionItem | null | undefined, answer: any): boolean;
  evaluateQuestionAnswer(q: QuestionItem | null | undefined, answer: any): boolean;
  evaluatePageCondition(
    page: CoursePage,
    runtimeInput: PageRuntimeProgress | undefined,
    project: CourseProject
  ): EngineConditionEvaluationResult;
  canJumpToPage(
    lesson: CourseLesson,
    targetIndex: number,
    currentIndex: number,
    pagesRuntime: Record<string, PageRuntimeProgress>
  ): { allowed: boolean; reason?: string };
  isLessonReadyForCompletion(
    lesson: CourseLesson,
    pagesRuntime: Record<string, PageRuntimeProgress>,
    project: CourseProject
  ): { ready: boolean; pendingPageTitles: string[] };
  utf8ByteLength(str: string): number;
  serializeSuspendData(state: StudentProgressState, project: CourseProject): string;
  deserializeSuspendData(
    suspendStr: string | null | undefined,
    lessonLocation: string | null | undefined,
    project: CourseProject
  ): StudentProgressState;
}

export declare function initNavigationEngine(): NavigationEngineInstance;
