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
  AccordionBlock,
  TabsBlock,
  FlashcardsBlock,
  CheckpointBlock,
  ResourceBlock
} from '../types/scorm';

export interface ConditionEvaluationResult {
  met: boolean;
  label: string;
  instruction: string;
  completedMessage: string;
  progressText?: string;
  progressPercent?: number;
}

export const DEFAULT_LESSON_NAV_CONFIG: LessonNavigationConfig = {
  mode: 'sequential',
  allowBack: true,
  allowSkip: false,
  showPageIndex: true,
  requireCompletionToAdvance: false
};

export const DEFAULT_PAGE_NAV_RULE: PageNavigationRule = {
  type: 'button'
};

export function createEmptyPageRuntime(): PageRuntimeProgress {
  return {
    visited: false,
    completed: false,
    scrollPercent: 0,
    scrolledToBottom: false,
    interactedIds: [],
    openedResourceIds: [],
    confirmedResourceIds: [],
    questionAttempts: {},
    questionAnswers: {},
    questionCorrect: {}
  };
}

export class NavigationService {
  /**
   * Migrates any legacy project (where CourseLesson had `blocks` instead of `pages`)
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
            navigationRule: p.navigationRule && p.navigationRule.type
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

    return {
      ...rawProject,
      units: normalizedUnits
    };
  }

  /**
   * Returns all interactive items (flashcards, accordion items, tab items) inside a page.
   */
  static getPageInteractiveTargets(page: CoursePage): {
    blockId: string;
    blockTitle: string;
    blockType: 'flashcards' | 'accordion' | 'tabs';
    items: { id: string; label: string }[];
  }[] {
    const targets: {
      blockId: string;
      blockTitle: string;
      blockType: 'flashcards' | 'accordion' | 'tabs';
      items: { id: string; label: string }[];
    }[] = [];

    (page.blocks || []).forEach(block => {
      if (block.type === 'flashcards') {
        const fc = block as FlashcardsBlock;
        targets.push({
          blockId: fc.id,
          blockTitle: fc.title || 'Tarjetas Flashcards',
          blockType: 'flashcards',
          items: (fc.cards || []).map((c, idx) => ({
            id: c.id,
            label: c.front || `Tarjeta ${idx + 1}`
          }))
        });
      } else if (block.type === 'accordion') {
        const acc = block as AccordionBlock;
        targets.push({
          blockId: acc.id,
          blockTitle: acc.title || 'Acordeón Desplegable',
          blockType: 'accordion',
          items: (acc.items || []).map((it, idx) => ({
            id: it.id,
            label: it.title || `Elemento ${idx + 1}`
          }))
        });
      } else if (block.type === 'tabs') {
        const tb = block as TabsBlock;
        targets.push({
          blockId: tb.id,
          blockTitle: tb.title || 'Pestañas Interactivas',
          blockType: 'tabs',
          items: (tb.tabs || []).map((t, idx) => ({
            id: t.id,
            label: t.label || `Pestaña ${idx + 1}`
          }))
        });
      }
    });

    return targets;
  }

  /**
   * Returns all resource blocks inside a page.
   */
  static getPageResourceBlocks(page: CoursePage): ResourceBlock[] {
    return (page.blocks || []).filter(b => b.type === 'resource') as ResourceBlock[];
  }

  /**
   * Returns all checkpoint question IDs embedded inside a page.
   */
  static getPageCheckpointQuestionIds(page: CoursePage): string[] {
    return (page.blocks || [])
      .filter(b => b.type === 'checkpoint')
      .map(b => (b as CheckpointBlock).questionId)
      .filter(Boolean);
  }

