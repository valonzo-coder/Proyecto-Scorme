# EduBuilder SCORM

### Plataforma de creación de recursos educativos interactivos y exportación a SCORM 1.2

EduBuilder SCORM es una aplicación web diseñada para facilitar a docentes y profesionales de la educación la creación, edición y organización de recursos de aprendizaje interactivos, permitiendo exportarlos en formato **SCORM 1.2** para su utilización en plataformas de gestión del aprendizaje (LMS), como Moodle.

El proyecto busca ofrecer una herramienta intuitiva, flexible y accesible que permita diseñar experiencias de aprendizaje digitales sin necesidad de conocimientos avanzados de programación.

---

## 🎯 Objetivo del proyecto

Desarrollar una herramienta que permita a los docentes crear recursos educativos digitales estructurados, incorporar contenidos multimedia, diseñar actividades y evaluaciones interactivas y generar paquetes SCORM compatibles con plataformas LMS.

EduBuilder SCORM busca simplificar el proceso de producción de contenidos digitales, entregando autonomía al docente y facilitando la reutilización de materiales educativos.

## ✨ Características principales

### 1. Gestión de proyectos educativos

- Creación y edición de proyectos.
- Organización jerárquica del contenido.
- Estructuración mediante unidades, lecciones y páginas.
- Gestión de múltiples bloques de contenido.
- Guardado y recuperación de proyectos.
- Importación y exportación de proyectos editables.
- Almacenamiento local de los proyectos.

### 2. Editor de contenidos

Editor enriquecido para diseñar materiales educativos mediante diferentes recursos:

- Texto enriquecido.
- Títulos y subtítulos.
- Negrita, cursiva, subrayado y tachado.
- Listas ordenadas y desordenadas.
- Tablas.
- Imágenes.
- Videos y audios.
- Enlaces.
- Bloques destacados.
- Fórmulas matemáticas mediante LaTeX y KaTeX.
- Opciones de formato y alineación.

### 3. Navegación y estructura pedagógica

- Organización de contenidos por páginas.
- Navegación entre páginas mediante controles anterior y siguiente.
- Indicadores de progreso.
- Índice de navegación.
- Navegación secuencial o libre.
- Configuración de condiciones para avanzar.
- Visualización previa de la experiencia del estudiante.

### 4. Banco de preguntas

Desarrollo de un repositorio de preguntas reutilizables para la construcción de actividades y evaluaciones.

La arquitectura contempla:

- Organización por categorías y subcategorías.
- Clasificación por tipo de pregunta.
- Búsqueda y filtrado.
- Importación de preguntas desde Moodle XML.
- Reutilización de preguntas en evaluaciones.

### 5. Preguntas y evaluaciones

El proyecto contempla la incorporación de distintos tipos de preguntas interactivas, incluyendo:

- Selección única.
- Selección múltiple.
- Verdadero o falso.
- Respuesta corta.
- Respuesta numérica.
- Emparejamiento.
- Preguntas de desarrollo.
- Descripción.
- Preguntas Cloze o de respuestas incrustadas.

Se busca desarrollar compatibilidad con el formato Cloze de Moodle, incluyendo sus variantes de respuesta corta, numérica, selección única y selección múltiple, así como sus distintas modalidades de presentación.

### 6. Exportación SCORM

Generación de paquetes educativos para su utilización en plataformas LMS.

Objetivos de compatibilidad:

- SCORM 1.2.
- Generación del archivo `imsmanifest.xml`.
- Registro del progreso del estudiante.
- Recuperación de la última ubicación.
- Almacenamiento del estado de la actividad.
- Registro de puntuaciones.
- Finalización de actividades.
- Descarga del paquete SCORM en formato ZIP.

### 7. Vista del estudiante

Permite revisar cómo se visualizará el recurso educativo una vez publicado.

Incluye la navegación por los contenidos, visualización de recursos multimedia, interacción con actividades y seguimiento del progreso.

---

## 🛠️ Tecnologías utilizadas

El proyecto utiliza tecnologías web modernas:

| Tecnología | Utilización |
|---|---|
| React | Construcción de la interfaz de usuario |
| TypeScript | Desarrollo con tipado estático |
| Vite | Entorno de desarrollo y compilación |
| Tiptap | Editor de contenidos enriquecidos |
| KaTeX | Representación de expresiones matemáticas |
| JSZip | Creación y manipulación de archivos ZIP |
| SCORM 1.2 | Estándar de exportación de contenidos educativos |

---

## 🚀 Instalación y ejecución

### Requisitos previos

- Node.js.
- npm.
- Git.

### 1. Clonar el repositorio

```bash
git clone https://github.com/valonzo-coder/Proyecto-Scorme.git
```

### 2. Ingresar al directorio

