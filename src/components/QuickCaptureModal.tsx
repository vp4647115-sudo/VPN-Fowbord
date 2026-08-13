import React, { useState } from 'react';
import { Project, QuickCaptureItem, CanvasNode } from '../types';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
  onUpdateProject?: (updated: Partial<Project>) => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
}) => {
  const [type, setType] = useState<'idea' | 'task' | 'bug' | 'note' | 'link'>('idea');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');

  if (!isOpen) return null;

  const handleSaveCapture = () => {
    if (!title.trim()) return;

    const newItem: QuickCaptureItem = {
      id: `qc-${Date.now()}`,
      type,
      title: title.trim(),
      details: details.trim(),
      createdAt: new Date().toISOString(),
    };

    // Also optionally convert directly to a Canvas Node if project exists
    if (project && onUpdateProject) {
      const existingCaptures = project.quickCaptures || [];
      const nodeTypeMap: Record<string, any> = {
        idea: 'sticky',
        task: 'task',
        bug: 'bug',
        note: 'text',
        link: 'website',
      };

      const colorMap: Record<string, { bg: string; border: string }> = {
        idea: { bg: '#fef3c7', border: '#d97706' },
        task: { bg: '#ffffff', border: '#004ac6' },
        bug: { bg: '#fee2e2', border: '#dc2626' },
        note: { bg: '#f3e8ff', border: '#7e22ce' },
        link: { bg: '#e0f2fe', border: '#0284c7' },
      };

      const newNode: CanvasNode = {
        id: `node-qc-${Date.now()}`,
        type: nodeTypeMap[type] || 'sticky',
        title: title.trim(),
        subtitle: details.trim() || `Captured ${type}`,
        x: 240 + Math.random() * 120,
        y: 200 + Math.random() * 120,
        color: colorMap[type].bg,
        borderColor: colorMap[type].border,
        status: type === 'task' || type === 'bug' ? 'Todo' : undefined,
        priority: type === 'bug' ? 'High' : 'Medium',
      };

      onUpdateProject({
        quickCaptures: [newItem, ...existingCaptures],
        nodes: [...(project.nodes || []), newNode],
      });
    }

    setTitle('');
    setDetails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#121215] border border-white/15 rounded-2xl shadow-2xl p-6 font-sans text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">bolt</span>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white tracking-tight">Quick Capture</h3>
              <p className="text-xs text-slate-400">Instantly record thoughts or tasks to your workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Type Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5 mb-4">
          {(['idea', 'task', 'bug', 'note', 'link'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                type === t
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Form Inputs */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Title / Summary
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${type} title...`}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Additional Details / Description
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Add optional notes, specifications, or context..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveCapture}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Add to Workspace</span>
          </button>
        </div>

      </div>
    </div>
  );
};
