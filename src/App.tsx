import React, { useState, useEffect } from 'react';
import { Project, ViewMode, ChatMessage } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { TeamChatSidebar } from './components/TeamChatSidebar';
import { AiDiagramModal } from './components/AiDiagramModal';
import { ShareModal } from './components/ShareModal';
import { SettingsModal } from './components/SettingsModal';
import { TeamInviteModal } from './components/TeamInviteModal';
import { auth, loginWithGoogle, logoutUser, syncProjectToFirebase, getUserProjectsFromFirebase, deleteProjectFromFirebase } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeCategory, setActiveCategory] = useState<
    'My Projects' | 'Shared with me' | 'Templates' | 'Trash'
  >('My Projects');
  const [searchQuery, setSearchQuery] = useState('');

  // Team & Modals state
  const [activeTeamName, setActiveTeamName] = useState('Engineering Flow Team');
  const [joinedTeamNotice, setJoinedTeamNotice] = useState<string | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Check URL parameters for team join invitation link (?joinTeam=...&teamName=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinTeamId = params.get('joinTeam');
    const joinTeamName = params.get('teamName');

    if (joinTeamId && joinTeamName) {
      const decodedName = decodeURIComponent(joinTeamName);
      setActiveTeamName(decodedName);
      setJoinedTeamNotice(`🎉 Joined team "${decodedName}"! Online real-time collaboration is active.`);
      setIsChatOpen(true);
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userProjects = await getUserProjectsFromFirebase(user.uid);
          if (userProjects && userProjects.length > 0) {
            setProjects((prev) => {
              const ids = new Set(userProjects.map((p) => p.id));
              const merged = [...userProjects, ...prev.filter((p) => !ids.has(p.id))];
              return merged;
            });
            setCurrentProject(userProjects[0]);
          }
        } catch (e) {
          console.warn('Could not fetch user projects from Firebase:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch initial projects from server
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.projects) {
          setProjects(data.projects);
          if (data.projects.length > 0) {
            setCurrentProject(data.projects[0]);
          }
        }
      })
      .catch((err) => console.error('Failed to load projects from server:', err));
  }, []);

  // Handle select project
  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
    setViewMode('workspace');
  };

  // Create new blank project
  const handleNewProject = async () => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Blank Canvas Flow',
          description: 'Interactive AI whiteboard canvas',
          userId: currentUser?.uid || 'guest',
          nodes: [],
          connectors: [],
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setProjects((prev) => [data.project, ...prev]);
        setCurrentProject(data.project);
        setViewMode('workspace');

        // Save to Firebase under user ID
        if (currentUser) {
          syncProjectToFirebase(data.project, currentUser.uid);
        }
      }
    } catch (err) {
      console.error('Failed to create new project:', err);
    }
  };

  // Update current project
  const handleUpdateProject = async (updatedFields: Partial<Project>) => {
    if (!currentProject) return;

    const updatedProject = {
      ...currentProject,
      ...updatedFields,
      userId: currentUser?.uid || currentProject.userId || 'guest',
      updatedAt: new Date().toISOString(),
      updatedLabel: 'Just now',
    };

    setCurrentProject(updatedProject);
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );

    try {
      await fetch(`/api/projects/${currentProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject),
      });

      if (currentUser) {
        syncProjectToFirebase(updatedProject, currentUser.uid);
      }
    } catch (err) {
      console.error('Failed to save project update to backend:', err);
    }
  };

  // Delete project
  const handleDeleteProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (currentProject?.id === id) {
        setCurrentProject(null);
        setViewMode('dashboard');
      }
      if (currentUser) {
        deleteProjectFromFirebase(id);
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  // Duplicate project
  const handleDuplicateProject = async (project: Project) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${project.title} (Copy)`,
          description: project.description,
          userId: currentUser?.uid || 'guest',
          nodes: project.nodes,
          connectors: project.connectors,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setProjects((prev) => [data.project, ...prev]);
        if (currentUser) {
          syncProjectToFirebase(data.project, currentUser.uid);
        }
      }
    } catch (err) {
      console.error('Failed to duplicate project:', err);
    }
  };

  // Handle AI Generated Diagram output
  const handleDiagramGenerated = async (diagram: {
    title: string;
    description?: string;
    nodes: any[];
    connectors: any[];
  }) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: diagram.title,
          description: diagram.description || 'AI Generated Diagram',
          userId: currentUser?.uid || 'guest',
          nodes: diagram.nodes,
          connectors: diagram.connectors,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setProjects((prev) => [data.project, ...prev]);
        setCurrentProject(data.project);
        setViewMode('workspace');
        if (currentUser) {
          syncProjectToFirebase(data.project, currentUser.uid);
        }
      }
    } catch (err) {
      console.error('Failed to create AI generated project:', err);
    }
  };

  // Handle chat messages in workspace
  const handleSendMessage = (text: string) => {
    if (!currentProject) return;
    const newMsg: ChatMessage = {
      id: 'm-' + Date.now(),
      author: currentUser?.displayName || 'You',
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      text,
    };
    handleUpdateProject({ chat: [...currentProject.chat, newMsg] });
  };

  // Ask AI in workspace team chat
  const handleAskAi = async (promptText: string) => {
    if (!currentProject) return;
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          history: currentProject.chat,
          currentProject,
        }),
      });
      const data = await res.json();
      if (data.success && data.reply) {
        const aiMsg: ChatMessage = {
          id: 'ai-' + Date.now(),
          author: 'FlowBoard AI',
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          text: data.reply,
          isAi: true,
        };
        handleUpdateProject({ chat: [...currentProject.chat, aiMsg] });
      }
    } catch (err) {
      console.error('Failed to get AI chat reply:', err);
    }
  };

  // Rename project title directly from Navbar
  const handleRenameProject = (newTitle: string) => {
    if (!currentProject) return;
    handleUpdateProject({ title: newTitle });
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#f7f9fb] text-[#191c1e] antialiased">
      {/* Top Navbar */}
      <Navbar
        viewMode={viewMode}
        currentProject={currentProject}
        currentUser={currentUser}
        onLogin={() => loginWithGoogle()}
        onLogout={() => logoutUser()}
        onOpenDashboard={() => setViewMode('dashboard')}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        activeTeamName={activeTeamName}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onNewProject={handleNewProject}
        onRenameProject={handleRenameProject}
      />

      {/* Joined Team Notice Banner */}
      {joinedTeamNotice && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-[#004ac6] text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-base">groups</span>
          <span>{joinedTeamNotice}</span>
          <button
            onClick={() => setJoinedTeamNotice(null)}
            className="hover:bg-white/20 p-1 rounded-full transition-colors ml-1"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-1 pt-16 h-full relative overflow-hidden">
        {viewMode === 'dashboard' ? (
          <>
            <Sidebar
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
            />
            <Dashboard
              projects={projects}
              activeCategory={activeCategory}
              searchQuery={searchQuery}
              onSelectProject={handleSelectProject}
              onNewProject={handleNewProject}
              onOpenAiModal={() => setIsAiModalOpen(true)}
              onDeleteProject={handleDeleteProject}
              onDuplicateProject={handleDuplicateProject}
            />
          </>
        ) : (
          currentProject && (
            <>
              <CanvasWorkspace
                project={currentProject}
                onUpdateProject={handleUpdateProject}
                onOpenAiModal={() => setIsAiModalOpen(true)}
              />
              <TeamChatSidebar
                chatMessages={currentProject.chat || []}
                onSendMessage={handleSendMessage}
                onAskAi={handleAskAi}
                isOpen={isChatOpen}
                onToggleOpen={() => setIsChatOpen(!isChatOpen)}
              />
            </>
          )
        )}
      </div>

      {/* Modals */}
      <AiDiagramModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onDiagramGenerated={handleDiagramGenerated}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectTitle={currentProject?.title || 'FlowBoard Workspace'}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <TeamInviteModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        currentUser={currentUser}
        activeTeamName={activeTeamName}
        onUpdateTeamName={setActiveTeamName}
      />
    </div>
  );
}

