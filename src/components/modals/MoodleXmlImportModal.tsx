import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Upload,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FolderTree,
  CopyCheck,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Search
} from 'lucide-react';
import { CourseProject, QuestionType } from '../../types/scorm';
import { CategoryService, DEFAULT_CATEGORY_ID } from '../../services/categoryService';
import {
  MoodleXmlService,
  MoodleXmlParseResult,
  MoodleImportOptions,
  MoodleImportExecutionResult,
  ParsedMoodleQuestionDraft,
  MOODLE_XML_MAX_BYTES
} from '../../services/moodleXmlService';
import { SafeRichContent } from '../questions/SafeRichContent';

interface MoodleXmlImportModalProps {
  isOpen: boolean;
  project: CourseProject;
  initialDestinationCategoryId?: string | null;
  onClose: () => void;
  onImportComplete: (updatedProject: CourseProject) => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS: Record<WizardStep, string> = {
  1: '1. Archivo',
  2: '2. Análisis',
  3: '3. Vista previa',
  4: '4. Opciones',
  5: '5. Confirmar',
  6: '6. Resultado'
};

const MAPPED_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Opción múltiple',
  multiple_response: 'Selección múltiple',
  true_false: 'Verdadero / Falso',
  fill_blank: 'Respuesta corta',
  numerical: 'Numérica',
  matching: 'Emparejamiento',
  essay: 'Ensayo (no autocorregible)',
  description: 'Descripción informativa',
  cloze: 'Cloze (pendiente de adaptación)',
  unsupported: 'No compatible'
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function hydratePreviewHtml(draft: ParsedMoodleQuestionDraft): string {
  let out = draft.promptHtml || '';
  for (const att of draft.attachments) {
    if (att.previewDataUrl) {
      out = out.split(`moodle-file://${att.key}`).join(att.previewDataUrl);
    }
  }
  return out;
}

export const MoodleXmlImportModal: React.FC<MoodleXmlImportModalProps> = ({
  isOpen,
  project,
  initialDestinationCategoryId = null,
  onClose,
  onImportComplete
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null);
  const [parseResult, setParseResult] = useState<MoodleXmlParseResult | null>(null);
  const [fileReadError, setFileReadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Step 3 preview filters & selection
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewCategoryFilter, setPreviewCategoryFilter] = useState<string>('all');
  const [previewSupportFilter, setPreviewSupportFilter] = useState<string>('all');
  const [selectedQuestionTempIds, setSelectedQuestionTempIds] = useState<Set<string>>(new Set());

  // Step 4 import options
  const [scope, setScope] = useState<MoodleImportOptions['scope']>('all');
  const [selectedCategoryPathKey, setSelectedCategoryPathKey] = useState<string>('');
  const [destinationParentCategoryId, setDestinationParentCategoryId] = useState<string | null>(
    initialDestinationCategoryId && initialDestinationCategoryId !== DEFAULT_CATEGORY_ID
      ? initialDestinationCategoryId
      : null
  );
  const [createMissingCategories, setCreateMissingCategories] = useState<boolean>(true);
  const [duplicateMode, setDuplicateMode] = useState<MoodleImportOptions['duplicateMode']>('skip_duplicates');
  const [manualSkipTempIds, setManualSkipTempIds] = useState<Set<string>>(new Set());

  // Step 5-6 execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<MoodleImportExecutionResult | null>(null);

  const categoryTreeFlat = useMemo(() => {
    const categories = project.questionCategories || [];
    const tree = CategoryService.buildCategoryTree(categories, project.questionBank);
    return CategoryService.flattenTree(tree).filter(n => n.category.id !== DEFAULT_CATEGORY_ID);
  }, [project.questionCategories, project.questionBank]);

  const resetWizardState = () => {
    setStep(1);
    setSelectedFile(null);
    setParseResult(null);
    setFileReadError(null);
    setPreviewSearch('');
    setPreviewCategoryFilter('all');
    setPreviewSupportFilter('all');
    setSelectedQuestionTempIds(new Set());
    setScope('all');
    setSelectedCategoryPathKey('');
    setDestinationParentCategoryId(
      initialDestinationCategoryId && initialDestinationCategoryId !== DEFAULT_CATEGORY_ID
        ? initialDestinationCategoryId
        : null
    );
    setCreateMissingCategories(true);
    setDuplicateMode('skip_duplicates');
    setManualSkipTempIds(new Set());
    setIsImporting(false);
    setImportError(null);
    setExecutionResult(null);
  };

  const handleCloseSafely = () => {
    resetWizardState();
    onClose();
  };

  const processFile = async (file: File) => {
    setFileReadError(null);
    setImportError(null);
    setSelectedFile({ name: file.name, size: file.size });

    if (!file.name.toLowerCase().endsWith('.xml') && file.type && !file.type.includes('xml')) {
      setFileReadError('Selecciona un archivo con extensión .xml exportado desde Moodle.');
      return;
    }

    if (file.size > MOODLE_XML_MAX_BYTES) {
      setFileReadError(
        `El archivo supera el límite máximo permitido (${formatBytes(MOODLE_XML_MAX_BYTES)}). Divide el banco XML en archivos más pequeños.`
      );
      return;
    }

    try {
      const text = await file.text();
      const parsed = MoodleXmlService.parseMoodleXml(
        text,
        file.name,
        file.size,
        project.questionBank || []
      );
      setParseResult(parsed);

      // Pre-select all questions without fatal structural errors
      const validIds = new Set(parsed.questions.filter(q => q.errors.length === 0).map(q => q.tempId));
      setSelectedQuestionTempIds(validIds);
      if (parsed.categoriesFound.length > 0) {
        setSelectedCategoryPathKey(parsed.categoriesFound[0].pathKey);
      }

      // Auto-mark duplicates in manual skip set by default
      const dupIds = new Set(parsed.questions.filter(q => q.duplicateStatus !== 'none').map(q => q.tempId));
      setManualSkipTempIds(dupIds);

      setStep(2);
    } catch (err: any) {
      setFileReadError(err?.message || 'No se pudo leer el contenido del archivo XML.');
    }
  };

  const filteredPreviewQuestions = useMemo(() => {
    if (!parseResult) return [];
    const term = previewSearch.trim().toLowerCase();
    return parseResult.questions.filter(q => {
      if (previewCategoryFilter !== 'all') {
        const qKey =
          q.categorySegments.length === 1 && q.categorySegments[0] === 'Sin categorizar' && !q.moodleCategoryRawPath
            ? '__uncategorized__'
            : q.categorySegments.map(s => s.toLowerCase()).join(' / ');
        if (qKey !== previewCategoryFilter) return false;
      }
      if (previewSupportFilter === 'supported' && q.supportStatus !== 'supported') return false;
      if (previewSupportFilter === 'partial_or_unsupported' && q.supportStatus === 'supported') return false;
      if (previewSupportFilter === 'duplicates' && q.duplicateStatus === 'none') return false;
      if (term) {
        const hay = `${q.name} ${q.prompt} ${q.moodleType} ${q.categorySegments.join(' ')}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [parseResult, previewSearch, previewCategoryFilter, previewSupportFilter]);

  // Exact dry-run summary for Step 5 Confirmation
  const confirmationSummary = useMemo(() => {
    if (!parseResult) {
      return {
        candidatesCount: 0,
        willImportCount: 0,
        skippedDuplicatesCount: 0,
        skippedErrorsCount: 0,
        warningsCount: 0,
        incompatibleCount: 0,
        categoriesToCreatePreview: [] as string[],
        duplicateCandidates: [] as ParsedMoodleQuestionDraft[]
      };
    }

    const candidates = parseResult.questions.filter(q => {
      const qPathKey =
        q.categorySegments.length === 1 && q.categorySegments[0] === 'Sin categorizar' && !q.moodleCategoryRawPath
          ? '__uncategorized__'
          : q.categorySegments.map(s => s.toLowerCase()).join(' / ');

      if (scope === 'selected_questions') {
        return selectedQuestionTempIds.has(q.tempId);
      }
      if (scope === 'single_category' && selectedCategoryPathKey) {
        return qPathKey === selectedCategoryPathKey;
      }
      if (scope === 'category_with_subcategories' && selectedCategoryPathKey) {
        return qPathKey === selectedCategoryPathKey || qPathKey.startsWith(`${selectedCategoryPathKey} / `);
      }
      return true;
    });

    let workingCats = JSON.parse(JSON.stringify(project.questionCategories || []));
    const categoriesToCreatePreview: string[] = [];
    let willImportCount = 0;
    let skippedDuplicatesCount = 0;
    let skippedErrorsCount = 0;
    let warningsCount = 0;
    let incompatibleCount = 0;
    const duplicateCandidates: ParsedMoodleQuestionDraft[] = [];

    for (const q of candidates) {
      if (q.duplicateStatus !== 'none') {
        duplicateCandidates.push(q);
      }
      if (q.errors.length > 0) {
        skippedErrorsCount++;
        continue;
      }
      if (duplicateMode === 'skip_duplicates' && q.duplicateStatus !== 'none') {
        skippedDuplicatesCount++;
        continue;
      }
      if (duplicateMode === 'manual' && manualSkipTempIds.has(q.tempId)) {
        skippedDuplicatesCount++;
        continue;
      }

      willImportCount++;
      if (q.warnings.length > 0) warningsCount++;
      if (q.supportStatus !== 'supported') incompatibleCount++;

      const isUncat =
        !q.moodleCategoryRawPath &&
        q.categorySegments.length === 1 &&
        q.categorySegments[0] === 'Sin categorizar';

      if (!isUncat && createMissingCategories) {
        let segs = q.categorySegments;
        if (
          (scope === 'single_category' || scope === 'category_with_subcategories') &&
          selectedCategoryPathKey &&
          selectedCategoryPathKey !== '__uncategorized__'
        ) {
          const selEntry = parseResult.categoriesFound.find(c => c.pathKey === selectedCategoryPathKey);
          if (selEntry && selEntry.segments.length > 1 && segs.length >= selEntry.segments.length) {
            segs = segs.slice(selEntry.segments.length - 1);
          }
        }
        const beforeCount = workingCats.length;
        const sim = CategoryService.findOrCreateCategoryPath(
          workingCats,
          segs,
          destinationParentCategoryId,
          q.moodleCategoryRawPath || undefined
        );
        if (sim.createdCount > 0) {
          const added = sim.categories.slice(beforeCount);
          added.forEach(a => categoriesToCreatePreview.push(a.name));
        }
        workingCats = sim.categories;
      }
    }

    return {
      candidatesCount: candidates.length,
      willImportCount,
      skippedDuplicatesCount,
      skippedErrorsCount,
      warningsCount,
      incompatibleCount,
      categoriesToCreatePreview,
      duplicateCandidates
    };
  }, [
    parseResult,
    scope,
    selectedCategoryPathKey,
    selectedQuestionTempIds,
    destinationParentCategoryId,
    createMissingCategories,
    duplicateMode,
    manualSkipTempIds,
    project.questionCategories
  ]);

  const handleConfirmImport = async () => {
    if (!parseResult || isImporting) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const result = await MoodleXmlService.executeImport(project, parseResult, {
        scope,
        selectedCategoryPathKey,
        selectedQuestionTempIds,
        destinationParentCategoryId,
        createMissingCategories,
        duplicateMode,
        manualSkipTempIds
      });
      setExecutionResult(result);
      onImportComplete(result.updatedProject);
      setStep(6);
    } catch (err: any) {
      setImportError(err?.message || 'Error al confirmar la importación de preguntas.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900 truncate">
                Importar preguntas desde Moodle XML
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                Procesamiento local offline · Conserva jerarquía de categorías, HTML enriquecido y multimedia Base64
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseSafely}
            disabled={isImporting}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
            title="Cerrar asistente"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 6-Step Progress Bar */}
        <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex items-center gap-1.5 overflow-x-auto shrink-0">
          {([1, 2, 3, 4, 5, 6] as WizardStep[]).map(s => {
            const isCurrent = step === s;
            const isDone = step > s;
            return (
              <div
                key={s}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 border ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                {isDone && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                <span>{STEP_LABELS[s]}</span>
              </div>
            );
          })}
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* STEP 1: SELECT FILE */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) void processFile(dropped);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/70'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,text/xml,application/xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void processFile(f);
                    e.target.value = '';
                  }}
                />
                <Upload className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">
                  Selecciona o arrastra un archivo Moodle XML (.xml)
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Compatible con exportaciones de Banco de Preguntas de Moodle 3.x y 4.x. El archivo se procesa localmente sin subir datos a servidores externos.
                </p>
                {selectedFile && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
                    <FileCode2 className="w-4 h-4 text-blue-600" />
                    <span>{selectedFile.name}</span>
                    <span className="text-slate-400">·</span>
                    <span>{formatBytes(selectedFile.size)}</span>
                  </div>
                )}
              </div>

              {fileReadError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{fileReadError}</span>
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800">Tipos de pregunta Moodle evaluados al importar:</div>
                <p>
                  Autocorregibles en evaluaciones SCORM: <strong>Opción múltiple</strong> (única y múltiple), <strong>Verdadero/Falso</strong>, <strong>Respuesta corta</strong> (con variantes), <strong>Numérica</strong> (con tolerancia) y <strong>Emparejamiento</strong>.
                </p>
                <p className="text-slate-500">
                  Los tipos <em>Ensayo</em>, <em>Descripción</em> y <em>Cloze</em> se importan preservando su texto y estructura con aviso de compatibilidad limitada (no cuentan como reactivos autocorregibles).
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: ANALYZE SUMMARY */}
          {step === 2 && parseResult && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Resumen del análisis: {parseResult.fileName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tamaño: <span className="font-mono">{formatBytes(parseResult.fileSize)}</span> · Estado:{' '}
                    {parseResult.fatalError ? 'Con error bloqueante' : 'Listo para previsualizar'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setParseResult(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  Elegir otro archivo
                </button>
              </div>

              {parseResult.fatalError ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-extrabold">No se pudo procesar el archivo XML</div>
                    <p>{parseResult.fatalError}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-[11px] text-slate-500">Categorías</div>
                      <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                        {parseResult.categoriesFound.length}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-[11px] text-slate-500">Subcategorías</div>
                      <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                        {parseResult.totalSubcategoriesCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50">
                      <div className="text-[11px] text-blue-700 font-semibold">Total preguntas</div>
                      <div className="text-lg font-extrabold text-blue-900 tabular-nums">
                        {parseResult.questions.length}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-[11px] text-slate-500">Con multimedia</div>
                      <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                        {parseResult.mediaQuestionCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60">
                      <div className="text-[11px] text-amber-800">Limitadas / No comp.</div>
                      <div className="text-lg font-extrabold text-amber-900 tabular-nums">
                        {parseResult.incompatibleQuestionCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-[11px] text-slate-500">Errores estructura</div>
                      <div className="text-lg font-extrabold text-rose-700 tabular-nums">
                        {parseResult.structuralErrors.length}
                      </div>
                    </div>
                  </div>

                  {/* Type Distribution & Categories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Distribución por tipo Moodle
                      </h4>
                      <div className="space-y-1.5 text-xs">
                        {Object.entries(parseResult.typeDistribution).map(([mType, count]) => (
                          <div
                            key={mType}
                            className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0"
                          >
                            <span className="font-mono text-slate-700">{mType}</span>
                            <span className="font-bold text-slate-900 tabular-nums">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Rutas de categoría detectadas
                      </h4>
                      <div className="max-h-44 overflow-y-auto space-y-1.5 text-xs pr-1">
                        {parseResult.categoriesFound.map(cat => (
                          <div
                            key={cat.pathKey}
                            className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 last:border-0"
                          >
                            <span className="text-slate-700 truncate" title={cat.segments.join(' / ')}>
                              {cat.segments.join(' / ')}
                            </span>
                            <span className="text-slate-500 font-mono tabular-nums shrink-0">
                              {cat.questionCount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {parseResult.structuralErrors.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Observaciones de estructura detectadas:</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                        {parseResult.structuralErrors.slice(0, 10).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === 3 && parseResult && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="Filtrar preguntas en vista previa..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={previewCategoryFilter}
                  onChange={(e) => setPreviewCategoryFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg p-1.5 bg-slate-50"
                >
                  <option value="all">Todas las categorías ({parseResult.categoriesFound.length})</option>
                  {parseResult.categoriesFound.map(c => (
                    <option key={c.pathKey} value={c.pathKey}>
                      {c.segments.join(' / ')} ({c.questionCount})
                    </option>
                  ))}
                </select>
                <select
                  value={previewSupportFilter}
                  onChange={(e) => setPreviewSupportFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg p-1.5 bg-slate-50"
                >
                  <option value="all">Todos los estados</option>
                  <option value="supported">Solo compatibles SCORM</option>
                  <option value="partial_or_unsupported">Solo limitadas / no compatibles</option>
                  <option value="duplicates">Solo posibles duplicadas</option>
                </select>
              </div>

              {/* Bulk selection bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <span className="text-slate-600 font-semibold tabular-nums">
                  Mostrando {filteredPreviewQuestions.length} de {parseResult.questions.length} ·{' '}
                  <strong className="text-blue-700">{selectedQuestionTempIds.size}</strong> marcadas para selección manual
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(selectedQuestionTempIds);
                      filteredPreviewQuestions
                        .filter(q => q.errors.length === 0)
                        .forEach(q => next.add(q.tempId));
                      setSelectedQuestionTempIds(next);
                    }}
                    className="text-blue-700 hover:underline font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Marcar visibles
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(selectedQuestionTempIds);
                      filteredPreviewQuestions.forEach(q => next.delete(q.tempId));
                      setSelectedQuestionTempIds(next);
                    }}
                    className="text-slate-600 hover:underline font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Desmarcar visibles
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      const compatIds = new Set(
                        parseResult.questions
                          .filter(q => q.supportStatus === 'supported' && q.errors.length === 0)
                          .map(q => q.tempId)
                      );
                      setSelectedQuestionTempIds(compatIds);
                    }}
                    className="text-emerald-700 hover:underline font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Solo compatibles
                  </button>
                </div>
              </div>

              {/* Questions Preview List */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredPreviewQuestions.map((q, idx) => {
                  const isChecked = selectedQuestionTempIds.has(q.tempId);
                  return (
                    <div
                      key={q.tempId}
                      className={`p-3.5 rounded-xl border transition-colors ${
                        q.errors.length > 0
                          ? 'border-rose-200 bg-rose-50/40'
                          : isChecked
                          ? 'border-blue-200 bg-white'
                          : 'border-slate-200 bg-slate-50/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          disabled={q.errors.length > 0}
                          onClick={() => {
                            const next = new Set(selectedQuestionTempIds);
                            if (next.has(q.tempId)) next.delete(q.tempId);
                            else next.add(q.tempId);
                            setSelectedQuestionTempIds(next);
                          }}
                          className="mt-0.5 text-blue-600 disabled:opacity-40 cursor-pointer shrink-0"
                        >
                          {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                        </button>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-extrabold text-slate-900 truncate">
                              {idx + 1}. {q.name || 'Sin nombre'}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] shrink-0">
                              <span
                                className={`font-bold ${
                                  q.supportStatus === 'supported'
                                    ? 'text-emerald-700'
                                    : q.supportStatus === 'partial'
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                {q.supportStatus === 'supported'
                                  ? 'Compatible'
                                  : q.supportStatus === 'partial'
                                  ? 'Limitada'
                                  : 'No compatible'}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono text-slate-600">{q.moodleType}</span>
                              <span className="text-slate-300">→</span>
                              <span className="text-slate-700 font-semibold">{MAPPED_TYPE_LABELS[q.mappedType]}</span>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              <FolderTree className="w-3 h-3 text-slate-400" />
                              {q.categorySegments.join(' / ')}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono tabular-nums">{q.points} pts</span>
                            {q.attachments.length > 0 && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                                  <ImageIcon className="w-3 h-3" />
                                  {q.attachments.length} archivo(s)
                                </span>
                              </>
                            )}
                            {q.duplicateStatus !== 'none' && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-amber-700 font-bold">
                                  {q.duplicateStatus === 'exact' ? 'Duplicada exacta' : 'Posible duplicada'}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                            <SafeRichContent html={hydratePreviewHtml(q)} fallbackText={q.prompt} />
                          </div>

                          {(q.warnings.length > 0 || q.errors.length > 0) && (
                            <div className="space-y-1">
                              {q.errors.map((e, i) => (
                                <div key={i} className="text-[11px] text-rose-700 font-semibold flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{e}</span>
                                </div>
                              ))}
                              {q.warnings.map((w, i) => (
                                <div key={i} className="text-[11px] text-amber-800 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>{w}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: IMPORT OPTIONS */}
          {step === 4 && parseResult && (
            <div className="space-y-5">
              {/* Scope */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  1. Alcance de la importación
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="importScope"
                      checked={scope === 'all'}
                      onChange={() => setScope('all')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Todas las categorías y preguntas</div>
                      <div className="text-[11px] text-slate-500">
                        Importa la estructura completa detectada en el archivo ({parseResult.questions.length} preguntas).
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="importScope"
                      checked={scope === 'selected_questions'}
                      onChange={() => setScope('selected_questions')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Solo preguntas seleccionadas</div>
                      <div className="text-[11px] text-slate-500">
                        Únicamente las {selectedQuestionTempIds.size} preguntas marcadas en la vista previa.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="importScope"
                      checked={scope === 'single_category'}
                      onChange={() => setScope('single_category')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Solo una categoría específica</div>
                      <div className="text-[11px] text-slate-500">
                        Importa únicamente los reactivos directos de la ruta elegida.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="importScope"
                      checked={scope === 'category_with_subcategories'}
                      onChange={() => setScope('category_with_subcategories')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Categoría incluyendo subcategorías</div>
                      <div className="text-[11px] text-slate-500">
                        Importa la rama seleccionada y toda su jerarquía descendente.
                      </div>
                    </div>
                  </label>
                </div>

                {(scope === 'single_category' || scope === 'category_with_subcategories') && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Categoría del XML a importar:
                    </label>
                    <select
                      value={selectedCategoryPathKey}
                      onChange={(e) => setSelectedCategoryPathKey(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                    >
                      {parseResult.categoriesFound.map(cat => (
                        <option key={cat.pathKey} value={cat.pathKey}>
                          {cat.segments.join(' / ')} ({cat.questionCount} directas)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Destination & hierarchy */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  2. Destino y jerarquía de categorías
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Categoría destino en tu Banco de Preguntas:
                  </label>
                  <select
                    value={destinationParentCategoryId || ''}
                    onChange={(e) => setDestinationParentCategoryId(e.target.value || null)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                  >
                    <option value="">Raíz del Banco de Preguntas (respetar categorías principales)</option>
                    {categoryTreeFlat.map(node => (
                      <option key={node.category.id} value={node.category.id}>
                        {'— '.repeat(node.depth)}{node.category.name} ({node.recursiveCount})
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={createMissingCategories}
                    onChange={(e) => setCreateMissingCategories(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Crear automáticamente las categorías y subcategorías que no existan</span>
                </label>
              </div>

              {/* Duplicates */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CopyCheck className="w-4 h-4 text-blue-600" />
                    <span>3. Tratamiento de preguntas duplicadas</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                    {confirmationSummary.duplicateCandidates.length} detectadas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="dupMode"
                      checked={duplicateMode === 'skip_duplicates'}
                      onChange={() => setDuplicateMode('skip_duplicates')}
                      className="text-blue-600"
                    />
                    <span className="font-semibold text-slate-800">Omitir posibles duplicadas</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="dupMode"
                      checked={duplicateMode === 'import_all'}
                      onChange={() => setDuplicateMode('import_all')}
                      className="text-blue-600"
                    />
                    <span className="font-semibold text-slate-800">Importar todas</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="dupMode"
                      checked={duplicateMode === 'manual'}
                      onChange={() => setDuplicateMode('manual')}
                      className="text-blue-600"
                    />
                    <span className="font-semibold text-slate-800">Decidir manualmente</span>
                  </label>
                </div>

                {duplicateMode === 'manual' && confirmationSummary.duplicateCandidates.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pt-2 border-t border-slate-100">
                    {confirmationSummary.duplicateCandidates.map(d => {
                      const willSkip = manualSkipTempIds.has(d.tempId);
                      return (
                        <div
                          key={d.tempId}
                          className="flex items-center justify-between gap-3 p-2 rounded-lg bg-amber-50/60 border border-amber-200 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{d.name}</div>
                            <div className="text-[11px] text-amber-800">{d.duplicateReason}</div>
                          </div>
                          <select
                            value={willSkip ? 'skip' : 'import'}
                            onChange={(e) => {
                              const next = new Set(manualSkipTempIds);
                              if (e.target.value === 'skip') next.add(d.tempId);
                              else next.delete(d.tempId);
                              setManualSkipTempIds(next);
                            }}
                            className="text-xs border border-amber-300 bg-white rounded-md px-2 py-1 font-semibold shrink-0"
                          >
                            <option value="skip">Omitir</option>
                            <option value="import">Importar copia</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: TRANSACTIONAL CONFIRMATION */}
          {step === 5 && parseResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-1">
                <div className="font-extrabold">Revisión previa antes de confirmar</div>
                <p>
                  Todavía no se ha guardado ningún cambio en tu banco de preguntas. Verifica el resumen y presiona <strong>Confirmar e importar</strong> para aplicar la operación.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
                  <div className="text-[11px] text-emerald-800">Preguntas a importar</div>
                  <div className="text-xl font-extrabold text-emerald-900 tabular-nums">
                    {confirmationSummary.willImportCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60">
                  <div className="text-[11px] text-blue-800">Categorías nuevas</div>
                  <div className="text-xl font-extrabold text-blue-900 tabular-nums">
                    {confirmationSummary.categoriesToCreatePreview.length}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-[11px] text-slate-600">Duplicadas omitidas</div>
                  <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                    {confirmationSummary.skippedDuplicatesCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
                  <div className="text-[11px] text-amber-800">Con advertencias</div>
                  <div className="text-xl font-extrabold text-amber-900 tabular-nums">
                    {confirmationSummary.warningsCount}
                  </div>
                </div>
              </div>

              {confirmationSummary.categoriesToCreatePreview.length > 0 && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs space-y-1.5">
                  <div className="font-bold text-slate-800">Categorías que se crearán automáticamente:</div>
                  <div className="text-slate-600 leading-relaxed">
                    {confirmationSummary.categoriesToCreatePreview.join(', ')}
                  </div>
                </div>
              )}

              {confirmationSummary.incompatibleCount > 0 && (
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Se importarán <strong>{confirmationSummary.incompatibleCount}</strong> preguntas de tipo limitado o no autocorregible (ensayo, descripción o Cloze). Se guardarán en el banco con etiqueta de estado, pero no podrán usarse en evaluaciones SCORM calificables hasta ser adaptadas.
                  </span>
                </div>
              )}

              {importError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: RESULT */}
          {step === 6 && executionResult && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-emerald-950">
                    Importación completada correctamente
                  </h3>
                  <p className="text-xs text-emerald-900">
                    Tu banco de preguntas y las imágenes adjuntas ya están integrados y persistidos en el proyecto activo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-[11px] text-slate-500">Importadas</div>
                  <div className="text-xl font-extrabold text-emerald-700 tabular-nums">
                    {executionResult.importedCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-[11px] text-slate-500">Categorías creadas</div>
                  <div className="text-xl font-extrabold text-blue-700 tabular-nums">
                    {executionResult.categoriesCreatedCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-[11px] text-slate-500">Omitidas</div>
                  <div className="text-xl font-extrabold text-slate-800 tabular-nums">
                    {executionResult.skippedCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-[11px] text-slate-500">Con advertencias</div>
                  <div className="text-xl font-extrabold text-amber-700 tabular-nums">
                    {executionResult.warningQuestionsCount}
                  </div>
                </div>
              </div>

              {executionResult.importedWithWarnings.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2 max-h-48 overflow-y-auto">
                  <div className="text-xs font-extrabold text-amber-900">
                    Detalle de advertencias ({executionResult.importedWithWarnings.length}):
                  </div>
                  {executionResult.importedWithWarnings.map((item, idx) => (
                    <div key={idx} className="text-xs text-amber-900 border-b border-amber-200/70 pb-1.5 last:border-0">
                      <span className="font-bold">{item.title}:</span>{' '}
                      <span className="text-amber-800">{item.warnings.join(' · ')}</span>
                    </div>
                  ))}
                </div>
              )}

              {executionResult.errors.length > 0 && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 space-y-1.5 max-h-40 overflow-y-auto">
                  <div className="text-xs font-extrabold text-rose-900">
                    Preguntas omitidas por error ({executionResult.errors.length}):
                  </div>
                  {executionResult.errors.map((err, i) => (
                    <div key={i} className="text-xs text-rose-800">
                      {err}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div>
            {step > 1 && step < 6 && (
              <button
                type="button"
                disabled={isImporting}
                onClick={() => setStep((step - 1) as WizardStep)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {step < 6 ? (
              <button
                type="button"
                disabled={isImporting}
                onClick={handleCloseSafely}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCloseSafely}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                Finalizar
              </button>
            )}

            {step === 2 && parseResult && !parseResult.fatalError && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Ver vista previa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Configurar opciones</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={() => setStep(5)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Revisar y confirmar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 5 && (
              <button
                type="button"
                disabled={isImporting || confirmationSummary.willImportCount === 0}
                onClick={() => void handleConfirmImport()}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isImporting ? 'Importando...' : 'Confirmar e importar'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
