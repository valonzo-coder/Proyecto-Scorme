import React, { useState, useEffect, useRef } from 'react';
import { CourseProject, ActiveSection, ProjectSyncStatus } from './types/scorm';
import { StorageService } from './services/storageService';
import { ProjectPackageService } from './services/projectPackageService';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ProjectInfoView } from './components/project/ProjectInfoView';
import { ContentBuilderView } from './components/editor/ContentBuilderView';
import { QuestionBankView } from './components/questions/QuestionBankView';
import { AssessmentsView } from './components/assessments/AssessmentsView';
import { ScormConfigView } from './components/scorm-config/ScormConfigView';
import { StudentPlayerPreview } from './components/preview/StudentPlayerPreview';
import { ExportScormView } from './components/export/ExportScormView';
import { NewProjectModal } from './components/modals/NewProjectModal';
import { ConfirmDiscardModal } from './components/modals/ConfirmDiscardModal';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<CourseProject>(() => StorageService.getActiveProject().project);
  const [syncStatus, setSyncStatus] = useState<ProjectSyncStatus>(() => StorageService.getActiveProject().status);
  const [lastDownloaded, setLastDownloaded] = useState<string | null>(() => StorageService.getActiveProject().lastDownloaded);
  const [currentSection, setCurrentSection] = useState<ActiveSection>('project_info');

  // Modals & User alerts
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'new' | 'load' | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Update active project
  const handleUpdateProject = (updated: CourseProject) => {
    setProject(updated);
    setSyncStatus('modified');
    StorageService.saveActiveProject(updated, true);
  };

  // 1. Download Editable Project (.zip)
  const handleDownloadProject = async () => {
    try {
      const zipBlob = await ProjectPackageService.exportEditableProject(project);
      const slug = project.title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/^_+|_+$/g, '') || 'proyecto_edubuilder';
      const fileName = `${slug}.edubuilder.zip`;

      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      StorageService.setProjectDownloaded();
      const timeStr = new Date().toLocaleTimeString();
      setSyncStatus('saved');
      setLastDownloaded(timeStr);
      setNotification({
        type: 'success',
        message: `Proyecto editable descargado exitosamente como "${fileName}". Puedes abrirlo nuevamente en EduBuilder SCORM cuando lo desees.`
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Error al empaquetar el proyecto: ${err?.message || 'Error desconocido'}`
      });
    }
  };

  // 2. Prompt New Project (guard against discarding unsaved work)
  const handlePromptNewProject = () => {
    if (syncStatus === 'modified') {
      setPendingAction('new');
      setIsConfirmDiscardOpen(true);
    } else {
      setIsNewProjectModalOpen(true);
    }
  };

  // 3. Prompt Load Project (guard against discarding unsaved work)
  const handlePromptLoadProject = () => {
    if (syncStatus === 'modified') {
      setPendingAction('load');
      setIsConfirmDiscardOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  // User confirmed discarding pending changes
  const handleConfirmDiscard = () => {
    setIsConfirmDiscardOpen(false);
    if (pendingAction === 'new') {
      setIsNewProjectModalOpen(true);
    } else if (pendingAction === 'load') {
      fileInputRef.current?.click();
    }
    setPendingAction(null);
  };

  // User chose to download before proceeding
  const handleDownloadAndProceed = async () => {
    await handleDownloadProject();
    setIsConfirmDiscardOpen(false);
    if (pendingAction === 'new') {
      setIsNewProjectModalOpen(true);
    } else if (pendingAction === 'load') {
      fileInputRef.current?.click();
    }
    setPendingAction(null);
  };

  // File chosen from computer
  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { project: importedProject, mediaCount } = await ProjectPackageService.importEditableProject(file);
      StorageService.setLoadedProject(importedProject);
      setProject(importedProject);
      setSyncStatus('loaded');
      setLastDownloaded(null);
      setCurrentSection('project_info');
      setNotification({
        type: 'success',
        message: `¡Proyecto "${importedProject.title}" cargado con éxito! Se recuperaron todas las lecciones, actividades y ${mediaCount} recursos multimedia.`
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'No se pudo cargar el archivo seleccionado.'
      });
    }
    e.target.value = '';
  };

  // Project created via modal
  const handleProjectCreated = (newProject: CourseProject) => {
    setProject(newProject);
    setSyncStatus('fresh');
    setLastDownloaded(null);
    setCurrentSection('project_info');
    setNotification({
      type: 'success',
      message: `¡Proyecto "${newProject.title}" creado con éxito! Puedes comenzar a añadir tus contenidos.`
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans">
      {/* Hidden file input for loading editable projects */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.edubuilder,application/zip"
        onChange={handleFileChosen}
        className="hidden"
      />

      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        activeProject={project}
        syncStatus={syncStatus}
        onPromptNewProject={handlePromptNewProject}
        onPromptLoadProject={handlePromptLoadProject}
        onDownloadProject={handleDownloadProject}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentSection={currentSection}
          activeProject={project}
          syncStatus={syncStatus}
          lastDownloaded={lastDownloaded}
          onSelectSection={setCurrentSection}
          onDownloadProject={handleDownloadProject}
        />

        {/* Global Floating Notification Toast */}
        {notification && (
          <div className="px-6 pt-3">
            <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-md transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex items-center gap-2.5">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium leading-snug">{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Viewport Router */}
        <main className="flex-1 overflow-y-auto bg-slate-100">
          {currentSection === 'project_info' && (
            <ProjectInfoView
              project={project}
              syncStatus={syncStatus}
              lastDownloaded={lastDownloaded}
              onUpdateProject={handleUpdateProject}
              onDownloadProject={handleDownloadProject}
              onPromptNewProject={handlePromptNewProject}
              onPromptLoadProject={handlePromptLoadProject}
              onNavigateSection={setCurrentSection}
            />
          )}

          {currentSection === 'builder' && (
            <ContentBuilderView
              project={project}
              onUpdateProject={handleUpdateProject}
              onOpenQuestionBank={() => setCurrentSection('questions')}
            />
          )}

          {currentSection === 'questions' && (
            <QuestionBankView
              project={project}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {currentSection === 'assessments' && (
            <AssessmentsView
              project={project}
              onUpdateProject={handleUpdateProject}
              onOpenQuestionBank={() => setCurrentSection('questions')}
            />
          )}

          {currentSection === 'scorm_config' && (
            <ScormConfigView
              project={project}
              onUpdateProject={handleUpdateProject}
              onNavigateExport={() => setCurrentSection('export')}
            />
          )}

          {currentSection === 'preview' && (
            <StudentPlayerPreview
              project={project}
              onOpenBuilder={() => setCurrentSection('builder')}
            />
          )}

          {currentSection === 'export' && (
            <ExportScormView
              project={project}
              onOpenPreview={() => setCurrentSection('preview')}
            />
          )}
        </main>
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* Confirm Discard Modal */}
      <ConfirmDiscardModal
        isOpen={isConfirmDiscardOpen}
        onCancel={() => {
          setIsConfirmDiscardOpen(false);
          setPendingAction(null);
        }}
        onConfirmDiscard={handleConfirmDiscard}
        onDownloadAndProceed={handleDownloadAndProceed}
      />
    </div>
  );
}
