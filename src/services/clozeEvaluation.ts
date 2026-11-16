import { parseCloze, ClozeSubquestion, ClozeAnswer } from './clozeParser';

export type ClozeResponse = string | string[];
export type ClozeResponseMap = Record<string, ClozeResponse>;

export interface ClozeEvaluation {
  earnedPoints: number;
  maximumPoints: number;
  fraction: number;
  allAnswered: boolean;
  allCorrect: boolean;
  details: Array<{ index: number; earned: number; maximum: number; fraction: number; feedback: string }>;
}

function normalizeText(value: string, caseSensitive: boolean): string {
  const normalized = value.trim().normalize('NFC');
  return caseSensitive ? normalized : normalized.toLocaleLowerCase();
}

function parseNumeric(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function answerFraction(sub: ClozeSubquestion, _answer: ClozeAnswer | undefined, response: ClozeResponse): number {
  const type = sub.canonicalType;
  const responses = Array.isArray(response) ? response : [response];
  if (type === 'SHORTANSWER' || type === 'SHORTANSWER_C') {
    const caseSensitive = type === 'SHORTANSWER_C';
    const submitted = normalizeText(String(responses[0] ?? ''), caseSensitive);
    const exact = sub.answers.find(item => item.text !== '*' && normalizeText(item.text, caseSensitive) === submitted);
    const wildcard = sub.answers.find(item => item.text === '*');
    const match = exact || wildcard;
    if (!match) return 0;
    return (match.fraction ?? (match.correctMarker ? 100 : 0)) / 100;
  }

  if (type === 'NUMERICAL') {
    const submitted = parseNumeric(String(responses[0] ?? ''));
    if (submitted === null) return 0;
    for (const item of sub.answers) {
      const expected = parseNumeric(item.text);
      if (expected === null) continue;
      const tolerance = Math.max(0, item.tolerance ?? 0);
      if (Math.abs(submitted - expected) <= tolerance + Number.EPSILON) {
        return (item.fraction ?? (item.correctMarker ? 100 : 0)) / 100;
      }
    }
    return 0;
  }

  const selected = new Set(responses.map(String));
  const isMulti = type === 'MULTIRESPONSE' || type === 'MULTIRESPONSE_H' ||
    type === 'MULTIRESPONSE_S' || type === 'MULTIRESPONSE_HS';
  if (isMulti) {
    // Cloze MULTIRESPONSE awards the sum of selected option fractions.
    // Clamp the final fraction to Moodle's attainable 0..100% range.
    const raw = sub.answers.reduce((sum, item) => {
      const fraction = (item.fraction ?? (item.correctMarker ? 100 : 0)) / 100;
      return sum + (selected.has(item.text) ? fraction : 0);
    }, 0);
    return Math.max(0, Math.min(1, raw));
  }

  const chosen = sub.answers.find(item => selected.has(item.text));
  return chosen ? (chosen.fraction ?? (chosen.correctMarker ? 100 : 0)) / 100 : 0;
}

export function evaluateCloze(source: string, responses: ClozeResponseMap, points = 1): ClozeEvaluation {
  const parsed = parseCloze(source);
  const allSubquestions = parsed.subquestions;
  const maximumWeight = allSubquestions.reduce((sum, item) => sum + item.weight, 0);
  const details = allSubquestions.map(sub => {
    const response = responses[sub.id];
    const answered = Array.isArray(response) ? response.length > 0 : String(response ?? '').trim().length > 0;
    const fraction = answered && sub.supported && sub.canonicalType
      ? answerFraction(sub, sub.answers[0], response as ClozeResponse)
      : 0;
    const earned = fraction * sub.weight;
    const matchingAnswer = sub.answers.find(a => a.text === String(response ?? ''));
    return {
      index: sub.index,
      earned,
      maximum: sub.weight,
      fraction,
      feedback: matchingAnswer?.feedback || ''
    };
  });
  const earnedWeight = details.reduce((sum, item) => sum + item.earned, 0);
  const fraction = maximumWeight > 0 ? Math.max(0, Math.min(1, earnedWeight / maximumWeight)) : 0;
  const allAnswered = allSubquestions.every(sub => {
    const response = responses[sub.id];
    return Array.isArray(response) ? response.length > 0 : String(response ?? '').trim().length > 0;
  });
  const allCorrect = allSubquestions.length > 0 && allSubquestions.every(sub => sub.supported) && details.every(item => item.fraction >= 1);
  return {
    earnedPoints: fraction * Math.max(0, points),
    maximumPoints: Math.max(0, points),
    fraction,
    allAnswered,
    allCorrect,
    details
  };
}
