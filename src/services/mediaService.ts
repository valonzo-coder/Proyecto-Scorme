import { CourseProject, MediaAssetMeta, CalloutBlock, TextBlock, MediaBlock, ResourceBlock } from '../types/scorm';

interface StoredMediaEntry {
  meta: MediaAssetMeta;
  blob: Blob;
  objectUrl: string;
  projectId: string;
}

interface IndexedDbMediaRecord {
  relativePath: string;
  projectId: string;
  meta: MediaAssetMeta;
  blob: Blob;
}

const IDB_NAME = 'edubuilder_scorm_media_db';
const IDB_VERSION = 1;
const IDB_STORE = 'media_assets';

class MediaServiceManager {
  private assets: Map<string, StoredMediaEntry> = new Map();
  private objectUrlToPath: Map<string, string> = new Map();
  private activeProjectId: string = '';
  private revision: number = 0;
  private listeners: Set<() => void> = new Set();

  private notify(): void {
    this.revision++;
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {}
    });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getRevision(): number {
    return this.revision;
  }

  setActiveProjectId(projectId: string): void {
    this.activeProjectId = projectId;
  }

  getActiveProjectId(): string {
    return this.activeProjectId;
  }

  private openDatabase(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
      return Promise.resolve(null);
    }
    return new Promise(resolve => {
      try {
        const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE, { keyPath: 'relativePath' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  private idbQueue: Promise<void> = Promise.resolve();

  private enqueueIdbOp(op: () => Promise<void>): Promise<void> {
    this.idbQueue = this.idbQueue.then(op, op);
    return this.idbQueue;
  }

  private persistRecordToIdb(record: IndexedDbMediaRecord): Promise<void> {
    return this.enqueueIdbOp(async () => {
      const db = await this.openDatabase();
      if (!db) return;
      await new Promise<void>(resolve => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(record);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch (e) {
          db.close();
          resolve();
        }
      });
    });
  }

  private deleteRecordFromIdb(relativePath: string): Promise<void> {
    return this.enqueueIdbOp(async () => {
      const db = await this.openDatabase();
      if (!db) return;
      await new Promise<void>(resolve => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).delete(relativePath);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch (e) {
          db.close();
          resolve();
        }
      });
    });
  }

  private clearIdb(): Promise<void> {
    return this.enqueueIdbOp(async () => {
      const db = await this.openDatabase();
      if (!db) return;
      await new Promise<void>(resolve => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).clear();
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch (e) {
          db.close();
          resolve();
        }
      });
    });
  }

  /**
   * Restores persisted media blobs from IndexedDB for the active project after page reload.
   * Ensures any leftover records from another project are discarded so projects never mix.
   */
  async restoreProjectMedia(projectId: string): Promise<number> {
    this.activeProjectId = projectId;
    const db = await this.openDatabase();
    if (!db) return 0;

    const records = await new Promise<IndexedDbMediaRecord[]>(resolve => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).getAll();
        req.onsuccess = () => {
          db.close();
          resolve(Array.isArray(req.result) ? req.result : []);
        };
        req.onerror = () => {
          db.close();
          resolve([]);
        };
      } catch (e) {
        db.close();
        resolve([]);
      }
    });

    let restored = 0;
    for (const rec of records) {
      if (rec.projectId !== projectId) {
        // Purge stale assets from other projects
        void this.deleteRecordFromIdb(rec.relativePath);
        continue;
      }
      if (!this.assets.has(rec.relativePath)) {
        const objectUrl =
          typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(rec.blob)
            : '';
        this.assets.set(rec.relativePath, {
          meta: rec.meta,
          blob: rec.blob,
          objectUrl,
          projectId
        });
        if (objectUrl) {
          this.objectUrlToPath.set(objectUrl, rec.relativePath);
        }
        restored++;
      }
    }

    if (restored > 0) {
      this.notify();
    }
    return restored;
  }

  private getMediaFolder(mimeType: string, filename: string): string {
    const lowerMime = (mimeType || '').toLowerCase();
    const lowerName = (filename || '').toLowerCase();
    if (lowerMime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(lowerName)) {
      return 'media/imagenes';
    }
    if (lowerMime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lowerName)) {
      return 'media/audio';
    }
    if (lowerMime.startsWith('video/') || /\.(mp4|webm|ogv|mov|m4v)$/.test(lowerName)) {
      return 'media/videos';
    }
    return 'media/recursos';
  }

  /**
   * Adds a file uploaded by the user to the active project's media registry,
   * assigns a collision-free persistent path, and persists it in IndexedDB.
   */
  async addMediaFile(file: File, projectId?: string): Promise<MediaAssetMeta> {
    return this.addMediaBlob(file, file.name, file.type, projectId);
  }

  /**
   * Adds a Blob (e.g. decoded from Moodle XML Base64) to the active project's media registry,
   * assigns a collision-free persistent path, and persists it in IndexedDB.
   */
  async addMediaBlob(
    blob: Blob,
    filename: string,
    mimeType?: string,
    projectId?: string
  ): Promise<MediaAssetMeta> {
    const cleanName = (filename || 'archivo').replace(/[^a-zA-Z0-9._-]/g, '_') || 'archivo';
    const resolvedMime = mimeType || blob.type || 'application/octet-stream';
    const folder = this.getMediaFolder(resolvedMime, cleanName);

    let assetId = '';
    let relativePath = '';
    do {
      const rand = Math.random().toString(36).substring(2, 8);
      assetId = `med_${Date.now()}_${rand}`;
      relativePath = `${folder}/${assetId}_${cleanName}`;
    } while (this.assets.has(relativePath));

    const meta: MediaAssetMeta = {
      id: assetId,
      filename: cleanName,
      mimeType: resolvedMime,
      size: blob.size,
      relativePath
    };

    const targetProjectId = projectId || this.activeProjectId || 'active';
    const objectUrl =
      typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(blob)
        : '';

    this.assets.set(relativePath, {
      meta,
      blob,
      objectUrl,
      projectId: targetProjectId
    });
    if (objectUrl) {
      this.objectUrlToPath.set(objectUrl, relativePath);
    }

    await this.persistRecordToIdb({
      relativePath,
      projectId: targetProjectId,
      meta,
      blob
    });

    this.notify();
    return meta;
  }

  /**
   * Registers a Blob from an unpacked project zip file into the active project.
   */
  registerUnpackedAsset(meta: MediaAssetMeta, blob: Blob, projectId?: string): void {
    const targetProjectId = projectId || this.activeProjectId || 'active';
    const existing = this.assets.get(meta.relativePath);
    if (existing?.objectUrl) {
      try {
        URL.revokeObjectURL(existing.objectUrl);
      } catch (e) {}
      this.objectUrlToPath.delete(existing.objectUrl);
    }

    const objectUrl =
      typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(blob)
        : '';

    this.assets.set(meta.relativePath, {
      meta,
      blob,
      objectUrl,
      projectId: targetProjectId
    });
    if (objectUrl) {
      this.objectUrlToPath.set(objectUrl, relativePathOrFallback(meta));
    }

    void this.persistRecordToIdb({
      relativePath: meta.relativePath,
      projectId: targetProjectId,
      meta,
      blob
    });
    this.notify();
  }

  /**
   * Resolves a persistent media path (or known blob URL) to its live object URL for display.
   */
  resolveMediaUrl(pathOrUrl?: string): string {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
      return pathOrUrl;
    }
    const item = this.assets.get(pathOrUrl);
    if (item && item.objectUrl) {
      return item.objectUrl;
    }
    return pathOrUrl;
  }

  /**
   * Resolves a live blob URL (if registered) back to its persistent relative path ("media/...").
   */
  resolvePersistentPath(urlOrPath?: string): string {
    if (!urlOrPath) return '';
    if (urlOrPath.startsWith('media/')) return urlOrPath;
    const mapped = this.objectUrlToPath.get(urlOrPath);
    if (mapped) return mapped;
    return urlOrPath;
  }

  hasAsset(relativePath: string): boolean {
    return this.assets.has(relativePath);
  }

  removeAsset(relativePath: string): void {
    const entry = this.assets.get(relativePath);
    if (!entry) return;
    if (entry.objectUrl) {
      try {
        URL.revokeObjectURL(entry.objectUrl);
      } catch (e) {}
      this.objectUrlToPath.delete(entry.objectUrl);
    }
    this.assets.delete(relativePath);
    void this.deleteRecordFromIdb(relativePath);
    this.notify();
  }

  /**
   * Normalizes rich HTML for persistent storage (project.json, sessionStorage, SCORM).
   * Ensures every <img>/<video>/<audio>/<source> with data-media-path or known blob: src
   * stores its stable relative path ("media/...") and NEVER a temporary blob: URL.
   */
  normalizeRichHtmlForStorage(html: string): string {
    if (!html) return '';

    const normalizeTagAttributes = (tagHtml: string): string => {
      const dataPathMatch = tagHtml.match(/\sdata-media-path=["']([^"']+)["']/i);
      const srcMatch = tagHtml.match(/\ssrc=["']([^"']+)["']/i);
      let persistentPath = dataPathMatch ? dataPathMatch[1] : '';

      if (!persistentPath && srcMatch) {
        const currentSrc = srcMatch[1];
        if (currentSrc.startsWith('media/')) {
          persistentPath = currentSrc;
        } else if (currentSrc.startsWith('blob:')) {
          persistentPath = this.objectUrlToPath.get(currentSrc) || '';
        }
      }

      if (!persistentPath) {
        return tagHtml;
      }

      let updated = tagHtml;
      if (srcMatch) {
        updated = updated.replace(/\ssrc=["'][^"']*["']/i, ` src="${persistentPath}"`);
      } else {
        updated = updated.replace(/<(img|video|audio|source)\b/i, `<$1 src="${persistentPath}"`);
      }

      if (!dataPathMatch) {
        updated = updated.replace(/<(img|video|audio|source)\b/i, `<$1 data-media-path="${persistentPath}"`);
      }
      return updated;
    };

    return html.replace(/<(img|video|audio|source)\b[^>]*>/gi, normalizeTagAttributes);
  }

  /**
   * Hydrates persisted HTML ("media/...") with active blob: object URLs for live rendering
   * in Tiptap or StudentPlayerPreview, preserving data-media-path and all attributes (alt, class, etc.).
   */
  hydrateRichHtmlForDisplay(html: string): string {
    if (!html) return '';

    const hydrateTagAttributes = (tagHtml: string): string => {
      const dataPathMatch = tagHtml.match(/\sdata-media-path=["']([^"']+)["']/i);
      const srcMatch = tagHtml.match(/\ssrc=["']([^"']+)["']/i);
      const persistentPath =
        (dataPathMatch && dataPathMatch[1].startsWith('media/') ? dataPathMatch[1] : '') ||
        (srcMatch && srcMatch[1].startsWith('media/') ? srcMatch[1] : '');

      if (!persistentPath) {
        return tagHtml;
      }

      const resolvedUrl = this.resolveMediaUrl(persistentPath);
      let updated = tagHtml;
      if (srcMatch) {
        updated = updated.replace(/\ssrc=["'][^"']*["']/i, ` src="${resolvedUrl}"`);
      } else {
        updated = updated.replace(/<(img|video|audio|source)\b/i, `<$1 src="${resolvedUrl}"`);
      }

      if (!dataPathMatch) {
        updated = updated.replace(/<(img|video|audio|source)\b/i, `<$1 data-media-path="${persistentPath}"`);
      }
      return updated;
    };

    return html.replace(/<(img|video|audio|source)\b[^>]*>/gi, hydrateTagAttributes);
  }

  /**
   * Scans an entire CourseProject and ensures all embedded HTML and block URLs use
   * persistent relative paths rather than temporary blob: URLs.
   */
  sanitizeProjectMediaReferences(project: CourseProject): CourseProject {
    let changed = false;

    const cleanCover = project.coverImage
      ? this.resolvePersistentPath(project.coverImage)
      : project.coverImage;
    if (cleanCover !== project.coverImage) changed = true;

    const sanitizedUnits = (project.units || []).map(unit => ({
      ...unit,
      lessons: (unit.lessons || []).map(lesson => ({
        ...lesson,
        pages: (lesson.pages || []).map(page => ({
          ...page,
          blocks: (page.blocks || []).map(block => {
            if (block.type === 'text') {
              const tb = block as TextBlock;
              const normalized = this.normalizeRichHtmlForStorage(tb.content);
              if (normalized !== tb.content) {
                changed = true;
                return { ...tb, content: normalized };
              }
            } else if (block.type === 'callout') {
              const cb = block as CalloutBlock;
              const normalized = this.normalizeRichHtmlForStorage(cb.content);
              if (normalized !== cb.content) {
                changed = true;
                return { ...cb, content: normalized };
              }
            } else if (block.type === 'media') {
              const mb = block as MediaBlock;
              const resolved = this.resolvePersistentPath(mb.url);
              if (resolved !== mb.url) {
                changed = true;
                return { ...mb, url: resolved };
              }
            } else if (block.type === 'resource') {
              const rb = block as ResourceBlock;
              const resolved = this.resolvePersistentPath(rb.relativePath);
              if (resolved !== rb.relativePath) {
                changed = true;
                return { ...rb, relativePath: resolved };
              }
            }
            return block;
          })
        }))
      }))
    }));

    const sanitizeQuestionHtml = (q: any) => {
      let qChanged = false;
      const nextQ = { ...q };
      for (const field of ['promptHtml', 'explanationHtml', 'feedbackCorrectHtml', 'feedbackPartiallyCorrectHtml', 'feedbackIncorrectHtml']) {
        if (typeof nextQ[field] === 'string' && nextQ[field]) {
          const norm = this.normalizeRichHtmlForStorage(nextQ[field]);
          if (norm !== nextQ[field]) {
            nextQ[field] = norm;
            qChanged = true;
          }
        }
      }
      if (qChanged) changed = true;
      return qChanged ? nextQ : q;
    };

    const sanitizedQuestions = (project.questionBank || []).map(sanitizeQuestionHtml);
    const sanitizedAssessments = (project.assessments || []).map(a => {
      if (!Array.isArray(a.questionSnapshots) || a.questionSnapshots.length === 0) return a;
      return {
        ...a,
        questionSnapshots: a.questionSnapshots.map(s => ({
          ...s,
          question: sanitizeQuestionHtml(s.question)
        }))
      };
    });

    if (!changed) return project;
    return {
      ...project,
      coverImage: cleanCover,
      units: sanitizedUnits,
      questionBank: sanitizedQuestions,
      assessments: sanitizedAssessments
    };
  }

  /**
   * Collects all persistent "media/..." relative paths actually referenced in the given project.
   * Ensures exports only include assets belonging to and referenced by the active project.
   */
  getReferencedMediaPaths(project: CourseProject): Set<string> {
    const refs = new Set<string>();
    const extractFromHtml = (html?: string) => {
      if (!html) return;
      const normalized = this.normalizeRichHtmlForStorage(html);
      const matches = normalized.matchAll(/(?:src|href|data-media-path)=["'](media\/[^"']+)["']/gi);
      for (const m of matches) {
        if (m[1]) refs.add(m[1]);
      }
    };

    const extractFromQuestion = (q: any) => {
      if (!q) return;
      extractFromHtml(q.promptHtml);
      extractFromHtml(q.explanationHtml);
      extractFromHtml(q.feedbackCorrectHtml);
      extractFromHtml(q.feedbackPartiallyCorrectHtml);
      extractFromHtml(q.feedbackIncorrectHtml);
    };

    if (project.coverImage && project.coverImage.startsWith('media/')) {
      refs.add(project.coverImage);
    }

    (project.units || []).forEach(unit => {
      (unit.lessons || []).forEach(lesson => {
        (lesson.pages || []).forEach(page => {
          (page.blocks || []).forEach(block => {
            if (block.type === 'text') {
              extractFromHtml((block as TextBlock).content);
            } else if (block.type === 'callout') {
              extractFromHtml((block as CalloutBlock).content);
            } else if (block.type === 'media') {
              const mb = block as MediaBlock;
              const persistent = this.resolvePersistentPath(mb.url);
              if (persistent.startsWith('media/')) {
                refs.add(persistent);
              }
            } else if (block.type === 'resource') {
              const rb = block as ResourceBlock;
              const persistent = this.resolvePersistentPath(rb.relativePath);
              if (persistent.startsWith('media/')) {
                refs.add(persistent);
              }
            }
          });
        });
      });
    });

    (project.questionBank || []).forEach(extractFromQuestion);
    (project.assessments || []).forEach(a => {
      (a.questionSnapshots || []).forEach(s => extractFromQuestion(s.question));
    });

    return refs;
  }

  /**
   * Retrieves registered assets. If project is provided, strictly filters to assets
   * referenced by that project (preventing orphaned or cross-project contamination).
   */
  getAllAssets(project?: CourseProject): { meta: MediaAssetMeta; blob: Blob }[] {
    const referenced = project ? this.getReferencedMediaPaths(project) : null;
    const list: { meta: MediaAssetMeta; blob: Blob }[] = [];
    this.assets.forEach(value => {
      if (!referenced || referenced.has(value.meta.relativePath)) {
        list.push({ meta: value.meta, blob: value.blob });
      }
    });
    return list;
  }

  /**
   * Removes assets in memory and IndexedDB that are no longer referenced anywhere in the project.
   */
  pruneUnreferencedAssets(project: CourseProject): void {
    const referenced = this.getReferencedMediaPaths(project);
    const toRemove: string[] = [];
    this.assets.forEach((_, path) => {
      if (!referenced.has(path)) {
        toRemove.push(path);
      }
    });
    toRemove.forEach(path => this.removeAsset(path));
  }

  /**
   * Clears all in-memory and IndexedDB assets and revokes object URLs.
   */
  clearAll(nextProjectId?: string): void {
    this.assets.forEach(value => {
      if (value.objectUrl) {
        try {
          URL.revokeObjectURL(value.objectUrl);
        } catch (e) {}
      }
    });
    this.assets.clear();
    this.objectUrlToPath.clear();
    if (nextProjectId !== undefined) {
      this.activeProjectId = nextProjectId;
    }
    void this.clearIdb();
    this.notify();
  }
}

function relativePathOrFallback(meta: MediaAssetMeta): string {
  return meta.relativePath;
}

export const MediaService = new MediaServiceManager();
