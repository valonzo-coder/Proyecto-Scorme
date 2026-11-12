export type ScormVersion = '1.2' | '2004_3rd' | '2004_4th';

export type QuestionType = 
  | 'multiple_choice' 
  | 'multiple_response' 
  | 'true_false' 
  | 'fill_blank' 
  | 'matching'
  | 'numerical'
  | 'essay'
  | 'description'
  | 'cloze'
  | 'unsupported';

export type DifficultyLevel = 'Fácil' | 'Medio' | 'Difícil';

export interface QuestionCategory {
  id: string;
  name: string;
  parentId: string | null;
  description?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  moodleOriginalPath?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  fraction?: number;
  feedback?: string;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface ShortAnswerVariant {
  text: string;
  fraction: number;
  feedback?: string;
}

export interface NumericalAnswer {
  value: number;
  tolerance: number;
  fraction: number;
  feedback?: string;
}

export interface ClozeSubquestionInfo {
  index: number;
  weight: number;
  subType: string;
  rawBody: string;
}

export interface QuestionItem {
  id: string;
  categoryId?: string;
  name?: string;
  type: QuestionType;
  prompt: string;
  promptHtml?: string;
  explanation: string;
  explanationHtml?: string;
  points: number;
  difficulty: DifficultyLevel;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  options?: QuestionOption[];
  trueFalseAnswer?: boolean;
  blankAnswer?: string;
  acceptedAnswers?: ShortAnswerVariant[];
  caseSensitive?: boolean;
  numericalAnswers?: NumericalAnswer[];
  matchingPairs?: MatchingPair[];
  penalty?: number;
  shuffleAnswers?: boolean;
  feedbackCorrectHtml?: string;
  feedbackPartiallyCorrectHtml?: string;
  feedbackIncorrectHtml?: string;
  rawMoodleType?: string;
  clozeData?: {
    rawText: string;
    subquestions: ClozeSubquestionInfo[];
  };
  importWarnings?: string[];
  pendingAdaptation?: boolean;
  externalMediaUrls?: string[];
}

export type BlockType = 
  | 'text' 
  | 'callout' 
  | 'accordion' 
  | 'tabs' 
  | 'flashcards' 
  | 'media' 
  | 'checkpoint'
  | 'math'
  | 'resource';

export interface BaseBlock {
  id: string;
  type: BlockType;
  title?: string;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
}

export type CalloutVariant = 
  | 'definition' 
  | 'example' 
  | 'warning' 
  | 'tip' 
  | 'activity' 
  | 'reflection' 
  | 'info' 
  | 'quote';

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  variant: CalloutVariant;
  title: string;
  content: string;
}

export interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

export interface AccordionBlock extends BaseBlock {
  type: 'accordion';
  items: AccordionItem[];
}

export interface TabItem {
  id: string;
  label: string;
  content: string;
}

export interface TabsBlock extends BaseBlock {
  type: 'tabs';
  tabs: TabItem[];
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  hint?: string;
}

export interface FlashcardsBlock extends BaseBlock {
  type: 'flashcards';
  cards: FlashcardItem[];
}

export interface MediaBlock extends BaseBlock {
  type: 'media';
  mediaType: 'image' | 'video_embed' | 'video_file' | 'audio';
  url: string; // can be relative path (e.g. "media/imagenes/...") or external embed URL
  mediaAssetId?: string; // reference to local media asset if uploaded
  caption?: string;
  altText?: string;
}

export interface CheckpointBlock extends BaseBlock {
  type: 'checkpoint';
  questionId: string;
}

export interface MathBlock extends BaseBlock {
  type: 'math';
  latex: string;
  caption?: string;
  displayMode: boolean;
}

export interface ResourceBlock extends BaseBlock {
  type: 'resource';
  title: string;
  description?: string;
  filename: string;
  relativePath: string;
  fileSize?: number;
}

export type ContentBlock = 
  | TextBlock 
  | CalloutBlock 
  | AccordionBlock 
  | TabsBlock 
  | FlashcardsBlock 
  | MediaBlock 
  | CheckpointBlock
  | MathBlock
  | ResourceBlock;

export type NavigationConditionType = 
  | 'button'
  | 'scrolling'
  | 'question'
  | 'interaction'
  | 'resource';

export type QuestionCriteria = 'answered' | 'correct';
export type InteractionCriteria = 'any_one' | 'specific_count' | 'all_items';
export type ResourceCriteria = 'open_only' | 'confirm_review' | 'confirm_activity';

