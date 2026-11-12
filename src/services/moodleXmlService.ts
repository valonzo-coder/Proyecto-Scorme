import {
  CourseProject,
  QuestionCategory,
  QuestionItem,
  QuestionType,
  QuestionOption,
  MatchingPair,
  ShortAnswerVariant,
  NumericalAnswer,
  ClozeSubquestionInfo
} from '../types/scorm';
import { CategoryService, DEFAULT_CATEGORY_ID, isQuestionAutoGradable } from './categoryService';
import { MediaService } from './mediaService';

export const MOODLE_XML_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
export const MOODLE_XML_MAX_QUESTIONS = 2500;

export interface ParsedMoodleFileAttachment {
  key: string;
  name: string;
  path: string;
  encoding: string;
  author?: string;
  license?: string;
  mimeType: string;
  base64Data: string;
  byteSize: number;
  previewDataUrl?: string;
}

export interface ParsedMoodleQuestionDraft {
  tempId: string;
  moodleType: string;
  mappedType: QuestionType;
  supportStatus: 'supported' | 'partial' | 'unsupported';
  categorySegments: string[];
  moodleCategoryRawPath: string;
  name: string;
  prompt: string;
  promptHtml: string;
  explanation: string;
  explanationHtml: string;
  points: number;
  penalty?: number;
  shuffleAnswers?: boolean;
  caseSensitive?: boolean;
  options?: QuestionOption[];
  trueFalseAnswer?: boolean;
  blankAnswer?: string;
  acceptedAnswers?: ShortAnswerVariant[];
  numericalAnswers?: NumericalAnswer[];
  matchingPairs?: MatchingPair[];
  feedbackCorrectHtml?: string;
  feedbackPartiallyCorrectHtml?: string;
  feedbackIncorrectHtml?: string;
  clozeData?: {
    rawText: string;
    subquestions: ClozeSubquestionInfo[];
  };
  attachments: ParsedMoodleFileAttachment[];
  externalMediaUrls: string[];
  warnings: string[];
  errors: string[];
  duplicateStatus: 'none' | 'exact' | 'probable';
  duplicateOfId?: string;
  duplicateReason?: string;
}

export interface MoodleXmlParseResult {
  fileName: string;
  fileSize: number;
  categoriesFound: { pathKey: string; segments: string[]; originalPath: string; questionCount: number }[];
  totalSubcategoriesCount: number;
  questions: ParsedMoodleQuestionDraft[];
  typeDistribution: Record<string, number>;
  mediaQuestionCount: number;
  incompatibleQuestionCount: number;
  warningQuestionCount: number;
  structuralErrors: string[];
  fatalError?: string;
}

export type DuplicateResolutionMode = 'import_all' | 'skip_duplicates' | 'manual';

export interface MoodleImportOptions {
  scope: 'all' | 'single_category' | 'category_with_subcategories' | 'selected_questions';
  selectedCategoryPathKey?: string;
  selectedQuestionTempIds?: Set<string>;
  destinationParentCategoryId: string | null; // null = root of Question Bank
  createMissingCategories: boolean;
  duplicateMode: DuplicateResolutionMode;
  manualSkipTempIds?: Set<string>;
}

export interface MoodleImportExecutionResult {
  importedCount: number;
  skippedCount: number;
  skippedDuplicatesCount: number;
  skippedErrorsCount: number;
  categoriesCreatedCount: number;
  warningQuestionsCount: number;
  importedWithWarnings: { title: string; warnings: string[] }[];
  errors: string[];
  updatedProject: CourseProject;
}

// ---------------------------------------------------------------------------
// Lightweight XML Node Adapter (works identically with browser DOMParser or Node fallback)
// ---------------------------------------------------------------------------
interface SimpleXmlNode {
  tagName: string;
  attributes: Record<string, string>;
  children: SimpleXmlNode[];
  textContent: string;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const cp = parseInt(hex, 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : _;
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const cp = parseInt(dec, 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : _;
    })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseXmlFallback(xml: string): { root: SimpleXmlNode | null; error?: string } {
  const cleaned = xml.replace(/^\uFEFF/, '').trim();
  const root: SimpleXmlNode = { tagName: '__root__', attributes: {}, children: [], textContent: '' };
  const stack: SimpleXmlNode[] = [root];
  let i = 0;
  const len = cleaned.length;

  while (i < len) {
    const lt = cleaned.indexOf('<', i);
    if (lt === -1) {
      const tail = cleaned.slice(i);
      if (tail && stack.length > 1) {
        stack[stack.length - 1].textContent += decodeXmlEntities(tail);
      }
      break;
    }
    if (lt > i && stack.length > 1) {
      stack[stack.length - 1].textContent += decodeXmlEntities(cleaned.slice(i, lt));
    }

    if (cleaned.startsWith('<!--', lt)) {
      const endComment = cleaned.indexOf('-->', lt + 4);
      if (endComment === -1) return { root: null, error: 'Comentario XML sin cerrar.' };
      i = endComment + 3;
      continue;
    }
    if (cleaned.startsWith('<![CDATA[', lt)) {
      const endCdata = cleaned.indexOf(']]>', lt + 9);
      if (endCdata === -1) return { root: null, error: 'Bloque CDATA sin cerrar.' };
      const cdataText = cleaned.slice(lt + 9, endCdata);
      if (stack.length > 1) {
        stack[stack.length - 1].textContent += cdataText;
      }
      i = endCdata + 3;
      continue;
    }
    if (cleaned.startsWith('<?', lt)) {
      const endPi = cleaned.indexOf('?>', lt + 2);
      if (endPi === -1) return { root: null, error: 'Instrucción de procesamiento XML sin cerrar.' };
      i = endPi + 2;
      continue;
    }
    if (cleaned.startsWith('</', lt)) {
      const gt = cleaned.indexOf('>', lt + 2);
      if (gt === -1) return { root: null, error: 'Etiqueta de cierre XML malformada.' };
      const closeName = cleaned.slice(lt + 2, gt).trim().split(':').pop() || '';
      const top = stack[stack.length - 1];
      if (!top || top.tagName !== closeName) {
        return {
          root: null,
          error: `Etiqueta de cierre inesperada </${closeName}> (se esperaba </${top?.tagName || ''}>).`
        };
      }
      stack.pop();
      i = gt + 1;
      continue;
    }

    // Opening tag
    let gt = -1;
    let quote: string | null = null;
    for (let k = lt + 1; k < len; k++) {
      const ch = cleaned[k];
      if (quote) {
        if (ch === quote) quote = null;
      } else {
        if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '>') {
          gt = k;
          break;
        }
      }
    }
    if (gt === -1) return { root: null, error: 'Etiqueta de apertura XML sin cerrar.' };

    const rawTag = cleaned.slice(lt + 1, gt).trim();
    const selfClosing = rawTag.endsWith('/');
    const tagBody = selfClosing ? rawTag.slice(0, -1).trim() : rawTag;
    const spaceIdx = tagBody.search(/\s/);
    const fullName = spaceIdx === -1 ? tagBody : tagBody.slice(0, spaceIdx);
    const localName = fullName.split(':').pop() || fullName;
    if (!localName || !/^[A-Za-z_][A-Za-z0-9._-]*$/.test(localName)) {
      return { root: null, error: `Nombre de etiqueta XML inválido: "${fullName}".` };
    }

    const attrs: Record<string, string> = {};
    if (spaceIdx !== -1) {
      const attrStr = tagBody.slice(spaceIdx + 1);
      const attrRegex = /([A-Za-z_:][A-Za-z0-9._:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let am: RegExpExecArray | null;
      while ((am = attrRegex.exec(attrStr)) !== null) {
        attrs[am[1]] = decodeXmlEntities(am[2] !== undefined ? am[2] : am[3] || '');
      }
    }

    const node: SimpleXmlNode = {
      tagName: localName,
      attributes: attrs,
      children: [],
      textContent: ''
    };
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) {
      stack.push(node);
    }
    i = gt + 1;
  }

  if (stack.length !== 1) {
    return { root: null, error: `Estructura XML incompleta: falta cerrar <${stack[stack.length - 1].tagName}>.` };
  }
  return { root: root.children[0] || null };
}

function domElementToSimpleNode(el: Element): SimpleXmlNode {
  const attrs: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    attrs[a.name] = a.value;
  }
  const children: SimpleXmlNode[] = [];
  let directText = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    const cn = el.childNodes[i];
    if (cn.nodeType === 1) {
      children.push(domElementToSimpleNode(cn as Element));
    } else if (cn.nodeType === 3 || cn.nodeType === 4) {
      directText += cn.nodeValue || '';
    }
  }
  return {
    tagName: (el.localName || el.tagName || '').toLowerCase(),
    attributes: attrs,
    children,
    textContent: directText
  };
}

