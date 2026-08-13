import React, { useState } from 'react';
import { Project, CanvasNode, BoardMode, TaskStatus, TaskPriority } from '../types';

interface BoardViewSwitcherProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  activeMode: BoardMode;
  onChangeMode: (mode: BoardMode) => void;
}

export const BoardViewSwitcher: React.FC<BoardViewSwitcherProps> = ({
  project,
  onUpdateProject,
  activeMode,
  onChangeMode,
}) => {
  const [selectedTask, setSelectedTask] = useState<CanvasNode | null>(null);

  const STATUS_COLUMNS: TaskStatus[] = ['Backlog', 'Todo', 'In Progress', 'Review', 'Blocked', 'Done'];

  const handleUpdateNodeStatus = (nodeId: string, newStatus: TaskStatus) => {
    const updatedNodes = (project.nodes || []).map((n) =>
      n.id === nodeId ? { ...n, status: newStatus } : n
    );
    onUpdateProject({ nodes: updatedNodes });
  };

  const handleUpdateNodePriority = (nodeId: string, newPriority: TaskPriority) => {
    const updatedNodes = (project.nodes || []).map((n) =>
      n.id === nodeId ? { ...n, priority: newPriority } : n
    );
    onUpdateProject({ nodes: updatedNodes });
  };

  const MODES: { id: BoardMode; label: string; icon: string }[] = [
    { id: 'canvas', label: 'Canvas', icon: 'draw' },
    { id: 'board', label: 'Kanban Board', icon: 'view_kanban' },
    { id: 'timeline', label: 'Timeline Gantt', icon: 'calendar_view_week' },
    { id: 'table', label: 'Table List', icon: 'table_chart' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'presentation', label: 'Presentation', icon: 'present_to_all' },
  ];

  // Render Kanban Board View
  const renderKanban = () => {
    const nodes = project.nodes || [];

    return (
      <div className="flex-1 p-6 overflow-x-auto bg-[#0a0a0c] text-white">
        <div className="flex items-start gap-4 min-w-[1200px] h-full">
          {STATUS_COLUMNS.map((colStatus) => {
            const colNodes = nodes.filter((n) => (n.status || 'Todo') === colStatus);

            return (
              <div
                key={colStatus}
                className="w-72 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col max-h-full"
              >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                      {colStatus}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                      {colNodes.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {colNodes.map((node) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedTask(node)}
                      className="p-3.5 bg-slate-900/90 border border-white/10 rounded-xl hover:border-blue-500/50 transition-all shadow-md cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-slate-300 uppercase">
                          {node.type}
                        </span>
                        {node.priority && (
                          <span
                            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                              node.priority === 'Urgent'
                                ? 'bg-red-500/20 text-red-400'
                                : node.priority === 'High'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-500/20 text-slate-400'
                            }`}
                          >
                            {node.priority}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                        {node.title}
                      </h4>

                      {node.subtitle && (
                        <p className="text-[11px] text-slate-400 line-clamp-2">{node.subtitle}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-500">
                        <span>{node.assignee || 'Unassigned'}</span>
                        <span>{node.estimate || '1d'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Timeline Gantt View
  const renderTimeline = () => {
    const nodes = project.nodes || [];

    return (
      <div className="flex-1 p-6 bg-[#0a0a0c] text-white overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">calendar_view_week</span>
              Project Execution Timeline & Gantt Chart
            </h3>
            <span className="text-xs text-slate-400">{nodes.length} Total Milestones & Tasks</span>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="py-2.5 px-3">Task / Milestone</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Progress</th>
                  <th className="py-2.5 px-3">Gantt Visual Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {nodes.map((n, i) => {
                  const progressPct = n.status === 'Done' ? 100 : n.status === 'In Progress' ? 50 : 15;

                  return (
                    <tr key={n.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>{n.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-blue-300">
                          {n.status || 'Todo'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{n.priority || 'Medium'}</td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-400">{progressPct}%</td>
                      <td className="py-3 px-3 w-72">
                        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden relative">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%`, marginLeft: `${(i % 3) * 15}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render Table List View
  const renderTable = () => {
    const nodes = project.nodes || [];

    return (
      <div className="flex-1 p-6 bg-[#0a0a0c] text-white overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">table_chart</span>
              Structured Task Directory
            </h3>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {nodes.map((n) => (
                  <tr key={n.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{n.title}</td>
                    <td className="py-3 px-4 text-slate-400">{n.type}</td>
                    <td className="py-3 px-4">
                      <select
                        value={n.status || 'Todo'}
                        onChange={(e) => handleUpdateNodeStatus(n.id, e.target.value as TaskStatus)}
                        className="bg-white/10 border border-white/10 rounded px-2 py-1 text-[11px] font-bold text-white focus:outline-none"
                      >
                        {STATUS_COLUMNS.map((st) => (
                          <option key={st} value={st} className="bg-slate-900 text-white">
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={n.priority || 'Medium'}
                        onChange={(e) => handleUpdateNodePriority(n.id, e.target.value as TaskPriority)}
                        className="bg-white/10 border border-white/10 rounded px-2 py-1 text-[11px] font-bold text-white focus:outline-none"
                      >
                        {(['Low', 'Medium', 'High', 'Urgent'] as TaskPriority[]).map((pr) => (
                          <option key={pr} value={pr} className="bg-slate-900 text-white">
                            {pr}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{n.assignee || 'Unassigned'}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedTask(n)}
                        className="text-blue-400 hover:text-blue-300 font-bold text-xs cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render Analytics View
  const renderAnalytics = () => {
    const nodes = project.nodes || [];
    const doneCount = nodes.filter((n) => n.status === 'Done').length;
    const inProgressCount = nodes.filter((n) => n.status === 'In Progress').length;
    const blockedCount = nodes.filter((n) => n.status === 'Blocked').length;

    const completionRate = nodes.length > 0 ? Math.round((doneCount / nodes.length) * 100) : 0;

    return (
      <div className="flex-1 p-6 bg-[#0a0a0c] text-white overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Nodes</span>
              <div className="text-2xl font-black text-white">{nodes.length}</div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Completion Rate</span>
              <div className="text-2xl font-black text-emerald-400">{completionRate}%</div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">In Progress</span>
              <div className="text-2xl font-black text-blue-400">{inProgressCount}</div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Blocked Tasks</span>
              <div className="text-2xl font-black text-red-400">{blockedCount}</div>
            </div>
          </div>

          <div className="p-6 bg-slate-900 border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Project Health & Throughput Analysis
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              FlowBoard AI continuously evaluates system throughput, node dependencies, and bottlenecks.
            </p>
            <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c]">
      {/* View Switcher Top Navigation Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#121215] border-b border-white/10 overflow-x-auto shrink-0">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onChangeMode(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMode === m.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-base">{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Render selected Mode view */}
      {activeMode === 'board' && renderKanban()}
      {activeMode === 'timeline' && renderTimeline()}
      {activeMode === 'table' && renderTable()}
      {activeMode === 'analytics' && renderAnalytics()}
      {activeMode === 'calendar' && renderTable()}
      {activeMode === 'presentation' && renderTimeline()}
    </div>
  );
};
