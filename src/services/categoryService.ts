import {
  CourseProject,
  QuestionCategory,
  QuestionItem,
  QuestionType,
  AssessmentConfig,
  AssessmentQuestionSnapshot
} from '../types/scorm';

export const DEFAULT_CATEGORY_ID = 'cat-uncategorized';
export const DEFAULT_CATEGORY_NAME = 'Sin categorizar';

export const AUTO_GRADABLE_QUESTION_TYPES: QuestionType[] = [
  'multiple_choice',
  'multiple_response',
  'true_false',
  'fill_blank',
  'matching',
  'numerical'
];

export interface CategoryTreeNode {
  category: QuestionCategory;
  children: CategoryTreeNode[];
  depth: number;
  directCount: number;
  recursiveCount: number;
}

export interface DeleteCategoryStrategy {
  questionAction: 'move' | 'delete';
  targetQuestionCategoryId?: string;
  subcategoryAction: 'move' | 'delete';
  targetSubcategoryParentId?: string | null;
}

export function isQuestionAutoGradable(q: Pick<QuestionItem, 'type'> | null | undefined): boolean {
  if (!q) return false;
  return AUTO_GRADABLE_QUESTION_TYPES.includes(q.type);
}

export function getQuestionSupportInfo(q: QuestionItem): {
  status: 'supported' | 'partial' | 'unsupported';
  label: string;
} {
  if (isQuestionAutoGradable(q) && !q.pendingAdaptation) {
    return { status: 'supported', label: 'Compatible con evaluaciones SCORM' };
  }
  if (q.type === 'essay' || q.type === 'description' || q.type === 'cloze') {
    return {
      status: 'partial',
      label:
        q.type === 'essay'
          ? 'Ensayo (revisión docente, no autocorregible en SCORM)'
          : q.type === 'description'
          ? 'Descripción informativa (sin calificación)'
          : 'Cloze (pendiente de adaptación para evaluación SCORM)'
    };
  }
  return { status: 'unsupported', label: 'Tipo no compatible con calificación automática SCORM' };
}

