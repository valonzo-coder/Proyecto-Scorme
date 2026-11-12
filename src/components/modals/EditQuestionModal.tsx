import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, AlertCircle, AlertTriangle, Code2 } from 'lucide-react';
import {
  QuestionItem,
  QuestionType,
  DifficultyLevel,
  QuestionOption,
  MatchingPair,
  QuestionCategory,
  NumericalAnswer,
  ShortAnswerVariant
} from '../../types/scorm';
import { CategoryService, DEFAULT_CATEGORY_ID, isQuestionAutoGradable } from '../../services/categoryService';
import { htmlToPlainText, sanitizeMoodleHtml } from '../../services/moodleXmlService';
import { RichTextEditor } from '../editor/RichTextEditor';

interface EditQuestionModalProps {
  question: QuestionItem | null;
  categories: QuestionCategory[];
  defaultCategoryId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedQuestion: QuestionItem) => void;
}

const DEFAULT_OPTIONS = (): QuestionOption[] => [
  { id: 'opt1', text: 'Primera opción', isCorrect: true },
  { id: 'opt2', text: 'Segunda opción alternativa', isCorrect: false },
  { id: 'opt3', text: 'Tercera opción alternativa', isCorrect: false }
];

const DEFAULT_PAIRS = (): MatchingPair[] => [
  { id: 'p1', left: 'Concepto A', right: 'Definición o ejemplo A' },
  { id: 'p2', left: 'Concepto B', right: 'Definición o ejemplo B' }
];

