import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getClozeTypeCatalog, normalizeClozeType, parseCloze, serializeCloze } from './clozeParser';

describe('Moodle Cloze parser', () => {
  it('normaliza nombres completos y alias documentados', () => {
    assert.equal(normalizeClozeType('SA'), 'SHORTANSWER');
    assert.equal(normalizeClozeType('MWC'), 'SHORTANSWER_C');
    assert.equal(normalizeClozeType('NM'), 'NUMERICAL');
    assert.equal(normalizeClozeType('MCHS'), 'MULTICHOICE_HS');
    assert.equal(normalizeClozeType('MRHS'), 'MULTIRESPONSE_HS');
    assert.equal(normalizeClozeType('REGEXP'), null);
  });

  it('interpreta ponderación, alternativas, porcentajes y retroalimentación', () => {
    const parsed = parseCloze('Texto {3:SHORTANSWER:=hola#Correcto~%50%buenas#Parcial}');
    assert.equal(parsed.subquestions.length, 1);
    assert.equal(parsed.subquestions[0].weight, 3);
    assert.equal(parsed.subquestions[0].answers[0].fraction, 100);
    assert.equal(parsed.subquestions[0].answers[0].feedback, 'Correcto');
    assert.equal(parsed.subquestions[0].answers[1].fraction, 50);
    assert.equal(parsed.subquestions[0].answers[1].feedback, 'Parcial');
  });

  it('interpreta tolerancia de respuestas numéricas', () => {
    const parsed = parseCloze('{2:NUMERICAL:=10:0.25#Correcto}');
    assert.equal(parsed.subquestions[0].answers[0].text, '10');
    assert.equal(parsed.subquestions[0].answers[0].tolerance, 0.25);
  });

  it('conserva extensiones desconocidas sin clasificarlas como nativas', () => {
    const parsed = parseCloze('{1:REGEXP:=^[A-Z]+$}');
    assert.equal(parsed.subquestions[0].supported, false);
    assert.equal(parsed.subquestions[0].extension, true);
    assert.ok(parsed.warnings.length > 0);
  });

  it('conserva literalmente la fuente al serializar', () => {
    const source = 'Ejemplo \\{literal\\} {1:SHORTANSWER:=texto}';
    assert.equal(serializeCloze(parseCloze(source)), source);
  });

  it('expone el catálogo de variantes', () => {
    assert.equal(getClozeTypeCatalog().length, 13);
  });
});