export interface PageNavigationRule {
  type: NavigationConditionType;
  // SCROLLING config
  scrollThresholdPercent?: number; // default 95
  // QUESTION config
  questionId?: string;
  questionCriteria?: QuestionCriteria;
  maxAttempts?: number; // 0 = unlimited
  allowRetry?: boolean;
  showFeedback?: boolean;
  // INTERACTION config
  targetBlockId?: string; // block id or 'any'
  interactionCriteria?: InteractionCriteria;
  requiredCount?: number;
  requiredItemIds?: string[];
  // RESOURCE config
  resourceBlockId?: string;
  resourceCriteria?: ResourceCriteria;
  // Extensibility for future combined conditions (AND / OR)
  combinator?: 'AND' | 'OR';
  secondaryRules?: PageNavigationRule[];
  // Optional completion action
  onCompleteAction?: 'unlock_next' | 'mark_page_complete';
}

export type LessonNavigationMode = 
  | 'sequential' 
  | 'free' 
  | 'sequential_with_requirements';

export interface LessonNavigationConfig {
  mode: LessonNavigationMode;
  allowBack: boolean;
  allowSkip: boolean;
  showPageIndex: boolean;
  requireCompletionToAdvance: boolean;
}

export interface CoursePage {
  id: string;
  title: string;
  order: number;
  blocks: ContentBlock[];
  navigationRule: PageNavigationRule;
  allowBackOverride?: boolean;
  completionNote?: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  order: number;
  pages: CoursePage[];
  navigationConfig?: LessonNavigationConfig;
  // Legacy support for migration from older versions
  blocks?: ContentBlock[];
  linkedQuizId?: string;
}

export interface CourseUnit {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: CourseLesson[];
}

// Runtime student progress & navigation tracking state
export interface PageRuntimeProgress {
  visited: boolean;
  completed: boolean;
  scrollPercent: number;
  scrolledToBottom: boolean;
  interactedIds: string[];
  openedResourceIds: string[];
  confirmedResourceIds: string[];
  questionAttempts: Record<string, number>;
  questionAnswers: Record<string, any>;
  questionCorrect: Record<string, boolean>;
}

export interface StudentProgressState {
  currentLessonId: string;
  currentPageId: string;
  completedLessons: Record<string, boolean>;
  completedAssessments: Record<string, { score: number; passed: boolean; attempts?: number }>;
  pages: Record<string, PageRuntimeProgress>;
}

export interface AssessmentQuestionSnapshot {
  bankQuestionId: string;
  capturedAt: string;
  question: QuestionItem;
}

export interface AssessmentConfig {
  id: string;
  title: string;
  description: string;
  type: 'lesson_quiz' | 'final_exam';
  passingScore: number;
  questionIds: string[];
  questionSnapshots?: AssessmentQuestionSnapshot[];
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showFeedback: boolean;
  timeLimitMinutes: number;
}

export interface SCORMConfig {
  version: ScormVersion;
  identifier: string;
  title: string;
  description: string;
  masteryScore: number;
  completionCriteria: 'passed_incomplete' | 'completed_failed' | 'completed_incomplete';
  reportingMode: 'score_and_status' | 'status_only' | 'score_only';
  exitBehavior: 'suspend' | 'finish';
  organizationName: string;
  authorName: string;
  launchFileName: string;
  enableApiDebug: boolean;
  moodleCompatibilityMode: boolean;
}

export interface CourseProject {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'Principiante' | 'Intermedio' | 'Avanzado';
  estimatedDuration: string;
  author: string;
  organization: string;
  coverImage?: string; // relative path "media/..." or data URI
  createdAt: string;
  updatedAt: string;
  units: CourseUnit[];
  questionCategories?: QuestionCategory[];
  questionBank: QuestionItem[];
  assessments: AssessmentConfig[];
  scormConfig: SCORMConfig;
}

// Editable Project File Format (Standardized, Versioned)
export const EDUBUILDER_FILE_FORMAT = 'EDUBUILDER_PROJECT';
export const EDUBUILDER_FORMAT_VERSION = '1.0.0';

export interface MediaAssetMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  relativePath: string; // e.g. "media/imagen-1.png"
}

export interface EduBuilderProjectManifest {
  format: 'EDUBUILDER_PROJECT';
  formatVersion: '1.0.0';
  appVersion: string;
  exportedAt: string;
  project: CourseProject;
  mediaAssets: MediaAssetMeta[];
}

// Active Project Sync Status
export type ProjectSyncStatus = 
  | 'fresh'     // Proyecto recién creado en blanco
  | 'loaded'    // Proyecto cargado desde archivo, sin cambios pendientes
  | 'modified'  // Cambios pendientes de descargar
  | 'saved';    // Cambios guardados en archivo descargado

export type ActiveSection = 
  | 'project_info' 
  | 'builder' 
  | 'questions' 
  | 'assessments' 
  | 'scorm_config' 
  | 'preview' 
  | 'export';
