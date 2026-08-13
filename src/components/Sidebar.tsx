import React from 'react';

interface SidebarProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  onOpenSettings: () => void;
  onOpenCommandBar?: () => void;
  onOpenQuickCapture?: () => void;
  onOpenKnowledgeBase?: () => void;
  onOpenWebhookModal?: () => void;
  onOpenSkillModal?: () => void;
  onOpenUserProfileModal?: () => void;
  onOpenDriveModal?: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenTeamModal?: () => void;
  activeTeamName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeCategory,
  setActiveCategory,
  onOpenSettings,
  onOpenCommandBar,
  onOpenQuickCapture,
  onOpenKnowledgeBase,
  onOpenWebhookModal,
  onOpenSkillModal,
  onOpenUserProfileModal,
  onOpenDriveModal,
  onOpenSupabaseModal,
  onOpenTeamModal,
  activeTeamName = 'Engineering Flow Team',
}) => {
  const mainNav = [
    { id: 'Overview', label: 'Overview', icon: 'dashboard' },
    { id: 'Boards', label: 'Boards', icon: 'view_kanban' },
    { id: 'Projects', label: 'Projects', icon: 'folder' },
    { id: 'Tasks', label: 'Tasks', icon: 'task_alt' },
    { id: 'Calendar', label: 'Calendar', icon: 'calendar_month' },
  ];

  const workspaceNav = [
    { id: 'Knowledge', label: 'Knowledge', icon: 'menu_book' },
    { id: 'Automations', label: 'Automations', icon: 'webhook' },
    { id: 'Integrations', label: 'Integrations', icon: 'extension' },
    { id: 'Analytics', label: 'Analytics', icon: 'analytics' },
  ];

  return (
    <aside className="w-64 border-r border-white/10 bg-[#0c0d12] text-slate-200 h-full flex flex-col py-5 px-3 hidden md:flex shrink-0 z-20 pt-20 overflow-y-auto select-none">
      
      {/* SECTION 1: MAIN */}
      <div className="mb-5">
        <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          MAIN
        </div>
        <nav className="flex flex-col gap-1">
          {mainNav.map((item) => {
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveCategory(item.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30 shadow-xs'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* SECTION 2: AI */}
      <div className="mb-5">
        <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-blue-400 flex items-center justify-between">
          <span>AI</span>
          <span className="bg-blue-500/20 text-blue-300 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">GEMINI 3.6</span>
        </div>
        <nav className="flex flex-col gap-1">
          {onOpenCommandBar && (
            <button
              onClick={onOpenCommandBar}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-blue-600/20 border border-transparent hover:border-blue-500/30 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg text-blue-400 animate-pulse">auto_awesome</span>
                <span>AI Command</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 group-hover:text-blue-300">Ctrl+K</span>
            </button>
          )}

          <button
            onClick={() => onOpenCommandBar?.()}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg text-indigo-400">account_tree</span>
            <span>Generate Flow</span>
          </button>

          <button
            onClick={() => onOpenCommandBar?.()}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg text-cyan-400">schema</span>
            <span>Generate Diagram</span>
          </button>

          {onOpenSkillModal && (
            <button
              onClick={onOpenSkillModal}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg text-purple-400">psychology</span>
              <span>AI Agents</span>
            </button>
          )}
        </nav>
      </div>

      {/* SECTION 3: WORKSPACE */}
      <div className="mb-5">
        <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          WORKSPACE
        </div>
        <nav className="flex flex-col gap-1">
          {workspaceNav.map((item) => {
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'Knowledge' && onOpenKnowledgeBase) {
                    onOpenKnowledgeBase();
                  } else if (item.id === 'Automations' && onOpenWebhookModal) {
                    onOpenWebhookModal();
                  } else {
                    setActiveCategory(item.id);
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30 shadow-xs'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* SECTION 4: SYSTEM & BOTTOM */}
      <div className="mt-auto pt-4 border-t border-white/10 space-y-1">
        <div className="px-3 mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          SYSTEM
        </div>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg text-slate-400">settings</span>
          <span>Settings</span>
        </button>

        <button
          onClick={() => onOpenCommandBar?.()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg text-slate-400">help_outline</span>
          <span>Help & Docs</span>
        </button>

        {/* BOTTOM: Workspace switcher & User profile */}
        <div className="pt-3 border-t border-white/10 mt-2 space-y-1">
          {onOpenTeamModal && (
            <button
              onClick={onOpenTeamModal}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                  FW
                </div>
                <span className="text-xs font-bold text-slate-200 truncate">{activeTeamName}</span>
              </div>
              <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-white">unfold_more</span>
            </button>
          )}

          {onOpenUserProfileModal && (
            <button
              onClick={onOpenUserProfileModal}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                U
              </div>
              <span className="truncate">User Profile</span>
            </button>
          )}
        </div>
      </div>

    </aside>
  );
};
