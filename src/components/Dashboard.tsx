import React, { useState } from 'react';
import { Project } from '../types';
import { TEMPLATES, TemplateItem } from '../data/templates';

interface DashboardProps {
  projects: Project[];
  activeCategory: string;
  searchQuery: string;
  onSelectProject: (p: Project) => void;
  onNewProject: () => void;
  onOpenTeamModal?: () => void;
  onDeleteProject: (id: string) => void;
  onPermanentDeleteProject?: (id: string) => void;
  onRestoreProject?: (id: string) => void;
  onEmptyTrash?: () => void;
  onDuplicateProject: (p: Project) => void;
  onUseTemplate?: (tmpl: TemplateItem) => void;
  onOpenCommandBar?: () => void;
  onOpenKnowledgeBase?: () => void;
  onOpenWebhookModal?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  activeCategory = 'Overview',
  searchQuery,
  onSelectProject,
  onNewProject,
  onOpenTeamModal,
  onDeleteProject,
  onPermanentDeleteProject,
  onRestoreProject,
  onEmptyTrash,
  onDuplicateProject,
  onUseTemplate,
  onOpenCommandBar,
  onOpenKnowledgeBase,
  onOpenWebhookModal,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedTemplateTag, setSelectedTemplateTag] = useState<string>('All');
  const [boardSubTab, setBoardSubTab] = useState<'all' | 'shared' | 'templates' | 'trash'>('all');
  const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');

  // Filter projects according to search query
  const searchLower = searchQuery.toLowerCase();

  const activeProjects = projects.filter(
    (p) => !(p as any).isTrashed && p.category !== 'Trash'
  );

  const sharedProjects = projects.filter(
    (p) => ((p as any).isShared || p.category === 'Shared with me') && !(p as any).isTrashed
  );

  const trashedProjects = projects.filter(
    (p) => (p as any).isTrashed || p.category === 'Trash'
  );

  // Filter templates
  const filteredTemplates = TEMPLATES.filter((tmpl) => {
    const matchesTag = selectedTemplateTag === 'All' || tmpl.tag === selectedTemplateTag;
    const matchesSearch =
      !searchQuery ||
      tmpl.title.toLowerCase().includes(searchLower) ||
      tmpl.description.toLowerCase().includes(searchLower);
    return matchesTag && matchesSearch;
  });

  // KPI Calculations
  const activeBoardsCount = activeProjects.length;
  const totalNodesCount = projects.reduce((acc, p) => acc + (p.nodes?.length || 0), 0);
  const allNodesList = projects.flatMap((p) =>
    (p.nodes || []).map((n) => ({ ...n, projectTitle: p.title, projectId: p.id }))
  );
  const openTasksCount = allNodesList.filter((n) => n.status && n.status !== 'Done').length;
  const completedTasksCount = allNodesList.filter((n) => n.status === 'Done').length;

  return (
    <main className="flex-1 overflow-y-auto bg-[#0a0a0c] text-slate-100 p-6 md:p-10 select-none">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="material-symbols-outlined text-blue-500 text-2xl">
                {activeCategory === 'Overview'
                  ? 'dashboard'
                  : activeCategory === 'Boards'
                  ? 'view_kanban'
                  : activeCategory === 'Projects'
                  ? 'folder'
                  : activeCategory === 'Tasks'
                  ? 'task_alt'
                  : activeCategory === 'Calendar'
                  ? 'calendar_month'
                  : activeCategory === 'Analytics'
                  ? 'analytics'
                  : activeCategory === 'Integrations'
                  ? 'extension'
                  : 'schema'}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
                {activeCategory === 'Overview'
                  ? 'Workspace Overview'
                  : activeCategory === 'Boards'
                  ? 'Whiteboard Canvas Directory'
                  : activeCategory === 'Projects'
                  ? 'Projects & Workflows'
                  : activeCategory === 'Tasks'
                  ? 'Global Task Directory'
                  : activeCategory === 'Calendar'
                  ? 'Milestones & Calendar'
                  : activeCategory === 'Analytics'
                  ? 'System Analytics'
                  : activeCategory === 'Integrations'
                  ? 'Integrations & Services'
                  : activeCategory}
              </h1>
            </div>
            <p className="text-slate-400 text-xs md:text-sm font-medium">
              {activeCategory === 'Overview'
                ? 'Welcome back. Monitor system architectures, active boards, task progress, and AI activities.'
                : activeCategory === 'Boards'
                ? 'Manage all visual architecture diagrams, team flows, templates, and trashed boards.'
                : activeCategory === 'Projects'
                ? 'High-level project execution tracking, health metrics, and team dependencies.'
                : activeCategory === 'Tasks'
                ? 'Kanban and list view of all system nodes, execution tasks, and assignments.'
                : activeCategory === 'Calendar'
                ? 'Timeline and calendar view of upcoming architectural milestones and project deadlines.'
                : activeCategory === 'Analytics'
                ? 'Detailed telemetry on diagram complexity, AI generations, and task completion velocity.'
                : 'Configure integrations, workspace services, and external connections.'}
            </p>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-3">
            {activeCategory === 'Boards' && boardSubTab === 'trash' ? (
              trashedProjects.length > 0 && (
                <button
                  onClick={onEmptyTrash}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">delete_forever</span>
                  <span>Empty Trash</span>
                </button>
              )
            ) : (
              <button
                onClick={onNewProject}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>New Board</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. OVERVIEW CATEGORY */}
        {(activeCategory === 'Overview' || activeCategory === 'My Projects') && (
          <div className="space-y-8">
            {/* KPI STAT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-[#121215] border border-white/10 rounded-2xl flex items-center gap-3.5 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">schema</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Active Boards</span>
                  <span className="text-xl font-black text-white">{activeBoardsCount}</span>
                </div>
              </div>

              <div className="p-4 bg-[#121215] border border-white/10 rounded-2xl flex items-center gap-3.5 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">account_tree</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">System Nodes</span>
                  <span className="text-xl font-black text-white">{totalNodesCount}</span>
                </div>
              </div>

              <div className="p-4 bg-[#121215] border border-white/10 rounded-2xl flex items-center gap-3.5 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">task_alt</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Open Tasks</span>
                  <span className="text-xl font-black text-emerald-400">{openTasksCount}</span>
                </div>
              </div>

              <div className="p-4 bg-[#121215] border border-white/10 rounded-2xl flex items-center gap-3.5 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl animate-pulse">auto_awesome</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Gemini 3.6 Engine</span>
                  <span className="text-xs font-bold text-amber-300">Active / Online</span>
                </div>
              </div>
            </div>

            {/* RECENT BOARDS GRID */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-extrabold text-lg text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">history</span>
                  <span>Recent Whiteboards</span>
                </h2>
                <button
                  onClick={onNewProject}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Create New</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeProjects
                  .filter((p) => !searchQuery || p.title.toLowerCase().includes(searchLower))
                  .slice(0, 8)
                  .map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => onSelectProject(proj)}
                      className="group bg-[#121215] border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer relative"
                    >
                      <div className="h-40 bg-slate-950 border-b border-white/10 relative overflow-hidden">
                        {proj.thumbnail ? (
                          <div
                            className="w-full h-full bg-cover bg-top transition-transform duration-500 group-hover:scale-105"
                            style={{ backgroundImage: `url('${proj.thumbnail}')` }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 to-slate-900">
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shadow-lg">
                              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                <span className="material-symbols-outlined text-lg">schema</span>
                              </div>
                              <div className="text-left">
                                <span className="text-xs font-bold text-white block">Canvas Flowboard</span>
                                <span className="text-[10px] text-slate-400 font-medium">Visual Whiteboard</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProject(proj);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            <span>Open Canvas</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-4 flex items-start justify-between">
                        <div className="flex-1 pr-2 min-w-0">
                          <h3 className="font-bold text-sm text-white mb-0.5 truncate group-hover:text-blue-400 transition-colors">
                            {proj.title}
                          </h3>
                          <p className="text-[11px] text-slate-400 truncate font-mono">
                            {proj.nodes?.length || 0} nodes • {proj.updatedLabel || 'Edited recently'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateProject(proj);
                          }}
                          className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                          title="Duplicate Board"
                        >
                          <span className="material-symbols-outlined text-base">content_copy</span>
                        </button>
                      </div>
                    </div>
                  ))}

                {/* Blank Canvas Tile */}
                <div
                  onClick={onNewProject}
                  className="bg-[#121215] border-2 border-dashed border-white/15 rounded-2xl overflow-hidden hover:border-blue-500 hover:bg-blue-600/10 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[200px] p-6 text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 mb-2 group-hover:scale-110 transition-transform border border-blue-500/30">
                    <span className="material-symbols-outlined text-2xl">add</span>
                  </div>
                  <span className="font-extrabold text-sm text-blue-400 mb-0.5 tracking-wide">
                    New Blank Canvas
                  </span>
                  <span className="text-[11px] text-slate-400">Launch clean board</span>
                </div>
              </div>
            </div>

            {/* AI ACTIVITY & SYSTEM STATUS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-white/10">
              {/* Left: AI Synthesis Hub */}
              <div className="p-6 bg-[#121215] border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-xl animate-pulse">auto_awesome</span>
                    <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">AI Command & Synthesis</h3>
                  </div>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold">
                    Gemini 3.6
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Transform natural language descriptions into complete architectural flowcharts, microservice layouts, and database relational models in seconds.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  {onOpenCommandBar && (
                    <button
                      onClick={onOpenCommandBar}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">auto_awesome</span>
                      <span>Launch AI Command (Ctrl+K)</span>
                    </button>
                  )}
                  {onOpenKnowledgeBase && (
                    <button
                      onClick={onOpenKnowledgeBase}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-purple-400">menu_book</span>
                      <span>Knowledge Base</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Team Collaboration & Automations */}
              <div className="p-6 bg-[#121215] border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-xl">group</span>
                    <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Team & Webhook Automations</h3>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                    Connected
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Invite engineering teammates, set up automated webhook triggers on diagram changes, and sync directly with Google Drive or Supabase.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  {onOpenTeamModal && (
                    <button
                      onClick={onOpenTeamModal}
                      className="bg-blue-900/60 hover:bg-blue-800/80 text-blue-300 border border-blue-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">group_add</span>
                      <span>Invite Members</span>
                    </button>
                  )}
                  {onOpenWebhookModal && (
                    <button
                      onClick={onOpenWebhookModal}
                      className="bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">webhook</span>
                      <span>Webhooks</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. BOARDS CATEGORY */}
        {activeCategory === 'Boards' && (
          <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              {[
                { id: 'all', label: 'All Boards', count: activeProjects.length, icon: 'view_kanban' },
                { id: 'shared', label: 'Shared with Me', count: sharedProjects.length, icon: 'groups' },
                { id: 'templates', label: 'Templates', count: TEMPLATES.length, icon: 'dashboard_customize' },
                { id: 'trash', label: 'Trash Bin', count: trashedProjects.length, icon: 'delete' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBoardSubTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    boardSubTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className="bg-black/30 px-2 py-0.5 rounded-full text-[10px] font-mono">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Subtab 1: ALL BOARDS */}
            {boardSubTab === 'all' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeProjects
                  .filter((p) => !searchQuery || p.title.toLowerCase().includes(searchLower))
                  .map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => onSelectProject(proj)}
                      className="group bg-[#121215] border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 hover:shadow-2xl transition-all duration-300 cursor-pointer relative"
                    >
                      <div className="h-44 bg-slate-950 border-b border-white/10 relative overflow-hidden">
                        {proj.thumbnail ? (
                          <div
                            className="w-full h-full bg-cover bg-top transition-transform duration-500 group-hover:scale-105"
                            style={{ backgroundImage: `url('${proj.thumbnail}')` }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 to-slate-900">
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shadow-lg">
                              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                <span className="material-symbols-outlined text-lg">schema</span>
                              </div>
                              <div className="text-left">
                                <span className="text-xs font-bold text-white block">Canvas Flowboard</span>
                                <span className="text-[10px] text-slate-400 font-medium">Visual Whiteboard</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProject(proj);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            <span>Open Workspace</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-4 flex items-start justify-between">
                        <div className="flex-1 pr-2 min-w-0">
                          <h3 className="font-bold text-sm text-white mb-1 truncate group-hover:text-blue-400 transition-colors">
                            {proj.title}
                          </h3>
                          <p className="text-xs text-slate-400 truncate font-mono">
                            {proj.updatedLabel || 'Edited recently'}
                          </p>
                        </div>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === proj.id ? null : proj.id);
                            }}
                            className="p-1 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-lg">more_vert</span>
                          </button>

                          {activeMenuId === proj.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 bottom-8 w-44 bg-[#1a1a20] border border-white/15 rounded-xl shadow-2xl py-1 z-30"
                            >
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onSelectProject(proj);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                                <span>Open</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onDuplicateProject(proj);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                <span>Duplicate</span>
                              </button>
                              <div className="h-px bg-white/10 my-1"></div>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onDeleteProject(proj.id);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 flex items-center gap-2 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                <span>Move to Trash</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                <div
                  onClick={onNewProject}
                  className="bg-[#121215] border-2 border-dashed border-white/15 rounded-2xl overflow-hidden hover:border-blue-500 hover:bg-blue-600/10 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[220px] p-6 text-center group"
                >
                  <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform border border-blue-500/30">
                    <span className="material-symbols-outlined text-3xl">add</span>
                  </div>
                  <span className="font-extrabold text-base text-blue-400 mb-1 tracking-wide">
                    Blank Canvas
                  </span>
                  <span className="text-xs text-slate-400">Start a new whiteboard from scratch</span>
                </div>
              </div>
            )}

            {/* Subtab 2: SHARED */}
            {boardSubTab === 'shared' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sharedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => onSelectProject(proj)}
                    className="group bg-[#121215] border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 cursor-pointer p-5 relative shadow-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                        Shared
                      </span>
                      <span className="text-[11px] text-slate-400">{proj.updatedLabel}</span>
                    </div>
                    <h3 className="font-bold text-base text-white truncate">{proj.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{proj.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Subtab 3: TEMPLATES */}
            {boardSubTab === 'templates' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 flex flex-col justify-between group p-5 relative shadow-xl"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${tmpl.color}`}>
                            <span className="material-symbols-outlined text-2xl">{tmpl.icon}</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                            {tmpl.tag}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-bold text-base text-white mb-2 group-hover:text-blue-400 transition-colors">
                        {tmpl.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed mb-6">
                        {tmpl.description}
                      </p>
                    </div>
                    <button
                      onClick={() => onUseTemplate && onUseTemplate(tmpl)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">add_box</span>
                      <span>Use Template</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Subtab 4: TRASH */}
            {boardSubTab === 'trash' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trashedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="bg-[#121215] border border-rose-500/30 rounded-2xl overflow-hidden shadow-xl p-5 flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-bold text-sm text-white mb-1 truncate">{proj.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4">{proj.description}</p>
                    </div>
                    <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                      <button
                        onClick={() => onRestoreProject && onRestoreProject(proj.id)}
                        className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">restore_from_trash</span>
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => onPermanentDeleteProject && onPermanentDeleteProject(proj.id)}
                        className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg">delete_forever</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. PROJECTS CATEGORY */}
        {activeCategory === 'Projects' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeProjects.map((proj) => {
                const nodeCount = proj.nodes?.length || 0;
                const completedNodes = proj.nodes?.filter((n) => n.status === 'Done').length || 0;
                const progressPct = nodeCount > 0 ? Math.round((completedNodes / nodeCount) * 100) : 100;

                return (
                  <div
                    key={proj.id}
                    onClick={() => onSelectProject(proj)}
                    className="bg-[#121215] border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 transition-all cursor-pointer shadow-xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        Active Health
                      </span>
                      <span className="text-xs font-mono text-slate-400">{progressPct}% Complete</span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-white mb-1 truncate">{proj.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{proj.description}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-400 font-mono">
                      <span>{nodeCount} Total Nodes</span>
                      <span>{completedNodes} Done</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. TASKS CATEGORY */}
        {activeCategory === 'Tasks' && (
          <div className="space-y-6">
            {/* Task Filter Pills */}
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'All Tasks' },
                { id: 'todo', label: 'To Do' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'done', label: 'Completed' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTaskFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    taskFilter === f.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Task Table */}
            <div className="bg-[#121215] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-white/10 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  <tr>
                    <th className="p-4">Task Name</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Assignee</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allNodesList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                        No tasks found in project diagrams. Add nodes with status on whiteboards to track tasks here.
                      </td>
                    </tr>
                  ) : (
                    allNodesList.map((node, i) => (
                      <tr key={node.id || i} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>{node.title || node.label || 'Task Node'}</span>
                        </td>
                        <td className="p-4 text-slate-400 font-mono">{node.projectTitle}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              node.status === 'Done'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : node.status === 'In Progress'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                            }`}
                          >
                            {node.status || 'To Do'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">{node.assignee || 'Unassigned'}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              const proj = projects.find((p) => p.id === node.projectId);
                              if (proj) onSelectProject(proj);
                            }}
                            className="text-blue-400 hover:underline font-bold"
                          >
                            Jump to Node
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. CALENDAR CATEGORY */}
        {activeCategory === 'Calendar' && (
          <div className="p-8 bg-[#121215] border border-white/10 rounded-2xl shadow-xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">calendar_month</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Project Timeline & Milestones</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Visual timeline representation for architecture releases, sprint deadlines, and diagram node dependencies.
              </p>
            </div>
          </div>
        )}

        {/* 6. ANALYTICS CATEGORY */}
        {activeCategory === 'Analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-[#121215] border border-white/10 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Diagrams</span>
                <p className="text-3xl font-black text-white">{activeProjects.length}</p>
              </div>
              <div className="p-6 bg-[#121215] border border-white/10 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total System Nodes</span>
                <p className="text-3xl font-black text-blue-400">{totalNodesCount}</p>
              </div>
              <div className="p-6 bg-[#121215] border border-white/10 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Completed Node Tasks</span>
                <p className="text-3xl font-black text-emerald-400">{completedTasksCount}</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
};