function parseXmlDocument(rawXml: string): { root: SimpleXmlNode | null; error?: string } {
  const cleaned = rawXml.replace(/^\uFEFF/, '');
  // Security: Reject DOCTYPE / ENTITY declarations to strictly prevent XXE & Billion Laughs
  if (/<!DOCTYPE\b/i.test(cleaned) || /<!ENTITY\b/i.test(cleaned)) {
    return {
      root: null,
      error: 'Archivo XML rechazado por seguridad: contiene declaraciones DOCTYPE o ENTITY externas no permitidas.'
    };
  }
  if (cleaned.includes('\uFFFD')) {
    return {
      root: null,
      error: 'El archivo contiene caracteres con problemas de codificación UTF-8.'
    };
  }

  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleaned, 'text/xml');
      const parserErr = doc.getElementsByTagName('parsererror')[0];
      if (parserErr) {
        return {
          root: null,
          error: `XML malformado: ${(parserErr.textContent || 'error de sintaxis').trim().slice(0, 180)}`
        };
      }
      if (!doc.documentElement) {
        return { root: null, error: 'El archivo XML está vacío o carece de elemento raíz.' };
      }
      return { root: domElementToSimpleNode(doc.documentElement) };
    } catch (e: any) {
      return { root: null, error: e?.message || 'Error al analizar XML con DOMParser.' };
    }
  }

  const fb = parseXmlFallback(cleaned);
  if (fb.error || !fb.root) {
    return { root: null, error: fb.error || 'XML vacío o malformado.' };
  }
  // Normalize tagNames to lowercase to match DOMParser normalization
  const lowerWalk = (n: SimpleXmlNode) => {
    n.tagName = n.tagName.toLowerCase();
    n.children.forEach(lowerWalk);
  };
  lowerWalk(fb.root);
  return { root: fb.root };
}

function findChild(node: SimpleXmlNode | null | undefined, tagName: string): SimpleXmlNode | undefined {
  if (!node) return undefined;
  const target = tagName.toLowerCase();
  return node.children.find(c => c.tagName === target);
}

function findChildren(node: SimpleXmlNode | null | undefined, tagName: string): SimpleXmlNode[] {
  if (!node) return [];
  const target = tagName.toLowerCase();
  return node.children.filter(c => c.tagName === target);
}

function getAllText(node: SimpleXmlNode | undefined): string {
  if (!node) return '';
  let text = node.textContent || '';
  for (const ch of node.children) {
    text += getAllText(ch);
  }
  return text;
}

function readMoodleTextContainer(node: SimpleXmlNode | undefined): string {
  if (!node) return '';
  const textNode = findChild(node, 'text');
  const raw = textNode ? getAllText(textNode) : getAllText(node);
  return raw.trim();
}

// ---------------------------------------------------------------------------
// MIME & Base64 helpers
// ---------------------------------------------------------------------------
function guessMimeFromNameAndBytes(filename: string, bytes: Uint8Array): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png') || (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)) {
    return 'image/png';
  }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) {
    return 'image/jpeg';
  }
  if (lower.endsWith('.gif') || (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)) {
    return 'image/gif';
  }
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}

function decodeBase64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Controlled Moodle HTML -> Tiptap-compatible Sanitized HTML & Plain Text
// ---------------------------------------------------------------------------
const BLOCKED_TAGS = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'applet',
  'style',
  'link',
  'meta',
  'form',
  'input',
  'textarea',
  'select',
  'button',
  'base',
  'svg'
]);

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'a',
  'img',
  'span',
  'mark',
  'code',
  'pre',
  'sup',
  'sub',
  'hr',
  'div'
]);

function isSafeUrl(url: string, allowPluginToken: boolean = false): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (allowPluginToken && (trimmed.startsWith('moodle-file://') || trimmed.startsWith('media/'))) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
    return false;
  }
  if (lower.startsWith('data:image/')) {
    // Allow raster data images; reject svg+xml data URIs for XSS hygiene
    return !lower.startsWith('data:image/svg');
  }
  return (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('/') ||
    lower.startsWith('#') ||
    lower.startsWith('media/') ||
    lower.startsWith('moodle-file://')
  );
}