  /**
   * Evaluates a single PageNavigationRule against the student's runtime progress for that page.
   * Centralized logic used identically by StudentPlayerPreview and ScormGenerator.
   */
  static evaluatePageCondition(
    page: CoursePage,
    runtimeInput: PageRuntimeProgress | undefined,
    project: CourseProject
  ): ConditionEvaluationResult {
    const rule = page.navigationRule || DEFAULT_PAGE_NAV_RULE;
    const runtime = runtimeInput || createEmptyPageRuntime();

    // If primary rule is evaluated
    const primaryResult = this.evaluateSingleRule(rule, page, runtime, project);

    // Future extensibility: combined conditions (AND / OR)
    if (rule.combinator && Array.isArray(rule.secondaryRules) && rule.secondaryRules.length > 0) {
      const secondaryResults = rule.secondaryRules.map(sr =>
        this.evaluateSingleRule(sr, page, runtime, project)
      );
      if (rule.combinator === 'AND') {
        const allMet = primaryResult.met && secondaryResults.every(r => r.met);
        return {
          ...primaryResult,
          met: allMet
        };
      } else {
        const anyMet = primaryResult.met || secondaryResults.some(r => r.met);
        return {
          ...primaryResult,
          met: anyMet
        };
      }
    }

    return primaryResult;
  }

