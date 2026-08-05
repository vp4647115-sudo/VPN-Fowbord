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
  onOpenAiModal: () => void;
  onOpenShareModal: () => void;
  onOpenTeamModal?: () => void;
  activeTeamName?: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNewProject: () => void;
  onRenameProject: (newTitle: string) => void;
  activeCategory?: string;
  setActiveCategory?: (cat: any) => void;
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  currentProject,
  currentUser,
  onLogin,
  onLogout,
  onOpenDashboard,
  onOpenAiModal,
  onOpenShareModal,
  onOpenTeamModal,
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
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-3 h-16 bg-[#ffffff]/90 backdrop-blur-xl border-b border-[#c3c6d7]/40 shadow-sm transition-all">
      {/* Left Branding & Title */}
      <div className="flex items-center gap-3">
        {viewMode === 'dashboard' && setActiveCategory && (
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 rounded-xl text-[#434655] hover:bg-[#e0e3e5]/60 transition-colors"
            title="Toggle Menu"
          >
            <span className="material-symbols-outlined text-xl">
              {showMobileMenu ? 'close' : 'menu'}
            </span>
          </button>
        )}

        <button
          onClick={onOpenDashboard}
          className="text-base md:text-lg font-headline font-bold text-[#004ac6] hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <span>FlowBoard AI</span>
        </button>

        {viewMode === 'workspace' && currentProject && (
          <>
            <div className="h-6 w-px bg-[#c3c6d7]/60 hidden md:block"></div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 cursor-pointer hover:bg-[#f2f4f6] px-2 py-0.5 -ml-2 rounded-lg transition-colors group">
                {isEditingTitle ? (
                  <form onSubmit={handleTitleSubmit}>
                    <input
                      type="text"
                      autoFocus
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onBlur={() => setIsEditingTitle(false)}
                      className="text-sm font-semibold text-[#191c1e] bg-white border border-[#004ac6] rounded px-1 outline-none"
                    />
                  </form>
                ) : (
                  <h1
                    onClick={() => {
                      setTitleInput(currentProject.title);
                      setIsEditingTitle(true);
                    }}
                    className="font-semibold text-sm md:text-base text-[#191c1e] flex items-center gap-1"
                  >
                    {currentProject.title}
                    <span className="material-symbols-outlined text-base text-[#434655] group-hover:text-[#004ac6] transition-colors">
                      edit
                    </span>
                  </h1>
                )}
              </div>
              <span className="text-[11px] text-[#737686] ml-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Saved to cloud
              </span>
            </div>
          </>
        )}
      </div>

      {/* Dashboard Center Search */}
      {viewMode === 'dashboard' && (
        <div className="flex-1 max-w-xl mx-8 relative hidden md:block">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737686] text-xl">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-[#e0e3e5]/70 border-none rounded-full py-2 pl-10 pr-4 text-sm text-[#191c1e] focus:ring-2 focus:ring-[#004ac6] focus:bg-white transition-all h-10 outline-none placeholder:text-[#737686]"
          />
        </div>
      )}

      {/* Right Action Bar */}
      <div className="flex items-center gap-3">
        {viewMode === 'dashboard' ? (
          <>
            <button
              onClick={onNewProject}
              className="bg-[#2563eb] hover:bg-[#004ac6] text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New Project
            </button>
            <button
              onClick={onOpenAiModal}
              title="AI Diagram Generator"
              className="bg-[#ffdbcd] text-[#943700] hover:bg-[#ffb596] px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              AI Generator
            </button>

            {/* Auth Login / Account Menu */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity outline-none"
                  title={currentUser.displayName || currentUser.email || 'Account'}
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="User avatar"
                      className="w-8 h-8 rounded-full object-cover border-2 border-[#004ac6] shadow-xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#004ac6] text-white font-bold text-xs flex items-center justify-center border border-white">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-11 w-56 bg-white border border-[#c3c6d7] rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95">
                    <div className="px-1 py-1 border-b border-[#c3c6d7]/30">
                      <p className="font-bold text-xs text-[#191c1e] truncate">
                        {currentUser.displayName || 'Firebase User'}
                      </p>
                      <p className="text-[10px] text-[#737686] truncate">{currentUser.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-base">logout</span>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-bold px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-base text-[#34d399]">login</span>
                Sign in with Google
              </button>
            )}
          </>
        ) : (
          <>
            {/* Export Dropdown Menu */}
            {currentProject && (
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="bg-[#f2f4f6] hover:bg-[#e0e3e5] text-[#191c1e] border border-[#c3c6d7] text-xs font-bold px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-xs"
                  title="Export Diagram"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  Export
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-11 w-48 bg-white border border-[#c3c6d7] rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        exportProjectToPng(currentProject);
                        setShowExportMenu(false);
                      }}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-[#191c1e] hover:bg-[#e0f2fe] hover:text-[#004ac6] transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-base text-[#004ac6]">image</span>
                      Export PNG Image
                    </button>

                    <button
                      onClick={() => {
                        exportProjectToSvg(currentProject);
                        setShowExportMenu(false);
                      }}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-[#191c1e] hover:bg-[#e0f2fe] hover:text-[#004ac6] transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-base text-[#2563eb]">code</span>
                      Export SVG Vector
                    </button>

                    <button
                      onClick={() => {
                        exportProjectToJson(currentProject);
                        setShowExportMenu(false);
                      }}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-[#191c1e] hover:bg-[#e0f2fe] hover:text-[#004ac6] transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-base text-[#943700]">data_object</span>
                      Export JSON Backup
                    </button>
                  </div>
                )}
              </div>
            )}

            {onOpenTeamModal && (
              <button
                onClick={onOpenTeamModal}
                className="bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] border border-[#7dd3fc] text-xs font-bold px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-xs"
                title="Create Team & Invite Members via Email"
              >
                <span className="material-symbols-outlined text-base">groups</span>
                <span className="hidden sm:inline font-bold">{activeTeamName}</span>
                <span className="bg-[#0284c7] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  Invite
                </span>
              </button>
            )}

            <button
              onClick={onOpenShareModal}
              className="bg-[#004ac6] text-white hover:bg-[#2563eb] text-xs font-semibold px-4 py-2 rounded-full transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">share</span>
              Share
            </button>

            {/* Auth Profile in Workspace */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity outline-none"
                  title={currentUser.displayName || currentUser.email || 'Account'}
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="User avatar"
                      className="w-8 h-8 rounded-full object-cover border-2 border-[#004ac6] shadow-xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#004ac6] text-white font-bold text-xs flex items-center justify-center border border-white">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-11 w-56 bg-white border border-[#c3c6d7] rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95">
                    <div className="px-1 py-1 border-b border-[#c3c6d7]/30">
                      <p className="font-bold text-xs text-[#191c1e] truncate">
                        {currentUser.displayName || 'Firebase User'}
                      </p>
                      <p className="text-[10px] text-[#737686] truncate">{currentUser.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-base">logout</span>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-bold px-3 py-2 rounded-full transition-all flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm text-[#34d399]">login</span>
                Sign in
              </button>
            )}

            <button
              onClick={onOpenDashboard}
              title="Return to Projects Dashboard"
              className="text-[#434655] hover:bg-[#e0e3e5] p-2 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">grid_view</span>
            </button>
          </>
        )}
      </div>

      {/* Mobile Menu Drawer */}
      {showMobileMenu && setActiveCategory && (
        <div className="absolute top-16 left-0 w-full bg-white border-b border-[#c3c6d7] shadow-xl p-4 z-50 md:hidden flex flex-col gap-2 animate-in slide-in-from-top-2">
          <div className="mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-[#f2f4f6] border border-[#c3c6d7]/50 rounded-xl py-2 px-3 text-xs text-[#191c1e] focus:ring-2 focus:ring-[#004ac6] focus:bg-white transition-all outline-none"
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
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-left transition-colors ${
                  isActive
                    ? 'bg-[#2563eb]/10 text-[#004ac6] font-bold'
                    : 'text-[#434655] hover:bg-[#f2f4f6]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
          {onOpenSettings && (
            <button
              onClick={() => {
                onOpenSettings();
                setShowMobileMenu(false);
              }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#434655] hover:bg-[#f2f4f6] text-left transition-colors"
            >
              <span className="material-symbols-outlined text-lg">settings</span>
              Settings
            </button>
          )}
        </div>
      )}
    </header>
  );
};

