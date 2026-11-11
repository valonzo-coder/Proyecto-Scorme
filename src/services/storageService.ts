import { CourseProject, QuestionItem, AssessmentConfig, SCORMConfig, CourseUnit } from '../types/scorm';

const STORAGE_KEY = 'edubuilder_scorm_projects_v1';
const CURRENT_PROJECT_ID_KEY = 'edubuilder_current_project_id';

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
  },
  {
    id: 'q6',
    type: 'multiple_choice',
    prompt: '¿Qué ventaja principal ofrece el principio de Microaprendizaje (Microlearning)?',
    explanation: 'El microaprendizaje fragmenta el conocimiento en unidades breves y enfocadas (3 a 7 minutos), lo que reduce la sobrecarga cognitiva y facilita la retención.',
    points: 10,
    difficulty: 'Fácil',
    tags: ['Microaprendizaje', 'Metodología'],
    options: [
      { id: 'mc_a', text: 'Reduce la sobrecarga cognitiva con unidades digestibles y focalizadas', isCorrect: true },
      { id: 'mc_b', text: 'Elimina la necesidad de realizar evaluaciones formativas', isCorrect: false },
      { id: 'mc_c', text: 'Garantiza que ningún alumno repruebe sin estudiar', isCorrect: false },
      { id: 'mc_d', text: 'Reemplaza a los docentes por robots sin supervisión', isCorrect: false },
    ]
  }
];

