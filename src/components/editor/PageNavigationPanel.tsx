import React, { useState } from 'react';
import {
  MousePointerClick,
  ArrowDownToLine,
  HelpCircle,
  Sparkles,
  FileCheck2,
  Settings2,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Layers,
  Info,
  Lock
} from 'lucide-react';
import {
  CourseProject,
  CourseLesson,
  CoursePage,
  NavigationConditionType,
  PageNavigationRule,
  LessonNavigationConfig,
  LessonNavigationMode
} from '../../types/scorm';
import {
  NavigationService,
  DEFAULT_LESSON_NAV_CONFIG,
  DEFAULT_PAGE_NAV_RULE
} from '../../services/navigationService';
import { CategoryService, isQuestionAutoGradable } from '../../services/categoryService';

interface PageNavigationPanelProps {
  project: CourseProject;
  lesson: CourseLesson;
  page: CoursePage;
  onUpdatePageRule: (rule: PageNavigationRule) => void;
  onUpdatePageMeta: (updates: Partial<CoursePage>) => void;
  onUpdateLessonMeta: (updates: Partial<CourseLesson>) => void;
  onInsertQuestionBlock: (questionId: string) => void;
  onOpenQuestionBank: () => void;
}

const CONDITION_CARDS: {
  type: NavigationConditionType;
  name: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  colorClass: string;
  activeBorderClass: string;
}[] = [
  {
    type: 'button',
    name: 'Botón Siguiente',
    description: 'Avanza al presionar Siguiente sin requisitos previos.',
    icon: MousePointerClick,
    colorClass: 'text-blue-600 bg-blue-50',
    activeBorderClass: 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20'
  },
  {
    type: 'scrolling',
    name: 'Lectura / Scrolling',
    description: 'Debe desplazarse hasta el final del contenido de la sección.',
    icon: ArrowDownToLine,
    colorClass: 'text-teal-600 bg-teal-50',
    activeBorderClass: 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500/20'
  },
  {
    type: 'question',
    name: 'Responder Pregunta',
    description: 'Debe responder o acertar una pregunta de comprobación.',
    icon: HelpCircle,
    colorClass: 'text-rose-600 bg-rose-50',
    activeBorderClass: 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/20'
  },
  {
    type: 'interaction',
    name: 'Interacción',
    description: 'Debe explorar tarjetas, acordeones o pestañas interactivas.',
    icon: Sparkles,
    colorClass: 'text-violet-600 bg-violet-50',
    activeBorderClass: 'border-violet-500 bg-violet-50/40 ring-2 ring-violet-500/20'
  },
  {
    type: 'resource',
    name: 'Revisar Recurso',
    description: 'Debe abrir y/o confirmar la revisión de un archivo adjunto.',
    icon: FileCheck2,
    colorClass: 'text-purple-600 bg-purple-50',
    activeBorderClass: 'border-purple-500 bg-purple-50/40 ring-2 ring-purple-500/20'
  }
];

