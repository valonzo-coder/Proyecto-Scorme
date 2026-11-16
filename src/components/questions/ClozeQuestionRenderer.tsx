import React from 'react';
import { parseCloze, ClozeSubquestion } from '../../services/clozeParser';
import { ClozeResponseMap } from '../../services/clozeEvaluation';
import { SafeRichContent } from './SafeRichContent';

interface ClozeQuestionRendererProps {
  source: string;
  value: ClozeResponseMap;
  onChange: (value: ClozeResponseMap) => void;
  disabled?: boolean;
  showFeedback?: boolean;
  idPrefix?: string;
}

function plainOptionLabel(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim();
}

function ClozeControl({ question, value, onChange, disabled, seed }: {
  question: ClozeSubquestion;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  disabled: boolean;
  seed: string;
}) {
  const type = question.canonicalType;
  const isMulti = type === 'MULTIRESPONSE' || type === 'MULTIRESPONSE_H' ||
    type === 'MULTIRESPONSE_S' || type === 'MULTIRESPONSE_HS';
  const shuffled = !!type?.endsWith('S');
  const hash = (value: string) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index++) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  };
  const options = shuffled
    ? [...question.answers].sort((a, b) => hash(seed + a.text) - hash(seed + b.text))
    : question.answers;
  const selected = Array.isArray(value) ? value : value == null ? [] : [String(value)];

  if (type === 'SHORTANSWER' || type === 'SHORTANSWER_C' || type === 'NUMERICAL') {
    return <input
      type="text"
      inputMode={type === 'NUMERICAL' ? 'decimal' : 'text'}
      value={typeof value === 'string' ? value : ''}
      disabled={disabled}
      onChange={event => onChange(event.target.value)}
      aria-label={type === 'NUMERICAL' ? 'Respuesta numérica' : 'Respuesta corta'}
      className="inline-block min-w-[7rem] max-w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
    />;
  }

  if (type === 'MULTICHOICE' || type === 'MULTICHOICE_S') {
    return <select
      value={selected[0] || ''}
      disabled={disabled}
      onChange={event => onChange(event.target.value)}
      className="inline-block max-w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
    >
      <option value="">Selecciona...</option>
      {options.map((answer, index) => <option key={index} value={answer.text}>{plainOptionLabel(answer.text)}</option>)}
    </select>;
  }

  if (type?.startsWith('MULTICHOICE_') || isMulti) {
    const horizontal = type?.endsWith('_H') || type?.endsWith('_HS');
    return <span className={horizontal ? 'inline-flex flex-wrap gap-3' : 'inline-flex flex-col gap-1'}>
      {options.map((answer, index) => {
        const checked = selected.includes(answer.text);
        return <label key={index} className="inline-flex items-center gap-1.5 text-xs">
          <input
            type={isMulti ? 'checkbox' : 'radio'}
            name={question.id}
            checked={checked}
            disabled={disabled}
            onChange={event => {
              if (isMulti) onChange(event.target.checked
                ? [...selected, answer.text]
                : selected.filter(item => item !== answer.text));
              else onChange(answer.text);
            }}
          />
          <SafeRichContent html={answer.text} fallbackText={answer.text} className="inline" />
        </label>;
      })}
    </span>;
  }

  return <span className="text-xs text-amber-700">Tipo Cloze no disponible en este reproductor.</span>;
}

export const ClozeQuestionRenderer: React.FC<ClozeQuestionRendererProps> = ({
  source, value, onChange, disabled = false, showFeedback = false, idPrefix = 'cloze'
}) => {
  const parsed = parseCloze(source);
  const setAnswer = (question: ClozeSubquestion, answer: string | string[]) => {
    onChange({ ...value, [question.id]: answer });
  };

  return <div className="space-y-2 text-sm leading-7">
    {parsed.segments.map((segment, index) => segment.type === 'text'
      ? <SafeRichContent key={index} html={segment.value} fallbackText={segment.value} className="inline" />
      : <span key={segment.question.id} className="inline-flex align-middle mx-1">
          <ClozeControl
            question={segment.question}
            value={value[segment.question.id]}
            onChange={answer => setAnswer(segment.question, answer)}
            disabled={disabled || !segment.question.supported}
            seed={idPrefix + '-' + segment.question.id}
          />
        </span>
    )}
    {showFeedback && <div className="mt-2 space-y-1">
      {parsed.subquestions.map(question => {
        const response = value[question.id];
        const chosen = Array.isArray(response) ? response : [response || ''];
        const feedback = question.answers.find(answer => chosen.includes(answer.text))?.feedback;
        return feedback ? <div key={question.id} className="text-xs text-slate-600">{feedback}</div> : null;
      })}
    </div>}
    {parsed.warnings.length > 0 && <p className="text-xs text-amber-700">{parsed.warnings.join(' ')}</p>}
  </div>;
};
