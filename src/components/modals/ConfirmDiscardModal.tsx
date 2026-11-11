import React from 'react';
import { AlertTriangle, Download, ArrowRight, X } from 'lucide-react';

interface ConfirmDiscardModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onCancel: () => void;
  onConfirmDiscard: () => void;
  onDownloadAndProceed: () => void;
}

export const ConfirmDiscardModal: React.FC<ConfirmDiscardModalProps> = ({
  isOpen,
  title = '¿Deseas continuar? Hay cambios sin descargar',
  message = 'El proyecto activo tiene modificaciones que aún no has descargado en tu computador. Si creas o cargas otro proyecto ahora, los cambios no descargados se perderán.',
  onCancel,
  onConfirmDiscard,
  onDownloadAndProceed
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 mb-5">
          <p className="font-semibold text-slate-800 mb-0.5">💡 Recomendación:</p>
          <p className="text-[11px] text-slate-500">
            EduBuilder SCORM no guarda proyectos en servidores ni en la nube. Tu archivo .zip descargado es tu único respaldo permanente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Volver a la edición
          </button>

          <button
            onClick={onConfirmDiscard}
            className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          >
            Descartar y continuar
          </button>

          <button
            onClick={onDownloadAndProceed}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar y continuar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
