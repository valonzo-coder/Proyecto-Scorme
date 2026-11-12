import { CourseProject, QuestionItem, ProjectSyncStatus } from '../types/scorm';
import { MediaService } from './mediaService';
import { NavigationService, DEFAULT_LESSON_NAV_CONFIG } from './navigationService';
import { CategoryService } from './categoryService';

const SESSION_KEY = 'edubuilder_active_project_session';
const STATUS_KEY = 'edubuilder_active_project_status';
const LAST_DOWNLOAD_KEY = 'edubuilder_last_downloaded_at';

const INITIAL_QUESTIONS: QuestionItem[] = [
  {
    id: 'q1',
    type: 'multiple_choice',
    prompt: '¿Cuál de las siguientes fases NO pertenece al modelo tradicional ADDIE de diseño instruccional?',
    explanation: 'El modelo ADDIE consta de: Análisis, Diseño, Desarrollo, Implementación y Evaluación. La "Delegación" no forma parte de este ciclo.',
    points: 10,
    difficulty: 'Fácil',
    tags: ['Diseño Instruccional', 'ADDIE', 'Fundamentos'],
    options: [
      { id: 'opt1', text: 'Análisis (Analysis)', isCorrect: false },
      { id: 'opt2', text: 'Delegación (Delegation)', isCorrect: true },
      { id: 'opt3', text: 'Desarrollo (Development)', isCorrect: false },
      { id: 'opt4', text: 'Evaluación (Evaluation)', isCorrect: false },
    ]
  },
  {
    id: 'q2',
    type: 'true_false',
    prompt: 'En el estándar SCORM 1.2, el valor "cmi.core.lesson_status" puede configurarse como "passed", "completed", "failed" o "incomplete".',
    explanation: 'Verdadero. Estos cuatro valores junto con "browsed" y "not attempted" definen los estados canónicos de lección en el modelo CMI de SCORM 1.2.',
    points: 10,
    difficulty: 'Medio',
    tags: ['SCORM', 'LMS', 'Moodle'],
    trueFalseAnswer: true,
  },
  {
    id: 'q3',
    type: 'multiple_response',
    prompt: '¿Cuáles de los siguientes elementos son indispensables dentro de un paquete SCORM válido para Moodle?',
    explanation: 'Un paquete SCORM debe incluir un archivo de manifiesto imsmanifest.xml y al menos un recurso ejecutable (SCO) como index.html con comunicación JavaScript al API del LMS.',
    points: 15,
    difficulty: 'Medio',
    tags: ['SCORM', 'Empaquetado', 'Moodle'],
    options: [
      { id: 'mr1', text: 'Archivo manifestador imsmanifest.xml en la raíz del ZIP', isCorrect: true },
      { id: 'mr2', text: 'Recurso principal ejecutable (index.html u otro lanzador)', isCorrect: true },
      { id: 'mr3', text: 'Servidor MySQL compilado dentro del archivo ZIP', isCorrect: false },
      { id: 'mr4', text: 'Librería o API Wrapper para comunicar estado al LMS', isCorrect: true },
    ]
  },
  {
    id: 'q4',
    type: 'fill_blank',
    prompt: 'El archivo XML obligatorio en la raíz de todo paquete SCORM que define la estructura y recursos se denomina _______.xml',
    explanation: 'El archivo estándar de manifiesto IMS se llama imsmanifest.xml.',
    points: 10,
    difficulty: 'Fácil',
    tags: ['SCORM', 'Estándares'],
    blankAnswer: 'imsmanifest'
  },
  {
    id: 'q5',
    type: 'matching',
    prompt: 'Relaciona cada nivel de la Taxonomía de Bloom con la acción representativa:',
    explanation: 'Recordar se asocia a memorizar datos; Analizar a descomponer y comparar; Crear a producir soluciones o diseños nuevos.',
    points: 15,
    difficulty: 'Difícil',
    tags: ['Pedagogía', 'Bloom', 'Evaluación'],
    matchingPairs: [
      { id: 'm1', left: 'Recordar', right: 'Listar términos clave y definiciones' },
      { id: 'm2', left: 'Analizar', right: 'Diferenciar componentes y detectar patrones' },
      { id: 'm3', left: 'Crear', right: 'Diseñar un plan o recurso didáctico original' },
    ]
  }
];

