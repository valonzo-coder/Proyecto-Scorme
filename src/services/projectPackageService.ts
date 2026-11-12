import JSZip from 'jszip';
import { 
  CourseProject, 
  EduBuilderProjectManifest, 
  EDUBUILDER_FILE_FORMAT, 
  EDUBUILDER_FORMAT_VERSION, 
  MediaAssetMeta 
} from '../types/scorm';
import { MediaService } from './mediaService';
import { NavigationService } from './navigationService';

export interface ImportResult {
  project: CourseProject;
  mediaCount: number;
}

export class ProjectPackageService {
  /**
   * Generates a downloadable editable project package (.zip or .edubuilder).
   * Contains project.json (versioned format) and a media/ folder with all embedded assets.
   */
  static async exportEditableProject(rawProject: CourseProject): Promise<Blob> {
    const zip = new JSZip();

    // 1. Normalize & sanitize media references so no ephemeral blob: URLs are ever saved
    const project = MediaService.sanitizeProjectMediaReferences(
      NavigationService.migrateAndNormalizeProject(rawProject)
    );

    // 2. Gather ONLY media assets referenced by this active project
    const mediaItems = MediaService.getAllAssets(project);
    const mediaManifest: MediaAssetMeta[] = mediaItems.map(item => item.meta);

    // 3. Build the versioned manifest
    const manifest: EduBuilderProjectManifest = {
      format: EDUBUILDER_FILE_FORMAT,
      formatVersion: EDUBUILDER_FORMAT_VERSION,
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      project: {
        ...project,
        updatedAt: new Date().toISOString()
      },
      mediaAssets: mediaManifest
    };

    // 4. Write project.json to root of ZIP
    zip.file('project.json', JSON.stringify(manifest, null, 2));

    // 5. Write all media assets to their exact relativePath (media/imagenes/..., media/audio/..., etc.)
    for (const item of mediaItems) {
      zip.file(item.meta.relativePath, item.blob);
    }

    // 5. Friendly README
    const readmeContent = `========================================================================
ARCHIVO DE PROYECTO EDITABLE - EDUBUILDER SCORM
========================================================================
Proyecto: ${project.title}
Autor: ${project.author}
Formato: ${EDUBUILDER_FILE_FORMAT} v${EDUBUILDER_FORMAT_VERSION}
Fecha de exportación: ${manifest.exportedAt}

AVISO IMPORTANTE:
Este archivo es un proyecto de trabajo editable para EduBuilder SCORM.
Para continuar editando este curso:
1. Abre la aplicación EduBuilder SCORM en tu navegador.
2. Haz clic en "Cargar Proyecto" y selecciona este archivo .zip.
3. Todo el contenido, lecciones, evaluaciones y recursos multimedia se
   restaurarán exactamente como los dejaste.

NOTA: Si lo que deseas es subir este curso a Moodle LMS, utiliza la opción
"Exportar Paquete SCORM" dentro de EduBuilder SCORM, la cual genera un
paquete SCORM con imsmanifest.xml conforme a los estándares ADL.
========================================================================`;
    zip.file('README_PROYECTO.txt', readmeContent);

    // 6. Generate ZIP blob
    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });
  }

  /**
   * Imports and validates an editable project package.
   * Restores project structure and in-memory media assets.
   */
  static async importEditableProject(file: File | Blob): Promise<ImportResult> {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch (err) {
      throw new Error('El archivo seleccionado no es un archivo comprimido (.zip) válido o está dañado.');
    }

    // 1. Locate project.json
    let projectJsonFile = zip.file('project.json');
    if (!projectJsonFile) {
      // Check alternative name if user renamed
      projectJsonFile = zip.file('edubuilder.project.json');
    }

    if (!projectJsonFile) {
      throw new Error(
        'El archivo no corresponde a un proyecto de EduBuilder SCORM. Falta el archivo obligatorio "project.json" en la raíz del paquete.'
      );
    }

    // 2. Read and parse manifest
    let manifest: any;
    try {
      const jsonText = await projectJsonFile.async('string');
      manifest = JSON.parse(jsonText);
    } catch (err) {
      throw new Error('El archivo "project.json" está dañado o no contiene un formato JSON legible.');
    }

    // 3. Validate format signature
    if (manifest.format !== EDUBUILDER_FILE_FORMAT) {
      // Legacy fallback check: if it has units and title directly
      if (manifest.title && Array.isArray(manifest.units)) {
        manifest = {
          format: EDUBUILDER_FILE_FORMAT,
          formatVersion: '1.0.0',
          project: manifest,
          mediaAssets: []
        };
      } else {
        throw new Error(
          `Formato de archivo no reconocido. Se esperaba "${EDUBUILDER_FILE_FORMAT}", pero se encontró "${manifest.format || 'desconocido'}".`
        );
      }
    }

    // 4. Validate version compatibility
    if (manifest.formatVersion && !manifest.formatVersion.startsWith('1.')) {
      throw new Error(
        `La versión del proyecto (${manifest.formatVersion}) no es compatible con esta versión de EduBuilder SCORM (v1.x).`
      );
    }

    const project: CourseProject = manifest.project;
    if (!project || !project.title || !Array.isArray(project.units)) {
      throw new Error('La estructura interna del curso es inválida o carece de unidades didácticas.');
    }

    // Ensure SCORM config exists
    if (!project.scormConfig) {
      project.scormConfig = {
        version: '1.2',
        identifier: `com.edubuilder.imported.${Date.now()}`,
        title: project.title,
        description: project.description || '',
        masteryScore: 80,
        completionCriteria: 'passed_incomplete',
        reportingMode: 'score_and_status',
        exitBehavior: 'suspend',
        organizationName: project.organization || 'Mi Institución',
        authorName: project.author || 'Docente',
        launchFileName: 'index.html',
        enableApiDebug: true,
        moodleCompatibilityMode: true
      };
    }

    if (!Array.isArray(project.questionBank)) {
      project.questionBank = [];
    }

    if (!Array.isArray(project.assessments)) {
      project.assessments = [];
    }

    // 5. Ensure project ID exists & restore Media Assets strictly scoped to this project
    if (!project.id) {
      project.id = `proj-${Date.now()}`;
    }
    MediaService.clearAll(project.id);
    let mediaCount = 0;
    const mediaAssets: MediaAssetMeta[] = Array.isArray(manifest.mediaAssets) ? manifest.mediaAssets : [];

    for (const asset of mediaAssets) {
      const fileInZip = zip.file(asset.relativePath);
      if (fileInZip) {
        try {
          const buffer = await fileInZip.async('arraybuffer');
          const blob = new Blob([buffer], { type: asset.mimeType || 'application/octet-stream' });
          MediaService.registerUnpackedAsset(asset, blob, project.id);
          mediaCount++;
        } catch (mediaErr) {
          console.warn(`No se pudo cargar el recurso multimedia: ${asset.relativePath}`, mediaErr);
        }
      }
    }

    const migratedProject = MediaService.sanitizeProjectMediaReferences(
      NavigationService.migrateAndNormalizeProject(project)
    );

    return {
      project: migratedProject,
      mediaCount
    };
  }
}
