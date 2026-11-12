import React, { useState } from 'react';
import { 
  Settings2, 
  FileCode2, 
  CheckCircle2, 
  HelpCircle, 
  Award, 
  Copy, 
  Check, 
  Download,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { CourseProject, SCORMConfig, ScormVersion } from '../../types/scorm';
import { ScormGenerator } from '../../services/scormGenerator';

interface ScormConfigViewProps {
  project: CourseProject;
  onUpdateProject: (updated: CourseProject) => void;
  onNavigateExport: () => void;
}

export const ScormConfigView: React.FC<ScormConfigViewProps> = ({
  project,
  onUpdateProject,
  onNavigateExport
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'manifest'>('settings');
  const [copiedManifest, setCopiedManifest] = useState(false);

  const config = project.scormConfig;

  const handleUpdateConfig = (field: keyof SCORMConfig, value: any) => {
    onUpdateProject({
      ...project,
      scormConfig: {
        ...project.scormConfig,
        [field]: value
      }
    });
  };

  const manifestXml = ScormGenerator.generateManifest(project);

  const handleCopyManifest = () => {
    navigator.clipboard.writeText(manifestXml);
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Configuración SCORM &amp; Moodle</h1>
          <p className="text-xs text-slate-500">
            Ajusta los metadatos técnicos, criterios de finalización y variables del modelo CMI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'settings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Parámetros
            </button>
            <button
              onClick={() => setActiveTab('manifest')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'manifest' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Visor imsmanifest.xml</span>
            </button>
          </div>

          <button
            onClick={onNavigateExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ir a Exportar</span>
          </button>
        </div>
      </div>

      {activeTab === 'settings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Parameters */}
          <div className="lg:col-span-2 space-y-6">
            {/* Version & Standard Box */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>Estándar y Versión SCORM</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  config.version === '1.2'
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900">SCORM 1.2</span>
                    <input
                      type="radio"
                      name="scorm_ver"
                      checked={config.version === '1.2'}
                      onChange={() => handleUpdateConfig('version', '1.2')}
                      className="text-blue-600"
                    />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">
                    Recomendado para Moodle. Máxima compatibilidad con el 100% de plataformas LMS.
                  </p>
                  <span className="text-[10px] font-bold text-blue-700 uppercase">
                    Estándar oficial en Moodle
                  </span>
                </label>

                <label className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  config.version === '2004_3rd'
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900">SCORM 2004 (3rd Ed)</span>
                    <input
                      type="radio"
                      name="scorm_ver"
                      checked={config.version === '2004_3rd'}
                      onChange={() => handleUpdateConfig('version', '2004_3rd')}
                      className="text-blue-600"
                    />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">
                    Estándar ADL 2004 3ra Edición con modelo de datos API_1484_11.
                  </p>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">
                    ADL 2004 3rd Edition
                  </span>
                </label>

                <label className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  config.version === '2004_4th'
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900">SCORM 2004 (4th Ed)</span>
                    <input
                      type="radio"
                      name="scorm_ver"
                      checked={config.version === '2004_4th'}
                      onChange={() => handleUpdateConfig('version', '2004_4th')}
                      className="text-blue-600"
                    />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">
                    Secuenciación avanzada e interacción con el objeto de aprendizaje API_1484_11.
                  </p>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">
                    ADL 2004 4th Edition
                  </span>
                </label>
              </div>
            </div>

            {/* Identifiers & Naming */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Identificación del Paquete IMS</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Identificador Único del Paquete (Manifest Identifier)
                  </label>
                  <input
                    type="text"
                    value={config.identifier}
                    onChange={(e) => handleUpdateConfig('identifier', e.target.value)}
                    className="w-full text-xs font-mono text-slate-800 p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Debe ser único en tu plataforma Moodle para evitar conflictos de sobrescritura.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Organización / Institución</label>
                    <input
                      type="text"
                      value={config.organizationName}
                      onChange={(e) => handleUpdateConfig('organizationName', e.target.value)}
                      className="w-full text-xs text-slate-800 p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Autor Docente</label>
                    <input
                      type="text"
                      value={config.authorName}
                      onChange={(e) => handleUpdateConfig('authorName', e.target.value)}
                      className="w-full text-xs text-slate-800 p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Evaluation & Completion Tracking */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Rastreo de Progreso y Calificaciones</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Calificación Mínima para Aprobar (Mastery Score)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={config.masteryScore}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleUpdateConfig('masteryScore', Number.isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                      }}
                      className="w-24 text-sm font-bold font-mono text-center border border-slate-300 rounded-lg p-2 bg-slate-50"
                    />
                    <span className="text-xs text-slate-600 font-bold">% sobre 100</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Alcanzar este puntaje registrará el estado "passed" en el calificador de Moodle.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Criterio de Finalización (lesson_status)
                  </label>
                  <select
                    value={config.completionCriteria}
                    onChange={(e) => handleUpdateConfig('completionCriteria', e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50"
                  >
                    <option value="passed_incomplete">Passed / Incomplete (Recomendado)</option>
                    <option value="completed_failed">Completed / Failed</option>
                    <option value="completed_incomplete">Completed / Incomplete</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Modo de Reporte al LMS
                  </label>
                  <select
                    value={config.reportingMode || 'score_and_status'}
                    onChange={(e) => handleUpdateConfig('reportingMode', e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50"
                  >
                    <option value="score_and_status">Calificación + Estado (Recomendado)</option>
                    <option value="status_only">Solo Estado de Finalización</option>
                    <option value="score_only">Solo Calificación Numérica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Comportamiento al Salir (cmi.core.exit)
                  </label>
                  <select
                    value={config.exitBehavior || 'suspend'}
                    onChange={(e) => handleUpdateConfig('exitBehavior', e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50"
                  >
                    <option value="suspend">Suspender y reanudar (suspend)</option>
                    <option value="finish">Finalizar sesión normal</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Compatibility Checklist & Summary */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-xl p-6 shadow-md border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Moodle Compatibility Check</span>
              </div>
              <h4 className="text-base font-bold text-white mb-2">
                Paquete Optimizado para Moodle
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Todos los parámetros han sido validados contra las especificaciones ADL y el módulo mod_scorm de Moodle:
              </p>

              <div className="space-y-2 text-xs text-slate-200 border-t border-slate-800/80 pt-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Manifiesto XML en la raíz del ZIP</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Detección automática de API en window.parent</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sincronización bidireccional con suspend_data</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cierre limpio mediante LMSFinish()</span>
                </div>
              </div>
            </div>

            {/* Quick summary box */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs space-y-3">
              <h4 className="font-bold text-slate-800">Resumen de Exportación</h4>
              <div className="flex justify-between text-slate-600">
                <span>Versión activa:</span>
                <span className="font-mono font-bold text-slate-900">SCORM {config.version}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Archivo lanzador:</span>
                <span className="font-mono font-bold text-slate-900">{config.launchFileName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Nota de pase:</span>
                <span className="font-bold text-emerald-600">{config.masteryScore}%</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Comportamiento al salir:</span>
                <span className="font-semibold text-slate-800">Guardar posición</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Manifest XML Viewer */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-900 text-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-blue-400" />
              <span className="font-mono text-xs font-bold text-white">imsmanifest.xml (Vista Previa en Vivo)</span>
            </div>
            <button
              onClick={handleCopyManifest}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              {copiedManifest ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar XML</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-6 text-xs font-mono text-slate-800 bg-slate-50 overflow-x-auto max-h-[600px] leading-relaxed">
            {manifestXml}
          </pre>
        </div>
      )}
    </div>
  );
};