const DEFAULT_NUMERICAL = (): NumericalAnswer[] => [
  { value: 0, tolerance: 0.01, fraction: 100 }
];

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  question,
  categories,
  defaultCategoryId,
  isOpen,
  onClose,
  onSave
}) => {
  const [categoryId, setCategoryId] = useState<string>(
    question?.categoryId || defaultCategoryId || DEFAULT_CATEGORY_ID
  );
  const [name, setName] = useState<string>(question?.name || '');
  const [type, setType] = useState<QuestionType>(question?.type || 'multiple_choice');
  const [prompt, setPrompt] = useState(question?.prompt || '');
  const [promptHtml, setPromptHtml] = useState(
    question?.promptHtml || (question?.prompt ? `<p>${question.prompt}</p>` : '<p></p>')
  );
  const [useRichPrompt, setUseRichPrompt] = useState<boolean>(!!question?.promptHtml);
  const [explanation, setExplanation] = useState(question?.explanation || '');
  const [explanationHtml, setExplanationHtml] = useState(question?.explanationHtml || '');
  const [points, setPoints] = useState(question?.points ?? 10);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(question?.difficulty || 'Medio');
  const [tagInput, setTagInput] = useState(question?.tags?.join(', ') || 'General');
  const [options, setOptions] = useState<QuestionOption[]>(
    question?.options ? JSON.parse(JSON.stringify(question.options)) : DEFAULT_OPTIONS()
  );
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<boolean>(
    question?.trueFalseAnswer !== undefined ? question.trueFalseAnswer : true
  );
  const [blankAnswer, setBlankAnswer] = useState(question?.blankAnswer || '');
  const [acceptedAnswers, setAcceptedAnswers] = useState<ShortAnswerVariant[]>(
    question?.acceptedAnswers ? JSON.parse(JSON.stringify(question.acceptedAnswers)) : []
  );
  const [caseSensitive, setCaseSensitive] = useState<boolean>(!!question?.caseSensitive);
  const [numericalAnswers, setNumericalAnswers] = useState<NumericalAnswer[]>(
    question?.numericalAnswers?.length
      ? JSON.parse(JSON.stringify(question.numericalAnswers))
      : DEFAULT_NUMERICAL()
  );
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>(
    question?.matchingPairs ? JSON.parse(JSON.stringify(question.matchingPairs)) : DEFAULT_PAIRS()
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const flatCategories = useMemo(
    () => CategoryService.flattenTree(CategoryService.buildCategoryTree(categories, [])),
    [categories]
  );

  useEffect(() => {
    if (!isOpen) return;
    const initialCategory =
      question?.categoryId && categories.some(c => c.id === question.categoryId)
        ? question.categoryId
        : defaultCategoryId && categories.some(c => c.id === defaultCategoryId)
        ? defaultCategoryId
        : DEFAULT_CATEGORY_ID;

    setCategoryId(initialCategory);
    setName(question?.name || '');
    setType(question?.type || 'multiple_choice');
    setPrompt(question?.prompt || '');
    setPromptHtml(
      question?.promptHtml || (question?.prompt ? `<p>${question.prompt}</p>` : '<p></p>')
    );
    setUseRichPrompt(!!question?.promptHtml);
    setExplanation(question?.explanation || '');
    setExplanationHtml(question?.explanationHtml || '');
    setPoints(question?.points ?? 10);
    setDifficulty(question?.difficulty || 'Medio');
    setTagInput(question?.tags?.join(', ') || 'General');
    setOptions(question?.options ? JSON.parse(JSON.stringify(question.options)) : DEFAULT_OPTIONS());
    setTrueFalseAnswer(question?.trueFalseAnswer !== undefined ? question.trueFalseAnswer : true);
    setBlankAnswer(question?.blankAnswer || '');
    setAcceptedAnswers(
      question?.acceptedAnswers ? JSON.parse(JSON.stringify(question.acceptedAnswers)) : []
    );
    setCaseSensitive(!!question?.caseSensitive);
    setNumericalAnswers(
      question?.numericalAnswers?.length
        ? JSON.parse(JSON.stringify(question.numericalAnswers))
        : DEFAULT_NUMERICAL()
    );
    setMatchingPairs(
      question?.matchingPairs ? JSON.parse(JSON.stringify(question.matchingPairs)) : DEFAULT_PAIRS()
    );
    setValidationError(null);
  }, [question, isOpen, defaultCategoryId, categories]);

  if (!isOpen) return null;

  const handleTypeChange = (nextType: QuestionType) => {
    setType(nextType);
    setValidationError(null);
    if (nextType === 'multiple_choice') {
      const firstCorrectIdx = options.findIndex(o => o.isCorrect);
      setOptions(
        options.map((o, idx) => ({
          ...o,
          isCorrect: idx === (firstCorrectIdx >= 0 ? firstCorrectIdx : 0)
        }))
      );
    }
  };

  const handleToggleRichMode = (enableRich: boolean) => {
    if (enableRich && !useRichPrompt) {
      setPromptHtml(prompt.trim() ? `<p>${prompt.trim()}</p>` : '<p></p>');
    } else if (!enableRich && useRichPrompt) {
      setPrompt(htmlToPlainText(promptHtml));
    }
    setUseRichPrompt(enableRich);
  };

  const handleSave = () => {
    const effectivePromptHtml = useRichPrompt ? sanitizeMoodleHtml(promptHtml) : '';
    const effectivePrompt = useRichPrompt
      ? htmlToPlainText(effectivePromptHtml) || name.trim()
      : prompt.trim();

    if (!effectivePrompt) {
      setValidationError('Por favor redacta el enunciado de la pregunta.');
      return;
    }

    if (type === 'multiple_choice' || type === 'multiple_response') {
      if (options.length < 2) {
        setValidationError('Agrega al menos 2 opciones de respuesta.');
        return;
      }
      if (options.some(o => !o.text.trim())) {
        setValidationError('Todas las opciones de respuesta deben tener texto.');
        return;
      }
      const correctCount = options.filter(o => o.isCorrect).length;
      if (correctCount === 0) {
        setValidationError('Marca al menos una opción como correcta.');
        return;
      }
      if (type === 'multiple_choice' && correctCount !== 1) {
        setValidationError('Las preguntas de opción única deben tener exactamente una opción correcta.');
        return;
      }
    }

    if (type === 'fill_blank' && !blankAnswer.trim()) {
      setValidationError('Especifica la palabra o frase clave exacta esperada.');
      return;
    }

    if (type === 'numerical') {
      if (
        numericalAnswers.length === 0 ||
        numericalAnswers.some(n => !Number.isFinite(n.value) || n.tolerance < 0)
      ) {
        setValidationError('Especifica al menos un valor numérico válido y una tolerancia mayor o igual a 0.');
        return;
      }
    }

    if (type === 'matching') {
      if (matchingPairs.length < 2) {
        setValidationError('Agrega al menos 2 pares completos para emparejar.');
        return;
      }
      if (matchingPairs.some(p => !p.left.trim() || !p.right.trim())) {
        setValidationError('Todos los pares deben tener texto en la columna izquierda y derecha.');
        return;
      }
    }

    const tags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const safePoints =
      type === 'description' ? 0 : Number.isFinite(points) && points > 0 ? points : 10;
    const now = new Date().toISOString();

    const cleanVariants: ShortAnswerVariant[] | undefined =
      type === 'fill_blank'
        ? [
            { text: blankAnswer.trim(), fraction: 100 },
            ...acceptedAnswers
              .filter(v => v.text.trim() && v.text.trim().toLowerCase() !== blankAnswer.trim().toLowerCase())
              .map(v => ({ ...v, text: v.text.trim(), fraction: v.fraction || 100 }))
          ]
        : undefined;

    const autoGradable = isQuestionAutoGradable({ type });

    const updated: QuestionItem = {
      ...question,
      id: question?.id || `q-${Date.now()}`,
      categoryId: categoryId || DEFAULT_CATEGORY_ID,
      name: name.trim() || undefined,
      type,
      prompt: effectivePrompt,
      promptHtml: useRichPrompt ? effectivePromptHtml : undefined,
      explanation: explanation.trim(),
      explanationHtml:
        explanationHtml && htmlToPlainText(explanationHtml) === explanation.trim()
          ? explanationHtml
          : undefined,
      points: safePoints,
      difficulty,
      tags: tags.length > 0 ? tags : ['General'],
      createdAt: question?.createdAt || now,
      updatedAt: now,
      options:
        type === 'multiple_choice' || type === 'multiple_response'
          ? options.map(o => ({ ...o, text: o.text.trim() }))
          : undefined,
      trueFalseAnswer: type === 'true_false' ? trueFalseAnswer : undefined,
      blankAnswer: type === 'fill_blank' ? blankAnswer.trim() : undefined,
      acceptedAnswers: cleanVariants,
      caseSensitive: type === 'fill_blank' ? caseSensitive : undefined,
      numericalAnswers:
        type === 'numerical'
          ? numericalAnswers.map(n => ({ ...n, tolerance: Math.abs(n.tolerance || 0) }))
          : undefined,
      matchingPairs:
        type === 'matching'
          ? matchingPairs.map(p => ({ ...p, left: p.left.trim(), right: p.right.trim() }))
          : undefined,
      pendingAdaptation: autoGradable ? undefined : true
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {question ? 'Editar Pregunta del Banco' : 'Nueva Pregunta Evaluativa'}
            </h3>
            <p className="text-xs text-slate-500">
              Organiza por categoría y configura reactivos compatibles con SCORM
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {question?.importWarnings && question.importWarnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Notas de importación Moodle XML</span>
              </div>
              <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                {question.importWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Category + Short Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Categoría del Banco
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {flatCategories.map(node => (
                  <option key={node.category.id} value={node.category.id}>
                    {'\u00A0'.repeat(node.depth * 3)}
                    {node.depth > 0 ? '└ ' : ''}
                    {node.category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre identificador (opcional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. P01 - Ecuaciones lineales"
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Question Type, Difficulty & Points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Pregunta</label>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="multiple_choice">Opción Múltiple (Única)</option>
                <option value="multiple_response">Selección Múltiple (Varias)</option>
                <option value="true_false">Verdadero o Falso</option>
                <option value="fill_blank">Respuesta Corta / Completar</option>
                <option value="numerical">Respuesta Numérica</option>
                <option value="matching">Emparejamiento / Relación</option>
                {(type === 'essay' || question?.type === 'essay') && (
                  <option value="essay">Ensayo (No autocorregible)</option>
                )}
                {(type === 'description' || question?.type === 'description') && (
                  <option value="description">Descripción (Informativa)</option>
                )}
                {(type === 'cloze' || question?.type === 'cloze') && (
                  <option value="cloze">Cloze (Pendiente de adaptación)</option>
                )}
                {(type === 'unsupported' || question?.type === 'unsupported') && (
                  <option value="unsupported">No compatible ({question?.rawMoodleType || 'Moodle'})</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dificultad</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Fácil">Fácil</option>
                <option value="Medio">Medio</option>
                <option value="Difícil">Difícil</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Puntos Asignados</label>
              <input
                type="number"
                min={type === 'description' ? 0 : 1}
                max="100"
                disabled={type === 'description'}
                value={type === 'description' ? 0 : points}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setPoints(Number.isNaN(n) ? 1 : Math.max(1, n));
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-center font-mono font-bold tabular-nums disabled:opacity-60"
              />
            </div>
          </div>

          {/* Prompt (Plain or Tiptap Rich HTML) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Enunciado o Pregunta</label>
              <button
                type="button"
                onClick={() => handleToggleRichMode(!useRichPrompt)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{useRichPrompt ? 'Cambiar a texto simple' : 'Usar editor enriquecido (HTML/Imágenes/KaTeX)'}</span>
              </button>
            </div>

            {useRichPrompt ? (
              <RichTextEditor
                content={promptHtml}
                onChange={(html) => {
                  setPromptHtml(html);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Redacta el enunciado con formato, tablas, imágenes o fórmulas..."
              />
            ) : (
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Escribe claramente la pregunta o consigna para el estudiante..."
                className="w-full text-xs text-slate-800 p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Type Specific Fields */}
          {(type === 'multiple_choice' || type === 'multiple_response') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Opciones de Respuesta ({type === 'multiple_choice' ? 'Marca la única correcta' : 'Marca todas las correctas'})
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setValidationError(null);
                    setOptions([
                      ...options,
                      { id: `opt-${Date.now()}-${options.length}`, text: '', isCorrect: false }
                    ]);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar opción</span>
                </button>
              </div>

              {options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type={type === 'multiple_choice' ? 'radio' : 'checkbox'}
                    name="modal_correct_opt"
                    checked={opt.isCorrect}
                    onChange={(e) => {
                      setValidationError(null);
                      if (type === 'multiple_choice') {
                        setOptions(options.map(o => ({ ...o, isCorrect: o.id === opt.id })));
                      } else {
                        setOptions(
                          options.map(o =>
                            o.id === opt.id ? { ...o, isCorrect: e.target.checked } : o
                          )
                        );
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => {
                      setValidationError(null);
                      const updated = [...options];
                      updated[idx] = { ...updated[idx], text: e.target.value };
                      setOptions(updated);
                    }}
                    placeholder={`Opción ${idx + 1}`}
                    className={`flex-1 text-xs border rounded-lg p-2 ${
                      opt.isCorrect ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-300 bg-slate-50'
                    }`}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setOptions(options.filter(o => o.id !== opt.id))}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {type === 'true_false' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Respuesta Correcta Esperada:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTrueFalseAnswer(true)}
                  className={`p-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    trueFalseAnswer
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ✓ Verdadero
                </button>
                <button
                  type="button"
                  onClick={() => setTrueFalseAnswer(false)}
                  className={`p-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    !trueFalseAnswer
                      ? 'border-rose-500 bg-rose-50 text-rose-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ✗ Falso
                </button>
              </div>
            </div>
          )}

          {type === 'fill_blank' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Respuesta correcta principal
                </label>
                <input
                  type="text"
                  value={blankAnswer}
                  onChange={(e) => {
                    setBlankAnswer(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Ej. imsmanifest"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Distinguir mayúsculas y minúsculas al calificar</span>
              </label>

              {acceptedAnswers.length > 1 && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-600">
                    Variantes adicionales aceptadas ({acceptedAnswers.length - 1}):
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-700">
                    {acceptedAnswers.slice(1).map((v, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">
                        {v.text} ({v.fraction}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {type === 'numerical' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Valores numéricos aceptados y tolerancia (±)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setNumericalAnswers([
                      ...numericalAnswers,
                      { value: 0, tolerance: 0, fraction: 100 }
                    ])
                  }
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar respuesta numérica</span>
                </button>
              </div>
              {numericalAnswers.map((num, nIdx) => (
                <div key={nIdx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Valor exacto</label>
                    <input
                      type="number"
                      step="any"
                      value={num.value}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const next = [...numericalAnswers];
                        next[nIdx] = { ...next[nIdx], value: Number.isNaN(val) ? 0 : val };
                        setNumericalAnswers(next);
                        if (validationError) setValidationError(null);
                      }}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono tabular-nums"
                    />
                  </div>
                  <div className="col-span-5">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Tolerancia (±)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={num.tolerance}
                      onChange={(e) => {
                        const tol = parseFloat(e.target.value);
                        const next = [...numericalAnswers];
                        next[nIdx] = { ...next[nIdx], tolerance: Number.isNaN(tol) ? 0 : Math.abs(tol) };
                        setNumericalAnswers(next);
                      }}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono tabular-nums"
                    />
                  </div>
                  <div className="col-span-1 pt-4 flex justify-end">
                    {numericalAnswers.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setNumericalAnswers(numericalAnswers.filter((_, idx) => idx !== nIdx))
                        }
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {type === 'matching' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Pares a Emparejar</label>
                <button
                  type="button"
                  onClick={() => {
                    setValidationError(null);
                    setMatchingPairs([
                      ...matchingPairs,
                      { id: `p-${Date.now()}-${matchingPairs.length}`, left: '', right: '' }
                    ]);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar par</span>
                </button>
              </div>

              {matchingPairs.map((pair, pIdx) => (
                <div key={pair.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pair.left}
                    onChange={(e) => {
                      setValidationError(null);
                      const updated = [...matchingPairs];
                      updated[pIdx] = { ...updated[pIdx], left: e.target.value };
                      setMatchingPairs(updated);
                    }}
                    placeholder="Elemento columna izquierda"
                    className="flex-1 text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                  />
                  <span className="text-slate-400">↔</span>
                  <input
                    type="text"
                    value={pair.right}
                    onChange={(e) => {
                      setValidationError(null);
                      const updated = [...matchingPairs];
                      updated[pIdx] = { ...updated[pIdx], right: e.target.value };
                      setMatchingPairs(updated);
                    }}
                    placeholder="Elemento columna derecha"
                    className="flex-1 text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                  />
                  {matchingPairs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setMatchingPairs(matchingPairs.filter(p => p.id !== pair.id))}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {(type === 'essay' || type === 'description' || type === 'cloze' || type === 'unsupported') && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
              <div className="font-bold text-slate-900">
                {type === 'essay'
                  ? 'Pregunta abierta de Ensayo'
                  : type === 'description'
                  ? 'Elemento informativo (Descripción)'
                  : type === 'cloze'
                  ? 'Pregunta Cloze (Respuestas incrustadas)'
                  : `Tipo Moodle no compatible (${question?.rawMoodleType || 'desconocido'})`}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Este tipo conserva su contenido en el banco para edición o consulta, pero no participa en evaluaciones autocorregibles ni exportación funcional SCORM. Puedes cambiar el tipo arriba si deseas adaptarlo manualmente a un formato interactivo compatible.
              </p>
              {type === 'cloze' && question?.clozeData && question.clozeData.subquestions.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-slate-700">
                    Subelementos Cloze detectados ({question.clozeData.subquestions.length}):
                  </div>
                  {question.clozeData.subquestions.map(sub => (
                    <div key={sub.index} className="text-[11px] font-mono bg-white border border-slate-200 rounded px-2 py-1">
                      #{sub.index} [Peso {sub.weight} · {sub.subType}]: {sub.rawBody}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Retroalimentación Formativa / Explicación Didáctica
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explica al estudiante por qué la respuesta es correcta para consolidar el aprendizaje..."
              className="w-full text-xs text-slate-800 p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Etiquetas (separadas por comas)</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Ej. SCORM, Moodle, Didáctica"
              className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            Guardar Reactivo
          </button>
        </div>
      </div>
    </div>
  );
};
