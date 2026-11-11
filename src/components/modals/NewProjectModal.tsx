import React, { useState } from 'react';
import { X, Plus, BookOpen, GraduationCap, CheckCircle2 } from 'lucide-react';
import { CourseProject } from '../../types/scorm';
import { StorageService } from '../../services/storageService';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: CourseProject) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tecnología Educativa');
  const [level, setLevel] = useState<'Principiante' | 'Intermedio' | 'Avanzado'>('Intermedio');
  const [author, setAuthor] = useState('Profesor / Diseñador');
  const [organization, setOrganization] = useState('Mi Centro Educativo');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Por favor ingresa un título para el recurso.');
      return;
    }

    const created = StorageService.createNewProject(
      title.trim(),
      description.trim() || 'Recurso educativo interactivo estructurado en unidades y lecciones.',
      author.trim() || 'Docente Autor',
      organization.trim() || 'Mi Institución Educativa',
      category,
      level
    );

    onProjectCreated(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Crear Nuevo Recurso Didáctico</h3>
              <p className="text-xs text-slate-500">Configura la información básica de tu curso SCORM</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Título del Curso o Módulo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Estrategias de Evaluación por Competencias"
              className="w-full text-xs text-slate-800 p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descripción u Objetivos Generales
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Resume los aprendizajes esperados y la temática que abordará este recurso..."
              className="w-full text-xs text-slate-800 p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Área o Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
              >
                <option value="Tecnología Educativa">Tecnología Educativa</option>
                <option value="Pedagogía y Didáctica">Pedagogía y Didáctica</option>
                <option value="Ciencias y Matemáticas">Ciencias y Matemáticas</option>
                <option value="Humanidades y Lenguas">Humanidades y Lenguas</option>
                <option value="Ciberseguridad">Ciberseguridad</option>
                <option value="Capacitación Corporativa">Capacitación Corporativa</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nivel de Complejidad</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
              >
                <option value="Principiante">Principiante</option>
                <option value="Intermedio">Intermedio</option>
                <option value="Avanzado">Avanzado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Docente / Diseñador Autor</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full text-xs text-slate-800 p-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Institución / Centro</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full text-xs text-slate-800 p-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <span>
              El nuevo recurso incluirá automáticamente una primera unidad con lección de bienvenida y una evaluación sumativa lista para editar.
            </span>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Crear Recurso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