export class CategoryService {
  static createDefaultCategory(now: string = new Date().toISOString()): QuestionCategory {
    return {
      id: DEFAULT_CATEGORY_ID,
      name: DEFAULT_CATEGORY_NAME,
      parentId: null,
      description: 'Categoría predeterminada para reactivos sin clasificación asignada.',
      order: 0,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Ensures a valid, cycle-free category list (always containing "Sin categorizar")
   * and ensures every question references an existing categoryId.
   */
  static normalizeCategoriesAndQuestions(
    rawCategories: QuestionCategory[] | undefined,
    rawQuestions: QuestionItem[] | undefined
  ): { categories: QuestionCategory[]; questions: QuestionItem[] } {
    const now = new Date().toISOString();
    const list: QuestionCategory[] = Array.isArray(rawCategories)
      ? rawCategories.map((c, idx) => ({
          id: c.id || `cat-${idx + 1}`,
          name: (c.name || '').trim() || 'Categoría sin nombre',
          parentId: c.parentId || null,
          description: c.description,
          order: typeof c.order === 'number' ? c.order : idx + 1,
          createdAt: c.createdAt || now,
          updatedAt: c.updatedAt || now,
          moodleOriginalPath: c.moodleOriginalPath
        }))
      : [];

    if (!list.some(c => c.id === DEFAULT_CATEGORY_ID)) {
      list.unshift(this.createDefaultCategory(now));
    }

    const byId = new Map<string, QuestionCategory>();
    for (const c of list) {
      if (!byId.has(c.id)) {
        byId.set(c.id, c);
      }
    }

    // Break any accidental self-links or cycles in parentId
    const sanitizedCategories: QuestionCategory[] = [];
    for (const c of byId.values()) {
      let safeParent = c.parentId;
      if (c.id === DEFAULT_CATEGORY_ID) {
        safeParent = null;
      } else if (safeParent) {
        const visited = new Set<string>([c.id]);
        let cursor: string | null = safeParent;
        while (cursor) {
          if (visited.has(cursor) || !byId.has(cursor)) {
            safeParent = null;
            break;
          }
          visited.add(cursor);
          cursor = byId.get(cursor)?.parentId || null;
        }
      }
      sanitizedCategories.push({ ...c, parentId: safeParent });
    }

    const validIds = new Set(sanitizedCategories.map(c => c.id));
    const sanitizedQuestions: QuestionItem[] = (Array.isArray(rawQuestions) ? rawQuestions : []).map(q => ({
      ...q,
      categoryId: q.categoryId && validIds.has(q.categoryId) ? q.categoryId : DEFAULT_CATEGORY_ID,
      createdAt: q.createdAt || now,
      updatedAt: q.updatedAt || now
    }));

    return {
      categories: sanitizedCategories,
      questions: sanitizedQuestions
    };
  }

  static getDescendantIds(categories: QuestionCategory[], rootId: string): Set<string> {
    const descendants = new Set<string>();
    const queue = [rootId];
    const visited = new Set<string>([rootId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const cat of categories) {
        if (cat.parentId === current && !visited.has(cat.id)) {
          visited.add(cat.id);
          descendants.add(cat.id);
          queue.push(cat.id);
        }
      }
    }
    return descendants;
  }

  static getSubtreeIds(categories: QuestionCategory[], rootId: string): Set<string> {
    const ids = this.getDescendantIds(categories, rootId);
    ids.add(rootId);
    return ids;
  }

  static buildCategoryTree(
    categories: QuestionCategory[],
    questions: QuestionItem[]
  ): CategoryTreeNode[] {
    const directCounts = new Map<string, number>();
    for (const q of questions) {
      const cid = q.categoryId || DEFAULT_CATEGORY_ID;
      directCounts.set(cid, (directCounts.get(cid) || 0) + 1);
    }

    const childrenMap = new Map<string | null, QuestionCategory[]>();
    for (const c of categories) {
      const key = c.parentId || null;
      const arr = childrenMap.get(key) || [];
      arr.push(c);
      childrenMap.set(key, arr);
    }

    for (const arr of childrenMap.values()) {
      arr.sort((a, b) => {
        if (a.id === DEFAULT_CATEGORY_ID) return -1;
        if (b.id === DEFAULT_CATEGORY_ID) return 1;
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name, 'es');
      });
    }

    const buildNodes = (parentId: string | null, depth: number, seen: Set<string>): CategoryTreeNode[] => {
      const siblings = childrenMap.get(parentId) || [];
      return siblings
        .filter(c => !seen.has(c.id))
        .map(cat => {
          const nextSeen = new Set(seen);
          nextSeen.add(cat.id);
          const childNodes = buildNodes(cat.id, depth + 1, nextSeen);
          const directCount = directCounts.get(cat.id) || 0;
          const recursiveCount =
            directCount + childNodes.reduce((sum, ch) => sum + ch.recursiveCount, 0);
          return {
            category: cat,
            children: childNodes,
            depth,
            directCount,
            recursiveCount
          };
        });
    };

    return buildNodes(null, 0, new Set());
  }

  static flattenTree(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
    const out: CategoryTreeNode[] = [];
    const walk = (list: CategoryTreeNode[]) => {
      for (const n of list) {
        out.push(n);
        if (n.children.length > 0) walk(n.children);
      }
    };
    walk(nodes);
    return out;
  }

  static getCategoryBreadcrumb(categories: QuestionCategory[], categoryId?: string): string {
    if (!categoryId) return DEFAULT_CATEGORY_NAME;
    const byId = new Map(categories.map(c => [c.id, c]));
    const parts: string[] = [];
    const visited = new Set<string>();
    let curr = byId.get(categoryId);
    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      parts.unshift(curr.name);
      curr = curr.parentId ? byId.get(curr.parentId) : undefined;
    }
    return parts.length > 0 ? parts.join(' / ') : DEFAULT_CATEGORY_NAME;
  }

  static createCategory(
    categories: QuestionCategory[],
    name: string,
    parentId: string | null = null,
    description?: string,
    moodleOriginalPath?: string
  ): { categories: QuestionCategory[]; created: QuestionCategory } {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('El nombre de la categoría es obligatorio.');
    }
    const now = new Date().toISOString();
    const siblingMaxOrder = categories
      .filter(c => (c.parentId || null) === (parentId || null))
      .reduce((max, c) => Math.max(max, c.order), 0);

