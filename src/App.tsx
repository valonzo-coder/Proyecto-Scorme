import React, { useState, useEffect } from 'react';
import { CourseProject, ActiveSection } from './types/scorm';
import { StorageService } from './services/storageService';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import { ContentBuilderView } from './components/editor/ContentBuilderView';
import { QuestionBankView } from './components/questions/QuestionBankView';
import { AssessmentsView } from './components/assessments/AssessmentsView';
import { ScormConfigView } from './components/scorm-config/ScormConfigView';
import { StudentPlayerPreview } from './components/preview/StudentPlayerPreview';
import { ExportScormView } from './components/export/ExportScormView';
import { NewProjectModal } from './components/modals/NewProjectModal';

export default function App() {
  const [projects, setProjects] = useState<CourseProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [currentSection, setCurrentSection] = useState<ActiveSection>('dashboard');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  // Load projects from localStorage on mount
  useEffect(() => {
    const loadedProjects = StorageService.getProjects();
    setProjects(loadedProjects);
    const currId = StorageService.getCurrentProjectId();
    if (loadedProjects.some(p => p.id === currId)) {
      setActiveProjectId(currId);
    } else if (loadedProjects.length > 0) {
      setActiveProjectId(loadedProjects[0].id);
      StorageService.setCurrentProjectId(loadedProjects[0].id);
    }
    setLastSavedTime(new Date().toLocaleTimeString());
  }, []);

  // Get active project
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || null;

  // Handle selecting another project
  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    StorageService.setCurrentProjectId(projectId);
  };

  // Handle updates to project (builder, questions, scorm config, etc.)
  const handleUpdateProject = (updated: CourseProject) => {
    StorageService.saveProject(updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setLastSavedTime(new Date().toLocaleTimeString());
  };

  // Duplicate project
  const handleDuplicateProject = (projectId: string) => {
    const duplicate = StorageService.duplicateProject(projectId);
    if (duplicate) {
      const refreshed = StorageService.getProjects();
      setProjects(refreshed);
      setActiveProjectId(duplicate.id);
      StorageService.setCurrentProjectId(duplicate.id);
      setLastSavedTime(new Date().toLocaleTimeString());
    }
  };

  // Delete project
  const handleDeleteProject = (projectId: string) => {
    const success = StorageService.deleteProject(projectId);
    if (success) {
      const refreshed = StorageService.getProjects();
      setProjects(refreshed);
      const curr = StorageService.getCurrentProjectId();
      setActiveProjectId(curr);
      setLastSavedTime(new Date().toLocaleTimeString());
    }
  };

  // Import JSON project
  const handleImportProjectJson = (imported: CourseProject) => {
    StorageService.saveProject(imported);
    const refreshed = StorageService.getProjects();
    setProjects(refreshed);
    setActiveProjectId(imported.id);
    StorageService.setCurrentProjectId(imported.id);
    setLastSavedTime(new Date().toLocaleTimeString());
    setCurrentSection('builder');
  };

  // Project created via modal
  const handleProjectCreated = (newProject: CourseProject) => {
    const refreshed = StorageService.getProjects();
    setProjects(refreshed);
    setActiveProjectId(newProject.id);
    StorageService.setCurrentProjectId(newProject.id);
    setLastSavedTime(new Date().toLocaleTimeString());
    setCurrentSection('builder');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        activeProject={activeProject}
        allProjects={projects}
        onSelectProject={handleSelectProject}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentSection={currentSection}
          activeProject={activeProject}
          onSelectSection={setCurrentSection}
          lastSavedTime={lastSavedTime}
        />

        {/* Viewport Router */}
        <main className="flex-1 overflow-y-auto bg-slate-100">
          {currentSection === 'dashboard' && (
            <DashboardView
              projects={projects}
              activeProject={activeProject}
              onSelectProject={handleSelectProject}
              onNavigateSection={setCurrentSection}
              onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
              onDuplicateProject={handleDuplicateProject}
            />
          )}

          {currentSection === 'projects' && (
            <ProjectsView
              projects={projects}
              activeProject={activeProject}
              onSelectProject={handleSelectProject}
              onNavigateSection={setCurrentSection}
              onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
              onImportProjectJson={handleImportProjectJson}
            />
          )}

          {currentSection === 'builder' && activeProject && (
            <ContentBuilderView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
              onOpenQuestionBank={() => setCurrentSection('questions')}
            />
          )}

          {currentSection === 'questions' && activeProject && (
            <QuestionBankView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {currentSection === 'assessments' && activeProject && (
            <AssessmentsView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
              onOpenQuestionBank={() => setCurrentSection('questions')}
            />
          )}

          {currentSection === 'scorm_config' && activeProject && (
            <ScormConfigView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
              onNavigateExport={() => setCurrentSection('export')}
            />
          )}

          {currentSection === 'preview' && activeProject && (
            <StudentPlayerPreview
              project={activeProject}
              onOpenBuilder={() => setCurrentSection('builder')}
            />
          )}

          {currentSection === 'export' && activeProject && (
            <ExportScormView
              project={activeProject}
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
    </div>
  );
}
