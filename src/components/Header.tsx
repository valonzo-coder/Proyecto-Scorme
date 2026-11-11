import React from 'react';
import { Download, Package, AlertCircle, CheckCircle2, FileCheck2, Sparkles, PlayCircle } from 'lucide-react';
import { ActiveSection, CourseProject, ProjectSyncStatus } from '../types/scorm';

interface HeaderProps {
  currentSection: ActiveSection;
  activeProject: CourseProject;
  syncStatus: ProjectSyncStatus;
  lastDownloaded: string | null;
  onSelectSection: (section: ActiveSection) => void;
  onDownloadProject: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSection,
  activeProject,
  syncStatus,
  lastDownloaded,
  onSelectSection,
  onDownloadProject
}) => {
  const sectionTitles: Record<ActiveSection, string> = {
    project_info: 'Información del Proyecto',
    builder: 'Constructor de Contenidos',
    questions: 'Banco de Preguntas',
    assessments: 'Evaluaciones y Cuestionarios',
    scorm_config: 'Configuración de Parámetros SCORM',
    preview: 'Vista Previa del Estudiante',
    export: 'Exportar Paquete SCORM'
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-6 shrink-0 select-none">
      {/* Zone 1: Breadcrumb and title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-700">EduBuilder SCORM</span>
          <span>/</span>
          <span className="text-slate-500 font-medium truncate max-w-[220px]">
            {activeProject.title}
          </span>
          <span>/</span>
        </div>
        <h2 className="text-sm font-bold text-slate-900 truncate">
          {sectionTitles[currentSection]}
        </h2>
      </div>

      {/* Zone 2: Sync Status Indicator */}
      <div className="hidden lg:flex items-center gap-3 text-xs">
        {syncStatus === 'modified' && (
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="font-medium">Cambios pendientes de descargar</span>
          </div>
        )}

        {syncStatus === 'saved' && (
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">Proyecto descargado al día</span>
            {lastDownloaded && <span className="text-[11px] text-emerald-600">({lastDownloaded})</span>}
          </div>
        )}

        {syncStatus === 'loaded' && (
          <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
            <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-medium">Cargado desde archivo</span>
          </div>
        )}

        {syncStatus === 'fresh' && (
          <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium">Proyecto nuevo</span>
          </div>
        )}
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => onSelectSection('preview')}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            currentSection === 'preview'
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <PlayCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>Vista Previa</span>
        </button>

        <button
          onClick={onDownloadProject}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            syncStatus === 'modified'
              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-500/20'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
          }`}
          title="Descargar archivo editable para abrirlo más tarde"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Descargar Proyecto</span>
        </button>

        <button
          onClick={() => onSelectSection('export')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-600/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
          title="Generar paquete SCORM para Moodle"
        >
          <Package className="w-3.5 h-3.5" />
          <span>Exportar SCORM</span>
        </button>
      </div>
    </header>
  );
};
