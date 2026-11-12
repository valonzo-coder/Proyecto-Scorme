import React, { useState, useMemo } from 'react';
import {
  Plus,
  Award,
  Trash2,
  Edit3,
  AlertCircle,
  Shuffle,
  RefreshCw,
  FolderTree,
  CheckCircle2
} from 'lucide-react';
import {
  CourseProject,
  AssessmentConfig,
  AssessmentQuestionSnapshot,
  QuestionItem
} from '../../types/scorm';
import {
  CategoryService,
  DEFAULT_CATEGORY_ID,
  getQuestionSupportInfo,
  isQuestionAutoGradable
} from '../../services/categoryService';
import { MediaService } from '../../services/mediaService';

interface AssessmentsViewProps {
  project: CourseProject;
  onUpdateProject: (updated: CourseProject) => void;
  onOpenQuestionBank: () => void;
}

function buildSnapshot(q: QuestionItem): AssessmentQuestionSnapshot {
  return {
    bankQuestionId: q.id,
    capturedAt: q.updatedAt || new Date().toISOString(),
    question: JSON.parse(JSON.stringify(q))
  };
}

function areQuestionsContentEqual(a: QuestionItem, b: QuestionItem): boolean {
  return (
    a.type === b.type &&
    a.prompt === b.prompt &&
    (a.promptHtml || '') === (b.promptHtml || '') &&
    a.points === b.points &&
    a.explanation === b.explanation &&
    JSON.stringify(a.options || []) === JSON.stringify(b.options || []) &&
    a.trueFalseAnswer === b.trueFalseAnswer &&
    (a.blankAnswer || '') === (b.blankAnswer || '') &&
    JSON.stringify(a.acceptedAnswers || []) === JSON.stringify(b.acceptedAnswers || []) &&
    Boolean(a.caseSensitive) === Boolean(b.caseSensitive) &&
    JSON.stringify(a.numericalAnswers || []) === JSON.stringify(b.numericalAnswers || []) &&
    JSON.stringify(a.matchingPairs || []) === JSON.stringify(b.matchingPairs || [])
  );
}

