import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Layers,
  FileText,
  AlertCircle,
  LayoutList,
  HelpCircle,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Sigma,
  Download,
  Paperclip,
  MousePointerClick,
  ArrowDownToLine,
  FileCheck2,
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  Edit3,
  AlertTriangle,
  X
} from 'lucide-react';
import {
  CourseProject,
  CourseUnit,
  CourseLesson,
  CoursePage,
  ContentBlock,
  CalloutBlock,
  AccordionBlock,
  TabsBlock,
  FlashcardsBlock,
  CheckpointBlock,
  MediaBlock,
  MathBlock,
  ResourceBlock,
  TextBlock,
  BlockType,
  PageNavigationRule,
  NavigationConditionType
} from '../../types/scorm';
import { MediaService } from '../../services/mediaService';
import { MathService } from '../../services/mathService';
import { CategoryService, isQuestionAutoGradable } from '../../services/categoryService';
import { DEFAULT_LESSON_NAV_CONFIG, DEFAULT_PAGE_NAV_RULE } from '../../services/navigationService';
import { RichTextEditor } from './RichTextEditor';
import { PageNavigationPanel } from './PageNavigationPanel';

interface ContentBuilderViewProps {
  project: CourseProject;
  onUpdateProject: (updated: CourseProject) => void;
  onOpenQuestionBank: () => void;
}

interface PendingDelete {
  kind: 'unit' | 'lesson' | 'page';
  unitId: string;
  lessonId?: string;
  pageId?: string;
  title: string;
}

