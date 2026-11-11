import React from 'react';
import { 
  FolderKanban, 
  BookOpen, 
  HelpCircle, 
  Download, 
  Plus, 
  PlayCircle, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  Award,
  Layers,
  FileCheck2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { CourseProject, ActiveSection } from '../../types/scorm';

interface DashboardViewProps {
  projects: CourseProject[];
  activeProject: CourseProject | null;
  onSelectProject: (projectId: string) => void;
  onNavigateSection: (section: ActiveSection) => void;
  onOpenNewProjectModal: () => void;
  onDuplicateProject: (projectId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onNavigateSection,
  onOpenNewProjectModal,
  onDuplicateProject
}) => {
  const totalLessons = projects.reduce((acc, p) => 
    acc + p.units.reduce((uAcc, u) => uAcc + u.lessons.length, 0), 0
  );
  const totalQuestions = projects.reduce((acc, p) => acc + p.questionBank.length, 0);
  const totalAssessments = projects.reduce((acc, p) => acc + p.assessments.length, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome & Primary CTA Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Plataforma Profesional de Autoría SCORM
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
            Crea recursos e-learning interactivos listos para Moodle
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Diseña lecciones dinámicas con pestañas, acordeones, tarjetas de memoria y evaluaciones formativas sin tocar una sola línea de código. Exporta paquetes SCORM 1.2 o 2004 con integración de calificaciones garantizada.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenNewProjectModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Recurso</span>
            </button>

            {activeProject && (
              <button
                onClick={() => onNavigateSection('builder')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-medium text-xs rounded-xl transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>Continuar editando "{activeProject.title}"</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none"></div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cursos Activos</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {projects.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Persistidos en almacenamiento seguro</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lecciones Didácticas</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {totalLessons}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Con contenido multimedia estructurado</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preguntas Formuladas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {totalQuestions}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>5 formatos interactivos disponibles</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Compatibilidad Moodle</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
            100%
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>SCORM 1.2 &amp; 2004 Conformes</span>
          </div>
        </div>
      </div>

      {/* Recent Projects Table & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Proyectos Recientes</h2>
            <p className="text-xs text-slate-500">Administra tus cursos e-learning y exportaciones</p>
          </div>
          <button
            onClick={() => onNavigateSection('projects')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todos ({projects.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {projects.map((proj) => {
            const lessonCount = proj.units.reduce((acc, u) => acc + u.lessons.length, 0);
            const isCurrent = activeProject?.id === proj.id;
            return (
              <div 
                key={proj.id} 
                className={`p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors hover:bg-slate-50/80 ${
                  isCurrent ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {proj.title}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Activo
                      </span>
                    )}
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      SCORM {proj.scormConfig.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                    {proj.description}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{proj.units.length} unidades</span>
                    <span>·</span>
                    <span>{lessonCount} lecciones</span>
                    <span>·</span>
                    <span>{proj.questionBank.length} preguntas</span>
                    <span>·</span>
                    <span>Aprobación: {proj.scormConfig.masteryScore}%</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => {
                      onSelectProject(proj.id);
                      onNavigateSection('preview');
                    }}
                    title="Probar en el reproductor interactivo"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <PlayCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Vista Previa</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectProject(proj.id);
                      onNavigateSection('builder');
                    }}
                    title="Editar unidades y lecciones"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Constructor</span>
                  </button>

                  <button
                    onClick={() => onDuplicateProject(proj.id)}
                    title="Duplicar este curso como plantilla"
                    className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      onSelectProject(proj.id);
                      onNavigateSection('export');
                    }}
                    title="Exportar archivo ZIP para Moodle"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar ZIP</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructional Design Workflow Card */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Flujo de Trabajo Recomendado para Publicar en Moodle
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Sigue esta secuencia didáctica para asegurar experiencias de aprendizaje atractivas y evaluables
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-white border border-slate-200/80 shadow-xs">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mb-3">
              1
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Estructura &amp; Bloques</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Define unidades temáticas y añade bloques interactivos (acordeones, pestañas, tarjetas de memoria).
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200/80 shadow-xs">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mb-3">
              2
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Banco &amp; Evaluaciones</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Formula preguntas tipo test, verdadero/falso o de relacionar con retroalimentación inmediata.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200/80 shadow-xs">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mb-3">
              3
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Simulación en Vivo</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Prueba la experiencia tal como la verá el alumno y verifica las llamadas SCORM en la consola CMI.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200/80 shadow-xs">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mb-3">
              4
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Exportar a Moodle</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Descarga el archivo ZIP con el manifiesto imsmanifest.xml y súbelo como "Actividad SCORM".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