const INITIAL_DEFAULT_PROJECT: CourseProject = {
  id: 'proj-demo-1',
  title: 'Diseño Instruccional Digital y Estándar SCORM',
  description: 'Guía práctica interactiva para planificar unidades didácticas, formular evaluaciones por competencias y exportar paquetes SCORM 1.2 listos para Moodle.',
  category: 'Tecnología Educativa',
  level: 'Intermedio',
  estimatedDuration: '45 min',
  author: 'Prof. Diseñador Instruccional',
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
          blocks: [
            {
              id: 'b-1',
              type: 'text',
              title: '¿Qué es el diseño instruccional?',
              content: '<p class="lead">El diseño instruccional es el proceso sistemático de traducir principios de aprendizaje e instrucción en especificaciones concretas para materiales, actividades, recursos y evaluación.</p><p>A diferencia de la simple digitalización de diapositivas o documentos PDF, un recurso interactivo efectivo fomenta la participación activa del estudiante mediante preguntas intercaladas, reflexiones y retroalimentación inmediata.</p>'
            },
            {
              id: 'b-2',
              type: 'callout',
              variant: 'tip',
              title: 'Regla de Oro en E-learning',
              content: 'Nunca presentes más de tres conceptos nuevos por pantalla. Utiliza tarjetas desplegables, pestañas interactivas o preguntas formativas para mantener la atención activa.'
            },
            {
              id: 'b-3',
              type: 'accordion',
              title: 'Las 5 Fases del Ciclo ADDIE',
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
            },
            {
              id: 'b-4',
              type: 'checkpoint',
              title: 'Comprobación Rápida',
              questionId: 'q1'
            }
          ]
        },
        {
          id: 'les-1-2',
          title: '1.2 Principios de Microaprendizaje y Multimedia',
          summary: 'Aprende a fragmentar contenidos en píldoras formativas de alto impacto cognitivo.',
          estimatedMinutes: 12,
          order: 2,
          blocks: [
            {
              id: 'b-5',
              type: 'text',
              title: 'Teoría de la Carga Cognitiva de Sweller',
              content: '<p>Nuestra memoria de trabajo tiene una capacidad limitada. Al diseñar recursos e-learning, debemos minimizar la <strong>carga cognitiva extrínseca</strong> (distractores, interfaces complejas o textos redundantes) para maximizar la <strong>carga germánica</strong> (construcción de esquemas mentales profundos).</p>'
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
  ],
  questionBank: INITIAL_QUESTIONS,
  assessments: [
    {
      id: 'eval-final',
      title: 'Evaluación Final del Curso',
      description: 'Cuestionario sumativo para validar los conocimientos sobre diseño instruccional y empaquetado SCORM.',
      type: 'final_exam',
      passingScore: 80,
      questionIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
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
    authorName: 'Profesor Creador',
    launchFileName: 'index.html',
    enableApiDebug: true,
    moodleCompatibilityMode: true
  }
};

const SECOND_DEMO_PROJECT: CourseProject = {
  id: 'proj-demo-2',
  title: 'Ciberseguridad y Protección de Datos en Aulas Virtuales',
  description: 'Buenas prácticas para docentes sobre gestión de contraseñas, prevención de phishing y cumplimiento de privacidad de estudiantes.',
  category: 'Seguridad Digital',
  level: 'Principiante',
  estimatedDuration: '30 min',
  author: 'Dpto. de Informática Educativa',
  organization: 'Universidad Virtual',
  createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  updatedAt: new Date(Date.now() - 86400000).toISOString(),
  units: [
    {
      id: 'sec-u1',
      title: 'Unidad 1: Amenazas Comunes en Entornos Educativos',
      description: 'Identificación de correos fraudulentos, enlaces maliciosos y secuestro de sesiones.',
      order: 1,
      lessons: [
        {
          id: 'sec-les-1',
          title: '1.1 Detección Temprana de Phishing',
          summary: 'Aprende a reconocer remitentes falsos y solicitudes sospechosas de credenciales.',
          estimatedMinutes: 10,
          order: 1,
          blocks: [
            {
              id: 'sec-b1',
              type: 'text',
              title: 'Ingeniería Social en el Ámbito Académico',
              content: '<p>Los ciberdelincuentes suelen suplantar la identidad de administradores del campus virtual para engañar a profesores y solicitar claves de acceso.</p>'
            },
            {
              id: 'sec-b2',
              type: 'callout',
              variant: 'warning',
              title: 'Alerta de Seguridad',
              content: 'Ningún administrador de Moodle legítimo te pedirá tu contraseña por correo electrónico o mensaje privado jamás.'
            }
          ]
        }
      ]
    }
  ],
  questionBank: [
    {
      id: 'q-sec-1',
      type: 'true_false',
      prompt: '¿Es seguro reutilizar la misma contraseña del correo institucional en servicios externos de entretenimiento?',
      explanation: 'Falso. Reutilizar contraseñas expone todas tus cuentas si un servicio secundario sufre una brecha de seguridad.',
      points: 10,
      difficulty: 'Fácil',
      tags: ['Ciberseguridad', 'Contraseñas'],
      trueFalseAnswer: false
    }
  ],
  assessments: [
    {
      id: 'sec-exam',
      title: 'Cuestionario de Certificación en Seguridad',
      description: 'Examen de validación de prácticas seguras para educadores.',
      type: 'final_exam',
      passingScore: 70,
      questionIds: ['q-sec-1'],
      maxAttempts: 2,
      shuffleQuestions: false,
      shuffleOptions: true,
      showFeedback: true,
      timeLimitMinutes: 10
    }
  ],
  scormConfig: {
    version: '1.2',
    identifier: 'com.edubuilder.ciberseguridad101',
    title: 'Ciberseguridad en Aulas Virtuales',
    description: 'Curso SCORM sobre seguridad de la información escolar.',
    masteryScore: 70,
    completionCriteria: 'passed_incomplete',
    reportingMode: 'score_and_status',
    exitBehavior: 'suspend',
    organizationName: 'Universidad Virtual',
    authorName: 'Coordinación TIC',
    launchFileName: 'index.html',
    enableApiDebug: true,
    moodleCompatibilityMode: true
  }
};

export class StorageService {
  static getProjects(): CourseProject[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        const initial = [INITIAL_DEFAULT_PROJECT, SECOND_DEMO_PROJECT];
        this.saveProjects(initial);
        return initial;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading projects from localStorage', e);
      return [INITIAL_DEFAULT_PROJECT];
    }
  }

  static saveProjects(projects: CourseProject[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Error saving projects to localStorage', e);
    }
  }

  static getProjectById(id: string): CourseProject | null {
    const projects = this.getProjects();
    return projects.find(p => p.id === id) || null;
  }

  static getCurrentProjectId(): string {
    const saved = localStorage.getItem(CURRENT_PROJECT_ID_KEY);
    if (saved) return saved;
    const projects = this.getProjects();
    const firstId = projects[0]?.id || 'proj-demo-1';
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, firstId);
    return firstId;
  }

  static setCurrentProjectId(id: string): void {
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, id);
  }

  static saveProject(project: CourseProject): void {
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    const updated = {
      ...project,
      updatedAt: new Date().toISOString()
    };
    if (index >= 0) {
      projects[index] = updated;
    } else {
      projects.unshift(updated);
    }
    this.saveProjects(projects);
  }

  static deleteProject(id: string): boolean {
    const projects = this.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    if (filtered.length === projects.length) return false;
    this.saveProjects(filtered);
    if (this.getCurrentProjectId() === id) {
      if (filtered.length > 0) {
        this.setCurrentProjectId(filtered[0].id);
      }
    }
    return true;
  }

  static duplicateProject(id: string): CourseProject | null {
    const project = this.getProjectById(id);
    if (!project) return null;
    const newId = `proj-${Date.now()}`;
    const duplicate: CourseProject = {
      ...JSON.parse(JSON.stringify(project)),
      id: newId,
      title: `${project.title} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scormConfig: {
        ...project.scormConfig,
        identifier: `${project.scormConfig.identifier}.copy.${Date.now().toString().slice(-4)}`,
        title: `${project.title} (Copia)`
      }
    };
    this.saveProject(duplicate);
    return duplicate;
  }

  static createNewProject(title: string, description: string, category: string, level: 'Principiante' | 'Intermedio' | 'Avanzado'): CourseProject {
    const id = `proj-${Date.now()}`;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'nuevo-curso';
    
    const newProject: CourseProject = {
      id,
      title,
      description,
      category: category || 'General',
      level,
      estimatedDuration: '30 min',
      author: 'Docente Autor',
      organization: 'Mi Institución Educativa',
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
      ],
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
        description,
        masteryScore: 75,
        completionCriteria: 'passed_incomplete',
        reportingMode: 'score_and_status',
        exitBehavior: 'suspend',
        organizationName: 'Mi Institución Educativa',
        authorName: 'Docente Autor',
        launchFileName: 'index.html',
        enableApiDebug: true,
        moodleCompatibilityMode: true
      }
    };

    this.saveProject(newProject);
    this.setCurrentProjectId(id);
    return newProject;
  }
}