const RULE_BADGE_MAP: Record<NavigationConditionType, { label: string; icon: React.FC<{ className?: string }>; pill: string }> = {
  button: { label: 'Botón', icon: MousePointerClick, pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  scrolling: { label: 'Scroll', icon: ArrowDownToLine, pill: 'bg-teal-50 text-teal-700 border-teal-200' },
  question: { label: 'Pregunta', icon: HelpCircle, pill: 'bg-rose-50 text-rose-700 border-rose-200' },
  interaction: { label: 'Interacción', icon: Sparkles, pill: 'bg-violet-50 text-violet-700 border-violet-200' },
  resource: { label: 'Recurso', icon: FileCheck2, pill: 'bg-purple-50 text-purple-700 border-purple-200' }
};

export const ContentBuilderView: React.FC<ContentBuilderViewProps> = ({
  project,
  onUpdateProject,
  onOpenQuestionBank
}) => {
  const firstUnit = project.units[0];
  const firstLesson = firstUnit?.lessons[0];
  const firstPage = firstLesson?.pages?.[0];

  const [selectedUnitId, setSelectedUnitId] = useState<string>(firstUnit?.id || '');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(firstLesson?.id || '');
  const [selectedPageId, setSelectedPageId] = useState<string>(firstPage?.id || '');

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

  const [editingItem, setEditingItem] = useState<{ kind: 'unit' | 'lesson' | 'page'; id: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem('edubuilder_editor_sidebar_open');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return false;
    }
    return true;
  });
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);
  const [, setMediaRevision] = useState<number>(() => MediaService.getRevision());

  useEffect(() => {
    return MediaService.subscribe(() => {
      setMediaRevision(MediaService.getRevision());
    });
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem('edubuilder_editor_sidebar_open', String(showLeftPanel));
    } catch (e) {}
  }, [showLeftPanel]);

  const currentUnit = project.units.find(u => u.id === selectedUnitId) || project.units[0];
  const currentLesson = currentUnit?.lessons.find(l => l.id === selectedLessonId) || currentUnit?.lessons[0];
  const currentPages = currentLesson?.pages || [];
  const currentPageIndex = Math.max(
    0,
    currentPages.findIndex(p => p.id === selectedPageId)
  );
  const currentPage = currentPages[currentPageIndex] || currentPages[0];

  // Keep selections synced if project changes externally
  useEffect(() => {
    if (currentUnit && currentUnit.id !== selectedUnitId) setSelectedUnitId(currentUnit.id);
    if (currentLesson && currentLesson.id !== selectedLessonId) setSelectedLessonId(currentLesson.id);
    if (currentPage && currentPage.id !== selectedPageId) setSelectedPageId(currentPage.id);
  }, [project]);

  useEffect(() => {
    if (inlineNotice) {
      const t = setTimeout(() => setInlineNotice(null), 4000);
      return () => clearTimeout(t);
    }
  }, [inlineNotice]);

  const updateUnits = (newUnits: CourseUnit[], pruneMedia: boolean = false) => {
    const updatedProject: CourseProject = {
      ...project,
      units: newUnits
    };
    if (pruneMedia) {
      MediaService.pruneUnreferencedAssets(updatedProject);
    }
    onUpdateProject(updatedProject);
  };

  // Toggle accordion states in tree
  const toggleUnitExpand = (unitId: string) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleLessonExpand = (lessonId: string) => {
    setExpandedLessons(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  // Select a page from the tree
  const handleSelectPage = (unitId: string, lessonId: string, pageId: string) => {
    setSelectedUnitId(unitId);
    setSelectedLessonId(lessonId);
    setSelectedPageId(pageId);
    setExpandedUnits(prev => ({ ...prev, [unitId]: true }));
    setExpandedLessons(prev => ({ ...prev, [lessonId]: true }));
  };

  // Unit CRUD
  const handleAddUnit = () => {
    const newUnitId = `u-${Date.now()}`;
    const newLessonId = `les-${Date.now()}`;
    const newPageId = `page-${Date.now()}`;
    const newUnit: CourseUnit = {
      id: newUnitId,
      title: `Unidad ${project.units.length + 1}: Nueva Unidad`,
      description: 'Breve descripción de los objetivos de esta unidad didáctica.',
      order: project.units.length + 1,
      lessons: [
        {
          id: newLessonId,
          title: `${project.units.length + 1}.1 Primera Lección`,
          summary: 'Resumen orientativo de la lección para el estudiante.',
          estimatedMinutes: 10,
          order: 1,
          navigationConfig: { ...DEFAULT_LESSON_NAV_CONFIG },
          pages: [
            {
              id: newPageId,
              title: 'Página 1: Introducción',
              order: 1,
              navigationRule: { ...DEFAULT_PAGE_NAV_RULE },
              blocks: [
                {
                  id: `b-${Date.now()}-1`,
                  type: 'text',
                  title: 'Introducción al Tema',
                  content: '<p>Escribe aquí el contenido teórico o las instrucciones para el participante.</p>'
                }
              ]
            }
          ]
        }
      ]
    };
    updateUnits([...project.units, newUnit]);
    setExpandedUnits(prev => ({ ...prev, [newUnitId]: true }));
    setExpandedLessons(prev => ({ ...prev, [newLessonId]: true }));
    setSelectedUnitId(newUnitId);
    setSelectedLessonId(newLessonId);
    setSelectedPageId(newPageId);
  };

  // Lesson CRUD & Reorder
  const handleAddLesson = (unitId: string) => {
    const unitIndex = project.units.findIndex(u => u.id === unitId);
    if (unitIndex === -1) return;

    const unit = project.units[unitIndex];
    const newLessonId = `les-${Date.now()}`;
    const newPageId = `page-${Date.now()}`;
    const newLesson: CourseLesson = {
      id: newLessonId,
      title: `${unitIndex + 1}.${unit.lessons.length + 1} Nueva Lección`,
      summary: 'Objetivos específicos y desarrollo conceptual.',
      estimatedMinutes: 8,
      order: unit.lessons.length + 1,
      navigationConfig: { ...DEFAULT_LESSON_NAV_CONFIG },
      pages: [
        {
          id: newPageId,
          title: 'Página 1: Desarrollo Inicial',
          order: 1,
          navigationRule: { ...DEFAULT_PAGE_NAV_RULE },
          blocks: [
            {
              id: `b-${Date.now()}-1`,
              type: 'text',
              title: 'Desarrollo del Contenido',
              content: '<p>Redacta aquí las explicaciones, ejemplos prácticos o conceptos clave.</p>'
            }
          ]
        }
      ]
    };

    const newUnits = [...project.units];
    newUnits[unitIndex] = {
      ...unit,
      lessons: [...unit.lessons, newLesson]
    };

    updateUnits(newUnits);
    setExpandedUnits(prev => ({ ...prev, [unitId]: true }));
    setExpandedLessons(prev => ({ ...prev, [newLessonId]: true }));
    setSelectedUnitId(unitId);
    setSelectedLessonId(newLessonId);
    setSelectedPageId(newPageId);
  };

  const handleMoveLesson = (unitId: string, lessonIdx: number, direction: 'up' | 'down') => {
    const unitIndex = project.units.findIndex(u => u.id === unitId);
    if (unitIndex === -1) return;
    const lessons = [...project.units[unitIndex].lessons];
    const targetIdx = direction === 'up' ? lessonIdx - 1 : lessonIdx + 1;
    if (targetIdx < 0 || targetIdx >= lessons.length) return;

    const [moved] = lessons.splice(lessonIdx, 1);
    lessons.splice(targetIdx, 0, moved);
    const reordered = lessons.map((l, idx) => ({ ...l, order: idx + 1 }));

    const newUnits = [...project.units];
    newUnits[unitIndex] = { ...newUnits[unitIndex], lessons: reordered };
    updateUnits(newUnits);
  };

  // Page CRUD & Reorder
  const handleAddPage = (unitId: string, lessonId: string) => {
    const newPageId = `page-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const newUnits = project.units.map(u => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        lessons: u.lessons.map(l => {
          if (l.id !== lessonId) return l;
          const nextNum = l.pages.length + 1;
          const newPage: CoursePage = {
            id: newPageId,
            title: `Página ${nextNum}`,
            order: nextNum,
            navigationRule: { ...DEFAULT_PAGE_NAV_RULE },
            blocks: [
              {
                id: `b-${Date.now()}`,
                type: 'text',
                title: `Contenido de Página ${nextNum}`,
                content: '<p>Agrega texto enriquecido, imágenes, fórmulas o actividades interactivas para esta sección.</p>'
              }
            ]
          };
          return {
            ...l,
            pages: [...l.pages, newPage]
          };
        })
      };
    });

    updateUnits(newUnits);
    setExpandedUnits(prev => ({ ...prev, [unitId]: true }));
    setExpandedLessons(prev => ({ ...prev, [lessonId]: true }));
    setSelectedUnitId(unitId);
    setSelectedLessonId(lessonId);
    setSelectedPageId(newPageId);
  };

  const handleMovePage = (unitId: string, lessonId: string, pageIdx: number, direction: 'up' | 'down') => {
    const newUnits = project.units.map(u => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        lessons: u.lessons.map(l => {
          if (l.id !== lessonId) return l;
          const pages = [...l.pages];
          const targetIdx = direction === 'up' ? pageIdx - 1 : pageIdx + 1;
          if (targetIdx < 0 || targetIdx >= pages.length) return l;
          const [moved] = pages.splice(pageIdx, 1);
          pages.splice(targetIdx, 0, moved);
          return {
            ...l,
            pages: pages.map((p, idx) => ({ ...p, order: idx + 1 }))
          };
        })
      };
    });
    updateUnits(newUnits);
  };

  // Delete confirmation handler
  const requestDelete = (target: PendingDelete) => {
    if (target.kind === 'unit' && project.units.length <= 1) {
      setInlineNotice('El curso debe conservar al menos una unidad didáctica.');
      return;
    }
    if (target.kind === 'lesson') {
      const unit = project.units.find(u => u.id === target.unitId);
      if (unit && unit.lessons.length <= 1) {
        setInlineNotice('Cada unidad debe conservar al menos una lección.');
        return;
      }
    }
    if (target.kind === 'page') {
      const unit = project.units.find(u => u.id === target.unitId);
      const lesson = unit?.lessons.find(l => l.id === target.lessonId);
      if (lesson && lesson.pages.length <= 1) {
        setInlineNotice('Cada lección debe conservar al menos una página.');
        return;
      }
    }
    setPendingDelete(target);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;

    if (pendingDelete.kind === 'unit') {
      const filtered = project.units
        .filter(u => u.id !== pendingDelete.unitId)
        .map((u, idx) => ({ ...u, order: idx + 1 }));
      updateUnits(filtered, true);
      if (selectedUnitId === pendingDelete.unitId && filtered[0]) {
        const nextU = filtered[0];
        const nextL = nextU.lessons[0];
        const nextP = nextL?.pages[0];
        setSelectedUnitId(nextU.id);
        setSelectedLessonId(nextL?.id || '');
        setSelectedPageId(nextP?.id || '');
      }
    } else if (pendingDelete.kind === 'lesson' && pendingDelete.lessonId) {
      const newUnits = project.units.map(u => {
        if (u.id !== pendingDelete.unitId) return u;
        const filteredLessons = u.lessons
          .filter(l => l.id !== pendingDelete.lessonId)
          .map((l, idx) => ({ ...l, order: idx + 1 }));
        if (selectedLessonId === pendingDelete.lessonId && filteredLessons[0]) {
          setSelectedLessonId(filteredLessons[0].id);
          setSelectedPageId(filteredLessons[0].pages[0]?.id || '');
        }
        return { ...u, lessons: filteredLessons };
      });
      updateUnits(newUnits, true);
    } else if (pendingDelete.kind === 'page' && pendingDelete.lessonId && pendingDelete.pageId) {
      const newUnits = project.units.map(u => {
        if (u.id !== pendingDelete.unitId) return u;
        return {
          ...u,
          lessons: u.lessons.map(l => {
            if (l.id !== pendingDelete.lessonId) return l;
            const filteredPages = l.pages
              .filter(p => p.id !== pendingDelete.pageId)
              .map((p, idx) => ({ ...p, order: idx + 1 }));
            if (selectedPageId === pendingDelete.pageId && filteredPages[0]) {
              setSelectedPageId(filteredPages[0].id);
            }
            return { ...l, pages: filteredPages };
          })
        };
      });
      updateUnits(newUnits, true);
    }

    setPendingDelete(null);
  };

  // Rename helpers
  const renameUnit = (unitId: string, title: string) => {
    updateUnits(project.units.map(u => (u.id === unitId ? { ...u, title } : u)));
  };

  const renameLesson = (unitId: string, lessonId: string, title: string) => {
    updateUnits(
      project.units.map(u =>
        u.id !== unitId
          ? u
          : {
              ...u,
              lessons: u.lessons.map(l => (l.id === lessonId ? { ...l, title } : l))
            }
      )
    );
  };

  const renamePage = (unitId: string, lessonId: string, pageId: string, title: string) => {
    updateUnits(
      project.units.map(u =>
        u.id !== unitId
          ? u
          : {
              ...u,
              lessons: u.lessons.map(l =>
                l.id !== lessonId
                  ? l
                  : {
                      ...l,
                      pages: l.pages.map(p => (p.id === pageId ? { ...p, title } : p))
                    }
              )
            }
      )
    );
  };

  // Update active lesson metadata
  const handleUpdateCurrentLessonMeta = (updates: Partial<CourseLesson>) => {
    if (!currentUnit || !currentLesson) return;
    const newUnits = project.units.map(u => {
      if (u.id !== currentUnit.id) return u;
      return {
        ...u,
        lessons: u.lessons.map(l => (l.id === currentLesson.id ? { ...l, ...updates } : l))
      };
    });
    updateUnits(newUnits);
  };

  // Update active page metadata / rule / blocks
  const handleUpdateCurrentPage = (updates: Partial<CoursePage>, pruneMedia: boolean = false) => {
    if (!currentUnit || !currentLesson || !currentPage) return;
    const newUnits = project.units.map(u => {
      if (u.id !== currentUnit.id) return u;
      return {
        ...u,
        lessons: u.lessons.map(l => {
          if (l.id !== currentLesson.id) return l;
          return {
            ...l,
            pages: l.pages.map(p => (p.id === currentPage.id ? { ...p, ...updates } : p))
          };
        })
      };
    });
    updateUnits(newUnits, pruneMedia);
  };

  const handleUpdatePageRule = (rule: PageNavigationRule) => {
    handleUpdateCurrentPage({ navigationRule: rule });
  };

  // Block management inside currentPage
  const handleAddBlock = (type: BlockType, presetQuestionId?: string) => {
    if (!currentPage) return;

    let newBlock: ContentBlock;
    const blockId = `blk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

    switch (type) {
      case 'text':
        newBlock = {
          id: blockId,
          type: 'text',
          title: 'Concepto Clave',
          content: '<p>Escribe aquí tu contenido educativo. Puedes incluir párrafos, negritas, tablas, enlaces y fórmulas.</p>'
        };
        break;
      case 'callout':
        newBlock = {
          id: blockId,
          type: 'callout',
          variant: 'tip',
          title: 'Consejo Práctico',
          content: 'Destaca aquí recomendaciones clave, ejemplos o preguntas de reflexión para el estudiante.'
        };
        break;
      case 'accordion':
        newBlock = {
          id: blockId,
          type: 'accordion',
          title: 'Secciones Desplegables',
          items: [
            { id: `acc-${Date.now()}-1`, title: 'Elemento Desplegable 1', content: 'Explicación detallada que se revela al hacer clic.' },
            { id: `acc-${Date.now()}-2`, title: 'Elemento Desplegable 2', content: 'Información complementaria para organizar la lectura.' }
          ]
        };
        break;
      case 'tabs':
        newBlock = {
          id: blockId,
          type: 'tabs',
          title: 'Perspectivas Temáticas',
          tabs: [
            { id: `tab-${Date.now()}-1`, label: 'Enfoque Teórico', content: 'Fundamentación científica y modelos de referencia.' },
            { id: `tab-${Date.now()}-2`, label: 'Aplicación Práctica', content: 'Guía paso a paso y casos de estudio.' }
          ]
        };
        break;
      case 'flashcards':
        newBlock = {
          id: blockId,
          type: 'flashcards',
          title: 'Tarjetas de Memoria (Flashcards)',
          cards: [
            { id: `fc-${Date.now()}-1`, front: 'Término o Pregunta Clave', back: 'Definición precisa o respuesta sintetizada.', hint: 'Pista para recordar' },
            { id: `fc-${Date.now()}-2`, front: 'Segundo Concepto Relevante', back: 'Significado y contexto pedagógico.', hint: 'Relaciónalo con el tema anterior' }
          ]
        };
        break;
      case 'checkpoint': {
        const firstCompatible = project.questionBank.find(
          q => isQuestionAutoGradable(q) && !q.pendingAdaptation
        );
        const qId = presetQuestionId || firstCompatible?.id || '';
        newBlock = {
          id: blockId,
          type: 'checkpoint',
          title: 'Comprobación Formativa',
          questionId: qId
        };
        break;
      }
      case 'media':
        newBlock = {
          id: blockId,
          type: 'media',
          title: 'Imagen o Recurso Visual',
          mediaType: 'image',
          url: '',
          caption: 'Descripción o pie de foto explicativo',
          altText: 'Ilustración didáctica'
        };
        break;
      case 'math':
        newBlock = {
          id: blockId,
          type: 'math',
          title: 'Fórmula Matemática / Ecuación',
          latex: 'E = m \\cdot c^2',
          caption: 'Fórmula de equivalencia masa-energía',
          displayMode: true
        } as MathBlock;
        break;
      case 'resource':
        newBlock = {
          id: blockId,
          type: 'resource',
          title: 'Documento o Material Descargable',
          description: 'Descarga este recurso para profundizar en los contenidos de la sección.',
          filename: '',
          relativePath: ''
        } as ResourceBlock;
        break;
      default:
        return;
    }

    handleUpdateCurrentPage({
      blocks: [...currentPage.blocks, newBlock]
    });
  };

  const handleUpdateBlock = (blockId: string, updatedBlock: ContentBlock, pruneMedia: boolean = false) => {
    if (!currentPage) return;
    handleUpdateCurrentPage(
      {
        blocks: currentPage.blocks.map(b => (b.id === blockId ? updatedBlock : b))
      },
      pruneMedia
    );
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!currentPage) return;
    handleUpdateCurrentPage(
      {
        blocks: currentPage.blocks.filter(b => b.id !== blockId)
      },
      true
    );
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (!currentPage) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentPage.blocks.length) return;
    const newBlocks = [...currentPage.blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, moved);
    handleUpdateCurrentPage({ blocks: newBlocks });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-100 relative">
      {/* Inline Notice Banner */}
      {inlineNotice && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{inlineNotice}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Confirmar eliminación
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  ¿Estás seguro de eliminar{' '}
                  {pendingDelete.kind === 'unit'
                    ? 'la unidad'
                    : pendingDelete.kind === 'lesson'
                    ? 'la lección'
                    : 'la página'}{' '}
                  <strong className="text-slate-900">"{pendingDelete.title}"</strong>? Esta acción eliminará todo su contenido interno.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Backdrop Overlay */}
      {showLeftPanel && (
        <div
          onClick={() => setShowLeftPanel(false)}
          className="md:hidden absolute inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* ====================================================================
          ZONE 1: LEFT PANEL - HIERARCHICAL COURSE STRUCTURE (Units -> Lessons -> Pages)
         ==================================================================== */}
      <aside
        aria-hidden={!showLeftPanel}
        className={`bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden absolute md:static inset-y-0 left-0 z-40 shadow-2xl md:shadow-none h-full ${
          showLeftPanel
            ? 'w-80 max-w-[85vw] translate-x-0 md:w-80 md:opacity-100 pointer-events-auto'
            : 'w-80 max-w-[85vw] -translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:border-r-0 pointer-events-none'
        }`}
      >
        <div className="w-80 max-w-[85vw] flex flex-col h-full">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/70 shrink-0">
          <div className="min-w-0">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider truncate">
              Estructura del Curso
            </h2>
            <p className="text-[11px] text-slate-500">
              {project.units.length} unidades · Árbol jerárquico
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleAddUnit}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Unidad</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLeftPanel(false)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
              title="Ocultar estructura del curso"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
          {project.units.map((unit, uIdx) => {
            const isUnitExpanded = expandedUnits[unit.id] !== false;
            const isEditingUnit = editingItem?.kind === 'unit' && editingItem.id === unit.id;

            return (
              <div
                key={unit.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
              >
                {/* Unit Row */}
                <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleUnitExpand(unit.id)}
                    className="p-0.5 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                    title={isUnitExpanded ? 'Contraer unidad' : 'Expandir unidad'}
                  >
                    {isUnitExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {isEditingUnit ? (
                    <input
                      autoFocus
                      type="text"
                      value={unit.title}
                      onChange={(e) => renameUnit(unit.id, e.target.value)}
                      onBlur={() => setEditingItem(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') setEditingItem(null);
                      }}
                      className="flex-1 text-xs font-bold text-slate-900 bg-white border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none min-w-0"
                    />
                  ) : (
                    <span
                      onClick={() => toggleUnitExpand(unit.id)}
                      onDoubleClick={() => setEditingItem({ kind: 'unit', id: unit.id })}
                      className="flex-1 text-xs font-extrabold text-slate-800 truncate cursor-pointer"
                      title={`${unit.title} (doble clic para renombrar)`}
                    >
                      {unit.title}
                    </span>
                  )}

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ kind: 'unit', id: unit.id })}
                      title="Renombrar unidad"
                      className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddLesson(unit.id)}
                      title="Agregar lección a esta unidad"
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    {project.units.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          requestDelete({
                            kind: 'unit',
                            unitId: unit.id,
                            title: unit.title
                          })
                        }
                        title="Eliminar unidad"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lessons inside Unit */}
                {isUnitExpanded && (
                  <div className="p-2 space-y-2">
                    {unit.lessons.map((lesson, lIdx) => {
                      const isLessonExpanded = expandedLessons[lesson.id] !== false;
                      const isLessonActive = currentLesson?.id === lesson.id;
                      const isEditingLesson =
                        editingItem?.kind === 'lesson' && editingItem.id === lesson.id;

                      return (
                        <div
                          key={lesson.id}
                          className={`rounded-lg border transition-colors ${
                            isLessonActive
                              ? 'border-blue-200 bg-blue-50/30'
                              : 'border-slate-200/80 bg-slate-50/40'
                          }`}
                        >
                          {/* Lesson Header */}
                          <div className="p-2 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleLessonExpand(lesson.id)}
                              className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              {isLessonExpanded ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                            </button>

                            <BookOpen
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isLessonActive ? 'text-blue-600' : 'text-slate-400'
                              }`}
                            />

                            {isEditingLesson ? (
                              <input
                                autoFocus
                                type="text"
                                value={lesson.title}
                                onChange={(e) => renameLesson(unit.id, lesson.id, e.target.value)}
                                onBlur={() => setEditingItem(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Escape') setEditingItem(null);
                                }}
                                className="flex-1 text-[11px] font-bold text-slate-900 bg-white border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none min-w-0"
                              />
                            ) : (
                              <span
                                onClick={() => {
                                  const targetPage = lesson.pages?.[0]?.id || '';
                                  handleSelectPage(unit.id, lesson.id, targetPage);
                                }}
                                onDoubleClick={() =>
                                  setEditingItem({ kind: 'lesson', id: lesson.id })
                                }
                                className={`flex-1 text-[11px] font-bold truncate cursor-pointer ${
                                  isLessonActive ? 'text-blue-900' : 'text-slate-700'
                                }`}
                                title={lesson.title}
                              >
                                {lesson.title}
                              </span>
                            )}

                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                disabled={lIdx === 0}
                                onClick={() => handleMoveLesson(unit.id, lIdx, 'up')}
                                title="Subir lección"
                                className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={lIdx === unit.lessons.length - 1}
                                onClick={() => handleMoveLesson(unit.id, lIdx, 'down')}
                                title="Bajar lección"
                                className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItem({ kind: 'lesson', id: lesson.id })}
                                title="Renombrar lección"
                                className="p-0.5 text-slate-400 hover:text-blue-600 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddPage(unit.id, lesson.id)}
                                title="Agregar página a esta lección"
                                className="p-0.5 text-blue-600 hover:bg-blue-100 rounded cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              {unit.lessons.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    requestDelete({
                                      kind: 'lesson',
                                      unitId: unit.id,
                                      lessonId: lesson.id,
                                      title: lesson.title
                                    })
                                  }
                                  title="Eliminar lección"
                                  className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Pages inside Lesson */}
                          {isLessonExpanded && (
                            <div className="pl-5 pr-1.5 pb-2 space-y-1">
                              {(lesson.pages || []).map((page, pIdx) => {
                                const isPageSelected = currentPage?.id === page.id;
                                const isEditingPage =
                                  editingItem?.kind === 'page' && editingItem.id === page.id;
                                const ruleType = page.navigationRule?.type || 'button';
                                const badge = RULE_BADGE_MAP[ruleType] || RULE_BADGE_MAP.button;
                                const BadgeIcon = badge.icon;

                                return (
                                  <div
                                    key={page.id}
                                    onClick={() => handleSelectPage(unit.id, lesson.id, page.id)}
                                    className={`group px-2 py-1.5 rounded-lg flex items-center justify-between gap-1.5 cursor-pointer transition-all text-[11px] ${
                                      isPageSelected
                                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/70'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <BadgeIcon
                                        className={`w-3 h-3 shrink-0 ${
                                          isPageSelected ? 'text-blue-200' : 'text-slate-400'
                                        }`}
                                      />
                                      {isEditingPage ? (
                                        <input
                                          autoFocus
                                          type="text"
                                          value={page.title}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) =>
                                            renamePage(unit.id, lesson.id, page.id, e.target.value)
                                          }
                                          onBlur={() => setEditingItem(null)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'Escape')
                                              setEditingItem(null);
                                          }}
                                          className="flex-1 text-[11px] font-bold text-slate-900 bg-white border border-blue-400 rounded px-1 py-0.5 focus:outline-none min-w-0"
                                        />
                                      ) : (
                                        <span
                                          onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            setEditingItem({ kind: 'page', id: page.id });
                                          }}
                                          className="truncate"
                                        >
                                          {page.title}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <span
                                        className={`text-[9px] px-1 rounded font-mono ${
                                          isPageSelected
                                            ? 'bg-blue-700 text-blue-100'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}
                                        title={`${page.blocks.length} bloques · Condición: ${badge.label}`}
                                      >
                                        {page.blocks.length}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={pIdx === 0}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMovePage(unit.id, lesson.id, pIdx, 'up');
                                        }}
                                        title="Subir página"
                                        className={`p-0.5 rounded disabled:opacity-20 cursor-pointer ${
                                          isPageSelected
                                            ? 'text-blue-100 hover:bg-blue-700'
                                            : 'text-slate-400 hover:text-slate-700'
                                        }`}
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={pIdx === lesson.pages.length - 1}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMovePage(unit.id, lesson.id, pIdx, 'down');
                                        }}
                                        title="Bajar página"
                                        className={`p-0.5 rounded disabled:opacity-20 cursor-pointer ${
                                          isPageSelected
                                            ? 'text-blue-100 hover:bg-blue-700'
                                            : 'text-slate-400 hover:text-slate-700'
                                        }`}
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                      {lesson.pages.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            requestDelete({
                                              kind: 'page',
                                              unitId: unit.id,
                                              lessonId: lesson.id,
                                              pageId: page.id,
                                              title: page.title
                                            });
                                          }}
                                          title="Eliminar página"
                                          className={`p-0.5 rounded cursor-pointer ${
                                            isPageSelected
                                              ? 'text-blue-100 hover:text-rose-200'
                                              : 'text-slate-400 hover:text-rose-600'
                                          }`}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => handleAddPage(unit.id, lesson.id)}
                                className="w-full py-1 px-2 rounded-md border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-[10px] font-bold text-slate-500 hover:text-blue-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Nueva página</span>
                              </button>
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
        </div>
        </div>
      </aside>

      {/* ====================================================================
          ZONE 2: CENTER PANEL - ACTIVE PAGE EDITOR
         ==================================================================== */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0 transition-all duration-300">
        {currentUnit && currentLesson && currentPage ? (
          <div
            className={`mx-auto space-y-5 transition-all duration-300 ${
              !showLeftPanel && !showRightPanel
                ? 'max-w-full'
                : !showLeftPanel || !showRightPanel
                ? 'max-w-6xl'
                : 'max-w-4xl'
            }`}
          >
            {/* Page Navigation & Breadcrumb Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowLeftPanel(v => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"
                    title={showLeftPanel ? 'Ocultar barra lateral de estructura' : 'Mostrar barra lateral de estructura'}
                    aria-expanded={showLeftPanel}
                  >
                    {showLeftPanel ? (
                      <PanelLeftClose className="w-4 h-4" />
                    ) : (
                      <PanelLeftOpen className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {showLeftPanel ? 'Ocultar árbol' : 'Estructura'}
                    </span>
                  </button>

                  <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 flex-wrap">
                    <span className="text-blue-700">{currentUnit.title}</span>
                    <span>/</span>
                    <span className="text-slate-700">{currentLesson.title}</span>
                    <span>/</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Página {currentPageIndex + 1} de {currentPages.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Switch pages controls */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      disabled={currentPageIndex <= 0}
                      onClick={() => setSelectedPageId(currentPages[currentPageIndex - 1].id)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                      title="Página anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <select
                      value={currentPage.id}
                      onChange={(e) => setSelectedPageId(e.target.value)}
                      className="text-xs font-bold text-slate-800 bg-transparent px-2 py-1 focus:outline-none max-w-[180px] truncate cursor-pointer"
                    >
                      {currentPages.map((p, idx) => (
                        <option key={p.id} value={p.id}>
                          {idx + 1}. {p.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={currentPageIndex >= currentPages.length - 1}
                      onClick={() => setSelectedPageId(currentPages[currentPageIndex + 1].id)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                      title="Página siguiente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddPage(currentUnit.id, currentLesson.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Página</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRightPanel(v => !v)}
                    className="p-1.5 text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 rounded-lg border border-slate-200 cursor-pointer"
                    title={showRightPanel ? 'Ocultar panel de propiedades' : 'Mostrar panel de propiedades'}
                  >
                    {showRightPanel ? (
                      <PanelRightClose className="w-4 h-4" />
                    ) : (
                      <PanelRightOpen className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Active Page Title Input */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Nombre de la Página Activa
                  </label>
                  <input
                    type="text"
                    value={currentPage.title}
                    onChange={(e) => handleUpdateCurrentPage({ title: e.target.value })}
                    className="w-full text-lg font-extrabold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none pb-0.5"
                    placeholder="Título de la página..."
                  />
                </div>

                {/* Condition Badge Indicator */}
                {(() => {
                  const ruleType = currentPage.navigationRule?.type || 'button';
                  const badge = RULE_BADGE_MAP[ruleType] || RULE_BADGE_MAP.button;
                  const BadgeIcon = badge.icon;
                  return (
                    <div
                      onClick={() => setShowRightPanel(true)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer shrink-0 ${badge.pill}`}
                      title="Haz clic para configurar la condición de avance"
                    >
                      <BadgeIcon className="w-3.5 h-3.5" />
                      <span>Avance: {badge.label}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Block Add Toolbar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Agregar Bloque a "{currentPage.title}"
                </span>
                <span className="text-[11px] text-slate-400">
                  {currentPage.blocks.length} bloques en esta página
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                <button
                  type="button"
                  onClick={() => handleAddBlock('text')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-center group cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-800">Texto</span>
                  <span className="text-[9px] text-slate-400">Enriquecido</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBlock('callout')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all text-center group cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-800">Destacado</span>
                  <span className="text-[9px] text-slate-400">Tips &amp; Ejemplos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBlock('math')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all text-center group cursor-pointer"
                >
                  <Sigma className="w-4 h-4 text-teal-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-800">Fórmula</span>
                  <span className="text-[9px] text-slate-400">LaTeX / KaTeX</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBlock('media')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all text-center group cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-sky-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-800">Multimedia</span>
                  <span className="text-[9px] text-slate-400">Imagen / Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBlock('resource')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-center group cursor-pointer"
                >
                  <Download className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-800">Recurso</span>
                  <span className="text-[9px] text-slate-400">Descargable</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBlock('accordion')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-center group cursor-pointer"
                >
                  <LayoutList className="w-4 h-4 text-indigo-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-800">Acordeón</span>
                  <span className="text-[9px] text-slate-400">Plegables</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBlock('tabs')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-center group cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-800">Pestañas</span>
                  <span className="text-[9px] text-slate-400">Paralelas</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBlock('flashcards')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all text-center group cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-violet-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-800">Tarjetas</span>
                  <span className="text-[9px] text-slate-400">Flashcards</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBlock('checkpoint')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 transition-all text-center group cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-rose-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-slate-800">Pregunta</span>
                  <span className="text-[9px] text-slate-400">Comprobación</span>
                </button>
              </div>
            </div>

            {/* Active Page Content Blocks */}
            <div className="space-y-4">
              {currentPage.blocks.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700">
                    Esta página aún no tiene bloques de contenido
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Usa la barra superior para insertar texto enriquecido, imágenes, fórmulas, recursos o actividades.
                  </p>
                </div>
              ) : (
                currentPage.blocks.map((block, bIdx) => (
                  <div
                    key={block.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
                  >
                    {/* Block Header */}
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0">
                          Bloque {bIdx + 1}: {block.type}
                        </span>
                        <input
                          type="text"
                          value={block.title || ''}
                          onChange={(e) =>
                            handleUpdateBlock(block.id, { ...block, title: e.target.value })
                          }
                          placeholder="Título opcional del bloque..."
                          className="text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none flex-1 min-w-0"
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={bIdx === 0}
                          onClick={() => handleMoveBlock(bIdx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                          title="Subir bloque"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={bIdx === currentPage.blocks.length - 1}
                          onClick={() => handleMoveBlock(bIdx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                          title="Bajar bloque"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBlock(block.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                          title="Eliminar este bloque"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Block Body */}
                    <div className="p-4">
                      {block.type === 'text' && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                            <span>Editor de Texto Enriquecido</span>
                            <span className="text-[11px] font-normal text-slate-400">
                              Admite fórmulas KaTeX ($...$ o $$...$$), tablas editables, listas e imágenes
                            </span>
                          </label>
                          <RichTextEditor
                            content={(block as TextBlock).content}
                            onChange={(html) =>
                              handleUpdateBlock(block.id, { ...block, content: html })
                            }
                            placeholder="Redacta las explicaciones teóricas, conceptos o actividades..."
                          />
                        </div>
                      )}

                      {block.type === 'callout' && (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <label className="text-xs font-semibold text-slate-700">
                              Tipo de Bloque Didáctico:
                            </label>
                            <select
                              value={(block as CalloutBlock).variant}
                              onChange={(e) =>
                                handleUpdateBlock(block.id, {
                                  ...block,
                                  variant: e.target.value as any
                                })
                              }
                              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-800"
                            >
                              <option value="definition">📖 Definición Teórica (Púrpura)</option>
                              <option value="example">🔍 Ejemplo Resuelto (Cian)</option>
                              <option value="tip">💡 Consejo Práctico (Verde esmeralda)</option>
                              <option value="warning">⚠️ Advertencia / Atención (Ámbar)</option>
                              <option value="activity">⚡ Actividad de Aplicación (Naranja)</option>
                              <option value="reflection">🤔 Pregunta de Reflexión (Fucsia)</option>
                              <option value="info">ℹ️ Información Complementaria (Azul)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Contenido del Destacado Didáctico (puedes incluir fórmulas LaTeX con $...$)
                            </label>
                            <textarea
                              rows={3}
                              value={(block as CalloutBlock).content}
                              onChange={(e) =>
                                handleUpdateBlock(block.id, { ...block, content: e.target.value })
                              }
                              placeholder="Escribe el texto de la definición, ejemplo o reflexión..."
                              className="w-full text-xs text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white leading-relaxed"
                            />
                            {((block as CalloutBlock).content.includes('$') ||
                              (block as CalloutBlock).content.includes('\\')) && (
                              <div className="mt-2 p-2.5 bg-white border border-slate-200 rounded-lg text-xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Vista Previa con KaTeX:
                                </span>
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: MathService.renderFormulasInHtml(
                                      (block as CalloutBlock).content
                                    )
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {block.type === 'accordion' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-600">
                              Secciones del Acordeón
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const acc = block as AccordionBlock;
                                const newItem = {
                                  id: `acc-${Date.now()}`,
                                  title: `Nuevo elemento ${acc.items.length + 1}`,
                                  content: 'Contenido explicativo de este elemento.'
                                };
                                handleUpdateBlock(block.id, {
                                  ...acc,
                                  items: [...acc.items, newItem]
                                });
                              }}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              + Agregar elemento
                            </button>
                          </div>

                          {(block as AccordionBlock).items.map((item, itemIdx) => (
                            <div
                              key={item.id}
                              className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => {
                                    const acc = block as AccordionBlock;
                                    const updated = [...acc.items];
                                    updated[itemIdx] = { ...updated[itemIdx], title: e.target.value };
                                    handleUpdateBlock(block.id, { ...acc, items: updated });
                                  }}
                                  placeholder="Título de la pestaña plegable"
                                  className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1 flex-1"
                                />
                                {(block as AccordionBlock).items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const acc = block as AccordionBlock;
                                      const updated = acc.items.filter(i => i.id !== item.id);
                                      handleUpdateBlock(block.id, { ...acc, items: updated });
                                    }}
                                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <textarea
                                rows={2}
                                value={item.content}
                                onChange={(e) => {
                                  const acc = block as AccordionBlock;
                                  const updated = [...acc.items];
                                  updated[itemIdx] = { ...updated[itemIdx], content: e.target.value };
                                  handleUpdateBlock(block.id, { ...acc, items: updated });
                                }}
                                placeholder="Contenido que se desplegará al hacer clic..."
                                className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded p-2"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {block.type === 'tabs' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-600">
                              Pestañas Configuradas
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const tb = block as TabsBlock;
                                const newTab = {
                                  id: `tab-${Date.now()}`,
                                  label: `Pestaña ${tb.tabs.length + 1}`,
                                  content: 'Información expuesta en este panel.'
                                };
                                handleUpdateBlock(block.id, {
                                  ...tb,
                                  tabs: [...tb.tabs, newTab]
                                });
                              }}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              + Agregar pestaña
                            </button>
                          </div>

                          {(block as TabsBlock).tabs.map((tab, tIdx) => (
                            <div
                              key={tab.id}
                              className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={tab.label}
                                  onChange={(e) => {
                                    const tb = block as TabsBlock;
                                    const updated = [...tb.tabs];
                                    updated[tIdx] = { ...updated[tIdx], label: e.target.value };
                                    handleUpdateBlock(block.id, { ...tb, tabs: updated });
                                  }}
                                  placeholder="Etiqueta de la pestaña"
                                  className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1 flex-1"
                                />
                                {(block as TabsBlock).tabs.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const tb = block as TabsBlock;
                                      const updated = tb.tabs.filter(t => t.id !== tab.id);
                                      handleUpdateBlock(block.id, { ...tb, tabs: updated });
                                    }}
                                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <textarea
                                rows={2}
                                value={tab.content}
                                onChange={(e) => {
                                  const tb = block as TabsBlock;
                                  const updated = [...tb.tabs];
                                  updated[tIdx] = { ...updated[tIdx], content: e.target.value };
                                  handleUpdateBlock(block.id, { ...tb, tabs: updated });
                                }}
                                placeholder="Contenido del panel de la pestaña..."
                                className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded p-2"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {block.type === 'flashcards' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-600">
                              Tarjetas de Memoria Didácticas
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const fc = block as FlashcardsBlock;
                                const newCard = {
                                  id: `fc-${Date.now()}`,
                                  front: `Pregunta o Término ${fc.cards.length + 1}`,
                                  back: 'Respuesta o definición detallada.',
                                  hint: 'Pista de memorización'
                                };
                                handleUpdateBlock(block.id, {
                                  ...fc,
                                  cards: [...fc.cards, newCard]
                                });
                              }}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              + Agregar tarjeta
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(block as FlashcardsBlock).cards.map((card, cIdx) => (
                              <div
                                key={card.id}
                                className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 relative"
                              >
                                {(block as FlashcardsBlock).cards.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const fc = block as FlashcardsBlock;
                                      const updated = fc.cards.filter(c => c.id !== card.id);
                                      handleUpdateBlock(block.id, { ...fc, cards: updated });
                                    }}
                                    className="absolute top-2 right-2 text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    Frente (Pregunta/Término)
                                  </label>
                                  <input
                                    type="text"
                                    value={card.front}
                                    onChange={(e) => {
                                      const fc = block as FlashcardsBlock;
                                      const updated = [...fc.cards];
                                      updated[cIdx] = { ...updated[cIdx], front: e.target.value };
                                      handleUpdateBlock(block.id, { ...fc, cards: updated });
                                    }}
                                    className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 mt-0.5"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    Dorso (Respuesta/Definición)
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={card.back}
                                    onChange={(e) => {
                                      const fc = block as FlashcardsBlock;
                                      const updated = [...fc.cards];
                                      updated[cIdx] = { ...updated[cIdx], back: e.target.value };
                                      handleUpdateBlock(block.id, { ...fc, cards: updated });
                                    }}
                                    className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded p-1.5 mt-0.5"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    Pista opcional
                                  </label>
                                  <input
                                    type="text"
                                    value={card.hint || ''}
                                    onChange={(e) => {
                                      const fc = block as FlashcardsBlock;
                                      const updated = [...fc.cards];
                                      updated[cIdx] = { ...updated[cIdx], hint: e.target.value };
                                      handleUpdateBlock(block.id, { ...fc, cards: updated });
                                    }}
                                    placeholder="Ej. Revisa la lección anterior"
                                    className="w-full text-xs text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 mt-0.5"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {block.type === 'checkpoint' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700">
                              Selecciona la pregunta vinculada desde el banco de reactivos:
                            </label>
                            <button
                              type="button"
                              onClick={onOpenQuestionBank}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              Ir al Banco de Preguntas →
                            </button>
                          </div>

                          {project.questionBank.length === 0 ? (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                              Aún no has creado preguntas en el banco de reactivos. Ve a la sección "Banco de Preguntas" para formularlas.
                            </div>
                          ) : (
                            <>
                              <select
                                value={(block as CheckpointBlock).questionId}
                                onChange={(e) =>
                                  handleUpdateBlock(block.id, { ...block, questionId: e.target.value })
                                }
                                className="w-full text-xs text-slate-800 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                              >
                                <option value="">-- Seleccionar pregunta autocorregible --</option>
                                {project.questionBank.map((q) => {
                                  const compat = isQuestionAutoGradable(q) && !q.pendingAdaptation;
                                  const catLabel = CategoryService.getCategoryBreadcrumb(
                                    project.questionCategories || [],
                                    q.categoryId
                                  );
                                  return (
                                    <option key={q.id} value={q.id} disabled={!compat}>
                                      {compat ? '' : '[No autocorregible] '}[{catLabel}] {(q.name || q.prompt).slice(0, 55)} ({q.points} pts)
                                    </option>
                                  );
                                })}
                              </select>
                              {(() => {
                                const sel = project.questionBank.find(
                                  q => q.id === (block as CheckpointBlock).questionId
                                );
                                if (sel && (!isQuestionAutoGradable(sel) || sel.pendingAdaptation)) {
                                  return (
                                    <p className="text-[11px] text-rose-700 font-semibold">
                                      Esta pregunta ({sel.type}) no es autocorregible; selecciona otra pregunta compatible para que el bloque funcione en SCORM.
                                    </p>
                                  );
                                }
                                return null;
                              })()}
                            </>
                          )}
                        </div>
                      )}

                      {block.type === 'media' && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-semibold text-slate-700">
                              Tipo de Recurso:
                            </label>
                            <select
                              value={(block as MediaBlock).mediaType}
                              onChange={(e) =>
                                handleUpdateBlock(
                                  block.id,
                                  {
                                    ...block,
                                    mediaType: e.target.value as MediaBlock['mediaType'],
                                    url: ''
                                  },
                                  true
                                )
                              }
                              className="text-xs border border-slate-300 rounded p-1.5 bg-white"
                            >
                              <option value="image">Imagen (Local o Enlace)</option>
                              <option value="audio">Audio Local (MP3, WAV, OGG)</option>
                              <option value="video_file">Video Local (MP4, WebM)</option>
                              <option value="video_embed">Video Embebido (YouTube, Vimeo, etc.)</option>
                            </select>
                          </div>

                          {(block as MediaBlock).mediaType === 'image' && (
                            <div className="space-y-2">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                {(block as MediaBlock).url ? (
                                  <div className="w-24 h-16 rounded border bg-slate-100 overflow-hidden shrink-0">
                                    <img
                                      src={MediaService.resolveMediaUrl((block as MediaBlock).url)}
                                      alt="Vista previa"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-24 h-16 rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                                    <ImageIcon className="w-5 h-5" />
                                  </div>
                                )}

                                <div className="flex-1 space-y-1">
                                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Subir imagen desde el equipo</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const meta = await MediaService.addMediaFile(file, project.id);
                                          handleUpdateBlock(
                                            block.id,
                                            {
                                              ...block,
                                              url: meta.relativePath,
                                              mediaAssetId: meta.id
                                            },
                                            true
                                          );
                                        }
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                  <div className="text-[10px] text-slate-400">
                                    O ingresa una URL:
                                  </div>
                                  <input
                                    type="text"
                                    value={(block as MediaBlock).url}
                                    onChange={(e) =>
                                      handleUpdateBlock(block.id, { ...block, url: e.target.value })
                                    }
                                    placeholder="media/imagenes/nombre.jpg o https://..."
                                    className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {(block as MediaBlock).mediaType === 'audio' && (
                            <div className="space-y-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Subir audio desde el equipo</span>
                                  <input
                                    type="file"
                                    accept="audio/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const meta = await MediaService.addMediaFile(file, project.id);
                                        handleUpdateBlock(
                                          block.id,
                                          {
                                            ...block,
                                            url: meta.relativePath,
                                            mediaAssetId: meta.id
                                          },
                                          true
                                        );
                                      }
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                                {(block as MediaBlock).url && (
                                  <span className="text-[11px] font-mono text-slate-500 truncate max-w-xs">
                                    {(block as MediaBlock).url}
                                  </span>
                                )}
                              </div>
                              {(block as MediaBlock).url && (
                                <audio
                                  controls
                                  src={MediaService.resolveMediaUrl((block as MediaBlock).url)}
                                  className="w-full"
                                />
                              )}
                            </div>
                          )}

                          {(block as MediaBlock).mediaType === 'video_file' && (
                            <div className="space-y-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Subir video desde el equipo</span>
                                  <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const meta = await MediaService.addMediaFile(file, project.id);
                                        handleUpdateBlock(
                                          block.id,
                                          {
                                            ...block,
                                            url: meta.relativePath,
                                            mediaAssetId: meta.id
                                          },
                                          true
                                        );
                                      }
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                                {(block as MediaBlock).url && (
                                  <span className="text-[11px] font-mono text-slate-500 truncate max-w-xs">
                                    {(block as MediaBlock).url}
                                  </span>
                                )}
                              </div>
                              {(block as MediaBlock).url && (
                                <video
                                  controls
                                  src={MediaService.resolveMediaUrl((block as MediaBlock).url)}
                                  className="w-full max-h-64 rounded-lg bg-black"
                                />
                              )}
                            </div>
                          )}

                          {(block as MediaBlock).mediaType === 'video_embed' && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                URL del iframe de video embebido (YouTube embed, etc.)
                              </label>
                              <input
                                type="text"
                                value={(block as MediaBlock).url}
                                onChange={(e) =>
                                  handleUpdateBlock(block.id, { ...block, url: e.target.value })
                                }
                                placeholder="https://www.youtube.com/embed/..."
                                className="w-full text-xs p-2 border border-slate-200 rounded bg-white font-mono"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                                Pie de foto / Leyenda
                              </label>
                              <input
                                type="text"
                                value={(block as MediaBlock).caption || ''}
                                onChange={(e) =>
                                  handleUpdateBlock(block.id, { ...block, caption: e.target.value })
                                }
                                placeholder="Ej. Diagrama del ciclo ADDIE"
                                className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                                Texto alternativo (accesibilidad)
                              </label>
                              <input
                                type="text"
                                value={(block as MediaBlock).altText || ''}
                                onChange={(e) =>
                                  handleUpdateBlock(block.id, { ...block, altText: e.target.value })
                                }
                                placeholder="Descripción accesible"
                                className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {block.type === 'math' && (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Sigma className="w-4 h-4 text-teal-600" />
                              <span>Expresión Matemática (Sintaxis LaTeX):</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(block as MathBlock).displayMode}
                                onChange={(e) =>
                                  handleUpdateBlock(block.id, {
                                    ...block,
                                    displayMode: e.target.checked
                                  })
                                }
                                className="rounded text-teal-600 focus:ring-teal-500"
                              />
                              <span>Centrar ecuación en bloque independiente</span>
                            </label>
                          </div>

                          <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-center mr-1">
                              Insertar:
                            </span>
                            {[
                              { label: 'a/b', latex: '\\frac{a}{b}' },
                              { label: '√x', latex: '\\sqrt{x}' },
                              { label: 'x²', latex: 'x^{2}' },
                              { label: 'xᵢ', latex: 'x_{i}' },
                              { label: '∑', latex: '\\sum_{i=1}^{n}' },
                              { label: '∫', latex: '\\int_{a}^{b}' },
                              { label: '±', latex: '\\pm' },
                              { label: 'π', latex: '\\pi' },
                              { label: 'θ', latex: '\\theta' },
                              { label: '≠', latex: '\\neq' },
                              { label: '≤', latex: '\\le' },
                              { label: '≥', latex: '\\ge' },
                              { label: '∞', latex: '\\infty' }
                            ].map((sym, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => {
                                  const cur = (block as MathBlock).latex || '';
                                  handleUpdateBlock(block.id, {
                                    ...block,
                                    latex: cur ? `${cur} ${sym.latex}` : sym.latex
                                  });
                                }}
                                className="px-2 py-0.5 text-xs font-mono bg-white hover:bg-teal-50 hover:text-teal-700 border border-slate-200 rounded text-slate-700 transition-colors cursor-pointer"
                              >
                                {sym.label}
                              </button>
                            ))}
                          </div>

                          <textarea
                            rows={3}
                            value={(block as MathBlock).latex}
                            onChange={(e) =>
                              handleUpdateBlock(block.id, { ...block, latex: e.target.value })
                            }
                            placeholder="Ej. f(x) = \int_{-\infty}^{\infty} \hat{f}(\xi) e^{2\pi i \xi x} d\xi"
                            className="w-full text-xs font-mono text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                          />

                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                              Pie explicativo / Leyenda de la ecuación (opcional)
                            </label>
                            <input
                              type="text"
                              value={(block as MathBlock).caption || ''}
                              onChange={(e) =>
                                handleUpdateBlock(block.id, { ...block, caption: e.target.value })
                              }
                              placeholder="Ej. Transformada inversa de Fourier"
                              className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white"
                            />
                          </div>

                          <div className="p-4 bg-teal-50/40 border border-teal-200 rounded-xl">
                            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block mb-2">
                              Visualización con KaTeX:
                            </span>
                            <div
                              className="overflow-x-auto text-slate-900 py-1"
                              dangerouslySetInnerHTML={{
                                __html: MathService.renderLatexToHtml(
                                  (block as MathBlock).latex || '...',
                                  (block as MathBlock).displayMode
                                )
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {block.type === 'resource' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-slate-700 block mb-1">
                                Título del Recurso
                              </label>
                              <input
                                type="text"
                                value={(block as ResourceBlock).title}
                                onChange={(e) =>
                                  handleUpdateBlock(block.id, { ...block, title: e.target.value })
                                }
                                placeholder="Ej. Guía práctica en PDF, Plantilla Excel..."
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-700 block mb-1">
                                Cargar Archivo desde tu Computador
                              </label>
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer transition-colors w-full justify-center">
                                <Upload className="w-4 h-4" />
                                <span>Seleccionar archivo (PDF, DOCX, ZIP, etc.)</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const meta = await MediaService.addMediaFile(file, project.id);
                                      handleUpdateBlock(
                                        block.id,
                                        {
                                          ...block,
                                          filename: meta.filename,
                                          relativePath: meta.relativePath,
                                          fileSize: meta.size
                                        },
                                        true
                                      );
                                    }
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Descripción o Instrucción para el Estudiante
                            </label>
                            <textarea
                              rows={2}
                              value={(block as ResourceBlock).description || ''}
                              onChange={(e) =>
                                handleUpdateBlock(block.id, { ...block, description: e.target.value })
                              }
                              placeholder="Explica para qué sirve este archivo y cuándo debe consultarlo el estudiante..."
                              className="w-full text-xs text-slate-800 p-2 border border-slate-200 rounded-lg bg-white"
                            />
                          </div>

                          <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-lg flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 truncate">
                              <Paperclip className="w-5 h-5 text-purple-600 shrink-0" />
                              <div className="truncate">
                                <div className="text-xs font-bold text-slate-800 truncate">
                                  {(block as ResourceBlock).filename || 'Ningún archivo asignado'}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {(block as ResourceBlock).relativePath
                                    ? `Ruta en paquete: ${(block as ResourceBlock).relativePath} (${Math.round(
                                        ((block as ResourceBlock).fileSize || 0) / 1024
                                      )} KB)`
                                    : 'Haz clic en "Seleccionar archivo" para adjuntar el documento al proyecto.'}
                                </div>
                              </div>
                            </div>

                            {(block as ResourceBlock).relativePath && (
                              <a
                                href={MediaService.resolveMediaUrl((block as ResourceBlock).relativePath)}
                                download={(block as ResourceBlock).filename}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg shrink-0 cursor-pointer shadow-xs"
                                title="Descargar para comprobar"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Probar</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-3">
            {!showLeftPanel && (
              <button
                type="button"
                onClick={() => setShowLeftPanel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
                <span>Mostrar Estructura del Curso</span>
              </button>
            )}
            <span>Selecciona una página del árbol izquierdo para comenzar a diseñar.</span>
          </div>
        )}
      </main>

      {/* ====================================================================
          ZONE 3: RIGHT PANEL - PAGE NAVIGATION CONDITION & LESSON PROPS
         ==================================================================== */}
      {showRightPanel && currentLesson && currentPage && (
        <PageNavigationPanel
          project={project}
          lesson={currentLesson}
          page={currentPage}
          onUpdatePageRule={handleUpdatePageRule}
          onUpdatePageMeta={handleUpdateCurrentPage}
          onUpdateLessonMeta={handleUpdateCurrentLessonMeta}
          onInsertQuestionBlock={(qId) => handleAddBlock('checkpoint', qId)}
          onOpenQuestionBank={onOpenQuestionBank}
        />
      )}
    </div>
  );
};