export const INITIAL_DEFAULT_PROJECT: CourseProject = {
  id: 'edubuilder-course-1',
  title: 'Diseño Instruccional Digital y Estándar SCORM',
  description: 'Guía práctica interactiva para planificar unidades didácticas, formular evaluaciones por competencias y exportar paquetes SCORM 1.2 listos para Moodle.',
  category: 'Tecnología Educativa',
  level: 'Intermedio',
  estimatedDuration: '45 min',
  author: 'Profesor Diseñador Instruccional',
  organization: 'Centro de Innovación Docente',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  units: [
    {
      id: 'unit-1',
      title: 'Unidad 1: Fundamentos del Diseño Instruccional',
      description: 'Principios pedagógicos clave, modelos ADDIE y diseño centrado en el participante.',
      order: 1,
      lessons: [
        {
          id: 'les-1-1',
          title: '1.1 Introducción al Modelo ADDIE',
          summary: 'Descubre las cinco etapas sistemáticas para construir experiencias de aprendizaje efectivas.',
          estimatedMinutes: 10,
          order: 1,
          navigationConfig: {
            mode: 'sequential',
            allowBack: true,
            allowSkip: false,
            showPageIndex: true,
            requireCompletionToAdvance: true
          },
          pages: [
            {
              id: 'page-1-1-1',
              title: '1. Definición y Matriz de Fases',
              order: 1,
              navigationRule: { type: 'button' },
              blocks: [
                {
                  id: 'b-1',
                  type: 'text',
                  title: '¿Qué es el diseño instruccional y cómo se estructura?',
                  content: '<p class="lead">El diseño instruccional es el proceso sistemático de traducir principios de aprendizaje en recursos formativos altamente efectivos. Permite calcular el impacto formativo mediante métricas como $\\eta = \\frac{E_{final} - E_{inicial}}{E_{max}} \\times 100\\%$.</p><h3>Matriz de Fases Principales</h3><table class="border-collapse border border-slate-300 w-full my-3"><thead><tr class="bg-slate-100"><th class="border border-slate-300 p-2">Fase</th><th class="border border-slate-300 p-2">Entregable Clave</th><th class="border border-slate-300 p-2">Foco Pedagógico</th></tr></thead><tbody><tr><td class="border border-slate-300 p-2 font-bold">Análisis</td><td class="border border-slate-300 p-2">Perfil de audiencia</td><td class="border border-slate-300 p-2">Diagnóstico de necesidades</td></tr><tr><td class="border border-slate-300 p-2 font-bold">Diseño</td><td class="border border-slate-300 p-2">Matriz de competencias</td><td class="border border-slate-300 p-2">Taxonomía de Bloom</td></tr><tr><td class="border border-slate-300 p-2 font-bold">Desarrollo</td><td class="border border-slate-300 p-2">Paquete SCORM interactivo</td><td class="border border-slate-300 p-2">Microaprendizaje y práctica</td></tr></tbody></table><p>A diferencia de la simple digitalización de diapositivas estáticas, un recurso e-learning profesional fomenta la participación activa del estudiante.</p>'
                },
                {
                  id: 'b-2',
                  type: 'callout',
                  variant: 'definition',
                  title: 'Definición de Objeto de Aprendizaje',
                  content: 'Entidad digital educativa autocontenida y reutilizable, diseñada con un objetivo instruccional específico, actividades de aplicación y mecanismos de evaluación formativa inmediata.'
                }
              ]
            },
            {
              id: 'page-1-1-2',
              title: '2. Las 5 Etapas del Ciclo ADDIE',
              order: 2,
              navigationRule: {
                type: 'interaction',
                targetBlockId: 'b-3',
                interactionCriteria: 'specific_count',
                requiredCount: 2
              },
              blocks: [
                {
                  id: 'b-3',
                  type: 'accordion',
                  title: 'Explora las 5 Fases del Ciclo ADDIE (abre al menos 2 para continuar)',
                  items: [
                    {
                      id: 'acc-1',
                      title: '1. Análisis (Analysis)',
                      content: 'Identifica el perfil de tus estudiantes, sus conocimientos previos, brechas de desempeño y el contexto tecnológico donde cursarán la lección.'
                    },
                    {
                      id: 'acc-2',
                      title: '2. Diseño (Design)',
                      content: 'Define objetivos de aprendizaje medibles con la taxonomía de Bloom, la estructura de unidades y la estrategia de evaluación formativa y sumativa.'
                    },
                    {
                      id: 'acc-3',
                      title: '3. Desarrollo (Development)',
                      content: 'Redacción de contenidos, creación de guiones multimedia, elaboración de actividades interactivas y ensamblado del paquete SCORM.'
                    },
                    {
                      id: 'acc-4',
                      title: '4. Implementación (Implementation)',
                      content: 'Publicación en el LMS (Moodle, Blackboard, Canvas) y puesta a disposición de los alumnos verificando el registro de calificaciones.'
                    },
                    {
                      id: 'acc-5',
                      title: '5. Evaluación (Evaluation)',
                      content: 'Monitoreo de métricas formativas, tasa de finalización y análisis de preguntas problemáticas para la mejora continua.'
                    }
                  ]
                }
              ]
            },
            {
              id: 'page-1-1-3',
              title: '3. Comprobación de Aprendizaje',
              order: 3,
              navigationRule: {
                type: 'question',
                questionId: 'q1',
                questionCriteria: 'correct',
                maxAttempts: 0,
                allowRetry: true,
                showFeedback: true
              },
              blocks: [
                {
                  id: 'b-4',
                  type: 'checkpoint',
                  title: 'Comprobación Rápida',
                  questionId: 'q1'
                }
              ]
            }
          ]
        },
        {
          id: 'les-1-2',
          title: '1.2 Principios de Microaprendizaje y Multimedia',
          summary: 'Aprende a fragmentar contenidos en píldoras formativas de alto impacto cognitivo.',
          estimatedMinutes: 12,
          order: 2,
          navigationConfig: {
            mode: 'free',
            allowBack: true,
            allowSkip: true,
            showPageIndex: true,
            requireCompletionToAdvance: false
          },
          pages: [
            {
              id: 'page-1-2-1',
              title: '1. Carga Cognitiva y Tarjetas de Mayer',
              order: 1,
              navigationRule: {
                type: 'interaction',
                targetBlockId: 'b-6',
                interactionCriteria: 'all_items'
              },
              blocks: [
                {
                  id: 'b-5',
                  type: 'text',
                  title: 'Teoría de la Carga Cognitiva de Sweller',
                  content: '<p>Nuestra memoria de trabajo tiene una capacidad limitada. Al diseñar recursos e-learning, debemos minimizar la <strong>carga cognitiva extrínseca</strong> (distractores o interfaces complejas) para maximizar la <strong>carga germánica</strong> (construcción de esquemas mentales profundos).</p>'
                },
                {
                  id: 'b-6',
                  type: 'flashcards',
                  title: 'Tarjetas de Repaso: Principios de Mayer',
                  cards: [
                    {
                      id: 'fc-1',
                      front: 'Principio de Señalización',
                      back: 'Los estudiantes aprenden mejor cuando se añaden pistas visuales que dirigen la atención hacia los puntos centrales.',
                      hint: 'Guía la mirada del estudiante'
                    },
                    {
                      id: 'fc-2',
                      front: 'Principio de Modalidad',
                      back: 'Es preferible combinar imágenes con narración hablada antes que con texto escrito saturado en pantalla.',
                      hint: 'Canal auditivo + visual'
                    },
                    {
                      id: 'fc-3',
                      front: 'Principio de Segmentación',
                      back: 'El aprendizaje aumenta cuando el contenido se presenta en fragmentos controlados por el usuario en lugar de un flujo continuo.',
                      hint: 'Control del ritmo por el alumno'
                    }
                  ]
                },
                {
                  id: 'b-7',
                  type: 'callout',
                  variant: 'info',
                  title: 'Buenas prácticas para Moodle',
                  content: 'Procura que cada lección SCORM tome entre 5 y 15 minutos en completarse. Esto permite que los estudiantes avancen en sus tiempos libres y favorece la retención a largo plazo.'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'unit-2',
      title: 'Unidad 2: El Estándar SCORM y Compatibilidad con Moodle',
      description: 'Estructura interna de un paquete SCORM, el modelo de datos CMI y comunicación bidireccional con el LMS.',
      order: 2,
      lessons: [
        {
          id: 'les-2-1',
          title: '2.1 Anatomía de un Paquete SCORM',
          summary: 'Comprende qué contiene el archivo .zip que importas a tu aula virtual Moodle.',
          estimatedMinutes: 15,
          order: 1,
          navigationConfig: { ...DEFAULT_LESSON_NAV_CONFIG },
          pages: [
            {
              id: 'page-2-1-1',
              title: '1. Estructura Interna del Paquete',
              order: 1,
              navigationRule: { type: 'button' },
              blocks: [
                {
                  id: 'b-8',
                  type: 'text',
                  title: '¿Qué es SCORM?',
                  content: '<p><strong>SCORM</strong> (Sharable Content Object Reference Model) es una especificación técnica de ADL que define cómo crear objetos de aprendizaje interoperables que pueden reutilizarse en cualquier plataforma de aprendizaje virtual (LMS).</p>'
                },
                {
                  id: 'b-9',
                  type: 'tabs',
                  title: 'Componentes Clave de un Paquete SCORM',
                  tabs: [
                    {
                      id: 'tab-1',
                      label: 'imsmanifest.xml',
                      content: 'Es el cerebro del paquete. Contiene los metadatos del curso, la estructura jerárquica de unidades y lecciones, y el listado de todos los archivos físicos que componen el recurso.'
                    },
                    {
                      id: 'tab-2',
                      label: 'API Adapter',
                      content: 'Es el puente JavaScript provisto por Moodle (window.API). El curso busca este objeto en los marcos superiores para enviar datos de progreso, puntuaciones y tiempo.'
                    },
                    {
                      id: 'tab-3',
                      label: 'Modelo CMI',
                      content: 'Conjunto estandarizado de variables de datos como cmi.core.lesson_status (completado/reprobado), cmi.core.score.raw (calificación numérica) y cmi.suspend_data (marcador para retomar).'
                    }
                  ]
                },
                {
                  id: 'b-10',
                  type: 'callout',
                  variant: 'warning',
                  title: 'Cuidado al Comprimir el ZIP',
                  content: 'El archivo imsmanifest.xml DEBE encontrarse estrictamente en la raíz del archivo ZIP descargado. Si se comprime dentro de una carpeta padre, Moodle rechazará el paquete con error de manifiesto no encontrado.'
                }
              ]
            },
            {
              id: 'page-2-1-2',
              title: '2. Modelo de Puntuación y Verificación',
              order: 2,
              navigationRule: {
                type: 'question',
                questionId: 'q2',
                questionCriteria: 'answered',
                showFeedback: true,
                allowRetry: true
              },
              blocks: [
                {
                  id: 'b-math-1',
                  type: 'math',
                  title: 'Modelo Matemático de Puntuación Ponderada SCORM',
                  latex: 'S_{final} = \\frac{\\sum_{j=1}^{m} w_j \\cdot s_j}{\\sum_{j=1}^{m} w_j} \\times 100\\%',
                  caption: 'Cálculo del puntaje maestro estandarizado cmi.core.score.raw transferido a la libreta de calificaciones de Moodle',
                  displayMode: true
                },
                {
                  id: 'b-example-1',
                  type: 'callout',
                  variant: 'example',
                  title: 'Ejemplo de Calificación Normalizada',
                  content: 'Si una actividad formativa pondera $w_1 = 0.4$ con puntaje $s_1 = 85$ y la evaluación sumativa $w_2 = 0.6$ con $s_2 = 90$, el LMS registrará un valor final de $88\\%$ cumpliendo el criterio de aprobación fijado en $80\\%$.'
                },
                {
                  id: 'b-11',
                  type: 'checkpoint',
                  title: 'Verificación de Conceptos',
                  questionId: 'q2'
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  questionCategories: [CategoryService.createDefaultCategory()],
  questionBank: INITIAL_QUESTIONS,
  assessments: [
    {
      id: 'eval-final',
      title: 'Evaluación Final del Curso',
      description: 'Cuestionario sumativo para validar los conocimientos sobre diseño instruccional y empaquetado SCORM.',
      type: 'final_exam',
      passingScore: 80,
      questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
      maxAttempts: 3,
      shuffleQuestions: true,
      shuffleOptions: true,
      showFeedback: true,
      timeLimitMinutes: 15
    }
  ],
  scormConfig: {
    version: '1.2',
    identifier: 'com.edubuilder.scorm.curso101',
    title: 'Diseño Instruccional Digital y Estándar SCORM',
    description: 'Recurso educativo interactivo autocontenido compatible con Moodle LMS.',
    masteryScore: 80,
    completionCriteria: 'passed_incomplete',
    reportingMode: 'score_and_status',
    exitBehavior: 'suspend',
    organizationName: 'EduBuilder Learning Academy',
    authorName: 'Profesor Diseñador Instruccional',
    launchFileName: 'index.html',
    enableApiDebug: true,
    moodleCompatibilityMode: true
  }
};

export class StorageService {
  /**
   * Retrieves the single active project.
   * If a session exists in browser memory, restores it. Otherwise, returns initial starter template.
   */
  static getActiveProject(): { project: CourseProject; status: ProjectSyncStatus; lastDownloaded: string | null } {
    try {
      const data = sessionStorage.getItem(SESSION_KEY);
      const savedStatus = (sessionStorage.getItem(STATUS_KEY) as ProjectSyncStatus) || 'fresh';
      const lastDownloaded = sessionStorage.getItem(LAST_DOWNLOAD_KEY);

      if (data) {
        const parsed = NavigationService.migrateAndNormalizeProject(JSON.parse(data));
        return {
          project: MediaService.sanitizeProjectMediaReferences(parsed),
          status: savedStatus,
          lastDownloaded
        };
      }
    } catch (e) {
      console.error('Error recovering active project from session', e);
    }

    return {
      project: NavigationService.migrateAndNormalizeProject(INITIAL_DEFAULT_PROJECT),
      status: 'fresh',
      lastDownloaded: null
    };
  }

  /**
   * Saves updates to the active in-memory session and marks it as modified (pending download).
   */
  static saveActiveProject(project: CourseProject, markAsModified: boolean = true): void {
    try {
      const cleanProject = MediaService.sanitizeProjectMediaReferences(project);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(cleanProject));
      if (markAsModified) {
        sessionStorage.setItem(STATUS_KEY, 'modified');
      }
    } catch (e) {
      console.error('Error updating active project in session', e);
    }
  }

  /**
   * Called when the user loads a project from a file.
   */
  static setLoadedProject(project: CourseProject): void {
    const cleanProject = MediaService.sanitizeProjectMediaReferences(project);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(cleanProject));
      sessionStorage.setItem(STATUS_KEY, 'loaded');
      sessionStorage.removeItem(LAST_DOWNLOAD_KEY);
    }
  }

  /**
   * Called when the user downloads the editable project file.
   */
  static setProjectDownloaded(): void {
    const timestamp = new Date().toLocaleTimeString();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STATUS_KEY, 'saved');
      sessionStorage.setItem(LAST_DOWNLOAD_KEY, timestamp);
    }
  }

  /**
   * Creates a new blank project from scratch.
   */
  static createNewProject(
    title: string, 
    description: string, 
    author: string, 
    organization: string, 
    category: string = 'General',
    level: 'Principiante' | 'Intermedio' | 'Avanzado' = 'Intermedio'
  ): CourseProject {
    const projectId = `proj-${Date.now()}`;
    MediaService.clearAll(projectId);

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'nuevo-curso';

    const newProject: CourseProject = {
      id: projectId,
      title,
      description: description || 'Recurso educativo interactivo estructurado en unidades y lecciones.',
      category: category || 'General',
      level,
      estimatedDuration: '30 min',
      author: author || 'Docente Autor',
      organization: organization || 'Mi Institución Educativa',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      units: [
        {
          id: `u-${Date.now()}-1`,
          title: 'Unidad 1: Introducción y Objetivos',
          description: 'Panorama general de la materia y expectativas de aprendizaje.',
          order: 1,
          lessons: [
            {
              id: `les-${Date.now()}-1`,
              title: '1.1 Bienvenida y Conceptos Iniciales',
              summary: 'Conoce los temas fundamentales que abordaremos a lo largo de este curso.',
              estimatedMinutes: 10,
              order: 1,
              navigationConfig: { ...DEFAULT_LESSON_NAV_CONFIG },
              pages: [
                {
                  id: `page-${Date.now()}-1`,
                  title: 'Página 1: Introducción',
                  order: 1,
                  navigationRule: { type: 'button' },
                  blocks: [
                    {
                      id: `b-${Date.now()}-1`,
                      type: 'text',
                      title: '¡Te damos la bienvenida al curso!',
                      content: '<p>Este recurso interactivo ha sido diseñado para guiarte paso a paso en el dominio de las competencias clave.</p>'
                    },
                    {
                      id: `b-${Date.now()}-2`,
                      type: 'callout',
                      variant: 'info',
                      title: 'Objetivo de Aprendizaje',
                      content: 'Al finalizar esta lección, serás capaz de identificar los componentes esenciales de la temática propuesta.'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      questionCategories: [CategoryService.createDefaultCategory()],
      questionBank: [],
      assessments: [
        {
          id: `eval-${Date.now()}`,
          title: 'Evaluación de Cierre',
          description: 'Cuestionario de validación de conocimientos adquiridos.',
          type: 'final_exam',
          passingScore: 75,
          questionIds: [],
          maxAttempts: 3,
          shuffleQuestions: true,
          shuffleOptions: true,
          showFeedback: true,
          timeLimitMinutes: 20
        }
      ],
      scormConfig: {
        version: '1.2',
        identifier: `com.edubuilder.${slug}`,
        title,
        description: description || '',
        masteryScore: 75,
        completionCriteria: 'passed_incomplete',
        reportingMode: 'score_and_status',
        exitBehavior: 'suspend',
        organizationName: organization || 'Mi Institución Educativa',
        authorName: author || 'Docente Autor',
        launchFileName: 'index.html',
        enableApiDebug: true,
        moodleCompatibilityMode: true
      }
    };

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(newProject));
      sessionStorage.setItem(STATUS_KEY, 'fresh');
      sessionStorage.removeItem(LAST_DOWNLOAD_KEY);
    }

    return newProject;
  }
}