  private static evaluateSingleRule(
    rule: PageNavigationRule,
    page: CoursePage,
    runtime: PageRuntimeProgress,
    project: CourseProject
  ): ConditionEvaluationResult {
    switch (rule.type) {
      case 'scrolling': {
        const pct = Math.min(100, Math.max(0, Math.round(runtime.scrollPercent || 0)));
        const met = !!runtime.scrolledToBottom;
        return {
          met,
          label: 'Lectura completa (Scrolling)',
          instruction: 'Desplázate hasta el final del contenido para continuar.',
          completedMessage: 'Has recorrido todo el contenido de esta sección. Ya puedes continuar.',
          progressText: `${pct}% leído`,
          progressPercent: pct
        };
      }

      case 'question': {
        const pageCheckpointIds = this.getPageCheckpointQuestionIds(page);
        const qId = rule.questionId || pageCheckpointIds[0] || '';
        const question = project.questionBank.find(q => q.id === qId);

        if (!qId || !question) {
          return {
            met: true,
            label: 'Pregunta requerida',
            instruction: 'No hay una pregunta válida asignada; avance habilitado.',
            completedMessage: 'Sin preguntas pendientes.'
          };
        }

        const criteria = rule.questionCriteria || 'correct';
        const attempts = runtime.questionAttempts?.[qId] || 0;
        const hasAnswered = runtime.questionAnswers?.[qId] !== undefined && runtime.questionAnswers?.[qId] !== '';
        const isCorrect = !!runtime.questionCorrect?.[qId];
        const maxAttempts = rule.maxAttempts || 0;

        if (criteria === 'answered') {
          const met = hasAnswered;
          return {
            met,
            label: 'Responder pregunta',
            instruction: 'Responde la pregunta de comprobación para desbloquear la siguiente sección.',
            completedMessage: 'Respuesta registrada. Puedes continuar a la siguiente sección.',
            progressText: met ? 'Respondida' : 'Pendiente de responder'
          };
        }

        // criteria === 'correct'
        const met = isCorrect;
        const attemptsText = maxAttempts > 0 ? ` (Intento ${attempts}/${maxAttempts})` : '';
        return {
          met,
          label: 'Responder correctamente',
          instruction: `Responde correctamente la pregunta para desbloquear la siguiente sección.${attemptsText}`,
          completedMessage: '¡Respuesta correcta! Sección desbloqueada para continuar.',
          progressText: met ? 'Correcta' : hasAnswered ? 'Incorrecta — intenta nuevamente' : 'Pendiente'
        };
      }

      case 'interaction': {
        const targets = this.getPageInteractiveTargets(page);
        const targetBlock = rule.targetBlockId && rule.targetBlockId !== 'any'
          ? targets.find(t => t.blockId === rule.targetBlockId)
          : undefined;

        const candidateItems = targetBlock
          ? targetBlock.items
          : targets.flatMap(t => t.items);

        if (candidateItems.length === 0) {
          return {
            met: true,
            label: 'Interacción requerida',
            instruction: 'No hay elementos interactivos configurados en esta página.',
            completedMessage: 'Avance disponible.'
          };
        }

        const interactedSet = new Set(runtime.interactedIds || []);
        const criteria = rule.interactionCriteria || 'all_items';

        if (criteria === 'any_one') {
          const validCount = candidateItems.filter(it => interactedSet.has(it.id)).length;
          const met = validCount >= 1;
          return {
            met,
            label: 'Interacción con elemento',
            instruction: 'Explora o voltea al menos un elemento interactivo para continuar.',
            completedMessage: 'Interacción completada. Ya puedes avanzar.',
            progressText: `${Math.min(validCount, 1)} de 1 requerido`,
            progressPercent: met ? 100 : 0
          };
        }

        if (criteria === 'specific_count') {
          const required = Math.min(candidateItems.length, Math.max(1, rule.requiredCount || 1));
          const validCount = candidateItems.filter(it => interactedSet.has(it.id)).length;
          const met = validCount >= required;
          const pct = Math.min(100, Math.round((validCount / required) * 100));
          return {
            met,
            label: 'Interacción múltiple',
            instruction: `Interactúa con al menos ${required} elementos (${targetBlock ? targetBlock.blockTitle : 'tarjetas o pestañas'}) antes de continuar.`,
            completedMessage: 'Has explorado los elementos requeridos. Ya puedes continuar.',
            progressText: `${Math.min(validCount, required)} de ${required} explorados`,
            progressPercent: pct
          };
        }

        // all_items OR specific requiredItemIds
        const requiredItems = (rule.requiredItemIds && rule.requiredItemIds.length > 0)
          ? candidateItems.filter(it => rule.requiredItemIds!.includes(it.id))
          : candidateItems;

        const targetPool = requiredItems.length > 0 ? requiredItems : candidateItems;
        const doneCount = targetPool.filter(it => interactedSet.has(it.id)).length;
        const met = doneCount >= targetPool.length;
        const pct = Math.round((doneCount / targetPool.length) * 100);

        return {
          met,
          label: 'Explorar elementos interactivos',
          instruction: 'Voltea o explora todos los elementos requeridos para desbloquear la siguiente sección.',
          completedMessage: 'Todos los elementos han sido explorados. Avance habilitado.',
          progressText: `${doneCount} de ${targetPool.length} completados`,
          progressPercent: pct
        };
      }

      case 'resource': {
        const resources = this.getPageResourceBlocks(page);
        const targetRes = rule.resourceBlockId
          ? resources.find(r => r.id === rule.resourceBlockId)
          : resources[0];

        if (!targetRes) {
          return {
            met: true,
            label: 'Revisión de recurso',
            instruction: 'No hay un archivo adjunto configurado en esta página.',
            completedMessage: 'Avance disponible.'
          };
        }

        const criteria = rule.resourceCriteria || 'confirm_review';
        const isOpened = (runtime.openedResourceIds || []).includes(targetRes.id);
        const isConfirmed = (runtime.confirmedResourceIds || []).includes(targetRes.id);

        if (criteria === 'open_only') {
          return {
            met: isOpened,
            label: 'Abrir recurso',
            instruction: `Abre o descarga el archivo "${targetRes.title || targetRes.filename}" para continuar.`,
            completedMessage: 'Recurso abierto. Ya puedes continuar a la siguiente sección.',
            progressText: isOpened ? 'Archivo abierto' : 'Pendiente de abrir'
          };
        }

        if (criteria === 'confirm_activity') {
          const met = isOpened && isConfirmed;
          return {
            met,
            label: 'Completar actividad del recurso',
            instruction: `Abre el recurso "${targetRes.title || targetRes.filename}" y confirma que realizaste la actividad relacionada para continuar.`,
            completedMessage: 'Actividad confirmada. Ya puedes continuar.',
            progressText: met ? 'Confirmado' : isOpened ? 'Archivo abierto · Falta confirmar realización' : 'Pendiente de abrir y confirmar'
          };
        }

        // confirm_review
        const met = isOpened && isConfirmed;
        return {
          met,
          label: 'Revisar y confirmar recurso',
          instruction: `Abre el recurso "${targetRes.title || targetRes.filename}" y confirma su revisión para continuar.`,
          completedMessage: 'Revisión confirmada por el estudiante. Ya puedes continuar.',
          progressText: met ? 'Revisión confirmada' : isOpened ? 'Archivo abierto · Falta confirmar revisión' : 'Pendiente de abrir y confirmar'
        };
      }

      case 'button':
      default:
        return {
          met: true,
          label: 'Botón Siguiente',
          instruction: 'Presiona Siguiente para continuar.',
          completedMessage: 'Listo para avanzar a la siguiente sección.',
          progressPercent: 100
        };
    }
  }

