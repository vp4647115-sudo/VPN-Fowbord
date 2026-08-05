import React, { useState } from 'react';
import { CanvasNode, Connector } from '../types';

interface AiDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiagramGenerated: (diagram: {
    title: string;
    description?: string;
    nodes: CanvasNode[];
    connectors: Connector[];
  }) => void;
}

export const AiDiagramModal: React.FC<AiDiagramModalProps> = ({
  isOpen,
  onClose,
  onDiagramGenerated,
}) => {
  const [prompt, setPrompt] = useState('Generate an AWS architecture for a serverless web app');
  const [diagramType, setDiagramType] = useState('Architecture');
  const [visualStyle, setVisualStyle] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    try {
      const res = await fetch('/api/ai/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.success && data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
      }
    } catch (err) {
      console.error('Enhance prompt failed:', err);
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, diagramType, visualStyle }),
      });
      const data = await res.json();
      if (data.success && data.diagram) {
        onDiagramGenerated({
          title: data.diagram.title || prompt,
          description: data.diagram.description || '',
          nodes: data.diagram.nodes || [],
          connectors: data.diagram.connectors || [],
        });
        onClose();
      } else {
        setError(data.error || 'Failed to generate diagram');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to AI service');
    } finally {
      setLoading(false);
    }
  };

  const recentPrompts = [
    'User authentication flow',
    'E-commerce database schema',
    'CI/CD Deployment Pipeline',
    'Stripe Payment Gateway Integration',
  ];

  return (
    <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="modal-panel rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#c3c6d7]/30 flex items-center justify-between bg-white/80">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#004ac6] text-2xl animate-sparkle" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            <h2 className="font-headline font-bold text-lg text-[#191c1e]">
              Generate AI Diagram
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#434655] hover:bg-[#e0e3e5]/60 p-1.5 rounded-full transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 flex flex-col gap-5 bg-[#ffffff]">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          {/* Prompt Area */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#434655] uppercase tracking-wider">
              Prompt
            </label>
            <div className="relative group">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                className="w-full h-32 resize-none bg-[#f2f4f6] border border-[#c3c6d7] rounded-xl p-4 text-[#191c1e] focus:border-[#004ac6] focus:bg-white focus:ring-2 focus:ring-[#004ac6]/20 transition-all text-sm outline-none shadow-inner"
                placeholder="Describe what you want to create (e.g., Microservice payment gateway flow)..."
              />
              {/* Floating actions inside textarea */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={enhancing || loading}
                  title="Enhance Prompt with AI"
                  className="text-[#434655] hover:text-[#004ac6] transition-colors p-1.5 bg-white/80 rounded-md shadow-sm border border-[#c3c6d7]/50 flex items-center gap-1 text-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    magic_button
                  </span>
                  {enhancing ? 'Enhancing...' : 'Enhance'}
                </button>
                <button
                  type="button"
                  onClick={() => setPrompt('')}
                  disabled={loading}
                  title="Clear"
                  className="text-[#434655] hover:text-red-600 transition-colors p-1.5 bg-white/80 rounded-md shadow-sm border border-[#c3c6d7]/50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    backspace
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Settings Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Diagram Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#434655] uppercase tracking-wider">
                Diagram Type
              </label>
              <div className="relative">
                <select
                  value={diagramType}
                  onChange={(e) => setDiagramType(e.target.value)}
                  className="w-full appearance-none bg-[#f2f4f6] border border-[#c3c6d7] rounded-xl px-4 py-3 text-[#191c1e] focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20 transition-all text-sm outline-none cursor-pointer pr-10 font-medium"
                >
                  <option value="Architecture">Architecture</option>
                  <option value="Flowchart">Flowchart</option>
                  <option value="Mind Map">Mind Map</option>
                  <option value="UML Class Diagram">UML Class Diagram</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#434655] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            {/* Visual Style */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#434655] uppercase tracking-wider">
                Visual Style
              </label>
              <div className="relative">
                <select
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                  className="w-full appearance-none bg-[#f2f4f6] border border-[#c3c6d7] rounded-xl px-4 py-3 text-[#191c1e] focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20 transition-all text-sm outline-none cursor-pointer pr-10 font-medium"
                >
                  <option value="Professional">Professional</option>
                  <option value="Hand-drawn">Hand-drawn</option>
                  <option value="Tech / Dark">Tech / Dark</option>
                  <option value="Minimalist">Minimalist</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#434655] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Recent Prompts */}
          <div className="flex flex-col gap-2.5 border-t border-[#c3c6d7]/30 pt-4">
            <label className="text-xs font-semibold text-[#434655] uppercase tracking-wider">
              Recent Prompts
            </label>
            <div className="flex flex-wrap gap-2">
              {recentPrompts.map((rp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(rp)}
                  className="px-3 py-1.5 bg-[#f2f4f6] hover:bg-[#e0e3e5] border border-[#c3c6d7]/60 rounded-full text-xs text-[#191c1e] transition-colors flex items-center gap-1.5 font-medium"
                >
                  <span className="material-symbols-outlined text-[14px] text-[#737686]">
                    history
                  </span>
                  {rp}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer / Action Area */}
        <div className="px-6 py-4 bg-[#f2f4f6]/70 border-t border-[#c3c6d7]/30 flex justify-between items-center">
          <div className="text-[#434655] text-xs font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#004ac6]">
              info
            </span>
            Consumes 5 AI Credits
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="bg-[#2563eb] hover:bg-[#004ac6] text-white font-headline font-semibold text-sm py-2.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Generating...
              </span>
            ) : (
              <>
                <span>Generate</span>
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  generating_tokens
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
