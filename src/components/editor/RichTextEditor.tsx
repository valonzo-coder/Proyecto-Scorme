import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  List, 
  ListOrdered, 
  Quote, 
  Minus, 
  Table as TableIcon, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Upload, 
  Sigma, 
  Palette, 
  Highlighter, 
  Type, 
  Heading1, 
  Heading2, 
  Heading3, 
  Plus, 
  Trash2, 
  X, 
  Check, 
  Eye
} from 'lucide-react';
import { MediaService } from '../../services/mediaService';
import { MathService } from '../../services/mathService';

interface RichTextEditorProps {
  content: string;
  onChange: (htmlContent: string) => void;
  placeholder?: string;
}

const COMMON_MATH_SYMBOLS = [
  { label: '±', latex: '\\pm ' },
  { label: '×', latex: '\\times ' },
  { label: '÷', latex: '\\div ' },
  { label: '√x', latex: '\\sqrt{x} ' },
  { label: 'a/b', latex: '\\frac{a}{b} ' },
  { label: 'x²', latex: 'x^2 ' },
  { label: 'xᵢ', latex: 'x_i ' },
  { label: 'π', latex: '\\pi ' },
  { label: 'θ', latex: '\\theta ' },
  { label: 'α', latex: '\\alpha ' },
  { label: 'β', latex: '\\beta ' },
  { label: '∑', latex: '\\sum_{i=1}^{n} ' },
  { label: '∫', latex: '\\int_{a}^{b} ' },
  { label: '≤', latex: '\\le ' },
  { label: '≥', latex: '\\ge ' },
  { label: '≠', latex: '\\neq ' },
  { label: '≈', latex: '\\approx ' },
  { label: '∞', latex: '\\infty ' }
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Escribe aquí tu contenido...'
}) => {
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [latexInput, setLatexInput] = useState('');
  const [isDisplayMath, setIsDisplayMath] = useState(true);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const [showTableMenu, setShowTableMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline font-medium'
        }
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full my-3 shadow-xs'
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-slate-300 w-full my-3'
        }
      }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    }
  });

  // Keep editor content in sync if parent changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '<p></p>');
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  // Handle local image upload via MediaService
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const meta = await MediaService.addMediaFile(file);
      const activeUrl = MediaService.resolveMediaUrl(meta.relativePath);
      editor.chain().focus().setImage({ src: activeUrl, alt: meta.filename }).run();
    } catch (err) {
      alert('Error al insertar imagen local.');
    }
    e.target.value = '';
  };

  // Insert Link
  const handleSetLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    }
    setIsLinkModalOpen(false);
    setLinkUrl('');
  };

  // Insert Math Formula
  const handleInsertMath = () => {
    if (!latexInput.trim()) {
      setIsMathModalOpen(false);
      return;
    }

    const cleanLatex = latexInput.trim();
    if (isDisplayMath) {
      // Block display math
      editor.chain().focus().insertContent(`<p>$$${cleanLatex}$$</p>`).run();
    } else {
      // Inline math
      editor.chain().focus().insertContent(`$${cleanLatex}$ `).run();
    }

    setIsMathModalOpen(false);
    setLatexInput('');
  };

  return (
    <div className="border border-slate-300 rounded-xl bg-white overflow-hidden shadow-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
      {/* Hidden file input for images */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Main Toolbar */}
      <div className="p-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-1 text-slate-700 select-none">
        {/* Paragraph & Headings */}
        <select
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          aria-label="Formato de texto"
          className="text-xs font-semibold px-2 py-1 bg-white border border-slate-200 rounded-md focus:outline-none"
        >
          <option value="p">Párrafo Normal</option>
          <option value="h1">Título Principal (H1)</option>
          <option value="h2">Subtítulo (H2)</option>
          <option value="h3">Encabezado Sección (H3)</option>
        </select>

        <div className="h-4 w-px bg-slate-300 mx-1"></div>

        {/* Text Styles */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('bold') ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Negrita (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Cursiva (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('underline') ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Subrayado (Ctrl+U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('strike') ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Tachado"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        {/* Colors & Highlight */}
        <div className="flex items-center gap-1">
          <label className="p-1.5 rounded hover:bg-slate-200 cursor-pointer flex items-center gap-1" title="Color de texto">
            <Palette className="w-3.5 h-3.5 text-slate-700" />
            <input
              type="color"
              onInput={(e: any) => editor.chain().focus().setColor(e.target.value).run()}
              className="w-3 h-3 p-0 border-0 bg-transparent cursor-pointer"
            />
          </label>

          <label className="p-1.5 rounded hover:bg-slate-200 cursor-pointer flex items-center gap-1" title="Color de resaltado">
            <Highlighter className="w-3.5 h-3.5 text-amber-600" />
            <input
              type="color"
              defaultValue="#fef08a"
              onInput={(e: any) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
              className="w-3 h-3 p-0 border-0 bg-transparent cursor-pointer"
            />
          </label>
        </div>

        <div className="h-4 w-px bg-slate-300 mx-1"></div>

        {/* Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200'
          }`}
          title="Alinear a la izquierda"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200'
          }`}
          title="Centrar"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200'
          }`}
          title="Alinear a la derecha"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive({ textAlign: 'justify' }) ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200'
          }`}
          title="Justificar"
        >
          <AlignJustify className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1"></div>

        {/* Lists & Quotes */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200'
          }`}
          title="Lista con viñetas"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200'
          }`}
          title="Lista numerada"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('blockquote') ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200'
          }`}
          title="Cita didáctica"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"
          title="Separador horizontal"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1"></div>

        {/* Tables */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTableMenu(!showTableMenu)}
            className={`p-1.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
              editor.isActive('table') ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-slate-200'
            }`}
            title="Tablas"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="text-[10px]">Tabla</span>
          </button>

          {showTableMenu && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-xl p-2 w-48 text-xs space-y-1">
              {!editor.isActive('table') ? (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                    setShowTableMenu(false);
                  }}
                  className="w-full text-left p-1.5 rounded hover:bg-slate-100 font-semibold text-slate-800"
                >
                  + Insertar Tabla (3×3)
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}
                    className="w-full text-left p-1 rounded hover:bg-slate-100"
                  >
                    + Columna después
                  </button>
                  <button
                    type="button"
                    onClick={() => { editor.chain().focus().deleteColumn().run(); setShowTableMenu(false); }}
                    className="w-full text-left p-1 rounded hover:bg-slate-100 text-rose-600"
                  >
                    - Eliminar columna
                  </button>
                  <button
                    type="button"
                    onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}
                    className="w-full text-left p-1 rounded hover:bg-slate-100"
                  >
                    + Fila después
                  </button>
                  <button
                    type="button"
                    onClick={() => { editor.chain().focus().deleteRow().run(); setShowTableMenu(false); }}
                    className="w-full text-left p-1 rounded hover:bg-slate-100 text-rose-600"
                  >
                    - Eliminar fila
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    type="button"
                    onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false); }}
                    className="w-full text-left p-1 rounded hover:bg-rose-50 text-rose-700 font-bold"
                  >
                    Eliminar tabla completa
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Media & Link */}
        <button
          type="button"
          onClick={() => {
            setLinkUrl(editor.getAttributes('link').href || '');
            setIsLinkModalOpen(true);
          }}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('link') ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200'
          }`}
          title="Insertar o editar enlace"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded hover:bg-slate-200 cursor-pointer flex items-center gap-1 text-slate-700"
          title="Insertar imagen desde el computador"
        >
          <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[10px]">Imagen</span>
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1"></div>

        {/* Math KaTeX Formula Button */}
        <button
          type="button"
          onClick={() => {
            setLatexInput('');
            setIsMathModalOpen(true);
          }}
          className="p-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
          title="Insertar expresión matemática LaTeX / KaTeX"
        >
          <Sigma className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[10px]">Fórmula LaTeX</span>
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="p-4 min-h-[160px] bg-white cursor-text" onClick={() => editor.chain().focus()}>
        <EditorContent editor={editor} />
      </div>

      {/* Math Modal */}
      {isMathModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Sigma className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Insertar Expresión Matemática (LaTeX / KaTeX)</h3>
              </div>
              <button onClick={() => setIsMathModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Código LaTeX de la Fórmula</label>
                <textarea
                  rows={3}
                  value={latexInput}
                  onChange={(e) => setLatexInput(e.target.value)}
                  placeholder="Ej. E = mc^2  o  \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Quick Math Symbols palette */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Símbolos Rápidos:</span>
                <div className="flex flex-wrap gap-1">
                  {COMMON_MATH_SYMBOLS.map((sym) => (
                    <button
                      key={sym.label}
                      type="button"
                      onClick={() => setLatexInput(prev => prev + sym.latex)}
                      className="px-2 py-1 text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded font-mono transition-colors cursor-pointer"
                      title={sym.latex}
                    >
                      {sym.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display mode toggle */}
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="mathMode"
                    checked={isDisplayMath}
                    onChange={() => setIsDisplayMath(true)}
                    className="text-indigo-600"
                  />
                  <span className="font-semibold text-slate-700">Ecuación en Bloque Centrada ($$...$$)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="mathMode"
                    checked={!isDisplayMath}
                    onChange={() => setIsDisplayMath(false)}
                    className="text-indigo-600"
                  />
                  <span className="font-semibold text-slate-700">Fórmula en el Texto ($...$)</span>
                </label>
              </div>

              {/* Live Preview */}
              {latexInput.trim() && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Vista Previa KaTeX:</span>
                  <div
                    className="overflow-x-auto text-center"
                    dangerouslySetInnerHTML={{
                      __html: MathService.renderLatexToHtml(latexInput, isDisplayMath)
                    }}
                  />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setIsMathModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleInsertMath}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Insertar Fórmula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Insertar / Editar Enlace Web</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://ejemplo.edu o enlace..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSetLink}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Guardar Enlace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