function escapeHtmlText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeStyleValue(rawStyle: string): string {
  const safeParts: string[] = [];
  rawStyle.split(';').forEach(decl => {
    const colon = decl.indexOf(':');
    if (colon === -1) return;
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const val = decl.slice(colon + 1).trim();
    if (!val || /url\(|expression\(|javascript:/i.test(val)) return;
    if (prop === 'color' || prop === 'background-color' || prop === 'text-align') {
      safeParts.push(`${prop}: ${val}`);
    }
  });
  return safeParts.join('; ');
}

function sanitizeDomNode(node: Node): string {
  if (node.nodeType === 3) {
    return escapeHtmlText(node.nodeValue || '');
  }
  if (node.nodeType !== 1) return '';
  const el = node as Element;
  let tag = el.tagName.toLowerCase();

  if (BLOCKED_TAGS.has(tag)) {
    return '';
  }

  let childrenHtml = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    childrenHtml += sanitizeDomNode(el.childNodes[i]);
  }

  if (!ALLOWED_TAGS.has(tag)) {
    return childrenHtml;
  }

  // Normalize Moodle tags toward Tiptap equivalents
  if (tag === 'b') tag = 'strong';
  else if (tag === 'i') tag = 'em';
  else if (tag === 'strike' || tag === 'del') tag = 's';
  else if (tag === 'h4' || tag === 'h5' || tag === 'h6') tag = 'h3';
  else if (tag === 'div') tag = 'p';

  if (tag === 'br' || tag === 'hr') {
    return `<${tag}>`;
  }

  if (tag === 'img') {
    const src = el.getAttribute('src') || '';
    if (!isSafeUrl(src, true)) return '';
    const alt = el.getAttribute('alt') || '';
    const dataPath = el.getAttribute('data-media-path') || '';
    const attrs = [`src="${escapeHtmlAttr(src)}"`, `alt="${escapeHtmlAttr(alt)}"`];
    if (dataPath) attrs.push(`data-media-path="${escapeHtmlAttr(dataPath)}"`);
    attrs.push('class="rounded-lg max-w-full my-2"');
    return `<img ${attrs.join(' ')}>`;
  }

  if (tag === 'a') {
    const href = el.getAttribute('href') || '';
    if (!isSafeUrl(href, false)) return childrenHtml;
    return `<a href="${escapeHtmlAttr(href)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${childrenHtml}</a>`;
  }

  if (tag === 'table') {
    return `<table class="border-collapse border border-slate-300 w-full my-2">${childrenHtml}</table>`;
  }

  const keptAttrs: string[] = [];
  if (tag === 'span' || tag === 'p' || tag === 'mark') {
    const st = el.getAttribute('style');
    if (st) {
      const cleanSt = sanitizeStyleValue(st);
      if (cleanSt) keptAttrs.push(`style="${escapeHtmlAttr(cleanSt)}"`);
    }
  }
  if ((tag === 'td' || tag === 'th')) {
    const colspan = el.getAttribute('colspan');
    const rowspan = el.getAttribute('rowspan');
    if (colspan && /^\d+$/.test(colspan)) keptAttrs.push(`colspan="${colspan}"`);
    if (rowspan && /^\d+$/.test(rowspan)) keptAttrs.push(`rowspan="${rowspan}"`);
  }

  const attrStr = keptAttrs.length > 0 ? ' ' + keptAttrs.join(' ') : '';
  return `<${tag}${attrStr}>${childrenHtml}</${tag}>`;
}

export function sanitizeMoodleHtml(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return '';
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, 'text/html');
      let out = '';
      for (let i = 0; i < doc.body.childNodes.length; i++) {
        out += sanitizeDomNode(doc.body.childNodes[i]);
      }
      return out.trim();
    } catch (e) {}
  }
  // Safe fallback sanitizer when DOMParser is unavailable (e.g. Node.js tests)
  return rawHtml
    .replace(/<(script|iframe|object|embed|style|form|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|iframe|object|embed|style|form|input|meta|link)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"')
    .trim();
}

