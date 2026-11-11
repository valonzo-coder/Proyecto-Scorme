import React from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  BookOpen, 
  HelpCircle, 
  CheckSquare, 
  Settings2, 
  PlayCircle, 
  Download,
  GraduationCap,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { ActiveSection, CourseProject } from '../types/scorm';

interface SidebarProps {
  currentSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  activeProject: CourseProject | null;
  allProjects: CourseProject[];
  onSelectProject: (projectId: string) => void;
  onOpenNewProjectModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  activeProject,
  allProjects,
  onSelectProject,
  onOpenNewProjectModal
}) => {
  const navItems = [
    { id: 'dashboard' as ActiveSection, label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'projects' as ActiveSection, label: 'Mis Proyectos', icon: FolderKanban, badge: allProjects.length },
    { id: 'builder' as ActiveSection, label: 'Constructor de Contenidos', icon: BookOpen, badge: activeProject ? activeProject.units.reduce((acc, u) => acc + u.lessons.length, 0) : null },
    { id: 'questions' as ActiveSection, label: 'Banco de Preguntas', icon: HelpCircle, badge: activeProject ? activeProject.questionBank.length : null },
    { id: 'assessments' as ActiveSection, label: 'Evaluaciones', icon: CheckSquare, badge: activeProject ? activeProject.assessments.length : null },
    { id: 'scorm_config' as ActiveSection, label: 'Configuración SCORM', icon: Settings2, badge: activeProject ? `v${activeProject.scormConfig.version}` : null },
    { id: 'preview' as ActiveSection, label: 'Vista Previa Estudiante', icon: PlayCircle, badge: 'Live' },
    { id: 'export' as ActiveSection, label: 'Exportar Paquete ZIP', icon: Download, badge: 'Moodle' }
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
            <p className="text-xs text-slate-400">Autoría e-Learning para Moodle</p>
          </div>
        </div>
      </div>

      {/* Active Project Selector Card */}
      <div className="p-3 m-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Proyecto Activo</span>
          <button 
            onClick={onOpenNewProjectModal}
            className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            + Nuevo
          </button>
        </div>

        <select 
          value={activeProject?.id || ''} 
          onChange={(e) => onSelectProject(e.target.value)}
          aria-label="Seleccionar Proyecto Activo"
          className="w-full bg-slate-900/90 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
        >
          {allProjects.map(p => (
            <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
              {p.title}
            </option>
          ))}
        </select>

        {activeProject && (
          <div className="mt-2.5 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
            <span>{activeProject.units.length} unidades · {activeProject.units.reduce((acc, u) => acc + u.lessons.length, 0)} lecciones</span>
            <span className="text-blue-400 font-mono">SCORM {activeProject.scormConfig.version}</span>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Navegación Principal
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
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

      {/* Bottom Pro / Moodle Badge */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
          <span>Moodle LMS Validated 100%</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Exportaciones compatibles con Moodle 3.9 a 4.4+</p>
      </div>
    </aside>
  );
};
