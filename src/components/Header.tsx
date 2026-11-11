import React from 'react';
import { PlayCircle, Download, CheckCircle2, Save } from 'lucide-react';
import { ActiveSection, CourseProject } from '../types/scorm';

interface HeaderProps {
  currentSection: ActiveSection;
  activeProject: CourseProject | null;
  onSelectSection: (section: ActiveSection) => void;
  lastSavedTime: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentSection,
  activeProject,
  onSelectSection,
  lastSavedTime
}) => {
  const sectionTitles: Record<ActiveSection, string> = {
    dashboard: 'Panel General',
    projects: 'Mis Proyectos',
    builder: 'Constructor de Contenidos',
    questions: 'Banco de Preguntas',
    assessments: 'Evaluaciones y Cuestionarios',
    scorm_config: 'Configuración de Parámetros SCORM',
    preview: 'Vista Previa del Estudiante',
    export: 'Generador de Paquete SCORM'
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 shrink-0 select-none">
      {/* Zone 1: Breadcrumb and title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-600">EduBuilder SCORM</span>
          <span>/</span>
          <span className="text-slate-500 font-medium truncate max-w-[200px]">
            {activeProject ? activeProject.title : 'Sin proyecto activo'}
          </span>
          <span>/</span>
        </div>
        <h2 className="text-sm font-bold text-slate-900 truncate">
          {sectionTitles[currentSection]}
        </h2>
      </div>

      {/* Zone 2: Status & Auto-save confirmation */}
      <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Auto-guardado activo</span>
        </div>
        {lastSavedTime && (
          <span className="text-slate-400 font-mono text-[11px]">
            Último cambio: {lastSavedTime}
          </span>
        )}
      </div>

      {/* Zone 3: Primary Fast CTAs */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => onSelectSection('preview')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap shrink-0 ${
            currentSection === 'preview'
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <PlayCircle className="w-4 h-4 text-blue-600" />
          <span>Vista Previa</span>
        </button>

        <button
          onClick={() => onSelectSection('export')}
          className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-600/20 transition-all whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Exportar SCORM</span>
        </button>
      </div>
    </header>
  );
};