  /**
   * Determines whether the student is allowed to jump directly to targetPageIndex
   * in the given lesson based on its LessonNavigationConfig and completed pages.
   */
  static canJumpToPage(
    lesson: CourseLesson,
    targetIndex: number,
    currentIndex: number,
    pagesRuntime: Record<string, PageRuntimeProgress>
  ): { allowed: boolean; reason?: string } {
    const config = lesson.navigationConfig || DEFAULT_LESSON_NAV_CONFIG;
    const pages = lesson.pages || [];

    if (targetIndex < 0 || targetIndex >= pages.length) {
      return { allowed: false, reason: 'Página fuera de rango.' };
    }
    if (targetIndex === currentIndex) {
      return { allowed: true };
    }

    // Free mode allows jumping anywhere
    if (config.mode === 'free') {
      return { allowed: true };
    }

    // Backwards check
    if (targetIndex < currentIndex) {
      if (!config.allowBack) {
        return { allowed: false, reason: 'Esta lección no permite retroceder a páginas anteriores.' };
      }
      return { allowed: true };
    }

    // Forward check in sequential / sequential_with_requirements
    if (config.allowSkip) {
      return { allowed: true };
    }

    // Check that all pages prior to targetIndex are completed
    for (let i = 0; i < targetIndex; i++) {
      const p = pages[i];
      const rt = pagesRuntime[p.id];
      if (!rt || !rt.completed) {
        return {
          allowed: false,
          reason: `Completa "${p.title}" antes de avanzar a esta sección.`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Checks if all pages in a lesson have met their requirements / been completed.
   */
  static isLessonReadyForCompletion(
    lesson: CourseLesson,
    pagesRuntime: Record<string, PageRuntimeProgress>,
    project: CourseProject
  ): { ready: boolean; pendingPageTitles: string[] } {
    const pendingPageTitles: string[] = [];
    (lesson.pages || []).forEach(p => {
      const rt = pagesRuntime[p.id];
      const evalRes = this.evaluatePageCondition(p, rt, project);
      if (!evalRes.met) {
        pendingPageTitles.push(p.title);
      }
    });
    return {
      ready: pendingPageTitles.length === 0,
      pendingPageTitles
    };
  }

  /**
   * Serializes student progress cleanly within SCORM 1.2's strict 4096-char suspend_data limit.
   */
  static serializeSuspendData(state: StudentProgressState, project: CourseProject): string {
    // Map page IDs to short numeric indices to keep payload super compact
    const pageIndexMap: Record<string, number> = {};
    const lessonIndexMap: Record<string, number> = {};
    let pCounter = 0;
    let lCounter = 0;

    project.units.forEach(u => {
      u.lessons.forEach(l => {
        lessonIndexMap[l.id] = lCounter++;
        l.pages.forEach(p => {
          pageIndexMap[p.id] = pCounter++;
        });
      });
    });

    const compactPages: Record<string, any> = {};
    Object.entries(state.pages).forEach(([pageId, rt]) => {
      const idx = pageIndexMap[pageId];
      if (idx === undefined) return;
      if (!rt.visited && !rt.completed && rt.interactedIds.length === 0 && Object.keys(rt.questionAnswers).length === 0) {
        return;
      }
      const entry: any = {};
      if (rt.visited) entry.v = 1;
      if (rt.completed) entry.c = 1;
      if (rt.scrolledToBottom) entry.s = 1;
      if (rt.interactedIds.length > 0) entry.i = rt.interactedIds;
      if (rt.openedResourceIds.length > 0) entry.o = rt.openedResourceIds;
      if (rt.confirmedResourceIds.length > 0) entry.f = rt.confirmedResourceIds;
      if (Object.keys(rt.questionAnswers).length > 0) entry.a = rt.questionAnswers;
      if (Object.keys(rt.questionCorrect).length > 0) entry.ok = rt.questionCorrect;
      if (Object.keys(rt.questionAttempts).length > 0) entry.at = rt.questionAttempts;
      compactPages[String(idx)] = entry;
    });

    const payload = {
      v: 2,
      cl: state.currentLessonId,
      cp: state.currentPageId,
      ls: Object.keys(state.completedLessons).filter(k => state.completedLessons[k]),
      as: state.completedAssessments,
      pg: compactPages
    };

    let json = JSON.stringify(payload);
    // Safety guard for SCORM 1.2 4096-char suspend_data limit
    if (json.length > 4000) {
      // Trim non-essential verbose answers if ever approaching 4096
      Object.values(payload.pg).forEach((entry: any) => {
        if (entry.c) {
          delete entry.i;
          delete entry.at;
        }
      });
      json = JSON.stringify(payload);
    }

    return json.slice(0, 4096);
  }

  /**
   * Restores StudentProgressState from SCORM suspend_data and optional lesson_location.
   */
  static deserializeSuspendData(
    suspendStr: string | null | undefined,
    lessonLocation: string | null | undefined,
    project: CourseProject
  ): StudentProgressState {
    const reversePageMap: Record<number, string> = {};
    let pCounter = 0;
    let firstLessonId = '';
    let firstPageId = '';

    project.units.forEach(u => {
      u.lessons.forEach(l => {
        if (!firstLessonId) firstLessonId = l.id;
        l.pages.forEach(p => {
          if (!firstPageId) firstPageId = p.id;
          reversePageMap[pCounter++] = p.id;
        });
      });
    });

    const state: StudentProgressState = {
      currentLessonId: firstLessonId,
      currentPageId: firstPageId,
      completedLessons: {},
      completedAssessments: {},
      pages: {}
    };

    if (lessonLocation && typeof lessonLocation === 'string') {
      if (lessonLocation.includes('|')) {
        const [lId, pId] = lessonLocation.split('|');
        if (lId) state.currentLessonId = lId;
        if (pId) state.currentPageId = pId;
      } else {
        state.currentLessonId = lessonLocation;
      }
    }

    if (!suspendStr) return state;

    try {
      const parsed = JSON.parse(suspendStr);
      if (parsed && parsed.v === 2) {
        if (parsed.cl) state.currentLessonId = parsed.cl;
        if (parsed.cp) state.currentPageId = parsed.cp;
        if (Array.isArray(parsed.ls)) {
          parsed.ls.forEach((lId: string) => {
            state.completedLessons[lId] = true;
          });
        }
        if (parsed.as && typeof parsed.as === 'object') {
          state.completedAssessments = parsed.as;
        }
        if (parsed.pg && typeof parsed.pg === 'object') {
          Object.entries(parsed.pg).forEach(([idxStr, entry]: [string, any]) => {
            const pageId = reversePageMap[Number(idxStr)];
            if (!pageId || !entry) return;
            state.pages[pageId] = {
              visited: !!entry.v,
              completed: !!entry.c,
              scrollPercent: entry.s ? 100 : 0,
              scrolledToBottom: !!entry.s,
              interactedIds: Array.isArray(entry.i) ? entry.i : [],
              openedResourceIds: Array.isArray(entry.o) ? entry.o : [],
              confirmedResourceIds: Array.isArray(entry.f) ? entry.f : [],
              questionAnswers: entry.a || {},
              questionCorrect: entry.ok || {},
              questionAttempts: entry.at || {}
            };
          });
        }
      }
    } catch (e) {
      console.warn('Could not parse suspend_data', e);
    }

    return state;
  }
}
