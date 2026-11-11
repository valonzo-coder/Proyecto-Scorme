import { MediaAssetMeta } from '../types/scorm';

class MediaServiceManager {
  private assets: Map<string, { meta: MediaAssetMeta; blob: Blob; objectUrl: string }> = new Map();

  /**
   * Adds a file uploaded by the user to the in-memory media registry
   * and returns its relative path metadata (e.g., "media/foto-1234.png").
   */
  async addMediaFile(file: File): Promise<MediaAssetMeta> {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const assetId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const relativePath = `media/${assetId}_${cleanName}`;

    const meta: MediaAssetMeta = {
      id: assetId,
      filename: cleanName,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      relativePath
    };

    const objectUrl = (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function')
      ? URL.createObjectURL(file)
      : '';
    this.assets.set(relativePath, { meta, blob: file, objectUrl });

    return meta;
  }

  /**
   * Register a Blob from an unpacked project zip file
   */
  registerUnpackedAsset(meta: MediaAssetMeta, blob: Blob): void {
    const objectUrl = (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function')
      ? URL.createObjectURL(blob)
      : '';
    this.assets.set(meta.relativePath, { meta, blob, objectUrl });
  }

  /**
   * Resolves a media path: if it starts with "media/", returns its active objectUrl.
   * If it's an external URL or data URI, returns it untouched.
   */
  resolveMediaUrl(pathOrUrl?: string): string {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
      return pathOrUrl;
    }
    const item = this.assets.get(pathOrUrl);
    if (item) {
      return item.objectUrl;
    }
    return pathOrUrl;
  }

  /**
   * Retrieves all registered assets to be bundled into the editable ZIP file
   */
  getAllAssets(): { meta: MediaAssetMeta; blob: Blob }[] {
    const list: { meta: MediaAssetMeta; blob: Blob }[] = [];
    this.assets.forEach(value => {
      list.push({ meta: value.meta, blob: value.blob });
    });
    return list;
  }

  /**
   * Clears all in-memory assets and revokes object URLs
   */
  clearAll(): void {
    this.assets.forEach(value => {
      try {
        URL.revokeObjectURL(value.objectUrl);
      } catch (e) {}
    });
    this.assets.clear();
  }
}

export const MediaService = new MediaServiceManager();