    const created: QuestionCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      parentId: parentId || null,
      description: description?.trim() || undefined,
      order: siblingMaxOrder + 1,
      createdAt: now,
      updatedAt: now,
      moodleOriginalPath
    };

    return {
      categories: [...categories, created],
      created
    };
  }

  static renameCategory(
    categories: QuestionCategory[],
    categoryId: string,
    newName: string,
    description?: string
  ): QuestionCategory[] {
    const cleanName = newName.trim();
    if (!cleanName) throw new Error('El nombre de la categoría no puede estar vacío.');
    const now = new Date().toISOString();
    return categories.map(c =>
      c.id === categoryId
        ? {
            ...c,
            name: cleanName,
            description: description !== undefined ? description.trim() || undefined : c.description,
            updatedAt: now
          }
        : c
    );
  }

  static moveCategory(
    categories: QuestionCategory[],
    categoryId: string,
    newParentId: string | null
  ): QuestionCategory[] {
    if (categoryId === DEFAULT_CATEGORY_ID) {
      throw new Error('La categoría predeterminada "Sin categorizar" no puede moverse ni anidarse.');
    }
    if (newParentId === categoryId) {
      throw new Error('Una categoría no puede ser subcategoría de sí misma.');
    }
    if (newParentId) {
      const descendants = this.getDescendantIds(categories, categoryId);
      if (descendants.has(newParentId)) {
        throw new Error('No puedes mover una categoría dentro de una de sus propias subcategorías.');
      }
      if (!categories.some(c => c.id === newParentId)) {
        throw new Error('La categoría destino seleccionada no existe.');
      }
    }

    const now = new Date().toISOString();
    const siblingMaxOrder = categories
      .filter(c => (c.parentId || null) === (newParentId || null) && c.id !== categoryId)
      .reduce((max, c) => Math.max(max, c.order), 0);

    return categories.map(c =>
      c.id === categoryId
        ? {
            ...c,
            parentId: newParentId || null,
            order: siblingMaxOrder + 1,
            updatedAt: now
          }
        : c
    );
  }

  static reorderCategory(
    categories: QuestionCategory[],
    categoryId: string,
    direction: 'up' | 'down'
  ): QuestionCategory[] {
    const target = categories.find(c => c.id === categoryId);
    if (!target || target.id === DEFAULT_CATEGORY_ID) return categories;

    const siblings = categories
      .filter(c => (c.parentId || null) === (target.parentId || null) && c.id !== DEFAULT_CATEGORY_ID)
      .sort((a, b) => (a.order !== b.order ? a.order - b.order : a.name.localeCompare(b.name, 'es')));

    const idx = siblings.findIndex(s => s.id === categoryId);
    if (idx === -1) return categories;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return categories;

    const reordered = [...siblings];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(swapIdx, 0, moved);

    const orderMap = new Map<string, number>();
    reordered.forEach((s, i) => orderMap.set(s.id, i + 1));

    const now = new Date().toISOString();
    return categories.map(c =>
      orderMap.has(c.id) ? { ...c, order: orderMap.get(c.id)!, updatedAt: now } : c
    );
  }

  static deleteCategoryWithStrategy(
    categories: QuestionCategory[],
    questions: QuestionItem[],
    categoryId: string,
    strategy: DeleteCategoryStrategy
  ): { categories: QuestionCategory[]; questions: QuestionItem[] } {
    if (categoryId === DEFAULT_CATEGORY_ID) {
      throw new Error('La categoría predeterminada "Sin categorizar" no se puede eliminar.');
    }

    const target = categories.find(c => c.id === categoryId);
    if (!target) return { categories, questions };

    const descendants = this.getDescendantIds(categories, categoryId);
    const directChildren = categories.filter(c => c.parentId === categoryId);
    const now = new Date().toISOString();

    let nextCategories = [...categories];
    let nextQuestions = [...questions];

    // 1. Handle subcategories
    if (strategy.subcategoryAction === 'delete') {
      const removedCatIds = new Set<string>([categoryId, ...descendants]);
      nextCategories = nextCategories.filter(c => !removedCatIds.has(c.id));

      if (strategy.questionAction === 'delete') {
        nextQuestions = nextQuestions.filter(q => !removedCatIds.has(q.categoryId || DEFAULT_CATEGORY_ID));
      } else {
        const moveTarget =
          strategy.targetQuestionCategoryId && !removedCatIds.has(strategy.targetQuestionCategoryId)
            ? strategy.targetQuestionCategoryId
            : DEFAULT_CATEGORY_ID;
        nextQuestions = nextQuestions.map(q =>
          removedCatIds.has(q.categoryId || DEFAULT_CATEGORY_ID)
            ? { ...q, categoryId: moveTarget, updatedAt: now }
            : q
        );
      }
    } else {
      // Move direct subcategories to chosen target parent (or root)
      const destParent =
        strategy.targetSubcategoryParentId !== undefined
          ? strategy.targetSubcategoryParentId
          : target.parentId;
      const safeDestParent =
        destParent && destParent !== categoryId && !descendants.has(destParent) ? destParent : null;

      nextCategories = nextCategories
        .filter(c => c.id !== categoryId)
        .map(c =>
          directChildren.some(dc => dc.id === c.id)
            ? { ...c, parentId: safeDestParent, updatedAt: now }
            : c
        );

      if (strategy.questionAction === 'delete') {
        nextQuestions = nextQuestions.filter(q => (q.categoryId || DEFAULT_CATEGORY_ID) !== categoryId);
      } else {
        const moveTarget =
          strategy.targetQuestionCategoryId && strategy.targetQuestionCategoryId !== categoryId
            ? strategy.targetQuestionCategoryId
            : DEFAULT_CATEGORY_ID;
        nextQuestions = nextQuestions.map(q =>
          (q.categoryId || DEFAULT_CATEGORY_ID) === categoryId
            ? { ...q, categoryId: moveTarget, updatedAt: now }
            : q
        );
      }
    }

    return this.normalizeCategoriesAndQuestions(nextCategories, nextQuestions);
  }

  /**
   * Finds or creates nested categories matching path segments under rootParentId.
   * Matches sibling categories case-insensitively to prevent redundant branches.
   */
  static findOrCreateCategoryPath(
    categories: QuestionCategory[],
    segments: string[],
    rootParentId: string | null = null,
    originalMoodlePath?: string
  ): { categories: QuestionCategory[]; targetCategoryId: string; createdCount: number } {
    let working = [...categories];
    let currentParent: string | null = rootParentId || null;
    let createdCount = 0;

    const cleanSegments = segments.map(s => s.trim()).filter(Boolean);
    if (cleanSegments.length === 0) {
      return {
        categories: working,
        targetCategoryId: rootParentId || DEFAULT_CATEGORY_ID,
        createdCount: 0
      };
    }

    cleanSegments.forEach((seg, idx) => {
      const existing = working.find(
        c =>
          (c.parentId || null) === currentParent &&
          c.name.trim().toLowerCase() === seg.toLowerCase()
      );
      if (existing) {
        currentParent = existing.id;
      } else {
        const isLeaf = idx === cleanSegments.length - 1;
        const res = this.createCategory(
          working,
          seg,
          currentParent,
          undefined,
          isLeaf ? originalMoodlePath : undefined
        );
        working = res.categories;
        currentParent = res.created.id;
        createdCount++;
      }
    });

    return {
      categories: working,
      targetCategoryId: currentParent || DEFAULT_CATEGORY_ID,
      createdCount
    };
  }

  /**
   * Resolves the effective list of questions for an assessment, preferring immutable snapshots
   * when present while preserving fallback to project.questionBank for legacy assessments.
   */
  static getAssessmentEffectiveQuestions(
    assessment: AssessmentConfig,
    project: CourseProject
  ): QuestionItem[] {
    const snapshotMap = new Map<string, AssessmentQuestionSnapshot>(
      (assessment.questionSnapshots || []).map(s => [s.bankQuestionId, s])
    );
    const bankMap = new Map<string, QuestionItem>(
      (project.questionBank || []).map(q => [q.id, q])
    );

    const out: QuestionItem[] = [];
    for (const qId of assessment.questionIds || []) {
      const snap = snapshotMap.get(qId);
      const q = snap?.question || bankMap.get(qId);
      if (q && isQuestionAutoGradable(q) && !q.pendingAdaptation) {
        out.push(q);
      }
    }
    return out;
  }
}
