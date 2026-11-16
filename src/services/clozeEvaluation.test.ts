import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCloze } from './clozeEvaluation';

describe('Moodle Cloze evaluation', () => {
  it('awards weighted credit for exact short answers and partial fractions', () => {
    const result = evaluateCloze('{2:SHORTANSWER:=yes~%50%maybe}', { 'cloze-1': 'yes' }, 10);
    assert.equal(result.earnedPoints, 10);
    const partial = evaluateCloze('{2:SHORTANSWER:=yes~%50%maybe}', { 'cloze-1': 'maybe' }, 10);
    assert.equal(partial.earnedPoints, 5);
  });

  it('compares case-sensitive short answers correctly', () => {
    const good = evaluateCloze('{1:SHORTANSWER_C:=ABC}', { 'cloze-1': 'ABC' }, 5);
    const bad = evaluateCloze('{1:SHORTANSWER_C:=ABC}', { 'cloze-1': 'abc' }, 5);
    assert.equal(good.earnedPoints, 5);
    assert.equal(bad.earnedPoints, 0);
  });

  it('supports numeric tolerance', () => {
    const good = evaluateCloze('{1:NUMERICAL:=10:0.5}', { 'cloze-1': '10.4' }, 4);
    const bad = evaluateCloze('{1:NUMERICAL:=10:0.5}', { 'cloze-1': '10.6' }, 4);
    assert.equal(good.earnedPoints, 4);
    assert.equal(bad.earnedPoints, 0);
  });

  it('sums selected MULTIRESPONSE fractions and clamps the result', () => {
    const source = '{1:MULTIRESPONSE:%50%uno~%50%dos~%-50%tres}';
    const good = evaluateCloze(source, { 'cloze-1': ['uno', 'dos'] }, 6);
    const penalty = evaluateCloze(source, { 'cloze-1': ['uno', 'tres'] }, 6);
    assert.equal(good.earnedPoints, 6);
    assert.equal(penalty.earnedPoints, 0);
  });

  it('does not award credit when an unsupported extension is present', () => {
    const result = evaluateCloze('{1:SHORTANSWER:=ok} {1:REGEXP:=x}', { 'cloze-1': 'ok' }, 10);
    assert.equal(result.earnedPoints, 5);
    assert.equal(result.allCorrect, false);
  });
});
