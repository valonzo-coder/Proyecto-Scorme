import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  FolderTree,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  FileCode2,
  AlertTriangle,
  AlertCircle,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { CourseProject, QuestionCategory, QuestionItem, QuestionType } from '../../types/scorm';
import {
  CategoryService,
  CategoryTreeNode,
  DEFAULT_CATEGORY_ID,
  getQuestionSupportInfo
} from '../../services/categoryService';
import { MediaService } from '../../services/mediaService';
import { EditQuestionModal } from '../modals/EditQuestionModal';
import { MoodleXmlImportModal } from '../modals/MoodleXmlImportModal';
import { SafeRichContent } from './SafeRichContent';

interface QuestionBankViewProps {
  project: CourseProject;
  onUpdateProject: (updated: CourseProject) => void;
}

type SortOption = 'recent' | 'oldest' | 'name_asc' | 'name_desc';

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Opción múltiple (Única)',
  multiple_response: 'Selección múltiple (Varias)',
  true_false: 'Verdadero / Falso',
  fill_blank: 'Respuesta corta',
  numerical: 'Numérica',
  matching: 'Emparejamiento',
  essay: 'Ensayo (no autocorregible)',
  description: 'Descripción informativa',
  cloze: 'Cloze (anidada)',
  unsupported: 'No compatible'
};

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  project,
  onUpdateProject
}) => {
  const categories = project.questionCategories || [];
  const categoryTree = useMemo(
    () => CategoryService.buildCategoryTree(categories, project.questionBank),
    [categories, project.questionBank]
  );
  const flatTree = useMemo(() => CategoryService.flattenTree(categoryTree), [categoryTree]);

  // Category & filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [includeSubcategories, setIncludeSubcategories] = useState<boolean>(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [showCategoryPanel, setShowCategoryPanel] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Question modals
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [pendingDeleteQuestionId, setPendingDeleteQuestionId] = useState<string | null>(null);
  const [isMoodleImportOpen, setIsMoodleImportOpen] = useState(false);

  // Category CRUD modals
  const [catFormModal, setCatFormModal] = useState<{
    mode: 'create' | 'rename';
    parentId: string | null;
    categoryId?: string;
    name: string;
    description: string;
    error?: string;
  } | null>(null);

  const [moveCategoryModal, setMoveCategoryModal] = useState<{
    category: QuestionCategory;
    targetParentId: string | null;
    error?: string;
  } | null>(null);

  const [deleteCategoryModal, setDeleteCategoryModal] = useState<{
    category: QuestionCategory;
    questionCount: number;
    descendantQuestionsCount: number;
    subcategoryCount: number;
    questionAction: 'move' | 'delete';
    targetQuestionCategoryId: string;
    subcategoryAction: 'move' | 'delete';
    targetSubcategoryParentId: string | null;
  } | null>(null);

  const selectedCategory = useMemo(
    () => (selectedCategoryId === 'all' ? undefined : categories.find(c => c.id === selectedCategoryId)),
    [categories, selectedCategoryId]
  );

  // Compute filtered & sorted questions
  const filteredQuestions = useMemo(() => {
    const allowedCatIds =
      selectedCategoryId === 'all'
        ? null
        : includeSubcategories
        ? CategoryService.getSubtreeIds(categories, selectedCategoryId)
        : new Set([selectedCategoryId]);

    const qSearch = searchTerm.trim().toLowerCase();

    const filtered = project.questionBank.filter(q => {
      if (allowedCatIds) {
        const qCat = q.categoryId || DEFAULT_CATEGORY_ID;
        if (!allowedCatIds.has(qCat)) return false;
      }
      if (typeFilter !== 'all' && q.type !== typeFilter) return false;
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
      if (qSearch) {
        const hay = `${q.name || ''} ${q.prompt} ${q.explanation} ${q.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(qSearch)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const aLabel = (a.name || a.prompt || '').trim();
      const bLabel = (b.name || b.prompt || '').trim();
      if (sortBy === 'name_asc') return aLabel.localeCompare(bLabel, 'es');
      if (sortBy === 'name_desc') return bLabel.localeCompare(aLabel, 'es');
      const aTime = Date.parse(a.updatedAt || a.createdAt || '') || 0;
      const bTime = Date.parse(b.updatedAt || b.createdAt || '') || 0;
      return sortBy === 'oldest' ? aTime - bTime : bTime - aTime;
    });
  }, [
    project.questionBank,
    categories,
    selectedCategoryId,
    includeSubcategories,
    searchTerm,
    typeFilter,
    difficultyFilter,
    sortBy
  ]);

  // Handlers: Questions
  const handleSaveQuestion = (savedQuestion: QuestionItem) => {
    const exists = project.questionBank.some(q => q.id === savedQuestion.id);
    const updatedList = exists
      ? project.questionBank.map(q => (q.id === savedQuestion.id ? savedQuestion : q))
      : [savedQuestion, ...project.questionBank];

    onUpdateProject(
      MediaService.sanitizeProjectMediaReferences({
        ...project,
        questionBank: updatedList
      })
    );
  };

  const handleConfirmDeleteQuestion = () => {
    if (!pendingDeleteQuestionId) return;
    onUpdateProject(
      MediaService.sanitizeProjectMediaReferences({
        ...project,
        questionBank: project.questionBank.filter(q => q.id !== pendingDeleteQuestionId)
      })
    );
    setPendingDeleteQuestionId(null);
  };

  const handleDuplicateQuestion = (q: QuestionItem) => {
    const now = new Date().toISOString();
    const copy: QuestionItem = {
      ...JSON.parse(JSON.stringify(q)),
      id: `q-${Date.now()}`,
      name: q.name ? `${q.name} (Copia)` : undefined,
      prompt: `${q.prompt} (Copia)`,
      categoryId: q.categoryId || DEFAULT_CATEGORY_ID,
      createdAt: now,
      updatedAt: now
    };
    onUpdateProject({
      ...project,
      questionBank: [copy, ...project.questionBank]
    });
  };

  // Handlers: Categories
  const handleSubmitCategoryForm = () => {
    if (!catFormModal) return;
    try {
      let nextCategories: QuestionCategory[];
      if (catFormModal.mode === 'create') {
        const res = CategoryService.createCategory(
          categories,
          catFormModal.name,
          catFormModal.parentId,
          catFormModal.description
        );
        nextCategories = res.categories;
        setSelectedCategoryId(res.created.id);
        if (catFormModal.parentId) {
          setCollapsedCategories(prev => ({ ...prev, [catFormModal.parentId!]: false }));
        }
      } else {
        nextCategories = CategoryService.renameCategory(
          categories,
          catFormModal.categoryId!,
          catFormModal.name,
          catFormModal.description
        );
      }
      onUpdateProject({ ...project, questionCategories: nextCategories });
      setCatFormModal(null);
    } catch (err: any) {
      setCatFormModal({ ...catFormModal, error: err?.message || 'Error al guardar la categoría.' });
    }
  };

  const handleConfirmMoveCategory = () => {
    if (!moveCategoryModal) return;
    try {
      const nextCategories = CategoryService.moveCategory(
        categories,
        moveCategoryModal.category.id,
        moveCategoryModal.targetParentId
      );
      onUpdateProject({ ...project, questionCategories: nextCategories });
      setMoveCategoryModal(null);
    } catch (err: any) {
      setMoveCategoryModal({
        ...moveCategoryModal,
        error: err?.message || 'No se pudo mover la categoría.'
      });
    }
  };

  const openDeleteCategoryModal = (cat: QuestionCategory) => {
    const descendants = CategoryService.getDescendantIds(categories, cat.id);
    const directQ = project.questionBank.filter(q => (q.categoryId || DEFAULT_CATEGORY_ID) === cat.id).length;
    const descQ = project.questionBank.filter(q => descendants.has(q.categoryId || DEFAULT_CATEGORY_ID)).length;

    setDeleteCategoryModal({
      category: cat,
      questionCount: directQ,
      descendantQuestionsCount: descQ,
      subcategoryCount: descendants.size,
      questionAction: 'move',
      targetQuestionCategoryId: DEFAULT_CATEGORY_ID,
      subcategoryAction: 'move',
      targetSubcategoryParentId: cat.parentId
    });
  };

  const handleConfirmDeleteCategory = () => {
    if (!deleteCategoryModal) return;
    const res = CategoryService.deleteCategoryWithStrategy(
      categories,
      project.questionBank,
      deleteCategoryModal.category.id,
      {
        questionAction: deleteCategoryModal.questionAction,
        targetQuestionCategoryId: deleteCategoryModal.targetQuestionCategoryId,
        subcategoryAction: deleteCategoryModal.subcategoryAction,
        targetSubcategoryParentId: deleteCategoryModal.targetSubcategoryParentId
      }
    );

    if (
      selectedCategoryId === deleteCategoryModal.category.id ||
      !res.categories.some(c => c.id === selectedCategoryId)
    ) {
      setSelectedCategoryId('all');
    }

    onUpdateProject(
      MediaService.sanitizeProjectMediaReferences({
        ...project,
        questionCategories: res.categories,
        questionBank: res.questions
      })
    );
    setDeleteCategoryModal(null);
  };

  const handleReorderCategory = (catId: string, dir: 'up' | 'down') => {
    const nextCategories = CategoryService.reorderCategory(categories, catId, dir);
    onUpdateProject({ ...project, questionCategories: nextCategories });
  };

  const renderCategoryNode = (node: CategoryTreeNode): React.ReactNode => {
    const { category, children, depth, directCount, recursiveCount } = node;
    const isSelected = selectedCategoryId === category.id;
    const isCollapsed = !!collapsedCategories[category.id];
    const isUncat = category.id === DEFAULT_CATEGORY_ID;

    return (
      <div key={category.id} className="select-none">
        <div
          className={`group flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
            isSelected
              ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
              : 'text-slate-700 hover:bg-slate-100 border border-transparent'
          }`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => setSelectedCategoryId(category.id)}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {children.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsedCategories(prev => ({ ...prev, [category.id]: !isCollapsed }));
                }}
                className="p-0.5 text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
                title={isCollapsed ? 'Expandir subcategorías' : 'Contraer subcategorías'}
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}

            {isSelected ? (
              <FolderOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}

            <span className="truncate" title={category.name}>
              {category.name}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className="text-[11px] font-mono tabular-nums text-slate-500"
              title={
                children.length > 0
                  ? `${directCount} directas · ${recursiveCount} total con subcategorías`
                  : `${directCount} preguntas`
              }
            >
              {children.length > 0 ? `${directCount}/${recursiveCount}` : directCount}
            </span>

            {!isUncat && (
              <div
                className="hidden group-hover:flex items-center gap-0.5 ml-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() =>
                    setCatFormModal({
                      mode: 'create',
                      parentId: category.id,
                      name: '',
                      description: ''
                    })
                  }
                  className="p-0.5 text-slate-400 hover:text-blue-700 cursor-pointer"
                  title="Nueva subcategoría"
                >
                  <FolderPlus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCatFormModal({
                      mode: 'rename',
                      parentId: category.parentId,
                      categoryId: category.id,
                      name: category.name,
                      description: category.description || ''
                    })
                  }
                  className="p-0.5 text-slate-400 hover:text-blue-700 cursor-pointer"
                  title="Renombrar categoría"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMoveCategoryModal({
                      category,
                      targetParentId: category.parentId
                    })
                  }
                  className="p-0.5 text-slate-400 hover:text-blue-700 cursor-pointer"
                  title="Mover categoría"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleReorderCategory(category.id, 'up')}
                  className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Subir orden"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleReorderCategory(category.id, 'down')}
                  className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Bajar orden"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => openDeleteCategoryModal(category)}
                  className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Eliminar categoría"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {!isCollapsed && children.length > 0 && (
          <div className="space-y-0.5 mt-0.5">
            {children.map(ch => renderCategoryNode(ch))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCategoryPanel(v => !v)}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg cursor-pointer shrink-0"
            title={showCategoryPanel ? 'Ocultar árbol de categorías' : 'Mostrar árbol de categorías'}
          >
            {showCategoryPanel ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Banco de Preguntas</h1>
            <p className="text-xs text-slate-500">
              Organiza por categorías jerárquicas, importa desde Moodle XML y reutiliza reactivos en evaluaciones SCORM
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsMoodleImportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileCode2 className="w-4 h-4 text-blue-600" />
            <span>Importar preguntas desde Moodle XML</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingQuestion(null);
              setIsQuestionModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Pregunta</span>
          </button>
        </div>
      </div>

      {/* Main Two-Panel Workspace */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT SIDEBAR: HIERARCHICAL CATEGORY TREE */}
        {showCategoryPanel && (
          <aside className="w-full lg:w-80 bg-white rounded-xl border border-slate-200 p-3.5 space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Categorías ({categories.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCatFormModal({
                    mode: 'create',
                    parentId: null,
                    name: '',
                    description: ''
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Categoría</span>
              </button>
            </div>

            {/* All Questions root item */}
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
              }`}
            >
              <span>Todas las preguntas</span>
              <span className="font-mono tabular-nums text-[11px]">
                {project.questionBank.length}
              </span>
            </button>

            {/* Tree */}
            <div className="space-y-0.5 max-h-[520px] overflow-y-auto pr-0.5">
              {categoryTree.map(node => renderCategoryNode(node))}
            </div>

            {selectedCategory && selectedCategory.id !== DEFAULT_CATEGORY_ID && (
              <div className="pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setCatFormModal({
                      mode: 'create',
                      parentId: selectedCategory.id,
                      name: '',
                      description: ''
                    })
                  }
                  className="text-[11px] font-semibold text-blue-700 hover:bg-blue-50 px-2 py-1 rounded border border-blue-200 cursor-pointer"
                >
                  + Subcategoría aquí
                </button>
                <button
                  type="button"
                  onClick={() => openDeleteCategoryModal(selectedCategory)}
                  className="text-[11px] font-semibold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded border border-rose-200 cursor-pointer"
                >
                  Eliminar categoría
                </button>
              </div>
            )}
          </aside>
        )}

        {/* RIGHT PANEL: QUESTIONS TOOLBAR & CARDS */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Selected Category Context & Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="text-xs text-slate-600 flex items-center gap-2 min-w-0">
                <span className="font-bold text-slate-900 truncate">
                  {selectedCategoryId === 'all'
                    ? 'Todas las categorías'
                    : CategoryService.getCategoryBreadcrumb(categories, selectedCategoryId)}
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-mono tabular-nums text-slate-500">
                  {filteredQuestions.length} reactivos
                </span>
              </div>

              {selectedCategoryId !== 'all' && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSubcategories}
                    onChange={(e) => setIncludeSubcategories(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Incluir subcategorías</span>
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
              <div className="relative md:col-span-5">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, enunciado, explicación o etiquetas..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-1.5 focus:outline-none"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="multiple_choice">Opción múltiple (Única)</option>
                  <option value="multiple_response">Selección múltiple (Varias)</option>
                  <option value="true_false">Verdadero / Falso</option>
                  <option value="fill_blank">Respuesta corta</option>
                  <option value="numerical">Numérica</option>
                  <option value="matching">Emparejamiento</option>
                  <option value="essay">Ensayo (no autocorregible)</option>
                  <option value="description">Descripción informativa</option>
                  <option value="cloze">Cloze (anidada)</option>
                  <option value="unsupported">No compatible</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-1.5 focus:outline-none"
                >
                  <option value="all">Dificultad: Todas</option>
                  <option value="Fácil">Fácil</option>
                  <option value="Medio">Medio</option>
                  <option value="Difícil">Difícil</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-1.5 focus:outline-none"
                >
                  <option value="recent">Más recientes</option>
                  <option value="oldest">Más antiguas</option>
                  <option value="name_asc">Nombre (A–Z)</option>
                  <option value="name_desc">Nombre (Z–A)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Question List */}
          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">
                No hay preguntas en esta vista
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Crea una nueva pregunta directamente o importa un banco de Moodle XML conservando su jerarquía de categorías.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsMoodleImportOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Importar Moodle XML
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestion(null);
                    setIsQuestionModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  Crear Pregunta
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q, qIndex) => {
                const support = getQuestionSupportInfo(q);
                const breadcrumb = CategoryService.getCategoryBreadcrumb(categories, q.categoryId);
                const updatedDate = q.updatedAt || q.createdAt;
                const formattedDate = updatedDate
                  ? new Date(updatedDate).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })
                  : '';

                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors"
                  >
                    {/* Card Header Metadata */}
                    <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-blue-700">{TYPE_LABELS[q.type]}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-600 font-medium">{q.difficulty}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono font-bold text-slate-700 tabular-nums">{q.points} pts</span>
                          {formattedDate && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-500">{formattedDate}</span>
                            </>
                          )}
                          {support.status !== 'supported' && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span
                                className={`font-bold ${
                                  support.status === 'partial' ? 'text-amber-700' : 'text-rose-700'
                                }`}
                              >
                                {support.label}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                          <Folder className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{breadcrumb}</span>
                          {q.name && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="font-semibold text-slate-700 truncate">{q.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(q)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                          title="Duplicar pregunta"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuestion(q);
                            setIsQuestionModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                          title="Editar pregunta"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteQuestionId(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                          title="Eliminar pregunta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-3.5">
                      <div className="text-sm font-bold text-slate-900 leading-snug flex items-start gap-2">
                        <span className="text-slate-400 font-mono shrink-0">{qIndex + 1}.</span>
                        <div className="flex-1 min-w-0 font-normal">
                          <SafeRichContent
                            html={q.promptHtml}
                            fallbackText={q.prompt}
                            className="text-sm text-slate-900 font-semibold"
                          />
                        </div>
                      </div>

                      {/* Warnings */}
                      {q.importWarnings && q.importWarnings.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                          {q.importWarnings.map((w, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Type-specific Answer Preview */}
                      {(q.type === 'multiple_choice' || q.type === 'multiple_response') && (
                        <div className="space-y-1.5">
                          {q.options?.map(opt => (
                            <div
                              key={opt.id}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                                opt.isCorrect
                                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-4 h-4 ${
                                    q.type === 'multiple_choice' ? 'rounded-full' : 'rounded'
                                  } border flex items-center justify-center text-[10px] shrink-0 ${
                                    opt.isCorrect
                                      ? 'border-emerald-600 bg-emerald-600 text-white'
                                      : 'border-slate-300'
                                  }`}
                                >
                                  {opt.isCorrect ? '✓' : ''}
                                </span>
                                <span>{opt.text}</span>
                              </div>
                              {opt.isCorrect && (
                                <span className="text-[10px] font-bold text-emerald-700 uppercase">Correcta</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'true_false' && (
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex-1 p-2.5 rounded-lg border text-xs text-center font-bold ${
                              q.trueFalseAnswer
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            Verdadero {q.trueFalseAnswer ? '✓ (Correcta)' : ''}
                          </div>
                          <div
                            className={`flex-1 p-2.5 rounded-lg border text-xs text-center font-bold ${
                              !q.trueFalseAnswer
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            Falso {!q.trueFalseAnswer ? '✓ (Correcta)' : ''}
                          </div>
                        </div>
                      )}

                      {q.type === 'fill_blank' && (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                          <div>
                            <span className="font-semibold text-slate-500">Respuesta principal:</span>{' '}
                            <code className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                              {q.blankAnswer}
                            </code>
                            <span className="ml-2 text-[11px] text-slate-500">
                              ({q.caseSensitive ? 'Distingue mayúsculas' : 'No distingue mayúsculas'})
                            </span>
                          </div>
                          {q.acceptedAnswers && q.acceptedAnswers.length > 1 && (
                            <div className="text-[11px] text-slate-600">
                              Variantes aceptadas:{' '}
                              {q.acceptedAnswers
                                .filter(v => v.fraction > 0)
                                .map(v => `"${v.text}" (${v.fraction}%)`)
                                .join(', ')}
                            </div>
                          )}
                        </div>
                      )}

                      {q.type === 'numerical' && (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                          <div className="font-semibold text-slate-600">Valores numéricos aceptados:</div>
                          {(q.numericalAnswers || []).map((n, idx) => (
                            <div key={idx} className="font-mono text-xs text-emerald-900">
                              • Valor: <strong>{n.value}</strong> · Tolerancia: ±{n.tolerance} · Crédito: {n.fraction ?? 100}%
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'matching' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.matchingPairs?.map(pair => (
                            <div
                              key={pair.id}
                              className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2"
                            >
                              <span className="font-semibold text-slate-800">{pair.left}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-slate-600">{pair.right}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'cloze' && q.clozeData && (
                        <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                          <div className="font-bold">
                            Reactivo Cloze con {q.clozeData.subquestions.length} subpregunta(s) embebida(s):
                          </div>
                          <div className="text-[11px] text-amber-800">
                            Se conserva para consulta. Edita y convierte a un formato autocorregible si deseas incluirla en evaluaciones SCORM.
                          </div>
                        </div>
                      )}

                      {(q.type === 'essay' || q.type === 'description' || q.type === 'unsupported') && (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            {q.type === 'essay'
                              ? 'Pregunta abierta de ensayo (sin autocorrección automática en SCORM).'
                              : q.type === 'description'
                              ? 'Elemento informativo de Moodle (sin puntuación calificable).'
                              : 'Tipo de pregunta no compatible con la calificación automática SCORM.'}
                          </span>
                        </div>
                      )}

                      {(q.explanationHtml || q.explanation) && (
                        <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-700 space-y-1">
                          <div className="font-bold text-blue-800">Retroalimentación general:</div>
                          <SafeRichContent html={q.explanationHtml} fallbackText={q.explanation} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create Question Modal */}
      <EditQuestionModal
        isOpen={isQuestionModalOpen}
        question={editingQuestion}
        categories={categories}
        defaultCategoryId={
          selectedCategoryId !== 'all' ? selectedCategoryId : DEFAULT_CATEGORY_ID
        }
        onClose={() => setIsQuestionModalOpen(false)}
        onSave={handleSaveQuestion}
      />

      {/* Moodle XML Import Wizard */}
      <MoodleXmlImportModal
        isOpen={isMoodleImportOpen}
        project={project}
        initialDestinationCategoryId={selectedCategoryId !== 'all' ? selectedCategoryId : null}
        onClose={() => setIsMoodleImportOpen(false)}
        onImportComplete={(updated) => onUpdateProject(updated)}
      />

      {/* Delete Question Confirmation Modal */}
      {pendingDeleteQuestionId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">¿Eliminar reactivo del banco?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Esta acción quitará la pregunta del banco de reactivos. Las evaluaciones ya configuradas conservarán su copia interna hasta que la retires manualmente.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteQuestionId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteQuestion}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Rename Category Modal */}
      {catFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                {catFormModal.mode === 'create'
                  ? catFormModal.parentId
                    ? 'Nueva Subcategoría'
                    : 'Nueva Categoría Principal'
                  : 'Renombrar Categoría'}
              </h3>
              <button
                type="button"
                onClick={() => setCatFormModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {catFormModal.error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
                {catFormModal.error}
              </div>
            )}

            <div className="space-y-3">
              {catFormModal.mode === 'create' && catFormModal.parentId && (
                <div className="text-[11px] text-slate-500">
                  Categoría padre:{' '}
                  <strong className="text-slate-800">
                    {CategoryService.getCategoryBreadcrumb(categories, catFormModal.parentId)}
                  </strong>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la categoría</label>
                <input
                  autoFocus
                  type="text"
                  value={catFormModal.name}
                  onChange={(e) => setCatFormModal({ ...catFormModal, name: e.target.value, error: undefined })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitCategoryForm();
                  }}
                  placeholder="Ej. Unidad 1 · Álgebra"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción (opcional)</label>
                <textarea
                  rows={2}
                  value={catFormModal.description}
                  onChange={(e) => setCatFormModal({ ...catFormModal, description: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCatFormModal(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitCategoryForm}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Category Modal */}
      {moveCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Mover categoría "{moveCategoryModal.category.name}"
            </h3>
            {moveCategoryModal.error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
                {moveCategoryModal.error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nueva ubicación padre:</label>
              <select
                value={moveCategoryModal.targetParentId || ''}
                onChange={(e) =>
                  setMoveCategoryModal({
                    ...moveCategoryModal,
                    targetParentId: e.target.value || null,
                    error: undefined
                  })
                }
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50"
              >
                <option value="">Raíz del Banco de Preguntas (Nivel superior)</option>
                {flatTree
                  .filter(n => {
                    const excluded = CategoryService.getSubtreeIds(
                      categories,
                      moveCategoryModal.category.id
                    );
                    return n.category.id !== DEFAULT_CATEGORY_ID && !excluded.has(n.category.id);
                  })
                  .map(n => (
                    <option key={n.category.id} value={n.category.id}>
                      {'— '.repeat(n.depth)}{n.category.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMoveCategoryModal(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveCategory}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Mover categoría
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Delete Category Modal */}
      {deleteCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Eliminar categoría "{deleteCategoryModal.category.name}"
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Contiene <strong>{deleteCategoryModal.questionCount}</strong> preguntas directas y{' '}
                  <strong>{deleteCategoryModal.subcategoryCount}</strong> subcategorías ({deleteCategoryModal.descendantQuestionsCount} preguntas en subcategorías).
                </p>
              </div>
            </div>

            {deleteCategoryModal.subcategoryCount > 0 && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <div className="font-bold text-slate-800">¿Qué hacer con las subcategorías?</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="subAct"
                    checked={deleteCategoryModal.subcategoryAction === 'move'}
                    onChange={() =>
                      setDeleteCategoryModal({ ...deleteCategoryModal, subcategoryAction: 'move' })
                    }
                    className="text-blue-600"
                  />
                  <span>Mover subcategorías a nivel superior / otra categoría</span>
                </label>
                {deleteCategoryModal.subcategoryAction === 'move' && (
                  <select
                    value={deleteCategoryModal.targetSubcategoryParentId || ''}
                    onChange={(e) =>
                      setDeleteCategoryModal({
                        ...deleteCategoryModal,
                        targetSubcategoryParentId: e.target.value || null
                      })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                  >
                    <option value="">Raíz del Banco de Preguntas</option>
                    {flatTree
                      .filter(n => {
                        const excluded = CategoryService.getSubtreeIds(
                          categories,
                          deleteCategoryModal.category.id
                        );
                        return n.category.id !== DEFAULT_CATEGORY_ID && !excluded.has(n.category.id);
                      })
                      .map(n => (
                        <option key={n.category.id} value={n.category.id}>
                          {'— '.repeat(n.depth)}{n.category.name}
                        </option>
                      ))}
                  </select>
                )}
                <label className="flex items-center gap-2 cursor-pointer text-rose-700 font-semibold">
                  <input
                    type="radio"
                    name="subAct"
                    checked={deleteCategoryModal.subcategoryAction === 'delete'}
                    onChange={() =>
                      setDeleteCategoryModal({ ...deleteCategoryModal, subcategoryAction: 'delete' })
                    }
                    className="text-rose-600"
                  />
                  <span>Eliminar también todas sus subcategorías</span>
                </label>
              </div>
            )}

            {(deleteCategoryModal.questionCount > 0 ||
              (deleteCategoryModal.subcategoryAction === 'delete' &&
                deleteCategoryModal.descendantQuestionsCount > 0)) && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <div className="font-bold text-slate-800">¿Qué hacer con las preguntas afectadas?</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="qAct"
                    checked={deleteCategoryModal.questionAction === 'move'}
                    onChange={() =>
                      setDeleteCategoryModal({ ...deleteCategoryModal, questionAction: 'move' })
                    }
                    className="text-blue-600"
                  />
                  <span>Mover las preguntas a otra categoría:</span>
                </label>
                {deleteCategoryModal.questionAction === 'move' && (
                  <select
                    value={deleteCategoryModal.targetQuestionCategoryId}
                    onChange={(e) =>
                      setDeleteCategoryModal({
                        ...deleteCategoryModal,
                        targetQuestionCategoryId: e.target.value
                      })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                  >
                    {flatTree
                      .filter(n => {
                        if (deleteCategoryModal.subcategoryAction === 'delete') {
                          const excluded = CategoryService.getSubtreeIds(
                            categories,
                            deleteCategoryModal.category.id
                          );
                          return !excluded.has(n.category.id);
                        }
                        return n.category.id !== deleteCategoryModal.category.id;
                      })
                      .map(n => (
                        <option key={n.category.id} value={n.category.id}>
                          {'— '.repeat(n.depth)}{n.category.name}
                        </option>
                      ))}
                  </select>
                )}
                <label className="flex items-center gap-2 cursor-pointer text-rose-700 font-semibold">
                  <input
                    type="radio"
                    name="qAct"
                    checked={deleteCategoryModal.questionAction === 'delete'}
                    onChange={() =>
                      setDeleteCategoryModal({ ...deleteCategoryModal, questionAction: 'delete' })
                    }
                    className="text-rose-600"
                  />
                  <span>Eliminar definitivamente las preguntas</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCategoryModal(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Confirmar eliminación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
