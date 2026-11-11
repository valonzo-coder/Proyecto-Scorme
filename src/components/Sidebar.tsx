import React from 'react';
import { 
  FolderKanban, 
  BookOpen, 
  HelpCircle, 
  CheckSquare, 
  Settings2, 
  PlayCircle, 
  Download,
  GraduationCap,
  Upload,
  Plus,
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Sparkles,
  Info
} from 'lucide-react';
import { ActiveSection, CourseProject, ProjectSyncStatus } from '../types/scorm';

interface SidebarProps {
  currentSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  activeProject: CourseProject;
  syncStatus: ProjectSyncStatus;
  onPromptNewProject: () => void;
  onPromptLoadProject: () => void;
  onDownloadProject: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  activeProject,
  syncStatus,
  onPromptNewProject,
  onPromptLoadProject,
  onDownloadProject
}) => {
  const totalLessons = activeProject.units.reduce((acc, u) => acc + u.lessons.length, 0);

  const navItems = [
    { id: 'project_info' as ActiveSection, label: 'Proyecto & Metadatos', icon: FolderKanban, badge: null },
    { id: 'builder' as ActiveSection, label: 'Constructor de Contenidos', icon: BookOpen, badge: `${totalLessons} lec` },
    { id: 'questions' as ActiveSection, label: 'Banco de Preguntas', icon: HelpCircle, badge: activeProject.questionBank.length },
    { id: 'assessments' as ActiveSection, label: 'Evaluaciones', icon: CheckSquare, badge: activeProject.assessments.length },
    { id: 'scorm_config' as ActiveSection, label: 'Configuración SCORM', icon: Settings2, badge: `v${activeProject.scormConfig.version}` },
    { id: 'preview' as ActiveSection, label: 'Vista Previa Estudiante', icon: PlayCircle, badge: 'Live' },
    { id: 'export' as ActiveSection, label: 'Exportar Paquete SCORM', icon: Download, badge: 'Moodle' }
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              EduBuilder <span className="text-blue-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-blue-950/70 border border-blue-800">SCORM</span>
            </h1>
            <p className="text-xs text-slate-400">Editor de Recursos para Moodle</p>
          </div>
        </div>
      </div>

      {/* Active Project Card with Change Status */}
      <div className="p-3 m-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Proyecto en Edición
          </span>
          {/* Sync Status Badge */}
          {syncStatus === 'modified' && (
            <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-700/60 px-1.5 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Sin descargar
            </span>
          )}
          {syncStatus === 'saved' && (
            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Descargado
            </span>
          )}
          {syncStatus === 'loaded' && (
            <span className="text-[10px] font-semibold text-blue-300 bg-blue-950/80 border border-blue-700/60 px-1.5 py-0.5 rounded flex items-center gap-1">
              <FileCheck2 className="w-3 h-3 text-blue-400" />
              Desde archivo
            </span>
          )}
          {syncStatus === 'fresh' && (
            <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1">
              Nuevo
            </span>
          )}
        </div>

        <div className="text-xs font-bold text-white truncate" title={activeProject.title}>
          {activeProject.title}
        </div>

        <div className="pt-2 border-t border-slate-700/50 grid grid-cols-2 gap-1.5 text-[11px]">
          <button
            onClick={onPromptNewProject}
            className="p-1.5 rounded bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title="Crear un nuevo proyecto desde cero"
          >
            <Plus className="w-3 h-3 text-blue-400" />
            <span>Nuevo</span>
          </button>

          <button
            onClick={onPromptLoadProject}
            className="p-1.5 rounded bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title="Cargar un proyecto desde tu computador"
          >
            <Upload className="w-3 h-3 text-emerald-400" />
            <span>Cargar</span>
          </button>
        </div>

        <button
          onClick={onDownloadProject}
          className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          title="Descargar archivo .zip editable del proyecto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Descargar Proyecto (.zip)</span>
        </button>
      </div>

      {/* Main Navigation */}
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Estructura del Proyecto
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ml-2 ${
                  isActive 
                    ? 'bg-blue-700 text-blue-100' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Offline / Static Mode Badge */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span>100% Autónomo y Privado</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">Sin servidor ni almacenamiento en la nube.</p>
      </div>
    </aside>
  );
};
