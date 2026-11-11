import React, { useState } from 'react';
import { 
  HelpCircle, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  Sparkles, 
  Award,
  Filter,
  Check,
  X
} from 'lucide-react';
import { CourseProject, QuestionItem, QuestionType, DifficultyLevel } from '../../types/scorm';
import { EditQuestionModal } from '../modals/EditQuestionModal';

interface QuestionBankViewProps {
  project: CourseProject;
  onUpdateProject: (updated: CourseProject) => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  project,
  onUpdateProject
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testedAnswers, setTestedAnswers] = useState<Record<string, any>>({});
  const [showFeedbackFor, setShowFeedbackFor] = useState<Record<string, boolean>>({});

  const typeLabels: Record<QuestionType, string> = {
    multiple_choice: 'Opción Múltiple (Única)',
    multiple_response: 'Selección Múltiple (Varias)',
    true_false: 'Verdadero / Falso',
    fill_blank: 'Completar Espacio',
    matching: 'Emparejamiento'
  };

  const filteredQuestions = project.questionBank.filter(q => {
    const matchesSearch = q.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          q.explanation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          q.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDiff = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    const matchesType = typeFilter === 'all' || q.type === typeFilter;
    return matchesSearch && matchesDiff && matchesType;
  });

  const handleSaveQuestion = (savedQuestion: QuestionItem) => {
    const exists = project.questionBank.some(q => q.id === savedQuestion.id);
    let updatedList: QuestionItem[];
    if (exists) {
      updatedList = project.questionBank.map(q => q.id === savedQuestion.id ? savedQuestion : q);
    } else {
      updatedList = [savedQuestion, ...project.questionBank];
    }
    onUpdateProject({
      ...project,
      questionBank: updatedList
    });
  };

  const handleDeleteQuestion = (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este reactivo del banco?')) return;
    onUpdateProject({
      ...project,
      questionBank: project.questionBank.filter(q => q.id !== id)
    });
  };

  const handleDuplicateQuestion = (q: QuestionItem) => {
    const duplicate: QuestionItem = {
      ...JSON.parse(JSON.stringify(q)),
      id: `q-${Date.now()}`,
      prompt: `${q.prompt} (Copia)`
    };
    onUpdateProject({
      ...project,
      questionBank: [duplicate, ...project.questionBank]
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Banco de Preguntas</h1>
          <p className="text-xs text-slate-500">
            Gestiona reactivos reutilizables en lecciones y cuestionarios SCORM con retroalimentación inmediata
          </p>
        </div>

        <button
          onClick={() => {
            setEditingQuestion(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Pregunta</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por enunciado, conceptos o etiquetas..."
            className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Tipo:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-200 bg-slate-50 rounded-lg p-1.5 focus:outline-none"
            >
              <option value="all">Todos los formatos</option>
              <option value="multiple_choice">Opción múltiple</option>
              <option value="multiple_response">Selección múltiple</option>
              <option value="true_false">Verdadero / Falso</option>
              <option value="fill_blank">Completar espacio</option>
              <option value="matching">Emparejamiento</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Dificultad:</span>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="text-xs border border-slate-200 bg-slate-50 rounded-lg p-1.5 focus:outline-none"
            >
              <option value="all">Todas</option>
              <option value="Fácil">Fácil</option>
              <option value="Medio">Medio</option>
              <option value="Difícil">Difícil</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">No hay preguntas con estos filtros</h3>
          <p className="text-xs text-slate-500 mb-4">Crea una nueva pregunta para tu banco o ajusta los criterios de búsqueda.</p>
          <button
            onClick={() => {
              setEditingQuestion(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Crear Primera Pregunta
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q, qIndex) => {
            return (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Header info */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      {typeLabels[q.type]}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      q.difficulty === 'Fácil' ? 'bg-emerald-50 text-emerald-700' :
                      q.difficulty === 'Medio' ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {q.difficulty}
                    </span>
                    <span className="text-xs font-mono text-slate-500 font-bold">
                      {q.points} pts
                    </span>
                    <div className="flex items-center gap-1">
                      {q.tags.map(t => (
                        <span key={t} className="text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicateQuestion(q)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                      title="Duplicar pregunta"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingQuestion(q);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                      title="Editar pregunta"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Prompt & Interactive Sandbox */}
                <div className="p-5 space-y-4">
                  <div className="text-sm font-bold text-slate-900 leading-snug">
                    {qIndex + 1}. {q.prompt}
                  </div>

                  {/* Interactive Option rendering */}
                  <div className="space-y-2">
                    {q.type === 'multiple_choice' && (
                      <div className="space-y-1.5">
                        {q.options?.map(opt => (
                          <div 
                            key={opt.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                              opt.isCorrect 
                                ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 font-medium' 
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                opt.isCorrect ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                              }`}>
                                {opt.isCorrect ? '✓' : ''}
                              </span>
                              <span>{opt.text}</span>
                            </div>
                            {opt.isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-700 uppercase">Correcta</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'multiple_response' && (
                      <div className="space-y-1.5">
                        {q.options?.map(opt => (
                          <div 
                            key={opt.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                              opt.isCorrect 
                                ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 font-medium' 
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                                opt.isCorrect ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                              }`}>
                                {opt.isCorrect ? '✓' : ''}
                              </span>
                              <span>{opt.text}</span>
                            </div>
                            {opt.isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-700 uppercase">Correcta</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'true_false' && (
                      <div className="flex items-center gap-3">
                        <div className={`flex-1 p-2.5 rounded-lg border text-xs text-center font-bold ${
                          q.trueFalseAnswer 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}>
                          Verdadero {q.trueFalseAnswer ? '✓ (Respuesta Correcta)' : ''}
                        </div>
                        <div className={`flex-1 p-2.5 rounded-lg border text-xs text-center font-bold ${
                          !q.trueFalseAnswer 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}>
                          Falso {!q.trueFalseAnswer ? '✓ (Respuesta Correcta)' : ''}
                        </div>
                      </div>
                    )}

                    {q.type === 'fill_blank' && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                        <span className="font-semibold text-slate-500">Respuesta esperada:</span>{' '}
                        <code className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                          {q.blankAnswer}
                        </code>
                      </div>
                    )}

                    {q.type === 'matching' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.matchingPairs?.map(pair => (
                          <div key={pair.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{pair.left}</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-slate-600">{pair.right}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Didactic Explanation */}
                  {q.explanation && (
                    <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-700">
                      <span className="font-bold text-blue-800">💡 Explicación formativa:</span>{' '}
                      {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Create Question Modal */}
      <EditQuestionModal
        isOpen={isModalOpen}
        question={editingQuestion}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveQuestion}
      />
    </div>
  );
};
