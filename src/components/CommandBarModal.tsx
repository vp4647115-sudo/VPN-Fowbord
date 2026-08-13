import React, { useState, useEffect } from 'react';
import { Project, CanvasNode } from '../types';
import { getApiUrl } from '../lib/api';

interface CommandBarModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
  onUpdateProject?: (updated: Partial<Project>) => void;
  onNavigateMode?: (mode: 'canvas' | 'board' | 'timeline' | 'table' | 'calendar' | 'analytics' | 'presentation') => void;
}

export const CommandBarModal: React.FC<CommandBarModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onNavigateMode,
}) => {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent, or toggle state if managed internally
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExecuteCommand = async (customPrompt?: string) => {
    const activePrompt = customPrompt || query;
    if (!activePrompt.trim()) return;

    setIsProcessing(true);
    setStatusMessage('FlowBoard AI processing command...');

    try {
      const lower = activePrompt.toLowerCase();

      // Check if command switches view modes
      if (lower.includes('kanban') || lower.includes('board view')) {
        onNavigateMode?.('board');
        setStatusMessage('Switched to Kanban Board View');
        setIsProcessing(false);
        setTimeout(onClose, 600);
        return;
      }
      if (lower.includes('gantt') || lower.includes('timeline')) {
        onNavigateMode?.('timeline');
        setStatusMessage('Switched to Timeline View');
        setIsProcessing(false);
        setTimeout(onClose, 600);
        return;
      }
      if (lower.includes('table') || lower.includes('grid') || lower.includes('list')) {
        onNavigateMode?.('table');
        setStatusMessage('Switched to Table View');
        setIsProcessing(false);
        setTimeout(onClose, 600);
        return;
      }
      if (lower.includes('analytics') || lower.includes('health') || lower.includes('metrics')) {
        onNavigateMode?.('analytics');
        setStatusMessage('Switched to Analytics View');
        setIsProcessing(false);
        setTimeout(onClose, 600);
        return;
      }
      if (lower.includes('presentation') || lower.includes('present')) {
        onNavigateMode?.('presentation');
        setStatusMessage('Switched to Presentation Mode');
        setIsProcessing(false);
        setTimeout(onClose, 600);
        return;
      }

      // Check if command is WBS task decomposition
      if (lower.includes('decompose') || lower.includes('turn into tasks') || lower.includes('break down') || lower.includes('project plan')) {
        const res = await fetch(getApiUrl('/api/ai/decompose'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: project?.title || 'Project Tasks', prompt: activePrompt }),
        });
        const data = await res.json();
        if (data.success && data.result && onUpdateProject && project) {
          const newNodes: CanvasNode[] = [];
          let xOffset = 200;
          let yOffset = 180;

          data.result.epics?.forEach((epic: any, eIdx: number) => {
            newNodes.push({
              id: `epic-${Date.now()}-${eIdx}`,
              type: 'project',
              title: epic.title,
              subtitle: epic.description,
              x: xOffset,
              y: yOffset,
              color: '#f3e8ff',
              borderColor: '#7e22ce',
              status: 'In Progress',
              priority: 'High',
            });

            epic.tasks?.forEach((task: any, tIdx: number) => {
              newNodes.push({
                id: `task-${Date.now()}-${eIdx}-${tIdx}`,
                type: 'task',
                title: task.title,
                subtitle: task.subtitle || `Estimate: ${task.estimate || '1d'}`,
                x: xOffset + (tIdx + 1) * 260,
                y: yOffset + 120,
                color: '#ffffff',
                borderColor: '#004ac6',
                status: task.status || 'Todo',
                priority: task.priority || 'Medium',
                estimate: task.estimate,
              });
            });

            yOffset += 260;
          });

          onUpdateProject({
            nodes: [...(project.nodes || []), ...newNodes],
          });
          setStatusMessage(`Successfully generated ${newNodes.length} task nodes on Canvas!`);
        }
      } else {
        // Default AI Diagram Flow Generation
        const res = await fetch(getApiUrl('/api/ai/generate-diagram'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: activePrompt }),
        });
        const data = await res.json();

        if (data.success && data.diagram && onUpdateProject) {
          onUpdateProject({
            title: data.diagram.title || project?.title || 'Generated Flow',
            nodes: data.diagram.nodes || [],
            connectors: data.diagram.connectors || [],
          });
          setStatusMessage('Generated new visual workspace flow!');
        }
      }
    } catch (err: any) {
      console.error('Command Execution Error:', err);
      setStatusMessage('Error processing command. Please try again.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setStatusMessage('');
        onClose();
      }, 1200);
    }
  };

  const QUICK_PROMPTS = [
    { label: '🏗️ E-Commerce Architecture', prompt: 'Create e-commerce order processing workflow' },
    { label: '⚙️ Microservice API Gateway', prompt: 'Create API Gateway microservice diagram with Auth and Redis' },
    { label: '📋 Decompose into Tasks', prompt: 'Decompose this application into development tasks and milestones' },
    { label: '🚨 Find Bottlenecks & Fix', prompt: 'Analyze flow and identify bottlenecks and missing failure paths' },
    { label: '📊 View Kanban Board', prompt: 'Switch to Kanban Board View' },
    { label: '📈 View Timeline Gantt', prompt: 'Switch to Timeline View' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 sm:pt-28 bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#121215] border border-white/15 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100">
        
        {/* Header Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-white/5">
          <span className="material-symbols-outlined text-blue-400 text-xl animate-pulse">auto_awesome</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleExecuteCommand();
            }}
            placeholder="Ask FlowBoard AI or type a command... (e.g. 'Create SaaS Architecture', 'Decompose tasks')"
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none font-medium"
            autoFocus
          />
          <span className="px-2 py-1 rounded bg-white/10 text-[10px] font-mono font-bold text-slate-300 tracking-wider uppercase">
            Ctrl + K
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Status indicator */}
        {statusMessage && (
          <div className="px-4 py-2 bg-blue-500/20 border-b border-blue-500/30 text-xs text-blue-200 font-semibold flex items-center gap-2">
            {isProcessing && <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Suggested Quick Commands */}
        <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Suggested AI Workflows</span>
            <span>Press Enter to run</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleExecuteCommand(item.prompt)}
                disabled={isProcessing}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/40 text-left transition-all group cursor-pointer"
              >
                <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-300">
                  {item.label}
                </span>
                <span className="material-symbols-outlined text-xs text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>FlowBoard Gemini 3.6 Engine Active</span>
          </div>
          <span>Esc to exit</span>
        </div>

      </div>
    </div>
  );
};
