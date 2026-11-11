import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Settings2, 
  Award, 
  Clock, 
  Shuffle, 
  RotateCcw, 
  CheckCircle2, 
  Trash2, 
  Edit3,
  HelpCircle,
  Percent
} from 'lucide-react';
import { CourseProject, AssessmentConfig } from '../../types/scorm';

interface AssessmentsViewProps {
  project: CourseProject;
  onUpdateProject: (updated: CourseProject) => void;
  onOpenQuestionBank: () => void;
}

export const AssessmentsView: React.FC<AssessmentsViewProps> = ({
  project,
  onUpdateProject,
  onOpenQuestionBank
}) => {
  const [editingAssessment, setEditingAssessment] = useState<AssessmentConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = (exam?: AssessmentConfig) => {
    if (exam) {
      setEditingAssessment(JSON.parse(JSON.stringify(exam)));
    } else {
      setEditingAssessment({
        id: `eval-${Date.now()}`,
        title: 'Evaluación Sumativa Final',
        description: 'Cuestionario de acreditación para validar el dominio de las competencias del curso.',
        type: 'final_exam',
        passingScore: project.scormConfig.masteryScore || 80,
        questionIds: project.questionBank.map(q => q.id),
        maxAttempts: 3,
        shuffleQuestions: true,
        shuffleOptions: true,
        showFeedback: true,
        timeLimitMinutes: 20
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveAssessment = (saved: AssessmentConfig) => {
    const exists = project.assessments.some(a => a.id === saved.id);
    let updatedList: AssessmentConfig[];
    if (exists) {
      updatedList = project.assessments.map(a => a.id === saved.id ? saved : a);
    } else {
      updatedList = [...project.assessments, saved];
    }

    onUpdateProject({
      ...project,
      assessments: updatedList,
      scormConfig: {
        ...project.scormConfig,
        masteryScore: saved.passingScore
      }
    });
    setIsModalOpen(false);
  };

  const handleDeleteAssessment = (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta evaluación?')) return;
    onUpdateProject({
      ...project,
      assessments: project.assessments.filter(a => a.id !== id)
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Evaluaciones y Cuestionarios</h1>
          <p className="text-xs text-slate-500">
            Define condiciones de aprobación, intentos y reportes automáticos de calificación al libro de Moodle
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Evaluación</span>
        </button>
      </div>

      {/* Assessment cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {project.assessments.map((exam) => {
          const selectedQuestions = project.questionBank.filter(q => exam.questionIds.includes(q.id));
          const totalPoints = selectedQuestions.reduce((acc, q) => acc + q.points, 0);

          return (
            <div
              key={exam.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="p-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 uppercase tracking-wide">
                    {exam.type === 'final_exam' ? 'Examen Final Acreditador' : 'Cuestionario Parcial'}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Award className="w-3.5 h-3.5" />
                    <span>Mínimo para aprobar: {exam.passingScore}%</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {exam.title}
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  {exam.description}
                </p>

                {/* Parameters Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-6">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Preguntas asignadas</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {exam.questionIds.length} <span className="text-xs font-normal text-slate-500">({totalPoints} pts)</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Intentos permitidos</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {exam.maxAttempts === 0 ? 'Ilimitados' : `${exam.maxAttempts} intentos`}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Límite de tiempo</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {exam.timeLimitMinutes === 0 ? 'Sin límite' : `${exam.timeLimitMinutes} minutos`}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Aleatorización</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {exam.shuffleQuestions ? 'Preguntas barajadas' : 'Orden secuencial'}
                    </span>
                  </div>
                </div>

                {/* Questions Preview inside this exam */}
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Preguntas incluidas ({selectedQuestions.length}):</span>
                    <button
                      onClick={onOpenQuestionBank}
                      className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      Editar banco →
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedQuestions.map((q, idx) => (
                      <div key={q.id} className="text-xs p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <span className="truncate max-w-[280px]">{idx + 1}. {q.prompt}</span>
                        <span className="font-mono text-slate-400 shrink-0 font-bold">{q.points}p</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  SCORM CMI: <code className="text-slate-600">cmi.core.score.raw</code>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenModal(exam)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Configurar</span>
                  </button>

                  {project.assessments.length > 1 && (
                    <button
                      onClick={() => handleDeleteAssessment(exam.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal */}
      {isModalOpen && editingAssessment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Configurar Evaluación SCORM
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Establece las reglas de calificación y vincula reactivos didácticos
            </p>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Evaluación</label>
                <input
                  type="text"
                  value={editingAssessment.title}
                  onChange={(e) => setEditingAssessment({ ...editingAssessment, title: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Instrucciones</label>
                <textarea
                  rows={2}
                  value={editingAssessment.description}
                  onChange={(e) => setEditingAssessment({ ...editingAssessment, description: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Puntaje Mínimo (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingAssessment.passingScore}
                    onChange={(e) => setEditingAssessment({ ...editingAssessment, passingScore: parseInt(e.target.value) || 70 })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-center font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Intentos Máximos (0=ilimitado)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={editingAssessment.maxAttempts}
                    onChange={(e) => setEditingAssessment({ ...editingAssessment, maxAttempts: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-center font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tiempo Máximo (minutos)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={editingAssessment.timeLimitMinutes}
                    onChange={(e) => setEditingAssessment({ ...editingAssessment, timeLimitMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-center font-mono font-bold"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingAssessment.shuffleQuestions}
                    onChange={(e) => setEditingAssessment({ ...editingAssessment, shuffleQuestions: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Barajar el orden de las preguntas para cada estudiante</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingAssessment.shuffleOptions}
                    onChange={(e) => setEditingAssessment({ ...editingAssessment, shuffleOptions: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Barajar el orden de las opciones de respuesta</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingAssessment.showFeedback}
                    onChange={(e) => setEditingAssessment({ ...editingAssessment, showFeedback: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Mostrar retroalimentación didáctica al enviar la evaluación</span>
                </label>
              </div>

              {/* Questions Checklist */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Selecciona las preguntas del banco a incluir en este cuestionario:
                </label>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 border border-slate-200 rounded-lg p-2 bg-slate-50">
                  {project.questionBank.map((q) => {
                    const isChecked = editingAssessment.questionIds.includes(q.id);
                    return (
                      <label key={q.id} className="flex items-start gap-2.5 p-2 bg-white rounded border border-slate-200 text-xs cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingAssessment({
                                ...editingAssessment,
                                questionIds: [...editingAssessment.questionIds, q.id]
                              });
                            } else {
                              setEditingAssessment({
                                ...editingAssessment,
                                questionIds: editingAssessment.questionIds.filter(id => id !== q.id)
                              });
                            }
                          }}
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{q.prompt}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            [{q.type}] · {q.points} puntos · {q.difficulty}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5 mt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveAssessment(editingAssessment)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
