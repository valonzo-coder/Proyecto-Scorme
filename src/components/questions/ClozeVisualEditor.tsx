import React, { useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Code2, Eye, EyeOff, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { ClozeQuestionRenderer } from './ClozeQuestionRenderer';
import { ClozeResponseMap } from '../../services/clozeEvaluation';
import { ClozeAnswer, ClozeCanonicalType, ClozeSubquestion, getClozeTypeCatalog, parseCloze } from '../../services/clozeParser';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200';
const labelClass = 'mb-1 block text-[11px] font-semibold text-slate-600';

function escapeAnswer(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/~/g, '\\~').replace(/#/g, '\\#').replace(/{/g, '\\{').replace(/}/g, '\\}').replace(/=/g, '\\=').replace(/:/g, '\\:');
}

function serializeAnswer(answer: ClozeAnswer, index: number, type: ClozeCanonicalType): string {
  const fraction = answer.fraction ?? (answer.correctMarker ? 100 : 0);
  const marker = fraction === 100 ? '=' : fraction !== 0 ? '%' + fraction + '%' : '';
  let text = escapeAnswer(answer.text);
  if (type === 'NUMERICAL' && answer.tolerance !== undefined && answer.tolerance !== null && answer.tolerance > 0) {
    text += ':' + answer.tolerance;
  }
  return (index > 0 ? '~' : '') + marker + text + (answer.feedback ? '#' + escapeAnswer(answer.feedback) : '');
}

function serializeSubquestion(type: ClozeCanonicalType, weight: number, answers: ClozeAnswer[]): string {
  const body = answers.map((answer, index) => serializeAnswer(answer, index, type)).join('');
  return '{' + weight + ':' + type + ':' + body + '}';
}

function replaceSubquestion(source: string, sub: ClozeSubquestion, replacement: string): string {
  return source.slice(0, sub.start) + replacement + source.slice(sub.end);
}

const createAnswer = (type: ClozeCanonicalType): ClozeAnswer => ({
  raw: '',
  text: '',
  fraction: 0,
  feedback: '',
  correctMarker: false,
  ...(type === 'NUMERICAL' ? { tolerance: 0 } : {})
});

export const ClozeVisualEditor: React.FC<Props> = ({ value, onChange }) => {
  const parsed = useMemo(() => parseCloze(value || ''), [value]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showSource, setShowSource] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [responses, setResponses] = useState<ClozeResponseMap>({});
  const [newType, setNewType] = useState<ClozeCanonicalType>('SHORTANSWER');
  const [newWeight, setNewWeight] = useState(1);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);

  const updateQuestion = (sub: ClozeSubquestion, patch: Partial<Pick<ClozeSubquestion, 'weight' | 'canonicalType' | 'answers'>>) => {
    if (!sub.canonicalType && !patch.canonicalType) return;
    const type = patch.canonicalType || sub.canonicalType!;
    const answers = patch.answers || sub.answers;
    const weight = patch.weight ?? sub.weight;
    onChange(replaceSubquestion(value, sub, serializeSubquestion(type, weight, answers)));
  };

  const addQuestion = () => {
    const defaults: ClozeAnswer[] = newType === 'SHORTANSWER' || newType === 'SHORTANSWER_C' || newType === 'NUMERICAL'
      ? [{ ...createAnswer(newType), text: newType === 'NUMERICAL' ? '0' : 'respuesta correcta', fraction: 100, correctMarker: true }]
      : [
          { ...createAnswer(newType), text: 'Opción correcta', fraction: 100, correctMarker: true },
          { ...createAnswer(newType), text: 'Opción alternativa', fraction: 0, correctMarker: false }
        ];
    const addition = serializeSubquestion(newType, Math.max(0.1, newWeight), defaults);
    const position = cursorPosition ?? value.length;
    const before = value.slice(0, position);
    const after = value.slice(position);
    const prefix = before && !/[\\s>]$/.test(before) ? ' ' : '';
    const suffix = after && !/^[\\s<]/.test(after) ? ' ' : '';
    onChange(before + prefix + addition + suffix + after);
    setCursorPosition(position + prefix.length + addition.length + suffix.length);
  };

  const removeQuestion = (sub: ClozeSubquestion) => {
    const before = value.slice(0, sub.start);
    const after = value.slice(sub.end);
    onChange(before + after);
  };

  const updateAnswer = (sub: ClozeSubquestion, index: number, patch: Partial<ClozeAnswer>) => {
    const answers = sub.answers.map((answer, i) => i === index ? { ...answer, ...patch } : answer);
    updateQuestion(sub, { answers });
  };

  const addAnswer = (sub: ClozeSubquestion) => updateQuestion(sub, {
    answers: [...sub.answers, createAnswer(sub.canonicalType!)]
  });

  const previewPoints = parsed.subquestions.reduce((sum, item) => sum + item.weight, 0);
  const catalog = getClozeTypeCatalog();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-indigo-950">Editor visual de respuestas incrustadas</div>
            <p className="mt-1 text-[11px] leading-relaxed text-indigo-900">Escribe el enunciado y administra cada espacio de respuesta desde sus controles. La sintaxis Cloze se genera automáticamente y se conserva para Moodle.</p>
          </div>
          <div className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-indigo-800">{parsed.subquestions.length} subpregunta(s) · {previewPoints} puntos de ponderación</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
        <label className={labelClass}>Enunciado y contenido de la pregunta (admite HTML, imágenes, tablas y fórmulas)</label>
        <textarea
          ref={sourceRef}
          rows={5}
          onSelect={event => setCursorPosition(event.currentTarget.selectionStart)}
          onClick={event => setCursorPosition(event.currentTarget.selectionStart)}
          className={inputClass + ' font-mono leading-relaxed'}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={'Escribe aquí el enunciado. Luego agrega espacios de respuesta con el botón inferior.\nEjemplo: Calcula el resultado de la operación: '}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] text-slate-500">El contenido se conserva como HTML compatible con Moodle.</span>
          <button type="button" onClick={() => setShowSource(!showSource)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100">
            <Code2 className="h-3.5 w-3.5" /> {showSource ? 'Ocultar código' : 'Ver sintaxis Cloze'}
          </button>
        </div>
        {showSource && <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-[11px] text-emerald-200">{value || 'La sintaxis se mostrará aquí.'}</pre>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[180px] flex-1">
            <label className={labelClass}>Tipo de respuesta que deseas insertar</label>
            <select className={inputClass} value={newType} onChange={event => setNewType(event.target.value as ClozeCanonicalType)}>
              {catalog.map(item => <option key={item.code} value={item.code}>{item.code} — {item.presentation}{item.shuffled ? ' · barajado' : ''}</option>)}
            </select>
          </div>
          <div className="w-24">
            <label className={labelClass}>Ponderación</label>
            <input className={inputClass} type="number" min="0.1" step="0.1" value={newWeight} onChange={event => setNewWeight(Number(event.target.value) || 1)} />
          </div>
          <button type="button" onClick={addQuestion} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Insertar respuesta
          </button>
        </div>
        <p className="text-[10px] text-slate-500">El nuevo espacio se inserta donde está el cursor del enunciado; si no seleccionaste una posición, se agrega al final.</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800">Configuración de subpreguntas</h4>
          <span className="text-[10px] text-slate-500">Cada espacio se califica de forma independiente</span>
        </div>
        {parsed.subquestions.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center text-xs text-slate-500">Todavía no hay espacios de respuesta. Inserta uno para comenzar.</div>}
        {parsed.subquestions.map(sub => {
          const open = expanded[sub.id] !== false;
          const type = sub.canonicalType;
          return <section key={sub.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2.5">
              <button type="button" onClick={() => setExpanded(current => ({ ...current, [sub.id]: !open }))} className="text-slate-500">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-800">Respuesta {sub.index} · {sub.originalType}</div>
                <div className="text-[10px] text-slate-500">Ponderación: {sub.weight} · {sub.answers.length} alternativa(s)</div>
              </div>
              <button type="button" onClick={() => removeQuestion(sub)} title="Eliminar respuesta" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
            {open && <div className="space-y-3 p-3">
              {!type ? <div className="text-xs text-amber-700">Este tipo corresponde a una extensión no reconocida. Se conserva en el contenido fuente, pero no puede editarse como tipo nativo.</div> : <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div><label className={labelClass}>Tipo Cloze</label><select className={inputClass} value={type} onChange={event => updateQuestion(sub, { canonicalType: event.target.value as ClozeCanonicalType })}>{catalog.map(item => <option key={item.code} value={item.code}>{item.code}</option>)}</select></div>
                  <div><label className={labelClass}>Ponderación</label><input className={inputClass} type="number" min="0.1" step="0.1" value={sub.weight} onChange={event => updateQuestion(sub, { weight: Math.max(0.1, Number(event.target.value) || 0.1) })} /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-slate-700">Alternativas / respuestas</span><button type="button" onClick={() => addAnswer(sub)} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"><Plus className="mr-1 inline h-3 w-3" />Agregar alternativa</button></div>
                  {sub.answers.map((answer, index) => <div key={index} className="rounded-lg border border-slate-200 p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <input className={inputClass + ' flex-1'} value={answer.text} onChange={event => updateAnswer(sub, index, { text: event.target.value })} placeholder={type === 'NUMERICAL' ? 'Valor numérico' : 'Texto de respuesta'} />
                      <div className="w-24"><label className={labelClass}>Fracción %</label><input className={inputClass} type="number" min="-100" max="100" step="0.1" value={answer.fraction ?? (answer.correctMarker ? 100 : 0)} onChange={event => updateAnswer(sub, index, { fraction: Number(event.target.value), correctMarker: Number(event.target.value) === 100 })} /></div>
                      {sub.answers.length > 1 && <button type="button" onClick={() => updateQuestion(sub, { answers: sub.answers.filter((_, i) => i !== index) })} className="mt-4 rounded p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                    {type === 'NUMERICAL' && <div className="w-36"><label className={labelClass}>Tolerancia</label><input className={inputClass} type="number" min="0" step="any" value={answer.tolerance ?? 0} onChange={event => updateAnswer(sub, index, { tolerance: Math.max(0, Number(event.target.value) || 0) })} /></div>}
                    <div><label className={labelClass}>Retroalimentación de esta respuesta (opcional)</label><input className={inputClass} value={answer.feedback} onChange={event => updateAnswer(sub, index, { feedback: event.target.value })} placeholder="Explica por qué esta alternativa es correcta o incorrecta..." /></div>
                  </div>)}
                </div>
              </>}
              {sub.errors.length > 0 && <div className="text-[10px] text-rose-700">{sub.errors.join(' ')}</div>}
            </div>}
          </section>;
        })}
      </div>

      {parsed.warnings.length > 0 && <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />{parsed.warnings.join(' ')}</div>}
      {parsed.errors.length > 0 && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">{parsed.errors.join(' ')}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <div className="text-xs font-bold text-slate-800">Vista previa interactiva</div>
          <button type="button" onClick={() => setShowPreview(!showPreview)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600">{showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{showPreview ? 'Ocultar' : 'Mostrar'}</button>
        </div>
        {showPreview && <div className="space-y-3 p-3">
          <ClozeQuestionRenderer source={value} value={responses} onChange={setResponses} />
          <div className="rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500">La vista previa permite comprobar la ubicación y el tipo de cada control. La puntuación definitiva se calcula al responder dentro de una evaluación.</div>
          {parsed.subquestions.length > 0 && <div className="text-[10px] font-semibold text-slate-600">Ponderación total: {previewPoints}</div>}
        </div>}
      </div>
    </div>
  );
};