```bash
cd Proyecto-Scorme
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Ejecutar en modo desarrollo

```bash
npm run dev
```

Vite mostrará en la terminal la dirección local para acceder a la aplicación desde el navegador.

### 5. Generar versión de producción

```bash
npm run build
```

Los archivos compilados se generarán en el directorio `dist`, según la configuración del proyecto.

---

## 📦 Flujo de trabajo

El funcionamiento general de EduBuilder SCORM considera el siguiente proceso:

1. **Crear un proyecto:** definir el recurso educativo.
2. **Organizar el contenido:** estructurar unidades, lecciones y páginas.
3. **Diseñar el material:** incorporar texto, imágenes, multimedia y fórmulas.
4. **Agregar actividades:** incorporar preguntas y evaluaciones.
5. **Configurar navegación:** definir las condiciones de avance.
6. **Previsualizar:** revisar la experiencia del estudiante.
7. **Exportar:** generar el paquete SCORM.
8. **Publicar:** cargar el paquete ZIP en una plataforma LMS compatible.

---

## 📚 Compatibilidad con Moodle

Uno de los objetivos centrales del proyecto es facilitar la integración con Moodle.

La aplicación busca ofrecer dos vías de utilización:

- **Importación Moodle XML:** incorporar preguntas existentes al banco de preguntas.
- **Exportación SCORM 1.2:** publicar recursos educativos interactivos como paquetes SCORM.

La compatibilidad de cada tipo de pregunta y funcionalidad debe validarse mediante pruebas de importación, reproducción y evaluación en Moodle.

---

## 💾 Gestión y almacenamiento de proyectos

EduBuilder SCORM está concebido como una aplicación independiente, sin requerir cuentas de usuario ni una base de datos centralizada para su funcionamiento básico.

La gestión de proyectos considera:

- Almacenamiento local.
- Exportación de proyectos editables.
- Importación de proyectos previamente guardados.
- Continuidad del trabajo en diferentes sesiones mediante archivos de proyecto.

Los proyectos editables son independientes de los paquetes SCORM generados.

---

## 🔒 Privacidad y autonomía

El diseño del proyecto prioriza la autonomía del usuario y el control local de sus materiales educativos.

La arquitectura busca evitar dependencias innecesarias de servicios externos y permitir que cada docente administre sus propios proyectos.

La disponibilidad de funciones externas o recursos remotos dependerá de la configuración de cada implementación.

---

## 🧭 Estado del proyecto

<sub>Proyecto en desarrollo activo.</sub>

EduBuilder SCORM se encuentra en evolución, incorporando progresivamente nuevas funcionalidades y mejoras de estabilidad, compatibilidad y experiencia de usuario.

Las principales líneas de trabajo son:

- [x] Editor de contenidos enriquecidos.
- [x] Organización jerárquica de contenidos.
- [x] Estructura de páginas dentro de las lecciones.
- [x] Vista previa del estudiante.
- [x] Sistema de navegación entre páginas.
- [x] Gestión de proyectos editables.
- [x] Generación de paquetes SCORM.
- [ ] Fortalecimiento de la persistencia de recursos multimedia.
- [ ] Mejoras en la recuperación del progreso SCORM.
- [ ] Ampliación del banco de preguntas.
- [ ] Categorías y subcategorías del banco.
- [ ] Importación completa de Moodle XML.
- [ ] Creación y edición visual de preguntas Cloze.
- [ ] Evaluación de todas las variantes estándar Cloze.
- [ ] Pruebas integrales de compatibilidad con Moodle.
- [ ] Ampliación de las pruebas automatizadas.

*La lista representa líneas de desarrollo y no constituye una certificación de compatibilidad de cada funcionalidad.*

---

## 🤝 Contribuciones

Las sugerencias, observaciones y propuestas de mejora son bienvenidas.

Si deseas contribuir al desarrollo del proyecto, puedes:

1. Revisar el repositorio.
2. Identificar oportunidades de mejora.
3. Reportar errores o problemas.
4. Proponer nuevas funcionalidades.
5. Compartir sugerencias relacionadas con la experiencia docente y el diseño de recursos educativos.

---

## 📌 Repositorio

**GitHub:**  
https://github.com/valonzo-coder/Proyecto-Scorme

---

## 👨‍💻 Autor

**Víctor Alonzo**

Proyecto orientado al desarrollo de herramientas tecnológicas para la creación de experiencias de aprendizaje digitales y la innovación educativa.

---

## 📄 Licencia

La licencia del proyecto debe definirse antes de su distribución pública. Mientras no se incorpore un archivo `LICENSE`, no se debe asumir que el código puede reutilizarse o distribuirse libremente.

---

*EduBuilder SCORM: creando nuevas posibilidades para el diseño de experiencias de aprendizaje digitales.*
