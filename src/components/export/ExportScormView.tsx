import React, { useState } from 'react';
import { 
  Download, 
  Package, 
  CheckCircle2, 
  FileCheck, 
  FileText, 
  Layers, 
  Award, 
  Sparkles, 
  ExternalLink, 
  HelpCircle,
  Clock,
  ShieldCheck,
  FolderArchive,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CourseProject } from '../../types/scorm';
import { ScormGenerator } from '../../services/scormGenerator';

interface ExportScormViewProps {
  project: CourseProject;
  onOpenPreview: () => void;
}

export const ExportScormView: React.FC<ExportScormViewProps> = ({
  project,
  onOpenPreview
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string>('');

  const totalLessons = project.units.reduce((acc, u) => acc + u.lessons.length, 0);
  const totalQuestions = project.questionBank.length;

  const handleGenerateAndDownloadZip = async () => {
    try {
      setIsExporting(true);
      setExportComplete(false);

      // Generate the real ZIP blob using JSZip
      const zipBlob = await ScormGenerator.createScormZipBlob(project);
      
      const slug = project.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'curso-scorm';
      const fileName = `${slug}_scorm_${project.scormConfig.version.replace('_', '.')}.zip`;

      // Trigger browser download
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setDownloadUrl(url);
      setDownloadFileName(fileName);
      setIsExporting(false);
      setExportComplete(true);

      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch(e) {}

    } catch (error) {
      console.error('Error generating SCORM zip package', error);
      alert('Ocurrió un error al generar el archivo comprimido.');
      setIsExporting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Listo para Generar · Compatible con Moodle LMS
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">
            Exportar Paquete SCORM {project.scormConfig.version}
          </h1>
          <p className="text-slate-300 text-xs leading-relaxed">
            Genera un archivo .ZIP autocontenido con el manifiesto IMS, reproductor responsivo sin dependencias externas, puente JavaScript SCORM y registro automático de calificaciones.
          </p>
        </div>

        <button
          disabled={isExporting}
          onClick={handleGenerateAndDownloadZip}
          className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2.5 shrink-0 cursor-pointer"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Comprimiendo Paquete...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Generar y Descargar ZIP</span>
            </>
          )}
        </button>
      </div>

      {/* Success Notification Alert */}
      {exportComplete && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900">
                ¡Paquete SCORM descargado exitosamente!
              </h4>
              <p className="text-[11px] text-emerald-700">
                El archivo <strong>"{downloadFileName}"</strong> está listo en tu carpeta de descargas para ser subido a Moodle.
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateAndDownloadZip}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline shrink-0 cursor-pointer"
          >
            Descargar nuevamente
          </button>
        </div>
      )}

      {/* Package Specs & Content Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Specs column */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <span>Ficha Técnica del Recurso</span>
          </h3>

          <div className="space-y-3 text-xs divide-y divide-slate-100">
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Título del curso:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[180px]">{project.title}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Versión SCORM:</span>
              <span className="font-mono font-bold text-blue-600">{project.scormConfig.version}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Unidades didácticas:</span>
              <span className="font-bold text-slate-800">{project.units.length}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Lecciones interactivas:</span>
              <span className="font-bold text-slate-800">{totalLessons}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Banco de reactivos:</span>
              <span className="font-bold text-slate-800">{totalQuestions} preguntas</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Nota mínima para aprobar:</span>
              <span className="font-bold text-emerald-600">{project.scormConfig.masteryScore}%</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Archivo lanzador (SCO):</span>
              <span className="font-mono font-semibold text-slate-700">{project.scormConfig.launchFileName}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenPreview}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-center"
            >
              Probar en el Simulador de Estudiante
            </button>
          </div>
        </div>

        {/* Files packaged in the zip */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-indigo-600" />
            <span>Contenido del Archivo ZIP Descargado</span>
          </h3>

          <p className="text-xs text-slate-500">
            Todos estos archivos se empaquetan en la raíz del archivo ZIP para garantizar compatibilidad con el módulo SCORM de Moodle:
          </p>

          <div className="space-y-2.5">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCode className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="font-mono font-bold text-xs text-slate-900">imsmanifest.xml</span>
                  <p className="text-[11px] text-slate-500">Manifiesto IMS con metadatos, árbol temático y recursos ADL.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Obligatorio</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-mono font-bold text-xs text-slate-900">index.html</span>
                  <p className="text-[11px] text-slate-500">Lanzador principal SCO con reproductor responsivo y evaluaciones.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Lanzador</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-indigo-600" />
                <div>
                  <span className="font-mono font-bold text-xs text-slate-900">scorm_api.js</span>
                  <p className="text-[11px] text-slate-500">Librería que detecta window.API (1.2) o window.API_1484_11 (2004).</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">API Bridge</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="font-mono font-bold text-xs text-slate-900">course_data.js &amp; player.css</span>
                  <p className="text-[11px] text-slate-500">Datos estructurados del curso y hoja de estilos autónoma sin CDN.</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">Recursos</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-purple-600" />
                <div>
                  <span className="font-mono font-bold text-xs text-slate-900">README_MOODLE.txt</span>
                  <p className="text-[11px] text-slate-500">Instrucciones paso a paso para el docente o administrador de Moodle.</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">Guía</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step by step Moodle import guide */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Paso a Paso: Cómo Subir tu Paquete a Moodle
          </h3>
          <p className="text-xs text-slate-500">
            Sigue estos 5 sencillos pasos para publicar tu recurso en cualquier aula virtual de Moodle:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="text-xs font-bold text-slate-900">Activar Edición</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ingresa a tu curso en Moodle y presiona el botón "Activar edición" en la esquina superior.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="text-xs font-bold text-slate-900">Añadir Actividad</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Haz clic en "+ Añadir una actividad o recurso" y elige "Paquete SCORM".
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="text-xs font-bold text-slate-900">Subir el Archivo .ZIP</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Arrastra y suelta el archivo .zip descargado directamente en el recuadro "Paquete de archivo".
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              4
            </div>
            <h4 className="text-xs font-bold text-slate-900">Calificación</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Establece en la pestaña Calificación la nota para aprobar ({project.scormConfig.masteryScore}%).
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              5
            </div>
            <h4 className="text-xs font-bold text-slate-900">¡Listo para Alumnos!</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Guarda cambios. Moodle registrará automáticamente las notas y el estado de avance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function FileCode(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 12.5 8 15l2 2.5"/><path d="m14 12.5 2 2.5-2 2.5"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/>
    </svg>
  );
}
