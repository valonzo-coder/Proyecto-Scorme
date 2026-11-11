import React, { useState } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Copy, 
  Trash2, 
  BookOpen, 
  PlayCircle, 
  Download, 
  LayoutGrid, 
  List, 
  Calendar, 
  User, 
  CheckCircle,
  Upload,
  FileCode,
  AlertTriangle
} from 'lucide-react';
import { CourseProject, ActiveSection } from '../../types/scorm';

interface ProjectsViewProps {
  projects: CourseProject[];
  activeProject: CourseProject | null;
  onSelectProject: (projectId: string) => void;
  onNavigateSection: (section: ActiveSection) => void;
  onOpenNewProjectModal: () => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onImportProjectJson: (project: CourseProject) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onNavigateSection,
  onOpenNewProjectModal,
  onDuplicateProject,
  onDeleteProject,
  onImportProjectJson
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [projectToDelete, setProjectToDelete] = useState<CourseProject | null>(null);

  // Extract unique categories
  const categories = ['all', ...Array.from(new Set(projects.map(p => p.category)))];

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleExportJson = (project: CourseProject) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.title && parsed.units) {
          // ensure unique ID
          parsed.id = `proj-imported-${Date.now()}`;
          onImportProjectJson(parsed);
        } else {
          alert('El archivo no tiene el formato válido de EduBuilder SCORM.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Mis Proyectos Educativos</h1>
          <p className="text-xs text-slate-500">Crea, edita, duplica y administra tus recursos para Moodle</p>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Importar JSON</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={onOpenNewProjectModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título o palabra clave..."
            className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'all' ? 'Todas' : cat}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1"></div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vista en cuadrícula"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vista en tabla"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Projects List or Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">No se encontraron proyectos</h3>
          <p className="text-xs text-slate-500 mb-4">Intenta ajustar tu búsqueda o crea un nuevo recurso educativo</p>
          <button
            onClick={onOpenNewProjectModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Crear Primer Recurso
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const isCurrent = activeProject?.id === p.id;
            const lessonCount = p.units.reduce((acc, u) => acc + u.lessons.length, 0);

            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl border transition-all flex flex-col justify-between overflow-hidden group shadow-xs hover:shadow-md ${
                  isCurrent ? 'border-blue-400 ring-1 ring-blue-400/40' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {p.category}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      SCORM {p.scormConfig.version}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1.5">
                    {p.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {p.description}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Estructura didáctica</span>
                      <span className="font-medium text-slate-800">{p.units.length} unidades · {lessonCount} lecciones</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Banco de reactivos</span>
                      <span className="font-medium text-slate-800">{p.questionBank.length} preguntas</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Nota mínima aprobación</span>
                      <span className="font-semibold text-emerald-600">{p.scormConfig.masteryScore}%</span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onSelectProject(p.id);
                        onNavigateSection('preview');
                      }}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                      title="Probar en el reproductor interactivo"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDuplicateProject(p.id)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                      title="Duplicar proyecto"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleExportJson(p)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                      title="Descargar copia de seguridad en JSON"
                    >
                      <FileCode className="w-4 h-4" />
                    </button>

                    {projects.length > 1 && (
                      <button
                        onClick={() => setProjectToDelete(p)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                        title="Eliminar proyecto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onSelectProject(p.id);
                        onNavigateSection('builder');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Título del Proyecto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-center">Unidades / Lecciones</th>
                <th className="py-3 px-4 text-center">Reactivos</th>
                <th className="py-3 px-4 text-center">Aprobación</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((p) => {
                const lessonCount = p.units.reduce((acc, u) => acc + u.lessons.length, 0);
                const isCurrent = activeProject?.id === p.id;
                return (
                  <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors ${isCurrent ? 'bg-blue-50/30' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{p.description}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{p.category}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {p.units.length} / {lessonCount}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {p.questionBank.length}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-emerald-600">
                      {p.scormConfig.masteryScore}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            onSelectProject(p.id);
                            onNavigateSection('preview');
                          }}
                          className="p-1.5 text-slate-600 hover:text-blue-600 rounded hover:bg-slate-100 cursor-pointer"
                          title="Vista previa"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            onSelectProject(p.id);
                            onNavigateSection('builder');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDuplicateProject(p.id)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                          title="Duplicar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {projects.length > 1 && (
                          <button
                            onClick={() => setProjectToDelete(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">¿Eliminar este curso?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Estás a punto de eliminar <strong className="text-slate-700">"{projectToDelete.title}"</strong>. Esta acción borrará todas sus unidades, lecciones y preguntas asociadas de tu almacenamiento local.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
              >
                Sí, Eliminar Proyecto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
