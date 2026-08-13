import React, { useState } from 'react';
import { ViewMode, Project } from '../types';
import { exportProjectToPng, exportProjectToSvg, exportProjectToJson } from '../lib/exportUtils';
import { User } from 'firebase/auth';

interface NavbarProps {
  viewMode: ViewMode;
  currentProject: Project | null;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenDashboard: () => void;
  onOpenShareModal: () => void;
  onOpenTeamModal?: () => void;
  onOpenDriveModal?: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenJwtModal?: () => void;
  activeTeamName?: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNewProject: () => void;
  onRenameProject: (newTitle: string) => void;
  activeCategory?: string;
  setActiveCategory?: (cat: any) => void;
  onOpenSettings?: () => void;
  onOpenSkillModal?: () => void;
  onOpenUserProfileModal?: () => void;
  onOpenWebhookModal?: () => void;
  onOpenCommandBar?: () => void;
  onOpenQuickCapture?: () => void;
  onOpenKnowledgeBase?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  currentProject,
  currentUser,
  onLogin,
  onLogout,
  onOpenDashboard,
  onOpenShareModal,
  onOpenTeamModal,
  onOpenDriveModal,
  onOpenSupabaseModal,
  onOpenJwtModal,
  onOpenSkillModal,
  onOpenUserProfileModal,
  onOpenWebhookModal,
  onOpenCommandBar,
  onOpenQuickCapture,
  onOpenKnowledgeBase,
  activeTeamName = 'Engineering Flow Team',
  searchQuery,
  setSearchQuery,
  onNewProject,
  onRenameProject,
  activeCategory,
  setActiveCategory,
  onOpenSettings,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleInput.trim()) {
      onRenameProject(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-3 h-16 bg-[#0a0a0c]/90 backdrop-blur-xl border-b border-white/10 shadow-lg text-slate-100 transition-all select-none">
      
      {/* Left Branding & Workspace Title */}
      <div className="flex items-center gap-4">
        {viewMode === 'dashboard' && setActiveCategory && (
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Toggle Menu"
          >
            <span className="material-symbols-outlined text-xl">
              {showMobileMenu ? 'close' : 'menu'}
            </span>
          </button>
        )}

        <button
          onClick={onOpenDashboard}
          className="text-base md:text-lg font-black tracking-widest text-white hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">schema</span>
          </div>
          <div className="flex flex-col text-left leading-none">
            <span className="font-extrabold text-sm md:text-base tracking-wider uppercase">
              <span className="text-blue-500">FLOW</span>
              <span className="text-white">BOARD</span>
            </span>
            <span className="text-[9px] font-mono text-slate-400 tracking-widest font-semibold mt-0.5">
              PLAN. ALGORITHM. BUILD.
            </span>
          </div>
        </button>

        {viewMode === 'workspace' && currentProject && (
          <>
            <div className="h-6 w-px bg-white/15 hidden md:block"></div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 cursor-pointer hover:bg-white/5 px-2 py-1 rounded-xl transition-colors group">
                {isEditingTitle ? (
                  <form onSubmit={handleTitleSubmit}>
                    <input
                      type="text"
                      autoFocus
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onBlur={() => setIsEditingTitle(false)}
                      className="text-xs font-bold text-white bg-slate-900 border border-blue-500 rounded-lg px-2 py-0.5 outline-none"
                    />
                  </form>
                ) : (
                  <h1
                    onClick={() => {
                      setTitleInput(currentProject.title);
                      setIsEditingTitle(true);
                    }}
                    className="font-bold text-xs md:text-sm text-white flex items-center gap-1.5"
                  >
                    <span>{currentProject.title}</span>
                    <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-blue-400 transition-colors">
                      edit
                    </span>
                  </h1>
                )}
              </div>
              <span className="text-[10px] text-slate-400 ml-2 flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Saved to cloud
              </span>
            </div>
          </>
        )}
      </div>

      {/* Dashboard Center Search */}
      {viewMode === 'dashboard' && (
        <div className="flex-1 max-w-lg mx-6 relative hidden md:block">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspace architecture, diagrams & tasks... (Ctrl + K)"
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs text-white focus:ring-2 focus:ring-blue-500 focus:bg-slate-900/90 transition-all h-9 outline-none placeholder:text-slate-500 font-medium"
          />
        </div>
      )}

      {/* Right Action Bar */}
      <div className="flex items-center gap-2.5">
        {viewMode === 'dashboard' ? (
          <>
            <button
              onClick={onNewProject}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>New Project</span>
            </button>

            {/* Auth Login / Account Menu */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity outline-none cursor-pointer"
                  title={currentUser.displayName || currentUser.email || 'Account'}
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="User avatar"
                      className="w-8 h-8 rounded-full object-cover border-2 border-blue-500 shadow-md"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center border border-blue-400">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-11 w-56 bg-[#121215] border border-white/15 rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95">
                    <div className="px-2 py-1.5 border-b border-white/10">
                      <p className="font-bold text-xs text-white truncate">
                        {currentUser.displayName || 'Firebase User'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{currentUser.email}</p>
                    </div>

                    {onOpenUserProfileModal && (
                      <button
                        onClick={() => {
                          onOpenUserProfileModal();
                          setShowUserMenu(false);
                        }}
                        className="flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-blue-400 hover:bg-blue-600/20 transition-colors text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">account_circle</span>
                        <span>User Profile</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5 border border-white/10 shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-emerald-400">login</span>
                <span>Sign in</span>
              </button>
            )}
          </>
        ) : (
          <>
            {/* Universal AI Command Bar Trigger */}
            {onOpenCommandBar && (
              <button
                onClick={onOpenCommandBar}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                title="Universal AI Command Bar (Ctrl + K)"
              >
                <span className="material-symbols-outlined text-base animate-pulse">auto_awesome</span>
                <span className="hidden sm:inline">AI Command</span>
                <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">Ctrl+K</span>
              </button>
            )}

            {/* Quick Capture Trigger */}
            {onOpenQuickCapture && (
              <button
                onClick={onOpenQuickCapture}
                className="bg-slate-900 hover:bg-slate-800 text-blue-300 border border-blue-500/30 text-xs font-bold px-3 py-2 rounded-full transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                title="Quick Capture Idea / Task (Ctrl + Shift + C)"
              >
                <span className="material-symbols-outlined text-base text-amber-400">bolt</span>
                <span className="hidden lg:inline">Capture</span>
              </button>
            )}

            {/* Knowledge Base Trigger */}
            {onOpenKnowledgeBase && (
              <button
                onClick={onOpenKnowledgeBase}
                className="bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 text-xs font-bold px-3 py-2 rounded-full transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                title="Workspace Knowledge Base Documents"
              >
                <span className="material-symbols-outlined text-base text-purple-400">menu_book</span>
                <span className="hidden lg:inline">Knowledge</span>
              </button>
            )}

            {/* Export Dropdown Menu */}
            {currentProject && (
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-bold px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Export Diagram"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  <span>Export</span>
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-11 w-52 bg-[#121215] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        exportProjectToPng(currentProject);
                        setShowExportMenu(false);
                      }}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-blue-600/20 hover:text-blue-400 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-blue-400">image</span>
                      <span>Export PNG Image</span>
                    </button>

                    <button
                      onClick={() => {
                        exportProjectToSvg(currentProject);
                        setShowExportMenu(false);
                      }}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-blue-600/20 hover:text-blue-400 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-blue-400">code</span>
                      <span>Export SVG Vector</span>
                    </button>

                    <button
                      onClick={() => {
                        exportProjectToJson(currentProject);
                        setShowExportMenu(false);
                      }}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-blue-600/20 hover:text-blue-400 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-amber-400">data_object</span>
                      <span>Export JSON Backup</span>
                    </button>

                    {onOpenDriveModal && (
                      <button
                        onClick={() => {
                          setShowExportMenu(false);
                          onOpenDriveModal();
                        }}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-emerald-600/20 hover:text-emerald-400 transition-colors text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base text-emerald-400">add_to_drive</span>
                        <span>Save to Google Drive</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {onOpenTeamModal && (
              <button
                onClick={onOpenTeamModal}
                className="bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 text-xs font-bold px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Create Team & Invite Members via Email"
              >
                <span className="material-symbols-outlined text-base">groups</span>
                <span className="hidden sm:inline font-bold">{activeTeamName}</span>
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  Invite
                </span>
              </button>
            )}

            <button
              onClick={onOpenShareModal}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-full transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">share</span>
              <span>Share</span>
            </button>

            {/* Auth Profile in Workspace */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity outline-none cursor-pointer"
                  title={currentUser.displayName || currentUser.email || 'Account'}
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="User avatar"
                      className="w-8 h-8 rounded-full object-cover border-2 border-blue-500 shadow-md"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center border border-blue-400">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-11 w-56 bg-[#121215] border border-white/15 rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95">
                    <div className="px-2 py-1.5 border-b border-white/10">
                      <p className="font-bold text-xs text-white truncate">
                        {currentUser.displayName || 'Firebase User'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{currentUser.email}</p>
                    </div>

                    {onOpenUserProfileModal && (
                      <button
                        onClick={() => {
                          onOpenUserProfileModal();
                          setShowUserMenu(false);
                        }}
                        className="flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-blue-400 hover:bg-blue-600/20 transition-colors text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">account_circle</span>
                        <span>User Profile</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-full transition-all flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm text-emerald-400">login</span>
                <span>Sign in</span>
              </button>
            )}

            <button
              onClick={onOpenDashboard}
              title="Return to Projects Dashboard"
              className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">grid_view</span>
            </button>
          </>
        )}
      </div>

      {/* Mobile Menu Drawer */}
      {showMobileMenu && setActiveCategory && (
        <div className="absolute top-16 left-0 w-full bg-[#121215] border-b border-white/15 shadow-2xl p-4 z-50 md:hidden flex flex-col gap-2 animate-in slide-in-from-top-2">
          <div className="mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          {[
            { id: 'My Projects', label: 'My Projects', icon: 'dashboard' },
            { id: 'Shared with me', label: 'Shared with me', icon: 'group' },
            { id: 'Templates', label: 'Templates', icon: 'dashboard_customize' },
            { id: 'Trash', label: 'Trash', icon: 'delete' },
          ].map((item) => {
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveCategory(item.id as any);
                  setShowMobileMenu(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
          {onOpenSettings && (
            <button
              onClick={() => {
                onOpenSettings();
                setShowMobileMenu(false);
              }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white text-left transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">settings</span>
              <span>Settings</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
