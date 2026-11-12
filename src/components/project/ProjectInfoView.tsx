import React, { useRef } from 'react';
import { 
  FolderDown, 
  Upload, 
  Plus, 
  Download, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  Building2, 
  BookOpen, 
  Image as ImageIcon, 
  HelpCircle, 
  CheckSquare, 
  Settings2, 
  PlayCircle,
  FileCheck2,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { CourseProject, ProjectSyncStatus, ActiveSection } from '../../types/scorm';
import { MediaService } from '../../services/mediaService';

interface ProjectInfoViewProps {
  project: CourseProject;
  syncStatus: ProjectSyncStatus;
  lastDownloaded: string | null;
  onUpdateProject: (updated: CourseProject) => void;
  onDownloadProject: () => void;
  onPromptNewProject: () => void;
  onPromptLoadProject: () => void;
  onNavigateSection: (section: ActiveSection) => void;
}

export const ProjectInfoView: React.FC<ProjectInfoViewProps> = ({
  project,
  syncStatus,
  lastDownloaded,
  onUpdateProject,
  onDownloadProject,
  onPromptNewProject,
  onPromptLoadProject,
  onNavigateSection
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverError, setCoverError] = React.useState<string | null>(null);
  const [, setMediaRevision] = React.useState(() => MediaService.getRevision());

  React.useEffect(() => {
    return MediaService.subscribe(() => {
      setMediaRevision(MediaService.getRevision());
    });
  }, []);

  const totalLessons = project.units.reduce((acc, u) => acc + u.lessons.length, 0);
  const totalPages = project.units.reduce(
    (acc, u) => acc + u.lessons.reduce((lAcc, l) => lAcc + (l.pages?.length || 0), 0),
    0
  );
  const totalQuestions = project.questionBank.length;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverError(null);

    try {
      const meta = await MediaService.addMediaFile(file, project.id);
      const updated = {
        ...project,
        coverImage: meta.relativePath
      };
      MediaService.pruneUnreferencedAssets(updated);
      onUpdateProject(updated);
    } catch (err) {
      setCoverError('Error al procesar la imagen de portada.');
    }
    e.target.value = '';
  };

  const handleUpdateField = (field: keyof CourseProject, value: any) => {
    onUpdateProject({
      ...project,
      [field]: value,
      scormConfig: field === 'title' ? { ...project.scormConfig, title: value } :
                   field === 'description' ? { ...project.scormConfig, description: value } :
                   field === 'author' ? { ...project.scormConfig, authorName: value } :
                   field === 'organization' ? { ...project.scormConfig, organizationName: value } :
                   project.scormConfig
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Sync Status Alert Bar */}
      {syncStatus === 'modified' && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Cambios pendientes de descargar
              </h4>
              <p className="text-[11px] text-amber-700">
                El proyecto actual tiene modificaciones en memoria. Descarga tu archivo de proyecto para conservar tu trabajo en tu equipo.
              </p>
            </div>
          </div>
          <button
            onClick={onDownloadProject}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Archivo Editable (.zip)</span>
          </button>
        </div>
      )}

      {syncStatus === 'saved' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900">
                Proyecto al día y descargado
              </h4>
              <p className="text-[11px] text-emerald-700">
                Todos los cambios actuales están respaldados en tu archivo descargado {lastDownloaded ? `(última descarga: ${lastDownloaded})` : ''}.
              </p>
            </div>
          </div>
          <button
            onClick={onDownloadProject}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline shrink-0 cursor-pointer"
          >
            Volver a descargar
          </button>
        </div>
      )}

      {syncStatus === 'loaded' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-900">
                Proyecto cargado desde archivo
              </h4>
              <p className="text-[11px] text-blue-700">
                Se recuperaron lecciones, actividades, preguntas y recursos multimedia. No hay cambios pendientes.
              </p>
            </div>
          </div>
        </div>
      )}

      {syncStatus === 'fresh' && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Proyecto nuevo en edición
              </h4>
              <p className="text-[11px] text-slate-500">
                Personaliza la información de tu curso y añade contenidos. Recuerda descargar el archivo cuando termines.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Three Primary Actions Hero Box */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-3">
              <span>EduBuilder SCORM · Aplicación Web Estática</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
              Gestión del Proyecto Activo
            </h1>
            <p className="text-slate-300 text-xs leading-relaxed">
              Trabajas exclusivamente con un proyecto a la vez. No se requieren cuentas, servidores ni bases de datos. Todo tu trabajo se mantiene en tu computador mediante descargas y cargas de archivos.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onPromptNewProject}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Crear Proyecto</span>
            </button>

            <button
              onClick={onPromptLoadProject}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Cargar Proyecto (.zip)</span>
            </button>

            <button
              onClick={onDownloadProject}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Proyecto Editable</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Project Metadata Editor & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Metadata Form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Datos Principales del Curso</h3>
              <p className="text-xs text-slate-500">Información visible para los estudiantes y en el manifiesto SCORM</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">ID: {project.id}</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre del Proyecto / Título del Curso <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={project.title}
                onChange={(e) => handleUpdateField('title', e.target.value)}
                placeholder="Ej. Introducción al Diseño Instruccional Digital"
                className="w-full text-base font-bold text-slate-900 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descripción Didáctica y Objetivos
              </label>
              <textarea
                rows={3}
                value={project.description}
                onChange={(e) => handleUpdateField('description', e.target.value)}
                placeholder="Describe la temática, competencias a desarrollar y público al que va dirigido..."
                className="w-full text-xs text-slate-800 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Docente o Autor
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={project.author}
                    onChange={(e) => handleUpdateField('author', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Institución Educativa / Centro
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={project.organization}
                    onChange={(e) => handleUpdateField('organization', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                <input
                  type="text"
                  value={project.category}
                  onChange={(e) => handleUpdateField('category', e.target.value)}
                  className="w-full text-xs text-slate-800 p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nivel</label>
                <select
                  value={project.level}
                  onChange={(e) => handleUpdateField('level', e.target.value as any)}
                  className="w-full text-xs text-slate-800 p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="Principiante">Principiante</option>
                  <option value="Intermedio">Intermedio</option>
                  <option value="Avanzado">Avanzado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Duración estimada</label>
                <input
                  type="text"
                  value={project.estimatedDuration}
                  onChange={(e) => handleUpdateField('estimatedDuration', e.target.value)}
                  placeholder="Ej. 45 min"
                  className="w-full text-xs text-slate-800 p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Cover image uploader */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Imagen o Identificación Visual de Portada
              </label>
              <div className="flex items-center gap-4">
                {project.coverImage ? (
                  <div className="w-24 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative group">
                    <img
                      src={MediaService.resolveMediaUrl(project.coverImage)}
                      alt="Portada"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{project.coverImage ? 'Cambiar imagen' : 'Seleccionar imagen del equipo'}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1">
                    La imagen se guardará dentro de la carpeta media/ del archivo .zip descargable con ruta relativa.
                  </p>
                  {coverError && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1">{coverError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Quick Access & Stats */}
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Contenido del Proyecto
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div 
                onClick={() => onNavigateSection('builder')}
                className="p-3 rounded-lg bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 cursor-pointer transition-colors"
              >
                <span className="text-slate-400 block text-[11px] mb-0.5">Unidades</span>
                <span className="font-extrabold text-slate-900 text-lg tabular-nums">
                  {project.units.length}
                </span>
                <span className="text-[10px] text-blue-600 block mt-1 font-semibold">Editar →</span>
              </div>

              <div 
                onClick={() => onNavigateSection('builder')}
                className="p-3 rounded-lg bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 cursor-pointer transition-colors"
              >
                <span className="text-slate-400 block text-[11px] mb-0.5">Lecciones / Páginas</span>
                <span className="font-extrabold text-slate-900 text-lg tabular-nums">
                  {totalLessons} <span className="text-xs font-semibold text-slate-400">/ {totalPages} pág</span>
                </span>
                <span className="text-[10px] text-blue-600 block mt-1 font-semibold">Editar →</span>
              </div>

              <div 
                onClick={() => onNavigateSection('questions')}
                className="p-3 rounded-lg bg-slate-50 hover:bg-amber-50/50 border border-slate-200/80 cursor-pointer transition-colors"
              >
                <span className="text-slate-400 block text-[11px] mb-0.5">Banco Reactivos</span>
                <span className="font-extrabold text-slate-900 text-lg tabular-nums">
                  {totalQuestions}
                </span>
                <span className="text-[10px] text-amber-600 block mt-1 font-semibold">Preguntas →</span>
              </div>

              <div 
                onClick={() => onNavigateSection('scorm_config')}
                className="p-3 rounded-lg bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 cursor-pointer transition-colors"
              >
                <span className="text-slate-400 block text-[11px] mb-0.5">Aprobación</span>
                <span className="font-extrabold text-emerald-600 text-lg tabular-nums">
                  {project.scormConfig.masteryScore}%
                </span>
                <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">SCORM {project.scormConfig.version} →</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => onNavigateSection('preview')}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4 text-blue-600" />
                <span>Simulador de Estudiante</span>
              </button>

              <button
                onClick={() => onNavigateSection('export')}
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Exportar Paquete SCORM (Moodle)</span>
              </button>
            </div>
          </div>

          {/* Format Difference Explainer Card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-xs space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Diferencia de Archivos Generados</span>
            </h4>

            <div className="space-y-2 text-[11px] text-slate-600">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <strong className="text-blue-700 block mb-0.5">1. Descargar Proyecto Editable (.zip)</strong>
                Genera el archivo fuente que EduBuilder SCORM puede volver a abrir en cualquier momento para seguir editando.
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <strong className="text-emerald-700 block mb-0.5">2. Exportar Paquete SCORM (.zip)</strong>
                Genera el paquete con imsmanifest.xml para subir directamente a Moodle LMS. Es un recurso terminado que no requiere EduBuilder para ejecutarse.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
