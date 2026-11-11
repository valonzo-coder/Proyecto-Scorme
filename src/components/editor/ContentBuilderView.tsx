import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Layers, 
  FileText, 
  AlertCircle, 
  LayoutList, 
  FolderPlus,
  HelpCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  Edit2,
  Copy,
  Info
} from 'lucide-react';
import { 
  CourseProject, 
  CourseUnit, 
  CourseLesson, 
  ContentBlock, 
  TextBlock, 
  CalloutBlock, 
  AccordionBlock, 
  TabsBlock, 
  FlashcardsBlock, 
  CheckpointBlock, 
  BlockType 
} from '../../types/scorm';

interface ContentBuilderViewProps {
  project: CourseProject;
  onUpdateProject: (updated: CourseProject) => void;
  onOpenQuestionBank: () => void;
}

export const ContentBuilderView: React.FC<ContentBuilderViewProps> = ({
  project,
  onUpdateProject,
  onOpenQuestionBank
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(project.units[0]?.id || '');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    project.units[0]?.lessons[0]?.id || ''
  );

  // Active unit & lesson
  const currentUnit = project.units.find(u => u.id === selectedUnitId) || project.units[0];
  const currentLesson = currentUnit?.lessons.find(l => l.id === selectedLessonId) || currentUnit?.lessons[0];

  // Helper to commit changes to project
  const updateUnits = (newUnits: CourseUnit[]) => {
    onUpdateProject({
      ...project,
      units: newUnits
    });
  };

  // Add unit
  const handleAddUnit = () => {
    const newUnitId = `u-${Date.now()}`;
    const newLessonId = `les-${Date.now()}`;
    const newUnit: CourseUnit = {
      id: newUnitId,
      title: `Unidad ${project.units.length + 1}: Nueva Unidad Temática`,
      description: 'Breve descripción de los objetivos de esta unidad didáctica.',
      order: project.units.length + 1,
      lessons: [
        {
          id: newLessonId,
          title: `${project.units.length + 1}.1 Primera Lección`,
          summary: 'Resumen orientativo de la lección para el estudiante.',
          estimatedMinutes: 10,
          order: 1,
          blocks: [
            {
              id: `b-${Date.now()}-1`,
              type: 'text',
              title: 'Introducción al Tema',
              content: '<p>Escribe aquí el contenido teórico o las instrucciones para el participante.</p>'
            }
          ]
        }
      ]
    };
    const updated = [...project.units, newUnit];
    updateUnits(updated);
    setSelectedUnitId(newUnitId);
    setSelectedLessonId(newLessonId);
  };

  // Delete unit
  const handleDeleteUnit = (unitId: string) => {
    if (project.units.length <= 1) {
      alert('El curso debe contener al menos una unidad didáctica.');
      return;
    }
    const filtered = project.units.filter(u => u.id !== unitId);
    updateUnits(filtered);
    if (selectedUnitId === unitId) {
      setSelectedUnitId(filtered[0].id);
      setSelectedLessonId(filtered[0].lessons[0]?.id || '');
    }
  };

  // Add lesson to current unit
  const handleAddLesson = (unitId: string) => {
    const unitIndex = project.units.findIndex(u => u.id === unitId);
    if (unitIndex === -1) return;

    const unit = project.units[unitIndex];
    const newLessonId = `les-${Date.now()}`;
    const newLesson: CourseLesson = {
      id: newLessonId,
      title: `${unitIndex + 1}.${unit.lessons.length + 1} Nueva Lección Didáctica`,
      summary: 'Objetivos específicos y desarrollo conceptual.',
      estimatedMinutes: 8,
      order: unit.lessons.length + 1,
      blocks: [
        {
          id: `b-${Date.now()}-1`,
          type: 'text',
          title: 'Desarrollo del Contenido',
          content: '<p>Redacta aquí las explicaciones, ejemplos prácticos o conceptos clave.</p>'
        }
      ]
    };

    const newUnits = [...project.units];
    newUnits[unitIndex] = {
      ...unit,
      lessons: [...unit.lessons, newLesson]
    };

    updateUnits(newUnits);
    setSelectedUnitId(unitId);
    setSelectedLessonId(newLessonId);
  };

  // Delete lesson
  const handleDeleteLesson = (unitId: string, lessonId: string) => {
    const unitIndex = project.units.findIndex(u => u.id === unitId);
    if (unitIndex === -1) return;
    const unit = project.units[unitIndex];
    if (unit.lessons.length <= 1) {
      alert('Cada unidad debe tener al menos una lección.');
      return;
    }
    const filteredLessons = unit.lessons.filter(l => l.id !== lessonId);
    const newUnits = [...project.units];
    newUnits[unitIndex] = {
      ...unit,
      lessons: filteredLessons
    };
    updateUnits(newUnits);
    if (selectedLessonId === lessonId) {
      setSelectedLessonId(filteredLessons[0].id);
    }
  };

  // Update current lesson fields
  const handleUpdateLessonMeta = (field: keyof CourseLesson, value: any) => {
    if (!currentUnit || !currentLesson) return;
    const newUnits = project.units.map(u => {
      if (u.id !== currentUnit.id) return u;
      return {
        ...u,
        lessons: u.lessons.map(l => {
          if (l.id !== currentLesson.id) return l;
          return { ...l, [field]: value };
        })
      };
    });
    updateUnits(newUnits);
  };

  // Block management
  const handleAddBlock = (type: BlockType) => {
    if (!currentUnit || !currentLesson) return;

    let newBlock: ContentBlock;
    const blockId = `blk-${Date.now()}`;

    switch (type) {
      case 'text':
        newBlock = {
          id: blockId,
          type: 'text',
          title: 'Concepto Clave',
          content: '<p>Escribe aquí tu contenido educativo. Puedes incluir párrafos, negritas y listas didácticas.</p>'
        };
        break;
      case 'callout':
        newBlock = {
          id: blockId,
          type: 'callout',
          variant: 'tip',
          title: 'Consejo Práctico',
          content: 'Destaca aquí recomendaciones clave, advertencias o recordatorios importantes para el estudiante.'
        };
        break;
      case 'accordion':
        newBlock = {
          id: blockId,
          type: 'accordion',
          title: 'Preguntas Frecuentes / Secciones Desplegables',
          items: [
            { id: `acc-${Date.now()}-1`, title: 'Elemento Desplegable 1', content: 'Explicación detallada o ejemplo práctico que se revela al hacer clic.' },
            { id: `acc-${Date.now()}-2`, title: 'Elemento Desplegable 2', content: 'Información complementaria para evitar la saturación visual.' }
          ]
        };
        break;
      case 'tabs':
        newBlock = {
          id: blockId,
          type: 'tabs',
          title: 'Perspectivas Temáticas',
          tabs: [
            { id: `tab-${Date.now()}-1`, label: 'Enfoque Teórico', content: 'Fundamentación científica y modelos de referencia.' },
            { id: `tab-${Date.now()}-2`, label: 'Aplicación Práctica', content: 'Guía paso a paso y casos de estudio en el aula.' }
          ]
        };
        break;
      case 'flashcards':
        newBlock = {
          id: blockId,
          type: 'flashcards',
          title: 'Tarjetas de Memoria y Auto-Evaluación',
          cards: [
            { id: `fc-${Date.now()}-1`, front: 'Término o Pregunta Clave', back: 'Definición precisa o respuesta sintetizada.', hint: 'Pista para recordar' },
            { id: `fc-${Date.now()}-2`, front: 'Segundo Concepto Relevante', back: 'Significado y contexto pedagógico.', hint: 'Relaciónalo con el tema anterior' }
          ]
        };
        break;
      case 'checkpoint':
        const firstQ = project.questionBank[0]?.id || '';
        newBlock = {
          id: blockId,
          type: 'checkpoint',
          title: 'Comprobación Formativa Rápida',
          questionId: firstQ
        };
        break;
      default:
        return;
    }

    const updatedBlocks = [...currentLesson.blocks, newBlock];
    handleUpdateLessonMeta('blocks', updatedBlocks);
  };

  const handleUpdateBlock = (blockId: string, updatedBlock: ContentBlock) => {
    if (!currentLesson) return;
    const newBlocks = currentLesson.blocks.map(b => b.id === blockId ? updatedBlock : b);
    handleUpdateLessonMeta('blocks', newBlocks);
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!currentLesson) return;
    const newBlocks = currentLesson.blocks.filter(b => b.id !== blockId);
    handleUpdateLessonMeta('blocks', newBlocks);
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (!currentLesson) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentLesson.blocks.length) return;
    const newBlocks = [...currentLesson.blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, moved);
    handleUpdateLessonMeta('blocks', newBlocks);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-100">
      {/* Left Column: Course Structure Outline */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Estructura Didáctica</h2>
            <p className="text-[11px] text-slate-500">{project.units.length} unidades organizadas</p>
          </div>
          <button
            onClick={handleAddUnit}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Unidad</span>
          </button>
        </div>

        {/* Units & Lessons list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {project.units.map((unit, uIdx) => {
            const isUnitSelected = selectedUnitId === unit.id;
            return (
              <div 
                key={unit.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs"
              >
                {/* Unit Header */}
                <div className={`p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 ${
                  isUnitSelected ? 'bg-blue-50/50' : ''
                }`}>
                  <input
                    type="text"
                    value={unit.title}
                    onChange={(e) => {
                      const newUnits = [...project.units];
                      newUnits[uIdx].title = e.target.value;
                      updateUnits(newUnits);
                    }}
                    className="font-bold text-xs text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none flex-1 truncate"
                  />

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleAddLesson(unit.id)}
                      title="Agregar lección a esta unidad"
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    {project.units.length > 1 && (
                      <button
                        onClick={() => handleDeleteUnit(unit.id)}
                        title="Eliminar unidad"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lessons in Unit */}
                <div className="p-1.5 space-y-1">
                  {unit.lessons.map((lesson) => {
                    const isLessonSelected = selectedLessonId === lesson.id;
                    return (
                      <div
                        key={lesson.id}
                        onClick={() => {
                          setSelectedUnitId(unit.id);
                          setSelectedLessonId(lesson.id);
                        }}
                        className={`p-2.5 rounded-lg text-xs cursor-pointer flex items-center justify-between gap-2 transition-all ${
                          isLessonSelected
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isLessonSelected ? 'text-white' : 'text-slate-400'}`} />
                          <span className="truncate">{lesson.title}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-mono px-1 rounded ${
                            isLessonSelected ? 'text-blue-200' : 'text-slate-400'
                          }`}>
                            {lesson.blocks.length} blq
                          </span>
                          {unit.lessons.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLesson(unit.id, lesson.id);
                              }}
                              className={`p-1 rounded opacity-60 hover:opacity-100 ${
                                isLessonSelected ? 'hover:bg-blue-700 text-white' : 'hover:bg-slate-200 text-slate-500'
                              }`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active Lesson Workspace */}
      <div className="flex-1 overflow-y-auto p-8">
        {currentLesson ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Lesson Title & Summary Header Box */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold">
                  <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                    {currentUnit?.title}
                  </span>
                  <span>·</span>
                  <span>Editando Contenido de Lección</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <label className="text-[11px] font-medium text-slate-600">Duración estimada:</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={currentLesson.estimatedMinutes}
                    onChange={(e) => handleUpdateLessonMeta('estimatedMinutes', parseInt(e.target.value) || 5)}
                    className="w-14 px-2 py-0.5 border border-slate-300 rounded text-center text-xs font-mono font-bold"
                  />
                  <span>min</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Lección</label>
                  <input
                    type="text"
                    value={currentLesson.title}
                    onChange={(e) => handleUpdateLessonMeta('title', e.target.value)}
                    placeholder="Ej. 1.1 Introducción a los Métodos Ágiles"
                    className="w-full text-base font-bold text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Resumen Didáctico u Objetivo</label>
                  <input
                    type="text"
                    value={currentLesson.summary}
                    onChange={(e) => handleUpdateLessonMeta('summary', e.target.value)}
                    placeholder="Breve párrafo introductorio para orientar al participante..."
                    className="w-full text-xs text-slate-700 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Block Add Toolbar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Insertar Bloque Interactivo
                </span>
                <span className="text-[11px] text-slate-400">
                  Haz clic para agregar componentes pedagógicos a esta lección
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <button
                  onClick={() => handleAddBlock('text')}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-center group cursor-pointer"
                >
                  <FileText className="w-5 h-5 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">Texto</span>
                  <span className="text-[10px] text-slate-400">Teoría &amp; listas</span>
                </button>

                <button
                  onClick={() => handleAddBlock('callout')}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all text-center group cursor-pointer"
                >
                  <AlertCircle className="w-5 h-5 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">Destacado</span>
                  <span className="text-[10px] text-slate-400">Tips pedagógicos</span>
                </button>

                <button
                  onClick={() => handleAddBlock('accordion')}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-center group cursor-pointer"
                >
                  <LayoutList className="w-5 h-5 text-indigo-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">Acordeón</span>
                  <span className="text-[10px] text-slate-400">Desplegables</span>
                </button>

                <button
                  onClick={() => handleAddBlock('tabs')}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-center group cursor-pointer"
                >
                  <Layers className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">Pestañas</span>
                  <span className="text-[10px] text-slate-400">Vistas paralelas</span>
                </button>

                <button
                  onClick={() => handleAddBlock('flashcards')}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all text-center group cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-violet-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">Flashcards</span>
                  <span className="text-[10px] text-slate-400">Repaso activo</span>
                </button>

                <button
                  onClick={() => handleAddBlock('checkpoint')}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 transition-all text-center group cursor-pointer"
                >
                  <HelpCircle className="w-5 h-5 text-rose-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">Pregunta</span>
                  <span className="text-[10px] text-slate-400">Comprobación</span>
                </button>
              </div>
            </div>

            {/* List of Content Blocks inside the Lesson */}
            <div className="space-y-4">
              {currentLesson.blocks.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700">Esta lección aún no tiene bloques</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Usa la barra superior para agregar tu primer bloque de texto o interactivo</p>
                </div>
              ) : (
                currentLesson.blocks.map((block, bIdx) => (
                  <div
                    key={block.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
                  >
                    {/* Block Header */}
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          Bloque {bIdx + 1}: {block.type}
                        </span>
                        <input
                          type="text"
                          value={block.title || ''}
                          onChange={(e) => handleUpdateBlock(block.id, { ...block, title: e.target.value })}
                          placeholder="Título opcional del bloque..."
                          className="text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-64"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          disabled={bIdx === 0}
                          onClick={() => handleMoveBlock(bIdx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                          title="Subir bloque"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          disabled={bIdx === currentLesson.blocks.length - 1}
                          onClick={() => handleMoveBlock(bIdx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                          title="Bajar bloque"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBlock(block.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                          title="Eliminar este bloque"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Block Body according to type */}
                    <div className="p-4">
                      {block.type === 'text' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Contenido del Bloque (HTML o texto estructurado)
                          </label>
                          <textarea
                            rows={4}
                            value={(block as TextBlock).content}
                            onChange={(e) => handleUpdateBlock(block.id, { ...block, content: e.target.value })}
                            className="w-full text-xs font-mono text-slate-800 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white leading-relaxed"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            Tip: Puedes usar etiquetas como &lt;p&gt;, &lt;strong&gt;, &lt;em&gt; o listas &lt;ul&gt;&lt;li&gt;.
                          </p>
                        </div>
                      )}

                      {block.type === 'callout' && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-semibold text-slate-600">Variante de estilo:</label>
                            <select
                              value={(block as CalloutBlock).variant}
                              onChange={(e) => handleUpdateBlock(block.id, { 
                                ...block, 
                                variant: e.target.value as any 
                              })}
                              className="text-xs border border-slate-200 rounded p-1 bg-white"
                            >
                              <option value="tip">Consejo Didáctico (Verde)</option>
                              <option value="info">Información Clave (Azul)</option>
                              <option value="warning">Advertencia / Alerta (Ámbar)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Mensaje Destacado</label>
                            <textarea
                              rows={2}
                              value={(block as CalloutBlock).content}
                              onChange={(e) => handleUpdateBlock(block.id, { ...block, content: e.target.value })}
                              className="w-full text-xs text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {block.type === 'accordion' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-600">Secciones del Acordeón</span>
                            <button
                              onClick={() => {
                                const acc = block as AccordionBlock;
                                const newItem = {
                                  id: `acc-${Date.now()}`,
                                  title: `Nuevo elemento ${acc.items.length + 1}`,
                                  content: 'Contenido explicativo de este elemento.'
                                };
                                handleUpdateBlock(block.id, {
                                  ...acc,
                                  items: [...acc.items, newItem]
                                });
                              }}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              + Agregar elemento
                            </button>
                          </div>

                          {(block as AccordionBlock).items.map((item, itemIdx) => (
                            <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => {
                                    const acc = block as AccordionBlock;
                                    const updated = [...acc.items];
                                    updated[itemIdx].title = e.target.value;
                                    handleUpdateBlock(block.id, { ...acc, items: updated });
                                  }}
                                  placeholder="Título de la pestaña plegable"
                                  className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1 flex-1"
                                />
                                {(block as AccordionBlock).items.length > 1 && (
                                  <button
                                    onClick={() => {
                                      const acc = block as AccordionBlock;
                                      const updated = acc.items.filter(i => i.id !== item.id);
                                      handleUpdateBlock(block.id, { ...acc, items: updated });
                                    }}
                                    className="text-slate-400 hover:text-rose-600 p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <textarea
                                rows={2}
                                value={item.content}
                                onChange={(e) => {
                                  const acc = block as AccordionBlock;
                                  const updated = [...acc.items];
                                  updated[itemIdx].content = e.target.value;
                                  handleUpdateBlock(block.id, { ...acc, items: updated });
                                }}
                                placeholder="Contenido que se desplegará al hacer clic..."
                                className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded p-2"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {block.type === 'tabs' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-600">Pestañas Configuradas</span>
                            <button
                              onClick={() => {
                                const tb = block as TabsBlock;
                                const newTab = {
                                  id: `tab-${Date.now()}`,
                                  label: `Pestaña ${tb.tabs.length + 1}`,
                                  content: 'Información expuesta en este panel.'
                                };
                                handleUpdateBlock(block.id, {
                                  ...tb,
                                  tabs: [...tb.tabs, newTab]
                                });
                              }}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              + Agregar pestaña
                            </button>
                          </div>

                          {(block as TabsBlock).tabs.map((tab, tIdx) => (
                            <div key={tab.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={tab.label}
                                  onChange={(e) => {
                                    const tb = block as TabsBlock;
                                    const updated = [...tb.tabs];
                                    updated[tIdx].label = e.target.value;
                                    handleUpdateBlock(block.id, { ...tb, tabs: updated });
                                  }}
                                  placeholder="Etiqueta de la pestaña"
                                  className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1 flex-1"
                                />
                                {(block as TabsBlock).tabs.length > 1 && (
                                  <button
                                    onClick={() => {
                                      const tb = block as TabsBlock;
                                      const updated = tb.tabs.filter(t => t.id !== tab.id);
                                      handleUpdateBlock(block.id, { ...tb, tabs: updated });
                                    }}
                                    className="text-slate-400 hover:text-rose-600 p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <textarea
                                rows={2}
                                value={tab.content}
                                onChange={(e) => {
                                  const tb = block as TabsBlock;
                                  const updated = [...tb.tabs];
                                  updated[tIdx].content = e.target.value;
                                  handleUpdateBlock(block.id, { ...tb, tabs: updated });
                                }}
                                placeholder="Contenido del panel de la pestaña..."
                                className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded p-2"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {block.type === 'flashcards' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-600">Tarjetas de Memoria Didácticas</span>
                            <button
                              onClick={() => {
                                const fc = block as FlashcardsBlock;
                                const newCard = {
                                  id: `fc-${Date.now()}`,
                                  front: `Pregunta o Término ${fc.cards.length + 1}`,
                                  back: 'Respuesta o definición detallada.',
                                  hint: 'Pista de memorización'
                                };
                                handleUpdateBlock(block.id, {
                                  ...fc,
                                  cards: [...fc.cards, newCard]
                                });
                              }}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              + Agregar tarjeta
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(block as FlashcardsBlock).cards.map((card, cIdx) => (
                              <div key={card.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 relative">
                                {(block as FlashcardsBlock).cards.length > 1 && (
                                  <button
                                    onClick={() => {
                                      const fc = block as FlashcardsBlock;
                                      const updated = fc.cards.filter(c => c.id !== card.id);
                                      handleUpdateBlock(block.id, { ...fc, cards: updated });
                                    }}
                                    className="absolute top-2 right-2 text-slate-400 hover:text-rose-600 p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Frente (Pregunta/Término)</label>
                                  <input
                                    type="text"
                                    value={card.front}
                                    onChange={(e) => {
                                      const fc = block as FlashcardsBlock;
                                      const updated = [...fc.cards];
                                      updated[cIdx].front = e.target.value;
                                      handleUpdateBlock(block.id, { ...fc, cards: updated });
                                    }}
                                    className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 mt-0.5"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Dorso (Respuesta/Definición)</label>
                                  <textarea
                                    rows={2}
                                    value={card.back}
                                    onChange={(e) => {
                                      const fc = block as FlashcardsBlock;
                                      const updated = [...fc.cards];
                                      updated[cIdx].back = e.target.value;
                                      handleUpdateBlock(block.id, { ...fc, cards: updated });
                                    }}
                                    className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded p-1.5 mt-0.5"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Pista opcional</label>
                                  <input
                                    type="text"
                                    value={card.hint || ''}
                                    onChange={(e) => {
                                      const fc = block as FlashcardsBlock;
                                      const updated = [...fc.cards];
                                      updated[cIdx].hint = e.target.value;
                                      handleUpdateBlock(block.id, { ...fc, cards: updated });
                                    }}
                                    placeholder="Ej. Revisa la lección anterior"
                                    className="w-full text-xs text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 mt-0.5"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {block.type === 'checkpoint' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700">
                              Selecciona la pregunta vinculada desde el banco de reactivos:
                            </label>
                            <button
                              onClick={onOpenQuestionBank}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              Ir al Banco de Preguntas →
                            </button>
                          </div>

                          {project.questionBank.length === 0 ? (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                              Aún no has creado preguntas en el banco de reactivos. Ve a la sección "Banco de Preguntas" para formularlas.
                            </div>
                          ) : (
                            <select
                              value={(block as CheckpointBlock).questionId}
                              onChange={(e) => handleUpdateBlock(block.id, { ...block, questionId: e.target.value })}
                              className="w-full text-xs text-slate-800 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                            >
                              {project.questionBank.map((q, qIndex) => (
                                <option key={q.id} value={q.id}>
                                  [{q.type}] {q.prompt} ({q.points} pts)
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            Selecciona una unidad y lección a la izquierda para comenzar a diseñar
          </div>
        )}
      </div>
    </div>
  );
};