export function htmlToPlainText(rawHtml: string): string {
  if (!rawHtml) return '';
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
      return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    } catch (e) {}
  }
  return decodeXmlEntities(
    rawHtml
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Category path normalization
// ---------------------------------------------------------------------------
export function parseMoodleCategoryPath(rawPath: string): string[] {
  let cleaned = (rawPath || '').trim();
  if (!cleaned) return [];
  cleaned = cleaned.replace(/^\$(?:course|system|module|cat)\$\/(?:top\/)?/i, '');
  cleaned = cleaned.replace(/^top\//i, '');
  // Split on unescaped slashes
  const rawParts = cleaned.split(/(?<!\\)\//);
  return rawParts
    .map(p => p.replace(/\\\//g, '/').trim())
    .filter(p => p.length > 0 && p.toLowerCase() !== 'top');
}

// ---------------------------------------------------------------------------
// Cloze subquestion extractor
// ---------------------------------------------------------------------------
function extractClozeSubquestions(rawText: string): ClozeSubquestionInfo[] {
  const subs: ClozeSubquestionInfo[] = [];
  const regex = /\{(\d*):([A-Z_]+):([^}]+)\}/gi;
  let match: RegExpExecArray | null;
  let idx = 1;
  while ((match = regex.exec(rawText)) !== null) {
    subs.push({
      index: idx++,
      weight: match[1] ? parseInt(match[1], 10) || 1 : 1,
      subType: match[2].toUpperCase(),
      rawBody: match[3]
    });
  }
  return subs;
}

// ---------------------------------------------------------------------------
// Attachment extraction & @@PLUGINFILE@@ replacement
// ---------------------------------------------------------------------------
function collectFilesFromContainer(
  node: SimpleXmlNode | undefined,
  collector: Map<string, ParsedMoodleFileAttachment>
): void {
  if (!node) return;
  const files = findChildren(node, 'file');
  for (const f of files) {
    const name = f.attributes.name || 'archivo';
    const path = f.attributes.path || '/';
    const encoding = (f.attributes.encoding || 'base64').toLowerCase();
    if (encoding !== 'base64') continue;
    const b64 = getAllText(f).trim();
    if (!b64) continue;
    try {
      const bytes = decodeBase64ToBytes(b64);
      const mimeType = guessMimeFromNameAndBytes(name, bytes);
      const normalizedPath = (path === '/' ? '' : path.replace(/^\/+|\/+$/g, '') + '/') + name;
      const key = `${normalizedPath}::${collector.size}`;
      const previewDataUrl =
        mimeType.startsWith('image/') && mimeType !== 'image/svg+xml'
          ? `data:${mimeType};base64,${b64.replace(/\s+/g, '')}`
          : undefined;

      const att: ParsedMoodleFileAttachment = {
        key,
        name,
        path,
        encoding,
        author: f.attributes.author,
        license: f.attributes.license,
        mimeType,
        base64Data: b64.replace(/\s+/g, ''),
        byteSize: bytes.byteLength,
        previewDataUrl
      };
      collector.set(normalizedPath.toLowerCase(), att);
      if (!collector.has(name.toLowerCase())) {
        collector.set(name.toLowerCase(), att);
      }
    } catch (e) {
      // Skip corrupt base64 gracefully; caller warns if unresolved
    }
  }
}

function rewritePluginFileUrls(
  rawHtml: string,
  fileMap: Map<string, ParsedMoodleFileAttachment>,
  usedAttachments: Map<string, ParsedMoodleFileAttachment>,
  externalMediaUrls: string[],
  warnings: string[]
): string {
  if (!rawHtml) return '';

  let replaced = rawHtml.replace(/@@PLUGINFILE@@\/([^"'\s<>)]+)/gi, (full, rawRel) => {
    let decoded = rawRel;
    try {
      decoded = decodeURIComponent(rawRel);
    } catch (e) {}
    const cleanRel = decoded.replace(/^\/+/, '').toLowerCase();
    const baseName = (cleanRel.split('/').pop() || cleanRel).toLowerCase();
    const att = fileMap.get(cleanRel) || fileMap.get(baseName);
    if (att) {
      usedAttachments.set(att.key, att);
      return `moodle-file://${att.key}`;
    }
    warnings.push(`No se encontró el archivo incrustado referido por "@@PLUGINFILE@@/${decoded}".`);
    return full;
  });

  // Detect external <img src="http(s)://..."> references
  const imgRegex = /<img\b[^>]*\bsrc\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  let im: RegExpExecArray | null;
  while ((im = imgRegex.exec(replaced)) !== null) {
    if (im[1] && !externalMediaUrls.includes(im[1])) {
      externalMediaUrls.push(im[1]);
    }
  }
  if (externalMediaUrls.length > 0) {
    warnings.push(
      `Contiene ${externalMediaUrls.length} imagen(es) externa(s) por URL; podría(n) no visualizarse sin conexión a Internet.`
    );
  }

  return sanitizeMoodleHtml(replaced);
}

// ---------------------------------------------------------------------------
// Duplicate Signature Helper
// ---------------------------------------------------------------------------
function normalizeForComparison(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildAnswerSignature(q: {
  type: QuestionType;
  options?: QuestionOption[];
  trueFalseAnswer?: boolean;
  blankAnswer?: string;
  numericalAnswers?: NumericalAnswer[];
  matchingPairs?: MatchingPair[];
}): string {
  if (q.type === 'multiple_choice' || q.type === 'multiple_response') {
    return (q.options || [])
      .map(o => `${o.isCorrect ? '1' : '0'}:${normalizeForComparison(o.text)}`)
      .sort()
      .join('|');
  }
  if (q.type === 'true_false') {
    return `tf:${q.trueFalseAnswer ? 'true' : 'false'}`;
  }
  if (q.type === 'fill_blank') {
    return `fb:${normalizeForComparison(q.blankAnswer || '')}`;
  }
  if (q.type === 'numerical') {
    return (q.numericalAnswers || [])
      .map(n => `${n.value}±${n.tolerance}`)
      .sort()
      .join('|');
  }
  if (q.type === 'matching') {
    return (q.matchingPairs || [])
      .map(p => `${normalizeForComparison(p.left)}=>${normalizeForComparison(p.right)}`)
      .sort()
      .join('|');
  }
  return q.type;
}

// ---------------------------------------------------------------------------
// Main Service
// ---------------------------------------------------------------------------
export class MoodleXmlService {
  /**
   * Offline analysis of a Moodle XML string (zero network calls, zero state mutations).
   */
  static parseMoodleXml(
    xmlContent: string,
    fileName: string,
    fileSize: number,
    existingQuestions: QuestionItem[] = []
  ): MoodleXmlParseResult {
    const emptyResult: MoodleXmlParseResult = {
      fileName,
      fileSize,
      categoriesFound: [],
      totalSubcategoriesCount: 0,
      questions: [],
      typeDistribution: {},
      mediaQuestionCount: 0,
      incompatibleQuestionCount: 0,
      warningQuestionCount: 0,
      structuralErrors: []
    };

    if (fileSize > MOODLE_XML_MAX_BYTES) {
      return {
        ...emptyResult,
        fatalError: `El archivo excede el límite máximo permitido de ${Math.round(MOODLE_XML_MAX_BYTES / (1024 * 1024))} MB.`
      };
    }

    if (!xmlContent || !xmlContent.trim()) {
      return {
        ...emptyResult,
        fatalError: 'El archivo seleccionado está vacío.'
      };
    }

    const { root, error } = parseXmlDocument(xmlContent);
    if (error || !root) {
      return {
        ...emptyResult,
        fatalError: error || 'No se pudo interpretar el documento XML.'
      };
    }

    if (root.tagName !== 'quiz') {
      return {
        ...emptyResult,
        fatalError: `Estructura inválida: se esperaba el elemento raíz <quiz>, pero se encontró <${root.tagName}>.`
      };
    }

    const questionNodes = findChildren(root, 'question');
    if (questionNodes.length === 0) {
      return {
        ...emptyResult,
        fatalError: 'El archivo Moodle XML no contiene ningún elemento <question>.'
      };
    }
    if (questionNodes.length > MOODLE_XML_MAX_QUESTIONS) {
      return {
        ...emptyResult,
        fatalError: `El archivo supera el máximo de ${MOODLE_XML_MAX_QUESTIONS} elementos <question> permitidos por importación.`
      };
    }

    // Track current active category from <question type="category">
    let currentSegments: string[] = [];
    let currentRawPath = '';
    const categoryStats = new Map<
      string,
      { pathKey: string; segments: string[]; originalPath: string; questionCount: number }
    >();

    const registerCategoryPath = (segments: string[], rawPath: string, incrementQuestion: boolean) => {
      if (segments.length === 0) {
        const key = '__uncategorized__';
        const existing = categoryStats.get(key) || {
          pathKey: key,
          segments: ['Sin categorizar'],
          originalPath: '',
          questionCount: 0
        };
        if (incrementQuestion) existing.questionCount++;
        categoryStats.set(key, existing);
        return;
      }
      // Register intermediate ancestor segments as well so hierarchy stats are complete
      for (let i = 1; i <= segments.length; i++) {
        const prefix = segments.slice(0, i);
        const key = prefix.map(s => s.toLowerCase()).join(' / ');
        const isLeaf = i === segments.length;
        const existing = categoryStats.get(key) || {
          pathKey: key,
          segments: prefix,
          originalPath: isLeaf ? rawPath : '',
          questionCount: 0
        };
        if (isLeaf && rawPath && !existing.originalPath) {
          existing.originalPath = rawPath;
        }
        if (isLeaf && incrementQuestion) {
          existing.questionCount++;
        }
        categoryStats.set(key, existing);
      }
    };

    const parsedQuestions: ParsedMoodleQuestionDraft[] = [];
    const structuralErrors: string[] = [];
    const typeDist: Record<string, number> = {};

    // Precompute existing question signatures for duplicate detection
    const existingSignatures = existingQuestions.map(eq => ({
      id: eq.id,
      nameNorm: normalizeForComparison(eq.name || ''),
      promptNorm: normalizeForComparison(eq.prompt),
      type: eq.type,
      ansSig: buildAnswerSignature(eq)
    }));

    questionNodes.forEach((qNode, qIdx) => {
      const moodleType = (qNode.attributes.type || '').trim().toLowerCase();

      if (!moodleType) {
        structuralErrors.push(`Elemento <question> #${qIdx + 1} carece de atributo "type".`);
        return;
      }

      // Handle <question type="category"> strictly as category marker
      if (moodleType === 'category') {
        const catNode = findChild(qNode, 'category');
        const rawCatPath = readMoodleTextContainer(catNode);
        currentRawPath = rawCatPath;
        currentSegments = parseMoodleCategoryPath(rawCatPath);
        registerCategoryPath(currentSegments, currentRawPath, false);
        return;
      }

      const warnings: string[] = [];
      const errors: string[] = [];
      const fileMap = new Map<string, ParsedMoodleFileAttachment>();
      const usedAttachments = new Map<string, ParsedMoodleFileAttachment>();
      const externalMediaUrls: string[] = [];

      // Collect all <file> attachments across the question subtree
      collectFilesFromContainer(qNode, fileMap);
      const qtNode = findChild(qNode, 'questiontext');
      collectFilesFromContainer(qtNode, fileMap);
      const gfNode = findChild(qNode, 'generalfeedback');
      collectFilesFromContainer(gfNode, fileMap);
      const cfNode = findChild(qNode, 'correctfeedback');
      collectFilesFromContainer(cfNode, fileMap);
      const pcfNode = findChild(qNode, 'partiallycorrectfeedback');
      collectFilesFromContainer(pcfNode, fileMap);
      const icfNode = findChild(qNode, 'incorrectfeedback');
      collectFilesFromContainer(icfNode, fileMap);
      findChildren(qNode, 'answer').forEach(ans => {
        collectFilesFromContainer(ans, fileMap);
        collectFilesFromContainer(findChild(ans, 'feedback'), fileMap);
      });
      findChildren(qNode, 'subquestion').forEach(sub => {
        collectFilesFromContainer(sub, fileMap);
      });

      const name = readMoodleTextContainer(findChild(qNode, 'name'));
      const rawPromptHtml = readMoodleTextContainer(qtNode);
      const promptHtml = rewritePluginFileUrls(
        rawPromptHtml,
        fileMap,
        usedAttachments,
        externalMediaUrls,
        warnings
      );
      const prompt = htmlToPlainText(promptHtml) || name;

      if (!prompt) {
        errors.push(`Pregunta #${qIdx + 1} (${name || moodleType}) no tiene enunciado ni nombre.`);
      }

      const rawGeneralFeedback = readMoodleTextContainer(gfNode);
      const explanationHtml = rewritePluginFileUrls(
        rawGeneralFeedback,
        fileMap,
        usedAttachments,
        externalMediaUrls,
        warnings
      );
      const explanation = htmlToPlainText(explanationHtml);

      const feedbackCorrectHtml = rewritePluginFileUrls(
        readMoodleTextContainer(cfNode),
        fileMap,
        usedAttachments,
        externalMediaUrls,
        warnings
      );
      const feedbackPartiallyCorrectHtml = rewritePluginFileUrls(
        readMoodleTextContainer(pcfNode),
        fileMap,
        usedAttachments,
        externalMediaUrls,
        warnings
      );
      const feedbackIncorrectHtml = rewritePluginFileUrls(
        readMoodleTextContainer(icfNode),
        fileMap,
        usedAttachments,
        externalMediaUrls,
        warnings
      );

      const gradeRaw = parseFloat(readMoodleTextContainer(findChild(qNode, 'defaultgrade')));
      const points = Number.isFinite(gradeRaw) && gradeRaw >= 0 ? gradeRaw : 10;
      const penaltyRaw = parseFloat(readMoodleTextContainer(findChild(qNode, 'penalty')));
      const penalty = Number.isFinite(penaltyRaw) ? penaltyRaw : undefined;
      const shuffleText = readMoodleTextContainer(findChild(qNode, 'shuffleanswers')).toLowerCase();
      const shuffleAnswers = shuffleText ? shuffleText === '1' || shuffleText === 'true' : undefined;

      const answerNodes = findChildren(qNode, 'answer');

      let mappedType: QuestionType = 'unsupported';
      let supportStatus: 'supported' | 'partial' | 'unsupported' = 'unsupported';
      let options: QuestionOption[] | undefined;
      let trueFalseAnswer: boolean | undefined;
      let blankAnswer: string | undefined;
      let acceptedAnswers: ShortAnswerVariant[] | undefined;
      let caseSensitive: boolean | undefined;
      let numericalAnswers: NumericalAnswer[] | undefined;
      let matchingPairs: MatchingPair[] | undefined;
      let clozeData: ParsedMoodleQuestionDraft['clozeData'];

      if (moodleType === 'multichoice') {
        const singleText = readMoodleTextContainer(findChild(qNode, 'single')).toLowerCase();
        const isSingleDeclared = singleText !== 'false' && singleText !== '0';

        const parsedOpts: QuestionOption[] = answerNodes.map((ans, aIdx) => {
          const frac = parseFloat(ans.attributes.fraction || '0') || 0;
          const ansHtml = rewritePluginFileUrls(
            readMoodleTextContainer(ans),
            fileMap,
            usedAttachments,
            externalMediaUrls,
            warnings
          );
          const ansText = htmlToPlainText(ansHtml);
          const fbHtml = rewritePluginFileUrls(
            readMoodleTextContainer(findChild(ans, 'feedback')),
            fileMap,
            usedAttachments,
            externalMediaUrls,
            warnings
          );
          return {
            id: `opt-${qIdx}-${aIdx}-${Math.random().toString(36).slice(2, 6)}`,
            text: ansText || `Opción ${aIdx + 1}`,
            isCorrect: frac > 0,
            fraction: frac,
            feedback: htmlToPlainText(fbHtml) || undefined
          };
        });

        const positiveCount = parsedOpts.filter(o => (o.fraction || 0) > 0).length;
        const hasPartialFractions = parsedOpts.some(
          o => (o.fraction || 0) > 0 && (o.fraction || 0) < 100
        );
        const hasNegativeFractions = parsedOpts.some(o => (o.fraction || 0) < 0);

        if (parsedOpts.length < 2) {
          errors.push('Pregunta de selección múltiple tiene menos de 2 opciones.');
        }
        if (positiveCount === 0) {
          errors.push('Pregunta de selección múltiple no tiene ninguna respuesta con fracción positiva (> 0).');
        }

        if (!isSingleDeclared || positiveCount > 1) {
          mappedType = 'multiple_response';
          if (isSingleDeclared && positiveCount > 1) {
            warnings.push(
              'Moodle declaró <single>true</single>, pero existen múltiples opciones con puntaje positivo; se importó como Selección Múltiple (Varias).'
            );
          }
        } else {
          mappedType = 'multiple_choice';
        }

        if (hasPartialFractions || hasNegativeFractions) {
          warnings.push(
            'Contiene porcentajes parciales o penalizaciones por opción en Moodle; EduBuilder califica selección exacta (correcta/incorrecta).'
          );
        }

        options = parsedOpts;
        supportStatus = errors.length === 0 ? 'supported' : 'unsupported';
      } else if (moodleType === 'truefalse') {
        mappedType = 'true_false';
        let foundTrue = false;
        let foundFalse = false;
        for (const ans of answerNodes) {
          const frac = parseFloat(ans.attributes.fraction || '0') || 0;
          const val = htmlToPlainText(readMoodleTextContainer(ans)).toLowerCase();
          if (val === 'true' || val === 'verdadero') {
            if (frac > 0) foundTrue = true;
          } else if (val === 'false' || val === 'falso') {
            if (frac > 0) foundFalse = true;
          }
        }
        if (!foundTrue && !foundFalse) {
          errors.push('Pregunta Verdadero/Falso no define claramente cuál respuesta tiene fracción > 0.');
        } else {
          trueFalseAnswer = foundTrue;
          supportStatus = 'supported';
        }
      } else if (moodleType === 'shortanswer') {
        mappedType = 'fill_blank';
        const useCaseText = readMoodleTextContainer(findChild(qNode, 'usecase')).trim();
        caseSensitive = useCaseText === '1' || useCaseText.toLowerCase() === 'true';

        const variants: ShortAnswerVariant[] = [];
        let hasWildcards = false;

        answerNodes.forEach(ans => {
          const frac = parseFloat(ans.attributes.fraction || '0') || 0;
          const ansText = htmlToPlainText(readMoodleTextContainer(ans));
          const fb = htmlToPlainText(readMoodleTextContainer(findChild(ans, 'feedback')));
          if (!ansText) return;
          if (ansText.includes('*')) hasWildcards = true;
          if (frac > 0) {
            variants.push({ text: ansText, fraction: frac, feedback: fb || undefined });
          }
        });

        variants.sort((a, b) => b.fraction - a.fraction);
        if (variants.length === 0) {
          errors.push('Pregunta de respuesta corta no contiene ninguna respuesta válida con fracción > 0.');
        } else {
          acceptedAnswers = variants;
          blankAnswer = variants[0].text;
          supportStatus = 'supported';
          if (hasWildcards) {
            warnings.push(
              'Una o más respuestas cortas incluyen comodines (*) de Moodle; la calificación en EduBuilder realiza coincidencia textual exacta.'
            );
          }
          if (variants.some(v => v.fraction < 100)) {
            warnings.push(
              'Incluye respuestas alternativas con puntaje parcial (<100%); en SCORM cualquier variante válida otorgará el puntaje completo de la pregunta.'
            );
          }
        }
      } else if (moodleType === 'numerical') {
        mappedType = 'numerical';
        const nums: NumericalAnswer[] = [];
        answerNodes.forEach(ans => {
          const frac = parseFloat(ans.attributes.fraction || '0') || 0;
          const rawVal = htmlToPlainText(readMoodleTextContainer(ans)).replace(',', '.');
          if (rawVal === '*') return; // Moodle catch-all wrong answer marker
          const numVal = parseFloat(rawVal);
          const tolRaw = parseFloat(readMoodleTextContainer(findChild(ans, 'tolerance')).replace(',', '.'));
          const tolerance = Number.isFinite(tolRaw) ? Math.abs(tolRaw) : 0;
          const fb = htmlToPlainText(readMoodleTextContainer(findChild(ans, 'feedback')));
          if (Number.isFinite(numVal) && frac > 0) {
            nums.push({ value: numVal, tolerance, fraction: frac, feedback: fb || undefined });
          }
        });

        const unitsNode = findChild(qNode, 'units');
        if (unitsNode && findChildren(unitsNode, 'unit').length > 0) {
          warnings.push(
            'La pregunta numérica define unidades de medida en Moodle; EduBuilder evaluará únicamente el valor numérico y su tolerancia.'
          );
        }

        if (nums.length === 0) {
          errors.push('Pregunta numérica no define ningún valor numérico válido con fracción > 0.');
        } else {
          numericalAnswers = nums;
          supportStatus = 'supported';
        }
      } else if (moodleType === 'matching') {
        mappedType = 'matching';
        const subNodes = findChildren(qNode, 'subquestion');
        const pairs: MatchingPair[] = [];
        let distractorCount = 0;

        subNodes.forEach((sub, sIdx) => {
          const leftHtml = rewritePluginFileUrls(
            readMoodleTextContainer(sub),
            fileMap,
            usedAttachments,
            externalMediaUrls,
            warnings
          );
          const left = htmlToPlainText(leftHtml);
          const right = htmlToPlainText(readMoodleTextContainer(findChild(sub, 'answer')));

          if (!left && right) {
            distractorCount++;
            return;
          }
          if (left && right) {
            pairs.push({
              id: `pair-${qIdx}-${sIdx}-${Math.random().toString(36).slice(2, 6)}`,
              left,
              right
            });
          }
        });

        if (distractorCount > 0) {
          warnings.push(
            `Contiene ${distractorCount} elemento(s) distractor(es) sin pareja izquierda; EduBuilder conserva únicamente pares completos izquierda ↔ derecha.`
          );
        }
        if (pairs.length < 2) {
          errors.push('La pregunta de emparejamiento debe tener al menos 2 pares completos.');
        } else {
          matchingPairs = pairs;
          supportStatus = 'supported';
        }
      } else if (moodleType === 'essay') {
        mappedType = 'essay';
        supportStatus = 'partial';
        warnings.push(
          'Pregunta tipo Ensayo: requiere revisión manual del docente. Se conserva intacta en el banco pero NO es autocorregible en evaluaciones SCORM.'
        );
      } else if (moodleType === 'description') {
        mappedType = 'description';
        supportStatus = 'partial';
        warnings.push(
          'Elemento Descripción de Moodle: contenido informativo sin calificación. No se incluirá como reactivo calificable en evaluaciones SCORM.'
        );
      } else if (moodleType === 'cloze' || moodleType === 'multianswer') {
        mappedType = 'cloze';
        supportStatus = 'partial';
        const subs = extractClozeSubquestions(rawPromptHtml);
        clozeData = {
          rawText: rawPromptHtml,
          subquestions: subs
        };
        warnings.push(
          `Pregunta Cloze (${subs.length} subelemento(s) incrustado(s)): se importó con su estructura original como contenido pendiente de adaptación; no es reproducible como pregunta interactiva SCORM.`
        );
      } else {
        mappedType = 'unsupported';
        supportStatus = 'unsupported';
        warnings.push(
          `Tipo Moodle "${moodleType}" no está soportado para reproducción interactiva en EduBuilder SCORM. Se importa únicamente como referencia pendiente de adaptación.`
        );
      }

      // Register category stats
      registerCategoryPath(currentSegments, currentRawPath, true);
      typeDist[mappedType] = (typeDist[mappedType] || 0) + 1;

      // Duplicate check (name + prompt + type + answer signature)
      const promptNorm = normalizeForComparison(prompt);
      const nameNorm = normalizeForComparison(name);
      const ansSig = buildAnswerSignature({
        type: mappedType,
        options,
        trueFalseAnswer,
        blankAnswer,
        numericalAnswers,
        matchingPairs
      });

      let duplicateStatus: 'none' | 'exact' | 'probable' = 'none';
      let duplicateOfId: string | undefined;
      let duplicateReason: string | undefined;

      for (const ex of existingSignatures) {
        if (ex.type === mappedType && ex.promptNorm && ex.promptNorm === promptNorm) {
          if (ex.ansSig === ansSig) {
            duplicateStatus = 'exact';
            duplicateOfId = ex.id;
            duplicateReason = 'Coincidencia exacta en enunciado, tipo y respuestas.';
            break;
          } else {
            duplicateStatus = 'probable';
            duplicateOfId = ex.id;
            duplicateReason = 'Mismo enunciado y tipo de pregunta con variantes en respuestas.';
          }
        } else if (
          duplicateStatus === 'none' &&
          ex.type === mappedType &&
          nameNorm &&
          ex.nameNorm === nameNorm &&
          ex.ansSig === ansSig
        ) {
          duplicateStatus = 'probable';
          duplicateOfId = ex.id;
          duplicateReason = 'Coincide nombre, tipo y respuestas.';
        }
      }

      parsedQuestions.push({
        tempId: `moodle-q-${qIdx}-${Math.random().toString(36).slice(2, 7)}`,
        moodleType,
        mappedType,
        supportStatus,
        categorySegments: currentSegments.length > 0 ? [...currentSegments] : ['Sin categorizar'],
        moodleCategoryRawPath: currentRawPath,
        name: name || prompt.slice(0, 80),
        prompt,
        promptHtml,
        explanation,
        explanationHtml,
        points: mappedType === 'description' ? 0 : points,
        penalty,
        shuffleAnswers,
        caseSensitive,
        options,
        trueFalseAnswer,
        blankAnswer,
        acceptedAnswers,
        numericalAnswers,
        matchingPairs,
        feedbackCorrectHtml: feedbackCorrectHtml || undefined,
        feedbackPartiallyCorrectHtml: feedbackPartiallyCorrectHtml || undefined,
        feedbackIncorrectHtml: feedbackIncorrectHtml || undefined,
        clozeData,
        attachments: Array.from(usedAttachments.values()),
        externalMediaUrls,
        warnings,
        errors,
        duplicateStatus,
        duplicateOfId,
        duplicateReason
      });
    });

    const categoriesFound = Array.from(categoryStats.values());
    const totalSubcategoriesCount = categoriesFound.filter(
      c => c.pathKey !== '__uncategorized__' && c.segments.length > 1
    ).length;

    return {
      fileName,
      fileSize,
      categoriesFound,
      totalSubcategoriesCount,
      questions: parsedQuestions,
      typeDistribution: typeDist,
      mediaQuestionCount: parsedQuestions.filter(q => q.attachments.length > 0 || q.externalMediaUrls.length > 0).length,
      incompatibleQuestionCount: parsedQuestions.filter(q => q.supportStatus !== 'supported').length,
      warningQuestionCount: parsedQuestions.filter(q => q.warnings.length > 0).length,
      structuralErrors
    };
  }

  /**
   * Transactional import: validates & stages all new categories, media assets, and questions.
   * Does not alter `project` if an unexpected error occurs prior to returning `updatedProject`.
   */
  static async executeImport(
    project: CourseProject,
    parseResult: MoodleXmlParseResult,
    options: MoodleImportOptions
  ): Promise<MoodleImportExecutionResult> {
    if (parseResult.fatalError) {
      throw new Error(parseResult.fatalError);
    }

    const now = new Date().toISOString();
    let workingCategories: QuestionCategory[] = JSON.parse(
      JSON.stringify(project.questionCategories || [])
    );
    const normInit = CategoryService.normalizeCategoriesAndQuestions(workingCategories, project.questionBank);
    workingCategories = normInit.categories;
    const existingBank = [...normInit.questions];

    let categoriesCreatedCount = 0;
    let importedCount = 0;
    let skippedDuplicatesCount = 0;
    let skippedErrorsCount = 0;
    let skippedScopeCount = 0;
    const importedWithWarnings: { title: string; warnings: string[] }[] = [];
    const errors: string[] = [];

    // Filter candidate questions according to Step 4 scope
    const candidates = parseResult.questions.filter(q => {
      const qPathKey =
        q.categorySegments.length === 1 && q.categorySegments[0] === 'Sin categorizar' && !q.moodleCategoryRawPath
          ? '__uncategorized__'
          : q.categorySegments.map(s => s.toLowerCase()).join(' / ');

      if (options.scope === 'selected_questions') {
        if (!options.selectedQuestionTempIds?.has(q.tempId)) {
          skippedScopeCount++;
          return false;
        }
      } else if (options.scope === 'single_category' && options.selectedCategoryPathKey) {
        if (qPathKey !== options.selectedCategoryPathKey) {
          skippedScopeCount++;
          return false;
        }
      } else if (options.scope === 'category_with_subcategories' && options.selectedCategoryPathKey) {
        const prefix = options.selectedCategoryPathKey;
        if (qPathKey !== prefix && !qPathKey.startsWith(prefix + ' / ')) {
          skippedScopeCount++;
          return false;
        }
      }
      return true;
    });

    const newQuestions: QuestionItem[] = [];

    // Pre-register category paths for selected candidates (only on confirmation!)
    const pathToCategoryId = new Map<string, string>();
    const resolveTargetCategoryId = (draft: ParsedMoodleQuestionDraft): string => {
      const isUncategorized =
        !draft.moodleCategoryRawPath &&
        draft.categorySegments.length === 1 &&
        draft.categorySegments[0] === 'Sin categorizar';

      if (isUncategorized) {
        return options.destinationParentCategoryId || DEFAULT_CATEGORY_ID;
      }

      if (!options.createMissingCategories) {
        return options.destinationParentCategoryId || DEFAULT_CATEGORY_ID;
      }

      const key = `${options.destinationParentCategoryId || 'root'}::${draft.categorySegments.map(s => s.toLowerCase()).join('/')}`;
      if (pathToCategoryId.has(key)) {
        return pathToCategoryId.get(key)!;
      }

      // Relative sub-path when importing a single category subtree inside destination
      let segmentsToCreate = draft.categorySegments;
      if (
        (options.scope === 'single_category' || options.scope === 'category_with_subcategories') &&
        options.selectedCategoryPathKey &&
        options.selectedCategoryPathKey !== '__uncategorized__'
      ) {
        const selEntry = parseResult.categoriesFound.find(c => c.pathKey === options.selectedCategoryPathKey);
        if (selEntry && selEntry.segments.length > 1 && segmentsToCreate.length >= selEntry.segments.length) {
          // Keep the selected leaf category and its descendants relative to destination
          segmentsToCreate = segmentsToCreate.slice(selEntry.segments.length - 1);
        }
      }

      const res = CategoryService.findOrCreateCategoryPath(
        workingCategories,
        segmentsToCreate,
        options.destinationParentCategoryId,
        draft.moodleCategoryRawPath || undefined
      );
      workingCategories = res.categories;
      categoriesCreatedCount += res.createdCount;
      pathToCategoryId.set(key, res.targetCategoryId);
      return res.targetCategoryId;
    };

    for (const draft of candidates) {
      if (draft.errors.length > 0) {
        skippedErrorsCount++;
        errors.push(`${draft.name || draft.tempId}: ${draft.errors.join(' ')}`);
        continue;
      }

      if (options.duplicateMode === 'skip_duplicates' && draft.duplicateStatus !== 'none') {
        skippedDuplicatesCount++;
        continue;
      }
      if (options.duplicateMode === 'manual' && options.manualSkipTempIds?.has(draft.tempId)) {
        skippedDuplicatesCount++;
        continue;
      }

      // Register Base64 attachments into MediaService and rewrite moodle-file:// -> media/...
      const keyToPersistentPath = new Map<string, string>();
      for (const att of draft.attachments) {
        try {
          const bytes = decodeBase64ToBytes(att.base64Data);
          const blob = new Blob([bytes.buffer as ArrayBuffer], { type: att.mimeType });
          const meta = await MediaService.addMediaBlob(blob, att.name, att.mimeType, project.id);
          keyToPersistentPath.set(att.key, meta.relativePath);
        } catch (err) {
          draft.warnings.push(`No se pudo almacenar el archivo adjunto "${att.name}".`);
        }
      }

      const replaceAttachmentTokens = (html?: string): string | undefined => {
        if (!html) return html;
        let out = html;
        keyToPersistentPath.forEach((persistentPath, key) => {
          const token = `moodle-file://${key}`;
          if (out.includes(token)) {
            out = out.split(token).join(persistentPath);
            // Also inject data-media-path on <img> pointing to persistentPath
            out = out.replace(
              new RegExp(`<img\\b([^>]*?)src="${persistentPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"([^>]*)>`, 'gi'),
              (m, pre, post) => {
                if (/data-media-path=/i.test(m)) return m;
                return `<img${pre}src="${persistentPath}" data-media-path="${persistentPath}"${post}>`;
              }
            );
          }
        });
        return out;
      };

      const targetCategoryId = resolveTargetCategoryId(draft);
      const pendingAdaptation = !isQuestionAutoGradable({ type: draft.mappedType });

      const newQ: QuestionItem = {
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        categoryId: targetCategoryId,
        name: draft.name,
        type: draft.mappedType,
        prompt: draft.prompt,
        promptHtml: replaceAttachmentTokens(draft.promptHtml),
        explanation: draft.explanation,
        explanationHtml: replaceAttachmentTokens(draft.explanationHtml),
        points: draft.points,
        difficulty: 'Medio',
        tags: ['Moodle XML', ...draft.categorySegments.slice(-2)],
        createdAt: now,
        updatedAt: now,
        options: draft.options,
        trueFalseAnswer: draft.trueFalseAnswer,
        blankAnswer: draft.blankAnswer,
        acceptedAnswers: draft.acceptedAnswers,
        caseSensitive: draft.caseSensitive,
        numericalAnswers: draft.numericalAnswers,
        matchingPairs: draft.matchingPairs,
        penalty: draft.penalty,
        shuffleAnswers: draft.shuffleAnswers,
        feedbackCorrectHtml: replaceAttachmentTokens(draft.feedbackCorrectHtml),
        feedbackPartiallyCorrectHtml: replaceAttachmentTokens(draft.feedbackPartiallyCorrectHtml),
        feedbackIncorrectHtml: replaceAttachmentTokens(draft.feedbackIncorrectHtml),
        rawMoodleType: draft.moodleType,
        clozeData: draft.clozeData,
        importWarnings: draft.warnings.length > 0 ? [...draft.warnings] : undefined,
        pendingAdaptation: pendingAdaptation || undefined,
        externalMediaUrls: draft.externalMediaUrls.length > 0 ? draft.externalMediaUrls : undefined
      };

      newQuestions.push(newQ);
      importedCount++;

      if (draft.warnings.length > 0) {
        importedWithWarnings.push({
          title: draft.name || draft.prompt.slice(0, 60),
          warnings: [...draft.warnings]
        });
      }
    }

    const updatedProject: CourseProject = MediaService.sanitizeProjectMediaReferences({
      ...project,
      questionCategories: workingCategories,
      questionBank: [...newQuestions, ...existingBank],
      updatedAt: now
    });

    return {
      importedCount,
      skippedCount: skippedScopeCount + skippedDuplicatesCount + skippedErrorsCount,
      skippedDuplicatesCount,
      skippedErrorsCount,
      categoriesCreatedCount,
      warningQuestionsCount: importedWithWarnings.length,
      importedWithWarnings,
      errors,
      updatedProject
    };
  }
}
