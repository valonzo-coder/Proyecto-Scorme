import {
  CourseProject,
  CourseUnit,
  CourseLesson,
  CoursePage,
  ContentBlock,
  PageNavigationRule,
  LessonNavigationConfig,
  PageRuntimeProgress,
  StudentProgressState,
  QuestionItem,
  ResourceBlock
} from '../types/scorm';
import {
  initNavigationEngine,
  EngineConditionEvaluationResult,
  EngineInteractiveTarget
} from './navigationEngine.js';
import { CategoryService } from './categoryService';

export type ConditionEvaluationResult = EngineConditionEvaluationResult;
export type InteractiveTarget = EngineInteractiveTarget;

const engine = initNavigationEngine();

export const DEFAULT_LESSON_NAV_CONFIG: LessonNavigationConfig = engine.DEFAULT_LESSON_NAV_CONFIG;

export const DEFAULT_PAGE_NAV_RULE: PageNavigationRule = engine.DEFAULT_PAGE_NAV_RULE;

export function createEmptyPageRuntime(): PageRuntimeProgress {
  return engine.createEmptyPageRuntime();
}

export class NavigationService {
  /**
   * Migrates any legacy project (where CourseLesson had `blocks` instead of `pages`,
   * or where questionCategories / question.categoryId did not yet exist)
   * and validates all navigationRule / navigationConfig fields without losing data.
   */
  static migrateAndNormalizeProject(rawProject: CourseProject): CourseProject {
    const normalizedUnits: CourseUnit[] = (rawProject.units || []).map((unit, uIdx) => {
      const normalizedLessons: CourseLesson[] = (unit.lessons || []).map((lesson, lIdx) => {
        let pages: CoursePage[] = [];

        if (Array.isArray(lesson.pages) && lesson.pages.length > 0) {
          pages = lesson.pages.map((p, pIdx) => ({
            ...p,
            id: p.id || `page-${lesson.id}-${pIdx + 1}`,
            title: p.title || `Página ${pIdx + 1}`,
            order: typeof p.order === 'number' ? p.order : pIdx + 1,
            blocks: Array.isArray(p.blocks) ? p.blocks : [],
            navigationRule:
              p.navigationRule && p.navigationRule.type
                ? p.navigationRule
                : { ...DEFAULT_PAGE_NAV_RULE }
          }));
        } else {
          // Legacy migration: convert lesson.blocks into "Página 1"
          const legacyBlocks: ContentBlock[] = Array.isArray(lesson.blocks) ? lesson.blocks : [];
          pages = [
            {
              id: `page-${lesson.id}-1`,
              title: 'Página 1',
              order: 1,
              blocks: legacyBlocks,
              navigationRule: { ...DEFAULT_PAGE_NAV_RULE }
            }
          ];
        }

        const navConfig: LessonNavigationConfig = {
          ...DEFAULT_LESSON_NAV_CONFIG,
          ...(lesson.navigationConfig || {})
        };

        const { blocks: _removedLegacyBlocks, ...restLesson } = lesson;

        return {
          ...restLesson,
          order: typeof lesson.order === 'number' ? lesson.order : lIdx + 1,
          pages,
          navigationConfig: navConfig
        };
      });

      return {
        ...unit,
        order: typeof unit.order === 'number' ? unit.order : uIdx + 1,
        lessons: normalizedLessons
      };
    });

    const catNorm = CategoryService.normalizeCategoriesAndQuestions(
      rawProject.questionCategories,
      rawProject.questionBank
    );

    return {
      ...rawProject,
      units: normalizedUnits,
      questionCategories: catNorm.categories,
      questionBank: catNorm.questions
    };
  }

  static getPageInteractiveTargets(page: CoursePage): InteractiveTarget[] {
    return engine.getPageInteractiveTargets(page);
  }

  static getPageResourceBlocks(page: CoursePage): ResourceBlock[] {
    return engine.getPageResourceBlocks(page);
  }

  static getPageCheckpointQuestionIds(page: CoursePage): string[] {
    return engine.getPageCheckpointQuestionIds(page);
  }

  static isQuestionAutoGradable(q: QuestionItem | null | undefined): boolean {
    return engine.isQuestionAutoGradable(q);
  }

  static isQuestionValid(q: QuestionItem | null | undefined): boolean {
    return engine.isQuestionValid(q);
  }

  static hasValidAnswer(q: QuestionItem | null | undefined, answer: any): boolean {
    return engine.hasValidAnswer(q, answer);
  }

  static evaluateQuestionAnswer(q: QuestionItem | null | undefined, answer: any): boolean {
    return engine.evaluateQuestionAnswer(q, answer);
  }

  static evaluatePageCondition(
    page: CoursePage,
    runtimeInput: PageRuntimeProgress | undefined,
    project: CourseProject
  ): ConditionEvaluationResult {
    return engine.evaluatePageCondition(page, runtimeInput, project);
  }

  static canJumpToPage(
    lesson: CourseLesson,
    targetIndex: number,
    currentIndex: number,
    pagesRuntime: Record<string, PageRuntimeProgress>
  ): { allowed: boolean; reason?: string } {
    return engine.canJumpToPage(lesson, targetIndex, currentIndex, pagesRuntime);
  }

  static isLessonReadyForCompletion(
    lesson: CourseLesson,
    pagesRuntime: Record<string, PageRuntimeProgress>,
    project: CourseProject
  ): { ready: boolean; pendingPageTitles: string[] } {
    return engine.isLessonReadyForCompletion(lesson, pagesRuntime, project);
  }

  static utf8ByteLength(str: string): number {
    return engine.utf8ByteLength(str);
  }

  static serializeSuspendData(state: StudentProgressState, project: CourseProject): string {
    return engine.serializeSuspendData(state, project);
  }

  static deserializeSuspendData(
    suspendStr: string | null | undefined,
    lessonLocation: string | null | undefined,
    project: CourseProject
  ): StudentProgressState {
    return engine.deserializeSuspendData(suspendStr, lessonLocation, project);
  }
}