export const PageNavigationPanel: React.FC<PageNavigationPanelProps> = ({
  project,
  lesson,
  page,
  onUpdatePageRule,
  onUpdatePageMeta,
  onUpdateLessonMeta,
  onInsertQuestionBlock,
  onOpenQuestionBank
}) => {
  const [activeTab, setActiveTab] = useState<'page_rule' | 'lesson_props'>('page_rule');

  const rule: PageNavigationRule = page.navigationRule || DEFAULT_PAGE_NAV_RULE;
  const lessonNav: LessonNavigationConfig = lesson.navigationConfig || DEFAULT_LESSON_NAV_CONFIG;

  const interactiveTargets = NavigationService.getPageInteractiveTargets(page);
  const resourceBlocks = NavigationService.getPageResourceBlocks(page);
  const checkpointQIds = NavigationService.getPageCheckpointQuestionIds(page);

  // Preview evaluation message for teacher clarity
  const previewEval = NavigationService.evaluatePageCondition(page, undefined, project);

  const handleSelectConditionType = (type: NavigationConditionType) => {
    const nextRule: PageNavigationRule = { type };
    if (type === 'scrolling') {
      nextRule.scrollThresholdPercent = 95;
    } else if (type === 'question') {
      const firstCompatible = project.questionBank.find(
        q => isQuestionAutoGradable(q) && !q.pendingAdaptation
      );
      nextRule.questionId = checkpointQIds[0] || firstCompatible?.id || '';
      nextRule.questionCriteria = 'correct';
      nextRule.maxAttempts = 0;
      nextRule.allowRetry = true;
      nextRule.showFeedback = true;
    } else if (type === 'interaction') {
      nextRule.targetBlockId = interactiveTargets[0]?.blockId || 'any';
      nextRule.interactionCriteria = 'all_items';
      nextRule.requiredCount = 1;
      nextRule.requiredItemIds = [];
    } else if (type === 'resource') {
      nextRule.resourceBlockId = resourceBlocks[0]?.id || '';
      nextRule.resourceCriteria = 'confirm_review';
    }
    onUpdatePageRule(nextRule);
  };

  const updateLessonNav = (patch: Partial<LessonNavigationConfig>) => {
    onUpdateLessonMeta({
      navigationConfig: {
        ...lessonNav,
        ...patch
      }
    });
  };

  // Selected interactive target for item-level selection
  const selectedTargetBlock =
    rule.targetBlockId && rule.targetBlockId !== 'any'
      ? interactiveTargets.find(t => t.blockId === rule.targetBlockId)
      : undefined;
  const availableItemsForRule = selectedTargetBlock
    ? selectedTargetBlock.items
    : interactiveTargets.flatMap(t => t.items);

  return (
    <aside className="w-80 xl:w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 h-full overflow-hidden">
      {/* Panel Header Tabs */}
      <div className="border-b border-slate-200 bg-slate-50 px-3 pt-3">
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl mb-3">
          <button
            type="button"
            onClick={() => setActiveTab('page_rule')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === 'page_rule'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Condición de navegación</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lesson_props')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === 'lesson_props'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Lección y Reglas</span>
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === 'page_rule' ? (
          <>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Condición de Avance de Sección
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Define qué debe hacer el estudiante en <strong className="text-slate-700">{page.title}</strong> para desbloquear el botón <em>Siguiente</em>.
              </p>
            </div>

            {/* 5 Visual Cards */}
            <div className="space-y-2">
              {CONDITION_CARDS.map(card => {
                const Icon = card.icon;
                const isSelected = rule.type === card.type;
                return (
                  <button
                    key={card.type}
                    type="button"
                    onClick={() => handleSelectConditionType(card.type)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? card.activeBorderClass
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">{card.name}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        {card.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Contextual Parameter Configuration */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Parámetros de la Condición</span>
              </div>

              {/* A. BUTTON */}
              {rule.type === 'button' && (
                <div className="text-xs text-slate-600 leading-relaxed">
                  No requiere configuración adicional. El botón <strong>Siguiente</strong> estará habilitado inmediatamente al abrir la sección.
                </div>
              )}

              {/* B. SCROLLING */}
              {rule.type === 'scrolling' && (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    El reproductor medirá únicamente el desplazamiento del área de lectura de esta página (ignorando el menú lateral) y habilitará <strong>Siguiente</strong> al llegar al final.
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Umbral de detección de final de lectura: {rule.scrollThresholdPercent ?? 95}%
                    </label>
                    <input
                      type="range"
                      min={80}
                      max={100}
                      step={5}
                      value={rule.scrollThresholdPercent ?? 95}
                      onChange={(e) =>
                        onUpdatePageRule({ ...rule, scrollThresholdPercent: Number(e.target.value) })
                      }
                      className="w-full accent-teal-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>80% del contenido</span>
                      <span>100% (final exacto)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* C. QUESTION */}
              {rule.type === 'question' && (
                <div className="space-y-3">
                  {project.questionBank.length === 0 ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 space-y-2">
                      <p>Tu banco de preguntas está vacío. Crea una pregunta para asociarla.</p>
                      <button
                        type="button"
                        onClick={onOpenQuestionBank}
                        className="text-xs font-bold text-blue-700 underline cursor-pointer"
                      >
                        Ir al Banco de Preguntas →
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Pregunta asociada
                        </label>
                        <select
                          value={rule.questionId || ''}
                          onChange={(e) => onUpdatePageRule({ ...rule, questionId: e.target.value })}
                          className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                        >
                          <option value="">-- Seleccionar pregunta autocorregible --</option>
                          {project.questionBank.map(q => {
                            const onPage = checkpointQIds.includes(q.id);
                            const compat = isQuestionAutoGradable(q) && !q.pendingAdaptation;
                            const catLabel = CategoryService.getCategoryBreadcrumb(
                              project.questionCategories || [],
                              q.categoryId
                            );
                            return (
                              <option key={q.id} value={q.id} disabled={!compat}>
                                {onPage ? '✓ [En página] ' : ''}
                                {compat ? '' : '[No autocorregible] '}
                                [{catLabel}] {(q.name || q.prompt).slice(0, 50)}
                              </option>
                            );
                          })}
                        </select>
                        {rule.questionId && !checkpointQIds.includes(rule.questionId) && (
                          <button
                            type="button"
                            onClick={() => onInsertQuestionBlock(rule.questionId!)}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Insertar bloque de esta pregunta en la página</span>
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Criterio de cumplimiento
                        </label>
                        <div className="grid grid-cols-1 gap-1.5">
                          <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white cursor-pointer text-xs">
                            <input
                              type="radio"
                              name="qCriteria"
                              checked={(rule.questionCriteria || 'correct') === 'answered'}
                              onChange={() => onUpdatePageRule({ ...rule, questionCriteria: 'answered' })}
                              className="text-rose-600"
                            />
                            <span>Basta con responder (cualquier respuesta)</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white cursor-pointer text-xs">
                            <input
                              type="radio"
                              name="qCriteria"
                              checked={(rule.questionCriteria || 'correct') === 'correct'}
                              onChange={() => onUpdatePageRule({ ...rule, questionCriteria: 'correct' })}
                              className="text-rose-600"
                            />
                            <span>Debe responder correctamente</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Intentos permitidos
                          </label>
                          <select
                            value={rule.maxAttempts ?? 0}
                            onChange={(e) => onUpdatePageRule({ ...rule, maxAttempts: Number(e.target.value) })}
                            className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-white"
                          >
                            <option value={0}>Ilimitados</option>
                            <option value={1}>1 intento</option>
                            <option value={2}>2 intentos</option>
                            <option value={3}>3 intentos</option>
                            <option value={5}>5 intentos</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.allowRetry !== false}
                            onChange={(e) => onUpdatePageRule({ ...rule, allowRetry: e.target.checked })}
                            className="rounded text-rose-600"
                          />
                          <span>Permitir volver a responder</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.showFeedback !== false}
                            onChange={(e) => onUpdatePageRule({ ...rule, showFeedback: e.target.checked })}
                            className="rounded text-rose-600"
                          />
                          <span>Mostrar retroalimentación al estudiante</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* D. INTERACTION */}
              {rule.type === 'interaction' && (
                <div className="space-y-3">
                  {interactiveTargets.length === 0 ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Esta página aún no tiene bloques de <strong>Tarjetas (Flashcards)</strong>, <strong>Acordeón</strong> o <strong>Pestañas</strong>. Agrega uno en el editor central para vincularlo.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Elemento interactivo objetivo
                        </label>
                        <select
                          value={rule.targetBlockId || 'any'}
                          onChange={(e) =>
                            onUpdatePageRule({
                              ...rule,
                              targetBlockId: e.target.value,
                              requiredItemIds: []
                            })
                          }
                          className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="any">Cualquier elemento interactivo de la página</option>
                          {interactiveTargets.map(t => (
                            <option key={t.blockId} value={t.blockId}>
                              [{t.blockType.toUpperCase()}] {t.blockTitle} ({t.items.length} ítems)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Condición de interacción
                        </label>
                        <select
                          value={rule.interactionCriteria || 'all_items'}
                          onChange={(e) =>
                            onUpdatePageRule({ ...rule, interactionCriteria: e.target.value as any })
                          }
                          className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="any_one">Basta interactuar con 1 elemento</option>
                          <option value="specific_count">Interactuar con un número específico</option>
                          <option value="all_items">Todos / Elementos obligatorios seleccionados</option>
                        </select>
                      </div>

                      {rule.interactionCriteria === 'specific_count' && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Cantidad mínima requerida (máx. {availableItemsForRule.length})
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, availableItemsForRule.length)}
                            value={rule.requiredCount || 1}
                            onChange={(e) =>
                              onUpdatePageRule({
                                ...rule,
                                requiredCount: Math.max(1, Number(e.target.value))
                              })
                            }
                            className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      )}

                      {(rule.interactionCriteria || 'all_items') === 'all_items' && availableItemsForRule.length > 0 && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Ítems obligatorios (si no marcas ninguno, serán todos):
                          </label>
                          <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-white border border-slate-200 rounded-lg">
                            {availableItemsForRule.map(item => {
                              const checked = (rule.requiredItemIds || []).includes(item.id);
                              return (
                                <label key={item.id} className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer py-0.5">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const cur = rule.requiredItemIds || [];
                                      const next = e.target.checked
                                        ? [...cur, item.id]
                                        : cur.filter(id => id !== item.id);
                                      onUpdatePageRule({ ...rule, requiredItemIds: next });
                                    }}
                                    className="rounded text-violet-600"
                                  />
                                  <span className="truncate">{item.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* E. RESOURCE */}
              {rule.type === 'resource' && (
                <div className="space-y-3">
                  {resourceBlocks.length === 0 ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Esta página aún no tiene un bloque de <strong>Recurso Descargable</strong>. Agrega un archivo PDF, presentación o guía en el editor central.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Recurso asociado
                        </label>
                        <select
                          value={rule.resourceBlockId || resourceBlocks[0]?.id || ''}
                          onChange={(e) => onUpdatePageRule({ ...rule, resourceBlockId: e.target.value })}
                          className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                        >
                          {resourceBlocks.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.title || r.filename || 'Recurso sin título'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Criterio de validación
                        </label>
                        <div className="space-y-1.5">
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 bg-white cursor-pointer text-[11px]">
                            <input
                              type="radio"
                              name="resCriteria"
                              checked={rule.resourceCriteria === 'open_only'}
                              onChange={() => onUpdatePageRule({ ...rule, resourceCriteria: 'open_only' })}
                              className="mt-0.5 text-purple-600"
                            />
                            <span>Basta con abrir o descargar el archivo</span>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 bg-white cursor-pointer text-[11px]">
                            <input
                              type="radio"
                              name="resCriteria"
                              checked={(rule.resourceCriteria || 'confirm_review') === 'confirm_review'}
                              onChange={() => onUpdatePageRule({ ...rule, resourceCriteria: 'confirm_review' })}
                              className="mt-0.5 text-purple-600"
                            />
                            <span>Abrir el recurso y confirmar explícitamente su revisión</span>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 bg-white cursor-pointer text-[11px]">
                            <input
                              type="radio"
                              name="resCriteria"
                              checked={rule.resourceCriteria === 'confirm_activity'}
                              onChange={() => onUpdatePageRule({ ...rule, resourceCriteria: 'confirm_activity' })}
                              className="mt-0.5 text-purple-600"
                            />
                            <span>Abrir y confirmar que completó una actividad relacionada</span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Configuration Error Alert (Fail-closed warning) */}
            {previewEval.configError && (
              <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 space-y-1">
                <span className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Configuración Incompleta (Sección Bloqueada)</span>
                </span>
                <p className="text-xs text-rose-900 font-medium leading-snug">
                  {previewEval.configError}
                </p>
              </div>
            )}

            {/* Live Student Instruction Preview */}
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 space-y-1">
              <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                <Info className="w-3 h-3" />
                Mensaje que verá el estudiante:
              </span>
              <p className="text-xs text-blue-950 font-medium leading-snug">
                "{previewEval.instruction}"
              </p>
            </div>

            {/* Page-specific option & future combination placeholder */}
            <div className="pt-2 border-t border-slate-200 space-y-2.5">
              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                <span>Permitir regresar desde esta página</span>
                <input
                  type="checkbox"
                  checked={page.allowBackOverride !== false}
                  onChange={(e) => onUpdatePageMeta({ allowBackOverride: e.target.checked })}
                  className="rounded text-blue-600"
                />
              </label>

              <div className="p-2.5 rounded-lg bg-slate-100/80 border border-dashed border-slate-300 text-[10px] text-slate-500 flex items-start gap-2">
                <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Modelo extensible: preparado para combinar múltiples condiciones (Y / O) por sección en próximas actualizaciones.
                </span>
              </div>
            </div>
          </>
        ) : (
          /* TAB 2: LESSON PROPERTIES & GENERAL NAVIGATION */
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Configuración de Lección y Navegación
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ajusta los metadatos y el modo global de recorrido de <strong>{lesson.title}</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Título de la Lección</label>
                <input
                  type="text"
                  value={lesson.title}
                  onChange={(e) => onUpdateLessonMeta({ title: e.target.value })}
                  className="w-full text-xs font-semibold text-slate-800 p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Resumen / Objetivo</label>
                <textarea
                  rows={2}
                  value={lesson.summary}
                  onChange={(e) => onUpdateLessonMeta({ summary: e.target.value })}
                  className="w-full text-xs text-slate-700 p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Duración Estimada (minutos)</label>
                <input
                  type="number"
                  min={1}
                  value={lesson.estimatedMinutes}
                  onChange={(e) => onUpdateLessonMeta({ estimatedMinutes: Math.max(1, Number(e.target.value)) })}
                  className="w-28 text-xs font-semibold text-slate-800 p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-3">
              <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Modo de Navegación entre Páginas
              </label>

              <div className="space-y-2">
                {[
                  {
                    id: 'sequential' as LessonNavigationMode,
                    title: 'Secuencial',
                    desc: 'El estudiante recorre las páginas en orden con Anterior y Siguiente, respetando las condiciones de cada página.'
                  },
                  {
                    id: 'free' as LessonNavigationMode,
                    title: 'Libre',
                    desc: 'El estudiante puede seleccionar cualquier página directamente desde el índice de la lección.'
                  },
                  {
                    id: 'sequential_with_requirements' as LessonNavigationMode,
                    title: 'Secuencial con Requisitos',
                    desc: 'Bloquea cualquier salto hacia adelante y exige completar todas las condiciones de página antes de finalizar la lección.'
                  }
                ].map(m => {
                  const active = lessonNav.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        updateLessonNav({
                          mode: m.id,
                          allowSkip: m.id === 'free',
                          requireCompletionToAdvance: m.id === 'sequential_with_requirements'
                        })
                      }
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        active
                          ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          {m.id === 'sequential_with_requirements' && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                          {m.title}
                        </span>
                        {active && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{m.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span>Permitir regresar a páginas anteriores</span>
                  <input
                    type="checkbox"
                    checked={lessonNav.allowBack}
                    onChange={(e) => updateLessonNav({ allowBack: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span>Permitir saltar páginas desde el índice</span>
                  <input
                    type="checkbox"
                    checked={lessonNav.allowSkip}
                    disabled={lessonNav.mode === 'sequential_with_requirements'}
                    onChange={(e) => updateLessonNav({ allowSkip: e.target.checked })}
                    className="rounded text-blue-600 disabled:opacity-40"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span>Mostrar índice de páginas al estudiante</span>
                  <input
                    type="checkbox"
                    checked={lessonNav.showPageIndex}
                    onChange={(e) => updateLessonNav({ showPageIndex: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span>Exigir requisitos para completar lección</span>
                  <input
                    type="checkbox"
                    checked={lessonNav.requireCompletionToAdvance}
                    onChange={(e) => updateLessonNav({ requireCompletionToAdvance: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
