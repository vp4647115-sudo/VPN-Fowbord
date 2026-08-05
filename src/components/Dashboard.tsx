import React, { useState } from 'react';
import { Project } from '../types';

interface DashboardProps {
  projects: Project[];
  activeCategory: string;
  searchQuery: string;
  onSelectProject: (p: Project) => void;
  onNewProject: () => void;
  onOpenAiModal: () => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (p: Project) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  activeCategory,
  searchQuery,
  onSelectProject,
  onNewProject,
  onOpenAiModal,
  onDeleteProject,
  onDuplicateProject,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) => {
    const matchesCategory =
      activeCategory === 'My Projects' || p.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="flex-1 overflow-y-auto bg-[#f7f9fb] p-6 md:p-10 pt-20">
      <div className="max-w-7xl mx-auto">
        {/* Header Title Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="font-headline text-2xl md:text-3xl font-bold text-[#191c1e] mb-1">
              Recent Projects
            </h1>
            <p className="text-[#434655] text-sm md:text-base">
              Pick up where you left off.
            </p>
          </div>

          {/* Sort & Quick AI button */}
          <div className="flex items-center gap-3">
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
            <button className="p-2 border border-[#c3c6d7] rounded-xl text-[#434655] hover:bg-[#eceef0] transition-colors">
              <span className="material-symbols-outlined text-xl">sort</span>
            </button>
          </div>
        </div>

        {/* Projects Grid */}
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
                  <div className="w-full h-full canvas-bg flex items-center justify-center p-4 opacity-80">
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="material-symbols-outlined text-3xl text-[#004ac6] mb-1">
                        schema
                      </span>
                      <span className="text-xs font-semibold text-[#434655]">
                        {proj.nodes.length} Canvas Nodes
                      </span>
                    </div>
                  </div>
                )}

                {/* Glassmorphism hover overlay */}
                <div className="absolute inset-0 bg-[#f7f9fb]/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProject(proj);
                    }}
                    className="bg-[#004ac6] hover:bg-[#2563eb] text-white px-5 py-2 rounded-full text-xs font-semibold shadow-md flex items-center gap-2 transition-transform active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">
                      edit
                    </span>
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
                      setActiveMenuId(
                        activeMenuId === proj.id ? null : proj.id
                      );
                    }}
                    className="p-1 rounded-full text-[#737686] hover:bg-[#f2f4f6] hover:text-[#191c1e] transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      more_vert
                    </span>
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
                        <span className="material-symbols-outlined text-sm">
                          open_in_new
                        </span>
                        Open
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          onDuplicateProject(proj);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#191c1e] hover:bg-[#f2f4f6] flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">
                          content_copy
                        </span>
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
                        <span className="material-symbols-outlined text-sm">
                          delete
                        </span>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Card 4: Blank Canvas Tile */}
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
            <span className="text-xs text-[#737686]">
              Start a new whiteboard from scratch
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};
