export type ScormVersion = '1.2' | '2004_3rd' | '2004_4th';

export type QuestionType = 
  | 'multiple_choice' 
  | 'multiple_response' 
  | 'true_false' 
  | 'fill_blank' 
  | 'matching';

export type DifficultyLevel = 'Fácil' | 'Medio' | 'Difícil';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface QuestionItem {
  id: string;
  type: QuestionType;
  prompt: string;
  explanation: string;
  points: number;
  difficulty: DifficultyLevel;
  tags: string[];
  options?: QuestionOption[];
  trueFalseAnswer?: boolean;
  blankAnswer?: string;
  matchingPairs?: MatchingPair[];
}

export type BlockType = 
  | 'text' 
  | 'callout' 
  | 'accordion' 
  | 'tabs' 
  | 'flashcards' 
  | 'media' 
  | 'checkpoint';

export interface BaseBlock {
  id: string;
  type: BlockType;
  title?: string;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string; // HTML or markdown-like styled text
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  variant: 'tip' | 'warning' | 'info' | 'quote';
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
  mediaType: 'image' | 'video_embed' | 'audio';
  url: string;
  caption?: string;
  altText?: string;
}

export interface CheckpointBlock extends BaseBlock {
  type: 'checkpoint';
  questionId: string;
}

export type ContentBlock = 
  | TextBlock 
  | CalloutBlock 
  | AccordionBlock 
  | TabsBlock 
  | FlashcardsBlock 
  | MediaBlock 
  | CheckpointBlock;

export interface CourseLesson {
  id: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  blocks: ContentBlock[];
  order: number;
  linkedQuizId?: string;
}

export interface CourseUnit {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: CourseLesson[];
}

export interface AssessmentConfig {
  id: string;
  title: string;
  description: string;
  type: 'lesson_quiz' | 'final_exam';
  passingScore: number; // e.g. 80 (%)
  questionIds: string[];
  maxAttempts: number; // 0 = unlimited
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showFeedback: boolean;
  timeLimitMinutes: number; // 0 = no limit
}

export interface SCORMConfig {
  version: ScormVersion;
  identifier: string;
  title: string;
  description: string;
  masteryScore: number; // 0-100
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
  createdAt: string;
  updatedAt: string;
  units: CourseUnit[];
  questionBank: QuestionItem[];
  assessments: AssessmentConfig[];
  scormConfig: SCORMConfig;
}

export type ActiveSection = 
  | 'dashboard' 
  | 'projects' 
  | 'builder' 
  | 'questions' 
  | 'assessments' 
  | 'scorm_config' 
  | 'preview' 
  | 'export';
