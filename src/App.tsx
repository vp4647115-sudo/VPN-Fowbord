import React, { useState, useEffect } from 'react';
import { Project, ViewMode, ChatMessage } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { TeamChatSidebar } from './components/TeamChatSidebar';
import { ShareModal } from './components/ShareModal';
import { SettingsModal } from './components/SettingsModal';
import { TeamInviteModal } from './components/TeamInviteModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { SupabaseModal } from './components/SupabaseModal';
import { JwtAuthModal } from './components/JwtAuthModal';
import { SkillEngineModal } from './components/SkillEngineModal';
import { UserProfileModal } from './components/UserProfileModal';
import { WebhookAutomationModal } from './components/WebhookAutomationModal';
import { CommandBarModal } from './components/CommandBarModal';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { KnowledgeBaseModal } from './components/KnowledgeBaseModal';
import { BoardViewSwitcher } from './components/BoardViewSwitcher';
import { BoardMode } from './types';
import { LoginPage } from './components/LoginPage';
import { auth, logoutUser, syncProjectToFirebase, getUserProjectsFromFirebase, deleteProjectFromFirebase } from './lib/firebase';
import { supabase, signInWithGoogleSupabase, signOutUser } from './lib/supabase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getApiUrl } from './lib/api';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeCategory, setActiveCategory] = useState<
    'My Projects' | 'Shared with me' | 'Templates' | 'Trash'
  >('My Projects');
  const [searchQuery, setSearchQuery] = useState('');

  // Canvas background grid style
  const [gridStyle, setGridStyle] = useState<'dot' | 'line' | 'blank'>('dot');

  // Team & Modals state
  const [activeTeamName, setActiveTeamName] = useState('Engineering Flow Team');
  const [joinedTeamNotice, setJoinedTeamNotice] = useState<string | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isJwtModalOpen, setIsJwtModalOpen] = useState(false);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [activeBoardMode, setActiveBoardMode] = useState<BoardMode>('canvas');
  const [isFirstTimeOnboarding, setIsFirstTimeOnboarding] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Global Keyboard Shortcuts (Ctrl + K, Ctrl + Shift + C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandBarOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setIsQuickCaptureOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Restore saved session from localStorage on initial load
  useEffect(() => {
    const savedUserStr = localStorage.getItem('flowboard_user');
    if (savedUserStr) {
      try {
        const parsed = JSON.parse(savedUserStr);
        if (parsed && (parsed.email || parsed.uid)) {
          setCurrentUser(parsed);
          setIsLoggedIn(true);

          // Check if profile details are completed
          const savedProfile = localStorage.getItem('flowboard_user_profile');
          if (!savedProfile) {
            setIsFirstTimeOnboarding(true);
            setIsUserProfileModalOpen(true);
          }
        }
      } catch (e) {
        console.warn('Stale user session');
      }
    }
  }, []);

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
      
      // Auto-open workspace view if current project exists
      if (currentProject) {
        setViewMode('workspace');
      }
    }
  }, [currentProject]);

  // Online Real-Time Team Sync & Presence Heartbeat Loop
  useEffect(() => {
    if (!activeTeamName) return;

    const teamId = 'team-' + activeTeamName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let isSubscribed = true;
    let lastSyncedAt = 0;

    const syncTeamOnlineState = async () => {
      try {
        // 1. Send active member heartbeat presence
        const presenceRes = await fetch(getApiUrl(`/api/teams/${teamId}/presence`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser?.uid || currentUser?.email || 'guest-' + Date.now(),
            email: currentUser?.email || 'online@flowboard.app',
            displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Team Collaborator',
            avatar: currentUser?.photoURL,
          }),
        });

        if (!presenceRes.ok) {
          return;
        }

        // 2. Fetch latest team state (nodes, connectors, chat)
        const res = await fetch(getApiUrl(`/api/teams/${teamId}`));
        if (res.ok && isSubscribed) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success && data.team) {
              const team = data.team;
              // Sync nodes, connectors, chat if team updated by another online member
              if (team.lastUpdated && team.lastUpdated > lastSyncedAt) {
                lastSyncedAt = team.lastUpdated;
                
                if (currentProject) {
                  const updatedProj = {
                    ...currentProject,
                    nodes: team.nodes && team.nodes.length > 0 ? team.nodes : currentProject.nodes,
                    connectors: team.connectors && team.connectors.length > 0 ? team.connectors : currentProject.connectors,
                    chat: team.chat && team.chat.length > 0 ? team.chat : currentProject.chat,
                  };
                  
                  // Only update state if there's an actual change in data length or nodes
                  if (
                    JSON.stringify(updatedProj.nodes) !== JSON.stringify(currentProject.nodes) ||
                    JSON.stringify(updatedProj.connectors) !== JSON.stringify(currentProject.connectors) ||
                    JSON.stringify(updatedProj.chat) !== JSON.stringify(currentProject.chat)
                  ) {
                    setCurrentProject(updatedProj);
                    setProjects((prev) =>
                      prev.map((p) => (p.id === updatedProj.id ? updatedProj : p))
                    );
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        // Silent online sync retry
      }
    };

    // Initial sync and poll every 1.5 seconds
    syncTeamOnlineState();
    const interval = setInterval(syncTeamOnlineState, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeTeamName, currentProject, currentUser]);

  // Listen to Supabase Auth state (for Supabase Google OAuth redirect & session restoration)
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session;
      if (session?.user) {
        const supaUser = {
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          photoURL: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop',
        };
        setCurrentUser(supaUser as any);
        setIsLoggedIn(true);
        localStorage.setItem('flowboard_user', JSON.stringify(supaUser));
      }
    }).catch((err) => {
      console.warn('Supabase getSession note:', err);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const supaUser = {
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          photoURL: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop',
        };
        setCurrentUser(supaUser as any);
        setIsLoggedIn(true);
        localStorage.setItem('flowboard_user', JSON.stringify(supaUser));
      }
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
        localStorage.setItem('flowboard_user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0],
          photoURL: user.photoURL,
        }));
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

  // Fetch initial projects from server with retry logic for startup
  useEffect(() => {
    let attempts = 0;
    const loadProjects = async () => {
      while (attempts < 3) {
        try {
          attempts++;
          const res = await fetch(getApiUrl('/api/projects'));
          if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await res.json();
              if (data && data.success && Array.isArray(data.projects) && data.projects.length > 0) {
                setProjects(data.projects);
                setCurrentProject((prev) => prev || data.projects[0]);
                return;
              }
            }
          }
        } catch (err: any) {
          console.warn(`Attempt ${attempts} fetching /api/projects:`, err?.message || err);
        }
        // Wait 800ms before retrying
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    };

    loadProjects();
  }, []);

  // Handle select project
  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
    setViewMode('workspace');
  };

  // Create new blank project
  const handleNewProject = async () => {
    const newProj: Project = {
      id: 'proj-' + Date.now(),
      title: 'Blank Canvas Flow',
      description: 'Interactive AI whiteboard canvas',
      category: 'My Projects',
      updatedAt: new Date().toISOString(),
      updatedLabel: 'Just now',
      userId: currentUser?.uid || 'guest',
      nodes: [],
      connectors: [],
      comments: [],
      chat: [],
    };

    try {
      const res = await fetch(getApiUrl('/api/projects'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProj),
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.success && data.project) {
            setProjects((prev) => [data.project, ...prev]);
            setCurrentProject(data.project);
            setViewMode('workspace');
            if (currentUser) {
              syncProjectToFirebase(data.project, currentUser.uid);
            }
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Backend API project creation unavailable, using local state:', err);
    }

    // Local state fallback
    setProjects((prev) => [newProj, ...prev]);
    setCurrentProject(newProj);
    setViewMode('workspace');
    if (currentUser) {
      syncProjectToFirebase(newProj, currentUser.uid);
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
      await fetch(getApiUrl(`/api/projects/${currentProject.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject),
      });
    } catch (err) {
      console.warn('Backend update failed, saved locally:', err);
    }

    if (currentUser) {
      syncProjectToFirebase(updatedProject, currentUser.uid);
    }

    // Broadcast live changes to active online team workspace
    if (activeTeamName && (updatedFields.nodes || updatedFields.connectors || updatedFields.chat)) {
      const teamId = 'team-' + activeTeamName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      fetch(getApiUrl(`/api/teams/${teamId}/sync`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: updatedProject.nodes,
          connectors: updatedProject.connectors,
          chat: updatedProject.chat,
          updatedBy: currentUser?.displayName || currentUser?.email || 'Collaborator',
        }),
      }).catch((e) => console.warn('Online team sync background error:', e));
    }
  };

  // Move project to Trash
  const handleDeleteProject = async (id: string) => {
    try {
      const targetProj = projects.find((p) => p.id === id);
      if (!targetProj) return;

      const updated = { ...targetProj, category: 'Trash' as const };
      
      try {
        await fetch(getApiUrl(`/api/projects/${id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
      } catch (e) {
        console.warn('Backend trash update fallback');
      }

      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (currentProject?.id === id) {
        setCurrentProject(null);
        setViewMode('dashboard');
      }
      if (currentUser) {
        syncProjectToFirebase(updated, currentUser.uid);
      }
    } catch (err) {
      console.error('Failed to move project to trash:', err);
    }
  };

  // Permanently delete project
  const handlePermanentDeleteProject = async (id: string) => {
    try {
      try {
        await fetch(getApiUrl(`/api/projects/${id}`), { method: 'DELETE' });
      } catch (e) {
        console.warn('Backend delete fallback');
      }
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (currentUser) {
        deleteProjectFromFirebase(id);
      }
    } catch (err) {
      console.error('Failed to delete project permanently:', err);
    }
  };

  // Restore project from trash
  const handleRestoreProject = async (id: string) => {
    try {
      const targetProj = projects.find((p) => p.id === id);
      if (!targetProj) return;

      const restored = { ...targetProj, category: 'My Projects' as const };
      try {
        await fetch(getApiUrl(`/api/projects/${id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(restored),
        });
      } catch (e) {
        console.warn('Backend restore fallback');
      }

      setProjects((prev) => prev.map((p) => (p.id === id ? restored : p)));
      if (currentUser) {
        syncProjectToFirebase(restored, currentUser.uid);
      }
    } catch (err) {
      console.error('Failed to restore project from trash:', err);
    }
  };

  // Empty entire Trash
  const handleEmptyTrash = async () => {
    try {
      const trashedIds = projects.filter((p) => p.category === 'Trash').map((p) => p.id);
      for (const id of trashedIds) {
        await fetch(getApiUrl(`/api/projects/${id}`), { method: 'DELETE' });
        if (currentUser) deleteProjectFromFirebase(id);
      }
      setProjects((prev) => prev.filter((p) => p.category !== 'Trash'));
    } catch (err) {
      console.error('Failed to empty trash:', err);
    }
  };

  // Use Template to create new canvas workspace
  const handleUseTemplate = async (template: any) => {
    try {
      const res = await fetch(getApiUrl('/api/projects'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.title,
          description: template.description,
          userId: currentUser?.uid || 'guest',
          nodes: template.nodes,
          connectors: template.connectors,
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
      console.error('Failed to create project from template:', err);
    }
  };

  // Duplicate project
  const handleDuplicateProject = async (project: Project) => {
    try {
      const res = await fetch(getApiUrl('/api/projects'), {
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

  // Handle chat messages in workspace
  const handleSendMessage = (text: string) => {
    if (!currentProject) return;
    const authorName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'You';
    const newMsg: ChatMessage = {
      id: 'm-' + Date.now(),
      author: authorName,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      text,
    };
    handleUpdateProject({ chat: [...currentProject.chat, newMsg] });

    if (activeTeamName) {
      const teamId = 'team-' + activeTeamName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      fetch(getApiUrl(`/api/teams/${teamId}/chat`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: authorName,
          text,
        }),
      }).catch((e) => console.warn('Team chat post error:', e));
    }
  };

  // Rename project title directly from Navbar
  const handleRenameProject = (newTitle: string) => {
    if (!currentProject) return;
    handleUpdateProject({ title: newTitle });
  };

  const handleNavbarGoogleLogin = async () => {
    const u = await signInWithGoogleSupabase();
    if (u) {
      setCurrentUser(u);
      setIsLoggedIn(true);
      localStorage.setItem('flowboard_user', JSON.stringify(u));
      setIsFirstTimeOnboarding(true);
      setIsUserProfileModalOpen(true);
    }
  };

  if (!isLoggedIn && !currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          if (user) {
            setCurrentUser(user);
          }
          setIsLoggedIn(true);
          setIsFirstTimeOnboarding(true);
          setIsUserProfileModalOpen(true);
        }}
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#f7f9fb] text-[#191c1e] antialiased">
      {/* Top Navbar */}
      <Navbar
        viewMode={viewMode}
        currentProject={currentProject}
        currentUser={currentUser}
        onLogin={handleNavbarGoogleLogin}
        onLogout={() => {
          signOutUser();
          logoutUser();
          setCurrentUser(null);
          setIsLoggedIn(false);
        }}
        onOpenDashboard={() => setViewMode('dashboard')}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenJwtModal={() => setIsJwtModalOpen(true)}
        activeTeamName={activeTeamName}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onNewProject={handleNewProject}
        onRenameProject={handleRenameProject}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenSkillModal={() => setIsSkillModalOpen(true)}
        onOpenUserProfileModal={() => {
          setIsFirstTimeOnboarding(false);
          setIsUserProfileModalOpen(true);
        }}
        onOpenWebhookModal={() => setIsWebhookModalOpen(true)}
        onOpenCommandBar={() => setIsCommandBarOpen(true)}
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
        onOpenKnowledgeBase={() => setIsKnowledgeBaseOpen(true)}
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
              onOpenCommandBar={() => setIsCommandBarOpen(true)}
              onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
              onOpenKnowledgeBase={() => setIsKnowledgeBaseOpen(true)}
              onOpenWebhookModal={() => setIsWebhookModalOpen(true)}
              onOpenSkillModal={() => setIsSkillModalOpen(true)}
              onOpenUserProfileModal={() => {
                setIsFirstTimeOnboarding(false);
                setIsUserProfileModalOpen(true);
              }}
              onOpenDriveModal={() => setIsDriveModalOpen(true)}
              onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
              onOpenJwtModal={() => setIsJwtModalOpen(true)}
            />
            <Dashboard
              projects={projects}
              activeCategory={activeCategory}
              searchQuery={searchQuery}
              onSelectProject={handleSelectProject}
              onNewProject={handleNewProject}
              onOpenTeamModal={() => setIsTeamModalOpen(true)}
              onDeleteProject={handleDeleteProject}
              onPermanentDeleteProject={handlePermanentDeleteProject}
              onRestoreProject={handleRestoreProject}
              onEmptyTrash={handleEmptyTrash}
              onDuplicateProject={handleDuplicateProject}
              onUseTemplate={handleUseTemplate}
            />
          </>
        ) : (
          currentProject && (
            <div className="flex flex-col flex-1 h-full w-full relative overflow-hidden">
              {activeBoardMode === 'canvas' ? (
                <CanvasWorkspace
                  project={currentProject}
                  onUpdateProject={handleUpdateProject}
                  gridStyle={gridStyle}
                />
              ) : (
                <BoardViewSwitcher
                  project={currentProject}
                  onUpdateProject={handleUpdateProject}
                  activeMode={activeBoardMode}
                  onChangeMode={setActiveBoardMode}
                />
              )}

              {/* View Switcher Bar floating toggle for Canvas */}
              <div className="fixed top-20 right-6 z-40 flex items-center gap-1 bg-[#121215]/90 border border-white/10 rounded-full p-1 shadow-2xl backdrop-blur-md">
                {(['canvas', 'board', 'timeline', 'table', 'analytics'] as BoardMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setActiveBoardMode(m)}
                    className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                      activeBoardMode === m
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <TeamChatSidebar
                chatMessages={currentProject.chat || []}
                onSendMessage={handleSendMessage}
                isOpen={isChatOpen}
                onToggleOpen={() => setIsChatOpen(!isChatOpen)}
              />
            </div>
          )
        )}
      </div>

      {/* Modals */}
      <CommandBarModal
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        project={currentProject || undefined}
        onUpdateProject={handleUpdateProject}
        onNavigateMode={(mode) => setActiveBoardMode(mode)}
      />

      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        project={currentProject || undefined}
        onUpdateProject={handleUpdateProject}
      />

      <KnowledgeBaseModal
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
        project={currentProject || undefined}
        onUpdateProject={handleUpdateProject}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectTitle={currentProject?.title || 'FlowBoard Workspace'}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenJwtModal={() => setIsJwtModalOpen(true)}
        gridStyle={gridStyle}
        onChangeGridStyle={setGridStyle}
      />

      <TeamInviteModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        currentUser={currentUser}
        activeTeamName={activeTeamName}
        onUpdateTeamName={setActiveTeamName}
      />

      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        currentProject={currentProject}
        onProjectImported={(proj) => {
          setProjects((prev) => [proj, ...prev]);
          setCurrentProject(proj);
          setViewMode('workspace');
          setIsDriveModalOpen(false);
        }}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      <JwtAuthModal
        isOpen={isJwtModalOpen}
        onClose={() => setIsJwtModalOpen(false)}
      />

      <SkillEngineModal
        isOpen={isSkillModalOpen}
        onClose={() => setIsSkillModalOpen(false)}
      />

      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        currentUserEmail={currentUser?.email || ''}
        currentDisplayName={currentUser?.displayName || ''}
        isFirstTime={isFirstTimeOnboarding}
        onProfileSaved={(updatedProfile) => {
          if (currentUser && updatedProfile.firstName) {
            const newDisplayName = updatedProfile.firstName;
            setCurrentUser({
              ...currentUser,
              displayName: newDisplayName,
            });
          }
        }}
      />

      <WebhookAutomationModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        currentUserEmail={currentUser?.email || ''}
        currentDisplayName={currentUser?.displayName || ''}
      />
    </div>
  );
}

