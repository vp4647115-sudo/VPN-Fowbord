import React, { useState } from 'react';
import { Project } from '../types';
import { TEMPLATES, TemplateItem } from '../data/templates';

interface DashboardProps {
  projects: Project[];
  activeCategory: string;
  searchQuery: string;
  onSelectProject: (p: Project) => void;
  onNewProject: () => void;
  onOpenAiModal: () => void;
  onOpenTeamModal?: () => void;
  onDeleteProject: (id: string) => void;
  onPermanentDeleteProject?: (id: string) => void;
  onRestoreProject?: (id: string) => void;
  onEmptyTrash?: () => void;
  onDuplicateProject: (p: Project) => void;
  onUseTemplate?: (tmpl: TemplateItem) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  activeCategory,
  searchQuery,
  onSelectProject,
  onNewProject,
  onOpenAiModal,
  onOpenTeamModal,
  onDeleteProject,
  onPermanentDeleteProject,
  onRestoreProject,
  onEmptyTrash,
  onDuplicateProject,
  onUseTemplate,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedTemplateTag, setSelectedTemplateTag] = useState<string>('All');

  // Filter projects according to category and search query
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeCategory === 'Trash') {
      return (p.category === 'Trash' || (p as any).isTrashed) && matchesSearch;
    }

    if (activeCategory === 'Shared with me') {
      return (
        (p.category === 'Shared with me' || (p as any).isShared) &&
        p.category !== 'Trash' &&
        !(p as any).isTrashed &&
        matchesSearch
      );
    }

    // Default: 'My Projects'
    return (
      p.category !== 'Trash' &&
      !(p as any).isTrashed &&
      p.category !== 'Shared with me' &&
      matchesSearch
    );
  });

  // Filter templates
  const filteredTemplates = TEMPLATES.filter((tmpl) => {
    const matchesTag = selectedTemplateTag === 'All' || tmpl.tag === selectedTemplateTag;
    const matchesSearch =
      !searchQuery ||
      tmpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  return (
    <main className="flex-1 overflow-y-auto bg-[#f7f9fb] p-6 md:p-10 pt-20">
      <div className="max-w-7xl mx-auto">
        {/* Header Section based on active category */}
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8 border-b border-[#c3c6d7]/30 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[#004ac6] text-2xl">
                {activeCategory === 'Templates'
                  ? 'dashboard_customize'
                  : activeCategory === 'Shared with me'
                  ? 'groups'
                  : activeCategory === 'Trash'
                  ? 'delete'
                  : 'dashboard'}
              </span>
              <h1 className="font-headline text-2xl md:text-3xl font-bold text-[#191c1e]">
                {activeCategory === 'Templates'
                  ? 'Whiteboard Templates'
                  : activeCategory === 'Shared with me'
                  ? 'Shared with Me'
                  : activeCategory === 'Trash'
                  ? 'Trash Bin'
                  : 'Recent Projects'}
              </h1>
            </div>
            <p className="text-[#434655] text-xs md:text-sm">
              {activeCategory === 'Templates'
                ? 'Launch production-ready architectural diagrams, mind maps, and agile flows in 1-click.'
                : activeCategory === 'Shared with me'
                ? 'Whiteboards and canvas diagrams shared by team members and collaborators.'
                : activeCategory === 'Trash'
                ? 'Deleted projects stored here. You can restore them or delete them permanently.'
                : 'Pick up where you left off or create a new board.'}
            </p>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-3">
            {activeCategory === 'Trash' ? (
              filteredProjects.length > 0 && (
                <button
                  onClick={onEmptyTrash}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">delete_forever</span>
                  Empty Trash
                </button>
              )
            ) : activeCategory === 'Shared with me' ? (
              <button
                onClick={onOpenTeamModal}
                className="px-4 py-2 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">group_add</span>
                Invite Team Members
              </button>
            ) : (
              <button
                onClick={onOpenAiModal}
                className="px-3.5 py-2 bg-[#ffdbcd] hover:bg-[#ffb596] text-[#943700] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span
                  className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                AI Diagram Generator
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: TEMPLATES CATEGORY */}
        {activeCategory === 'Templates' && (
          <div className="space-y-6">
            {/* Template Tag Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {['All', 'Architecture', 'Mind Map', 'Agile', 'Flowchart'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTemplateTag(tag)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    selectedTemplateTag === tag
                      ? 'bg-[#004ac6] text-white shadow-xs'
                      : 'bg-white text-[#434655] hover:bg-[#e0e3e5] border border-[#c3c6d7]/50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="bg-white border border-[#c3c6d7]/50 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between group p-5 relative"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs ${tmpl.color}`}
                        >
                          <span className="material-symbols-outlined text-2xl">{tmpl.icon}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#004ac6] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            {tmpl.tag}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-[#004ac6] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        Interactive Template
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[#191c1e] mb-2 group-hover:text-[#004ac6] transition-colors">
                      {tmpl.title}
                    </h3>
                    <p className="text-xs text-[#434655] leading-relaxed mb-6">
                      {tmpl.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#c3c6d7]/20 flex items-center justify-between">
                    <span className="text-[11px] text-[#737686] font-medium">Ready to edit</span>
                    <button
                      onClick={() => onUseTemplate && onUseTemplate(tmpl)}
                      className="bg-[#004ac6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base">add_box</span>
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 2: TRASH CATEGORY */}
        {activeCategory === 'Trash' && (
          <div>
            {filteredProjects.length === 0 ? (
              <div className="bg-white border border-[#c3c6d7]/40 rounded-3xl p-12 text-center max-w-md mx-auto my-12 shadow-sm space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-4xl">delete_outline</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#191c1e]">Trash is empty</h3>
                  <p className="text-xs text-[#737686] mt-1">
                    Deleted whiteboards will be listed here. You can restore them anytime.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="bg-white border border-red-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          Trashed
                        </span>
                        <span className="text-xs text-[#737686]">{proj.updatedLabel}</span>
                      </div>
                      <h3 className="font-bold text-sm text-[#191c1e] mb-1 truncate">{proj.title}</h3>
                      <p className="text-xs text-[#737686] line-clamp-2 mb-4">{proj.description}</p>
                    </div>

                    <div className="pt-3 border-t border-[#c3c6d7]/30 flex items-center gap-2">
                      <button
                        onClick={() => onRestoreProject && onRestoreProject(proj.id)}
                        className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-base">restore_from_trash</span>
                        Restore
                      </button>
                      <button
                        onClick={() => onPermanentDeleteProject && onPermanentDeleteProject(proj.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors"
                        title="Delete Permanently"
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

        {/* VIEW 3: SHARED WITH ME CATEGORY */}
        {activeCategory === 'Shared with me' && (
          <div>
            {filteredProjects.length === 0 ? (
              <div className="bg-white border border-[#c3c6d7]/40 rounded-3xl p-12 text-center max-w-md mx-auto my-12 shadow-sm space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-[#004ac6] flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-4xl">groups</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#191c1e]">No shared boards yet</h3>
                  <p className="text-xs text-[#737686] mt-1">
                    When team members invite you via email or share board links, they will show up here.
                  </p>
                </div>
                <button
                  onClick={onOpenTeamModal}
                  className="bg-[#004ac6] hover:bg-[#2563eb] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">group_add</span>
                  Create Team & Invite
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => onSelectProject(proj)}
                    className="group bg-white border border-[#c3c6d7]/40 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer relative"
                  >
                    <div className="h-40 bg-[#f8fafc] border-b border-[#c3c6d7]/30 relative flex items-center justify-center p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#004ac6] shadow-xs">
                          <span className="material-symbols-outlined text-xl">account_tree</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#191c1e] block">Shared Flow</span>
                          <span className="text-[10px] text-[#737686] font-medium">Live Canvas Board</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="bg-blue-100 text-[#004ac6] text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Shared
                        </span>
                        <span className="text-[11px] text-[#737686]">{proj.updatedLabel}</span>
                      </div>
                      <h3 className="font-bold text-sm text-[#191c1e] truncate">{proj.title}</h3>
                      <p className="text-xs text-[#737686] truncate">{proj.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: MY PROJECTS CATEGORY (STANDARD GRID) */}
        {activeCategory === 'My Projects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj)}
                className="group bg-white border border-[#c3c6d7]/40 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer relative"
              >
                {/* Preview Thumbnail */}
                <div className="h-44 bg-[#f2f4f6] border-b border-[#c3c6d7]/30 relative overflow-hidden">
                  {proj.thumbnail ? (
                    <div
                      className="w-full h-full bg-cover bg-top transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url('${proj.thumbnail}')` }}
                    />
                  ) : (
                    <div className="w-full h-full canvas-bg flex items-center justify-center p-4">
                      <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#c3c6d7]/40 shadow-xs">
                        <div className="w-8 h-8 rounded-xl bg-[#004ac6] text-white flex items-center justify-center shadow-xs">
                          <span className="material-symbols-outlined text-lg">schema</span>
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-[#191c1e] block">Canvas Flowboard</span>
                          <span className="text-[10px] text-[#737686] font-medium">Visual Whiteboard</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-[#f7f9fb]/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(proj);
                      }}
                      className="bg-[#004ac6] hover:bg-[#2563eb] text-white px-5 py-2 rounded-full text-xs font-semibold shadow-md flex items-center gap-2 transition-transform active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Open Workspace
                    </button>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 flex items-start justify-between">
                  <div className="flex-1 pr-2 min-w-0">
                    <h3 className="font-semibold text-sm md:text-base text-[#191c1e] mb-1 truncate">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-[#737686] truncate">
                      {proj.updatedLabel || 'Edited recently'}
                    </p>
                  </div>

                  {/* 3 Dots Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === proj.id ? null : proj.id);
                      }}
                      className="p-1 rounded-full text-[#737686] hover:bg-[#f2f4f6] hover:text-[#191c1e] transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">more_vert</span>
                    </button>

                    {activeMenuId === proj.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 bottom-8 w-40 bg-white border border-[#c3c6d7] rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95"
                      >
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onSelectProject(proj);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#191c1e] hover:bg-[#f2f4f6] flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          Open
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onDuplicateProject(proj);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#191c1e] hover:bg-[#f2f4f6] flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                          Duplicate
                        </button>
                        <div className="h-px bg-[#c3c6d7]/30 my-1"></div>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onDeleteProject(proj.id);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Move to Trash
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Blank Canvas Tile */}
            <div
              onClick={onNewProject}
              className="bg-white border-2 border-dashed border-[#c3c6d7] rounded-2xl overflow-hidden hover:border-[#004ac6] hover:bg-[#2563eb]/5 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[220px] p-6 text-center group"
            >
              <div className="w-14 h-14 rounded-full bg-[#2563eb]/15 flex items-center justify-center text-[#004ac6] mb-3 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">add</span>
              </div>
              <span className="font-headline font-bold text-base text-[#004ac6] mb-1">
                Blank Canvas
              </span>
              <span className="text-xs text-[#737686]">Start a new whiteboard from scratch</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
