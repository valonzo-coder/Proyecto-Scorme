import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, HelpCircle } from 'lucide-react';
import { QuestionItem, QuestionType, DifficultyLevel, QuestionOption, MatchingPair } from '../../types/scorm';

interface EditQuestionModalProps {
  question: QuestionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedQuestion: QuestionItem) => void;
}

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  question,
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const [type, setType] = useState<QuestionType>(question?.type || 'multiple_choice');
  const [prompt, setPrompt] = useState(question?.prompt || '');
  const [explanation, setExplanation] = useState(question?.explanation || '');
  const [points, setPoints] = useState(question?.points || 10);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(question?.difficulty || 'Medio');
  const [tagInput, setTagInput] = useState(question?.tags?.join(', ') || 'General');

  // Options for multiple choice / multiple response
  const [options, setOptions] = useState<QuestionOption[]>(
    question?.options || [
      { id: 'opt1', text: 'Primera opción', isCorrect: true },
      { id: 'opt2', text: 'Segunda opción alternativa', isCorrect: false },
      { id: 'opt3', text: 'Tercera opción alternativa', isCorrect: false },
    ]
  );

  // True/False answer
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<boolean>(
    question?.trueFalseAnswer !== undefined ? question.trueFalseAnswer : true
  );

  // Fill in the blank
  const [blankAnswer, setBlankAnswer] = useState(question?.blankAnswer || '');

  // Matching pairs
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>(
    question?.matchingPairs || [
      { id: 'p1', left: 'Concepto A', right: 'Definición o ejemplo A' },
      { id: 'p2', left: 'Concepto B', right: 'Definición o ejemplo B' },
    ]
  );

  const handleSave = () => {
    if (!prompt.trim()) {
      alert('Por favor redacta la pregunta o enunciado.');
      return;
    }

    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);

    const updated: QuestionItem = {
      id: question?.id || `q-${Date.now()}`,
      type,
      prompt,
      explanation,
      points: Number(points) || 10,
      difficulty,
      tags: tags.length > 0 ? tags : ['General'],
      options: (type === 'multiple_choice' || type === 'multiple_response') ? options : undefined,
      trueFalseAnswer: type === 'true_false' ? trueFalseAnswer : undefined,
      blankAnswer: type === 'fill_blank' ? blankAnswer : undefined,
      matchingPairs: type === 'matching' ? matchingPairs : undefined
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {question ? 'Editar Pregunta del Banco' : 'Nueva Pregunta Evaluativa'}
            </h3>
            <p className="text-xs text-slate-500">Configura reactivos pedagógicos compatibles con SCORM</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Question Type & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Pregunta</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="multiple_choice">Opción Múltiple (Única)</option>
                <option value="multiple_response">Selección Múltiple (Varias)</option>
                <option value="true_false">Verdadero o Falso</option>
                <option value="fill_blank">Completar Espacio en Blanco</option>
                <option value="matching">Emparejamiento / Relación</option>
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
                min="1"
                max="100"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 10)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-center font-mono font-bold"
              />
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Enunciado o Pregunta</label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Escribe claramente la pregunta o consigna para el estudiante..."
              className="w-full text-xs text-slate-800 p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
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
                  onClick={() => setOptions([...options, { id: `opt-${Date.now()}`, text: '', isCorrect: false }])}
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
                      if (type === 'multiple_choice') {
                        setOptions(options.map(o => ({ ...o, isCorrect: o.id === opt.id })));
                      } else {
                        setOptions(options.map(o => o.id === opt.id ? { ...o, isCorrect: e.target.checked } : o));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => {
                      const updated = [...options];
                      updated[idx].text = e.target.value;
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
                      className="text-slate-400 hover:text-rose-600 p-1"
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
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Palabra o frase clave exacta</label>
              <input
                type="text"
                value={blankAnswer}
                onChange={(e) => setBlankAnswer(e.target.value)}
                placeholder="Ej. imsmanifest"
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
              />
              <p className="text-[11px] text-slate-400 mt-1">La comparación no distingue mayúsculas o minúsculas.</p>
            </div>
          )}

          {type === 'matching' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Pares a Emparejar</label>
                <button
                  type="button"
                  onClick={() => setMatchingPairs([...matchingPairs, { id: `p-${Date.now()}`, left: '', right: '' }])}
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
                      const updated = [...matchingPairs];
                      updated[pIdx].left = e.target.value;
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
                      const updated = [...matchingPairs];
                      updated[pIdx].right = e.target.value;
                      setMatchingPairs(updated);
                    }}
                    placeholder="Elemento columna derecha"
                    className="flex-1 text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                  />
                  {matchingPairs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setMatchingPairs(matchingPairs.filter(p => p.id !== pair.id))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
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
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
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