export const AssessmentsView: React.FC<AssessmentsViewProps> = ({
  project,
  onUpdateProject,
  onOpenQuestionBank
}) => {
  const [editingAssessment, setEditingAssessment] = useState<AssessmentConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Category & type filters inside the modal
  const [pickerCategoryId, setPickerCategoryId] = useState<string>('all');
  const [pickerIncludeSubcategories, setPickerIncludeSubcategories] = useState<boolean>(true);
  const [pickerTypeFilter, setPickerTypeFilter] = useState<string>('all');
  const [randomCountInput, setRandomCountInput] = useState<number>(3);
  const [randomNotice, setRandomNotice] = useState<string | null>(null);

  const categories = project.questionCategories || [];
  const categoryTreeFlat = useMemo(() => {
    const tree = CategoryService.buildCategoryTree(categories, project.questionBank);
    return CategoryService.flattenTree(tree);
  }, [categories, project.questionBank]);

  const bankMap = useMemo(
    () => new Map(project.questionBank.map(q => [q.id, q])),
    [project.questionBank]
  );

  // Filtered questions inside picker
  const pickerQuestions = useMemo(() => {
    const allowedCatIds =
      pickerCategoryId === 'all'
        ? null
        : pickerIncludeSubcategories
        ? CategoryService.getSubtreeIds(categories, pickerCategoryId)
        : new Set([pickerCategoryId]);

    return project.questionBank.filter(q => {
      if (allowedCatIds && !allowedCatIds.has(q.categoryId || DEFAULT_CATEGORY_ID)) {
        return false;
      }
      if (pickerTypeFilter !== 'all' && q.type !== pickerTypeFilter) {
        return false;
      }
      return true;
    });
  }, [project.questionBank, categories, pickerCategoryId, pickerIncludeSubcategories, pickerTypeFilter]);

  const handleOpenModal = (exam?: AssessmentConfig) => {
    setValidationError(null);
    setRandomNotice(null);
    setPickerCategoryId('all');
    setPickerIncludeSubcategories(true);
    setPickerTypeFilter('all');

    if (exam) {
      const cloned: AssessmentConfig = JSON.parse(JSON.stringify(exam));
      // Ensure snapshots exist for any legacy pre-existing questionIds on open
      const snapMap = new Map((cloned.questionSnapshots || []).map(s => [s.bankQuestionId, s]));
      const initializedSnapshots: AssessmentQuestionSnapshot[] = [];
      for (const qId of cloned.questionIds) {
        const existingSnap = snapMap.get(qId);
        if (existingSnap) {
          initializedSnapshots.push(existingSnap);
        } else {
          const bankQ = bankMap.get(qId);
          if (bankQ && isQuestionAutoGradable(bankQ) && !bankQ.pendingAdaptation) {
            initializedSnapshots.push(buildSnapshot(bankQ));
          }
        }
      }
      cloned.questionSnapshots = initializedSnapshots;
      setEditingAssessment(cloned);
    } else {
      const compatibleQuestions = project.questionBank.filter(
        q => isQuestionAutoGradable(q) && !q.pendingAdaptation
      );
      setEditingAssessment({
        id: `eval-${Date.now()}`,
        title: 'Evaluación Sumativa Final',
        description:
          'Cuestionario de acreditación para validar el dominio de las competencias del curso.',
        type: 'final_exam',
        passingScore: project.scormConfig.masteryScore ?? 80,
        questionIds: compatibleQuestions.map(q => q.id),
        questionSnapshots: compatibleQuestions.map(q => buildSnapshot(q)),
        maxAttempts: 3,
        shuffleQuestions: true,
        shuffleOptions: true,
        showFeedback: true,
        timeLimitMinutes: 20
      });
    }
    setIsModalOpen(true);
  };

  const handleToggleQuestionInModal = (q: QuestionItem, checked: boolean) => {
    if (!editingAssessment) return;
    if (!isQuestionAutoGradable(q) || q.pendingAdaptation) return;

    if (checked) {
      const existingSnaps = editingAssessment.questionSnapshots || [];
      const hasSnap = existingSnaps.some(s => s.bankQuestionId === q.id);
      setEditingAssessment({
        ...editingAssessment,
        questionIds: editingAssessment.questionIds.includes(q.id)
          ? editingAssessment.questionIds
          : [...editingAssessment.questionIds, q.id],
        questionSnapshots: hasSnap ? existingSnaps : [...existingSnaps, buildSnapshot(q)]
      });
    } else {
      setEditingAssessment({
        ...editingAssessment,
        questionIds: editingAssessment.questionIds.filter(id => id !== q.id),
        questionSnapshots: (editingAssessment.questionSnapshots || []).filter(
          s => s.bankQuestionId !== q.id
        )
      });
    }
  };

  const handleSyncSnapshotInModal = (bankQuestionId: string) => {
    if (!editingAssessment) return;
    const bankQ = bankMap.get(bankQuestionId);
    if (!bankQ || !isQuestionAutoGradable(bankQ) || bankQ.pendingAdaptation) return;

    const nextSnap = buildSnapshot(bankQ);
    const exists = (editingAssessment.questionSnapshots || []).some(
      s => s.bankQuestionId === bankQuestionId
    );
    setEditingAssessment({
      ...editingAssessment,
      questionSnapshots: exists
        ? (editingAssessment.questionSnapshots || []).map(s =>
            s.bankQuestionId === bankQuestionId ? nextSnap : s
          )
        : [...(editingAssessment.questionSnapshots || []), nextSnap]
    });
  };

  const handlePickRandomFromCategory = () => {
    if (!editingAssessment) return;
    const pool = pickerQuestions.filter(
      q =>
        isQuestionAutoGradable(q) &&
        !q.pendingAdaptation &&
        !editingAssessment.questionIds.includes(q.id)
    );

    if (pool.length === 0) {
      setRandomNotice(
        'No quedan preguntas compatibles sin seleccionar en la categoría o filtro actual.'
      );
      return;
    }

    const desired = Math.max(1, Math.min(randomCountInput || 1, pool.length));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const chosen = shuffled.slice(0, desired);

    setEditingAssessment({
      ...editingAssessment,
      questionIds: [...editingAssessment.questionIds, ...chosen.map(c => c.id)],
      questionSnapshots: [
        ...(editingAssessment.questionSnapshots || []),
        ...chosen.map(c => buildSnapshot(c))
      ]
    });

    setRandomNotice(
      `Se agregaron ${chosen.length} pregunta(s) aleatoria(s) compatibles (${pool.length - chosen.length} restantes disponibles).`
    );
  };

  const handleSaveAssessment = (saved: AssessmentConfig) => {
    if (!saved.title.trim()) {
      setValidationError('El título de la evaluación es obligatorio.');
      return;
    }
    if (saved.questionIds.length === 0) {
      setValidationError(
        'Selecciona al menos una pregunta compatible con calificación automática.'
      );
      return;
    }

    // Preserve immutable snapshots for existing items, create snapshots for newly checked items
    const existingSnapMap = new Map<string, AssessmentQuestionSnapshot>(
      (saved.questionSnapshots || []).map(s => [s.bankQuestionId, s])
    );
    const validIds: string[] = [];
    const finalSnapshots: AssessmentQuestionSnapshot[] = [];

    for (const qId of saved.questionIds) {
      const existingSnap = existingSnapMap.get(qId);
      if (existingSnap && isQuestionAutoGradable(existingSnap.question) && !existingSnap.question.pendingAdaptation) {
        validIds.push(qId);
        finalSnapshots.push(existingSnap);
      } else {
        const bankQ = bankMap.get(qId);
        if (bankQ && isQuestionAutoGradable(bankQ) && !bankQ.pendingAdaptation) {
          validIds.push(qId);
          finalSnapshots.push(buildSnapshot(bankQ));
        }
      }
    }

    if (validIds.length === 0) {
      setValidationError('Las preguntas seleccionadas no son compatibles con calificación automática.');
      return;
    }

    const cleanSaved: AssessmentConfig = {
      ...saved,
      title: saved.title.trim(),
      passingScore: Math.min(100, Math.max(0, saved.passingScore)),
      questionIds: validIds,
      questionSnapshots: finalSnapshots
    };

    const exists = project.assessments.some(a => a.id === cleanSaved.id);
    const updatedList = exists
      ? project.assessments.map(a => (a.id === cleanSaved.id ? cleanSaved : a))
      : [...project.assessments, cleanSaved];

    onUpdateProject(
      MediaService.sanitizeProjectMediaReferences({
        ...project,
        assessments: updatedList,
        scormConfig: {
          ...project.scormConfig,
          masteryScore: cleanSaved.passingScore
        }
      })
    );
    setValidationError(null);
    setIsModalOpen(false);
  };

  const handleConfirmDeleteAssessment = () => {
    if (!pendingDeleteId) return;
    onUpdateProject(
      MediaService.sanitizeProjectMediaReferences({
        ...project,
        assessments: project.assessments.filter(a => a.id !== pendingDeleteId)
      })
    );
    setPendingDeleteId(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Evaluaciones y Cuestionarios
          </h1>
          <p className="text-xs text-slate-500">
            Selecciona reactivos por categoría con copia trazable e inmutable para tus paquetes SCORM en Moodle
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-600/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Evaluación</span>
        </button>
      </div>

      {/* Assessment cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {project.assessments.map(exam => {
          const selectedQuestions = CategoryService.getAssessmentEffectiveQuestions(exam, project);
          const totalPoints = selectedQuestions.reduce((acc, q) => acc + q.points, 0);
          const snapMap = new Map(
            (exam.questionSnapshots || []).map(s => [s.bankQuestionId, s])
          );
          const outOfSyncCount = exam.questionIds.filter(id => {
            const snap = snapMap.get(id);
            const bankQ = bankMap.get(id);
            if (!snap || !bankQ) return false;
            return !areQuestionsContentEqual(snap.question, bankQ);
          }).length;

          return (
            <div
              key={exam.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="p-6">
                <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                  <span className="font-bold text-blue-700 uppercase tracking-wide">
                    {exam.type === 'final_exam' ? 'Examen Final Acreditador' : 'Cuestionario Parcial'}
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <Award className="w-3.5 h-3.5" />
                    <span className="tabular-nums">Aprobación: {exam.passingScore}%</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1">{exam.title}</h3>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed">{exam.description}</p>

                {/* Parameters Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Preguntas asignadas</span>
                    <span className="font-bold text-slate-800 text-sm tabular-nums">
                      {selectedQuestions.length}{' '}
                      <span className="text-xs font-normal text-slate-500">({totalPoints} pts)</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Intentos permitidos</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {exam.maxAttempts === 0 ? 'Ilimitados' : `${exam.maxAttempts} intentos`}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Límite de tiempo</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {exam.timeLimitMinutes === 0 ? 'Sin límite' : `${exam.timeLimitMinutes} minutos`}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Aleatorización</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {exam.shuffleQuestions ? 'Preguntas barajadas' : 'Orden secuencial'}
                    </span>
                  </div>
                </div>

                {outOfSyncCount > 0 && (
                  <div className="mb-4 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
                    <span>
                      <strong>{outOfSyncCount}</strong> pregunta(s) cambiaron en el banco; esta evaluación conserva su copia original.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenModal(exam)}
                      className="text-amber-900 font-bold underline cursor-pointer shrink-0"
                    >
                      Revisar
                    </button>
                  </div>
                )}

                {/* Questions Preview */}
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Preguntas incluidas ({selectedQuestions.length}):</span>
                    <button
                      type="button"
                      onClick={onOpenQuestionBank}
                      className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      Ir al banco →
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="text-xs p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {idx + 1}. {q.name || q.prompt}
                        </span>
                        <span className="font-mono text-slate-400 shrink-0 font-bold tabular-nums">
                          {q.points}p
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  SCORM CMI: <code className="text-slate-600">cmi.core.score.raw</code>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(exam)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Configurar</span>
                  </button>

                  {project.assessments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(exam.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal */}
      {isModalOpen && editingAssessment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Configurar Evaluación SCORM
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Filtra por categoría, elige reactivos compatibles o selecciona aleatoriamente conservando copia inmutable
            </p>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {validationError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título de la Evaluación
                </label>
                <input
                  type="text"
                  value={editingAssessment.title}
                  onChange={(e) => {
                    if (validationError) setValidationError(null);
                    setEditingAssessment({ ...editingAssessment, title: e.target.value });
                  }}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción / Instrucciones
                </label>
                <textarea
                  rows={2}
                  value={editingAssessment.description}
                  onChange={(e) =>
                    setEditingAssessment({ ...editingAssessment, description: e.target.value })
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Puntaje Mínimo (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingAssessment.passingScore}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setEditingAssessment({
                        ...editingAssessment,
                        passingScore: Number.isNaN(val) ? 0 : Math.min(100, Math.max(0, val))
                      });
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-center font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Intentos Máximos (0=ilimitado)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={editingAssessment.maxAttempts}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setEditingAssessment({
                        ...editingAssessment,
                        maxAttempts: Number.isNaN(val) ? 0 : Math.max(0, val)
                      });
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-center font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiempo Máximo (minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={editingAssessment.timeLimitMinutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setEditingAssessment({
                        ...editingAssessment,
                        timeLimitMinutes: Number.isNaN(val) ? 0 : Math.max(0, val)
                      });
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-center font-mono font-bold"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingAssessment.shuffleQuestions}
                    onChange={(e) =>
                      setEditingAssessment({ ...editingAssessment, shuffleQuestions: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Barajar el orden de las preguntas para cada estudiante</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingAssessment.shuffleOptions}
                    onChange={(e) =>
                      setEditingAssessment({ ...editingAssessment, shuffleOptions: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Barajar el orden de las opciones de respuesta</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingAssessment.showFeedback}
                    onChange={(e) =>
                      setEditingAssessment({ ...editingAssessment, showFeedback: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Mostrar retroalimentación didáctica al enviar la evaluación</span>
                </label>
              </div>

              {/* Category Filter & Random Selection */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <FolderTree className="w-4 h-4 text-blue-600" />
                    <span>
                      Banco de Preguntas ({editingAssessment.questionIds.length} seleccionadas)
                    </span>
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Filtrar por categoría
                      </label>
                      <select
                        value={pickerCategoryId}
                        onChange={(e) => setPickerCategoryId(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                      >
                        <option value="all">
                          Todas las categorías ({project.questionBank.length})
                        </option>
                        {categoryTreeFlat.map(n => (
                          <option key={n.category.id} value={n.category.id}>
                            {'— '.repeat(n.depth)}
                            {n.category.name} ({n.directCount}/{n.recursiveCount})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Filtrar por tipo
                      </label>
                      <select
                        value={pickerTypeFilter}
                        onChange={(e) => setPickerTypeFilter(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                      >
                        <option value="all">Todos los tipos</option>
                        <option value="multiple_choice">Opción múltiple</option>
                        <option value="multiple_response">Selección múltiple</option>
                        <option value="true_false">Verdadero / Falso</option>
                        <option value="fill_blank">Respuesta corta</option>
                        <option value="numerical">Numérica</option>
                        <option value="matching">Emparejamiento</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {pickerCategoryId !== 'all' ? (
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pickerIncludeSubcategories}
                          onChange={(e) => setPickerIncludeSubcategories(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span>Incluir subcategorías</span>
                      </label>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        Solo preguntas autocorregibles pueden incluirse en evaluaciones SCORM.
                      </span>
                    )}

                    {/* Random selection */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={randomCountInput}
                        onChange={(e) => setRandomCountInput(Math.max(1, Number(e.target.value)))}
                        className="w-14 text-xs text-center font-mono font-bold border border-slate-300 rounded-lg py-1 bg-white"
                        title="Cantidad aleatoria"
                      />
                      <button
                        type="button"
                        onClick={handlePickRandomFromCategory}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>Agregar aleatorias compatibles</span>
                      </button>
                    </div>
                  </div>

                  {randomNotice && (
                    <div className="text-[11px] text-blue-800 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{randomNotice}</span>
                    </div>
                  )}
                </div>

                {/* Snapshot Diff / Sync section if any selected questions drifted from bank */}
                {(editingAssessment.questionSnapshots || []).some(snap => {
                  const bankQ = bankMap.get(snap.bankQuestionId);
                  return bankQ && !areQuestionsContentEqual(snap.question, bankQ);
                }) && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
                    <div className="font-bold text-amber-900">
                      Copias congeladas con cambios recientes en el Banco:
                    </div>
                    {(editingAssessment.questionSnapshots || []).map(snap => {
                      const bankQ = bankMap.get(snap.bankQuestionId);
                      if (!bankQ || areQuestionsContentEqual(snap.question, bankQ)) return null;
                      return (
                        <div
                          key={snap.bankQuestionId}
                          className="flex items-center justify-between gap-2 bg-white p-2 rounded border border-amber-200"
                        >
                          <span className="truncate text-slate-800">
                            {snap.question.name || snap.question.prompt}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSyncSnapshotInModal(snap.bankQuestionId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded cursor-pointer shrink-0"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Sincronizar copia</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Questions Checklist */}
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 border border-slate-200 rounded-lg p-2 bg-slate-50">
                  {pickerQuestions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No hay preguntas en esta categoría o filtro.
                    </div>
                  ) : (
                    pickerQuestions.map(q => {
                      const isChecked = editingAssessment.questionIds.includes(q.id);
                      const compatible = isQuestionAutoGradable(q) && !q.pendingAdaptation;
                      const support = getQuestionSupportInfo(q);
                      const catName = CategoryService.getCategoryBreadcrumb(categories, q.categoryId);

                      return (
                        <label
                          key={q.id}
                          className={`flex items-start gap-2.5 p-2.5 bg-white rounded border text-xs ${
                            compatible
                              ? 'border-slate-200 cursor-pointer hover:bg-slate-50'
                              : 'border-slate-200/70 opacity-65 cursor-not-allowed bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={!compatible}
                            checked={isChecked}
                            onChange={(e) => handleToggleQuestionInModal(q, e.target.checked)}
                            className="mt-0.5 w-4 h-4 text-blue-600 rounded disabled:opacity-40"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {q.name ? `${q.name}: ` : ''}
                              {q.prompt}
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="font-mono">{q.type}</span>
                              <span>·</span>
                              <span className="tabular-nums">{q.points} pts</span>
                              <span>·</span>
                              <span>{catName}</span>
                              {!compatible && (
                                <>
                                  <span>·</span>
                                  <span className="text-amber-700 font-bold">{support.label}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveAssessment(editingAssessment)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app Delete Confirmation Modal */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">¿Eliminar evaluación?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Esta evaluación dejará de incluirse en el menú del curso y en el paquete SCORM exportado.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAssessment}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
