/**
 * Parser Cloze de Moodle.
 * Conserva siempre el texto fuente y la sintaxis original para evitar pérdida de datos.
 * No ejecuta HTML ni interpreta extensiones externas como tipos nativos.
 */
export type ClozeCanonicalType =
  | 'SHORTANSWER' | 'SHORTANSWER_C' | 'NUMERICAL'
  | 'MULTICHOICE' | 'MULTICHOICE_V' | 'MULTICHOICE_H'
  | 'MULTIRESPONSE' | 'MULTIRESPONSE_H'
  | 'MULTICHOICE_S' | 'MULTICHOICE_VS' | 'MULTICHOICE_HS'
  | 'MULTIRESPONSE_S' | 'MULTIRESPONSE_HS';

export interface ClozeAnswer {
  raw: string;
  text: string;
  fraction: number | null;
  feedback: string;
  correctMarker: boolean;
  tolerance?: number | null;
}

export interface ClozeSubquestion {
  id: string;
  index: number;
  weight: number;
  originalType: string;
  canonicalType: ClozeCanonicalType | null;
  alias: string | null;
  rawBody: string;
  answers: ClozeAnswer[];
  supported: boolean;
  extension: boolean;
  start: number;
  end: number;
  errors: string[];
}

export interface ClozeTextSegment { type: 'text'; value: string; start: number; end: number }
export interface ClozeQuestionSegment { type: 'question'; question: ClozeSubquestion }
export type ClozeSegment = ClozeTextSegment | ClozeQuestionSegment;
export interface ClozeParseResult {
  source: string;
  segments: ClozeSegment[];
  subquestions: ClozeSubquestion[];
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

const TYPE_ALIASES: Record<string, ClozeCanonicalType> = {
  SHORTANSWER: 'SHORTANSWER', SA: 'SHORTANSWER', MW: 'SHORTANSWER',
  SHORTANSWER_C: 'SHORTANSWER_C', SAC: 'SHORTANSWER_C', MWC: 'SHORTANSWER_C',
  NUMERICAL: 'NUMERICAL', NM: 'NUMERICAL',
  MULTICHOICE: 'MULTICHOICE', MC: 'MULTICHOICE',
  MULTICHOICE_V: 'MULTICHOICE_V', MCV: 'MULTICHOICE_V',
  MULTICHOICE_H: 'MULTICHOICE_H', MCH: 'MULTICHOICE_H',
  MULTIRESPONSE: 'MULTIRESPONSE', MR: 'MULTIRESPONSE',
  MULTIRESPONSE_H: 'MULTIRESPONSE_H', MRH: 'MULTIRESPONSE_H',
  MULTICHOICE_S: 'MULTICHOICE_S', MCS: 'MULTICHOICE_S',
  MULTICHOICE_VS: 'MULTICHOICE_VS', MCVS: 'MULTICHOICE_VS',
  MULTICHOICE_HS: 'MULTICHOICE_HS', MCHS: 'MULTICHOICE_HS',
  MULTIRESPONSE_S: 'MULTIRESPONSE_S', MRS: 'MULTIRESPONSE_S',
  MULTIRESPONSE_HS: 'MULTIRESPONSE_HS', MRHS: 'MULTIRESPONSE_HS'
};

export function normalizeClozeType(type: string): ClozeCanonicalType | null {
  return TYPE_ALIASES[(type || '').trim().toUpperCase()] || null;
}

function splitUnescaped(value: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = '';
  let escaped = false;
  for (const ch of value) {
    if (escaped) { current += '\\' + ch; escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === delimiter) { parts.push(current); current = ''; }
    else current += ch;
  }
  if (escaped) current += '\\';
  parts.push(current);
  return parts;
}

function unescapeCloze(value: string): string {
  return value.replace(/\\([{}~#:=\\])/g, '$1');
}

function parseAnswers(type: ClozeCanonicalType | null, rawBody: string): ClozeAnswer[] {
  const tokens = splitUnescaped(rawBody, '~');
  return tokens.filter((token, i) => token.length > 0 || i > 0).map(token => {
    let rest = token;
    let fraction: number | null = null;
    let correctMarker = false;
    const percent = rest.match(/^%(-?(?:\d+(?:\.\d*)?|\.\d+))%/);
    if (percent) {
      fraction = Number(percent[1]);
      rest = rest.slice(percent[0].length);
    } else if (rest.startsWith('=')) {
      correctMarker = true;
      fraction = 100;
      rest = rest.slice(1);
    }
    const feedbackParts = splitUnescaped(rest, '#');
    let answerText = feedbackParts.shift() || '';
    const feedback = feedbackParts.join('#');
    let tolerance: number | null | undefined;
    if (type === 'NUMERICAL') {
      const numericParts = splitUnescaped(answerText, ':');
      if (numericParts.length > 1) {
        answerText = numericParts.shift() || '';
        const parsedTolerance = Number(unescapeCloze(numericParts.join(':')).trim());
        tolerance = Number.isFinite(parsedTolerance) && parsedTolerance >= 0 ? parsedTolerance : null;
      } else {
        tolerance = 0;
      }
    }
    return {
      raw: token,
      text: unescapeCloze(answerText),
      fraction,
      feedback: unescapeCloze(feedback),
      correctMarker,
      ...(type === 'NUMERICAL' ? { tolerance } : {})
    };
  });
}

function findClosingBrace(source: string, start: number): number {
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '}') return i;
  }
  return -1;
}

export function parseCloze(source: string): ClozeParseResult {
  const segments: ClozeSegment[] = [];
  const subquestions: ClozeSubquestion[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let cursor = 0;
  let textStart = 0;
  let index = 0;

  while (cursor < source.length) {
    if (source[cursor] !== '{' || (cursor > 0 && source[cursor - 1] === '\\')) {
      cursor++;
      continue;
    }
    const header = source.slice(cursor + 1).match(/^(\d*)\s*:\s*([A-Za-z_]+)\s*:/);
    if (!header) { cursor++; continue; }
    const bodyStart = cursor + 1 + header[0].length;
    const close = findClosingBrace(source, bodyStart);
    if (close < 0) {
      errors.push('Hay una subpregunta Cloze que comienza en la posición ' + cursor + ' y no tiene llave de cierre.');
      break;
    }

    if (cursor > textStart) {
      segments.push({ type: 'text', value: source.slice(textStart, cursor), start: textStart, end: cursor });
    }
    index++;
    const originalType = header[2].toUpperCase();
    const canonicalType = normalizeClozeType(originalType);
    const rawBody = source.slice(bodyStart, close);
    const weight = header[1] ? Number(header[1]) : 1;
    const localErrors: string[] = [];
    if (!Number.isFinite(weight) || weight <= 0) localErrors.push('La ponderación debe ser un número mayor que cero.');
    if (!canonicalType) warnings.push('Tipo Cloze "' + originalType + '" no estándar o no reconocido; se conserva su sintaxis original.');
    const question: ClozeSubquestion = {
      id: 'cloze-' + index,
      index,
      weight: Number.isFinite(weight) && weight > 0 ? weight : 1,
      originalType,
      canonicalType,
      alias: originalType !== canonicalType ? originalType : null,
      rawBody,
      answers: parseAnswers(canonicalType, rawBody),
      supported: canonicalType !== null,
      extension: canonicalType === null,
      start: cursor,
      end: close + 1,
      errors: localErrors
    };
    subquestions.push(question);
    segments.push({ type: 'question', question });
    errors.push(...localErrors);
    cursor = close + 1;
    textStart = cursor;
  }

  if (textStart < source.length) {
    segments.push({ type: 'text', value: source.slice(textStart), start: textStart, end: source.length });
  }
  return { source, segments, subquestions, errors, warnings, isValid: errors.length === 0 };
}

export function serializeCloze(result: ClozeParseResult): string {
  // La serialización inicial es deliberadamente sin pérdida: conserva exactamente la fuente.
  return result.source;
}

export function getClozeTypeCatalog(): Array<{ code: ClozeCanonicalType; aliases: string[]; presentation: string; multiple: boolean; shuffled: boolean }> {
  return [
    { code: 'SHORTANSWER', aliases: ['SA', 'MW'], presentation: 'text', multiple: false, shuffled: false },
    { code: 'SHORTANSWER_C', aliases: ['SAC', 'MWC'], presentation: 'text', multiple: false, shuffled: false },
    { code: 'NUMERICAL', aliases: ['NM'], presentation: 'number', multiple: false, shuffled: false },
    { code: 'MULTICHOICE', aliases: ['MC'], presentation: 'select', multiple: false, shuffled: false },
    { code: 'MULTICHOICE_V', aliases: ['MCV'], presentation: 'vertical-radio', multiple: false, shuffled: false },
    { code: 'MULTICHOICE_H', aliases: ['MCH'], presentation: 'horizontal-radio', multiple: false, shuffled: false },
    { code: 'MULTIRESPONSE', aliases: ['MR'], presentation: 'vertical-checkbox', multiple: true, shuffled: false },
    { code: 'MULTIRESPONSE_H', aliases: ['MRH'], presentation: 'horizontal-checkbox', multiple: true, shuffled: false },
    { code: 'MULTICHOICE_S', aliases: ['MCS'], presentation: 'select', multiple: false, shuffled: true },
    { code: 'MULTICHOICE_VS', aliases: ['MCVS'], presentation: 'vertical-radio', multiple: false, shuffled: true },
    { code: 'MULTICHOICE_HS', aliases: ['MCHS'], presentation: 'horizontal-radio', multiple: false, shuffled: true },
    { code: 'MULTIRESPONSE_S', aliases: ['MRS'], presentation: 'vertical-checkbox', multiple: true, shuffled: true },
    { code: 'MULTIRESPONSE_HS', aliases: ['MRHS'], presentation: 'horizontal-checkbox', multiple: true, shuffled: true }
  ];
}
