import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDriveModal?: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenJwtModal?: () => void;
  gridStyle?: 'dot' | 'line' | 'blank';
  onChangeGridStyle?: (style: 'dot' | 'line' | 'blank') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenDriveModal,
  onOpenSupabaseModal,
  onOpenJwtModal,
  gridStyle = 'dot',
  onChangeGridStyle,
}) => {
  const [selectedModel, setSelectedModel] = useState('gemini-3.6-flash');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="modal-panel rounded-3xl w-full max-w-md overflow-hidden shadow-2xl bg-white flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#c3c6d7]/30 flex items-center justify-between bg-gradient-to-r from-[#004ac6] to-[#2563eb] text-white">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-white text-2xl">settings</span>
            <h3 className="font-headline font-bold text-lg text-white">
              Workspace Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 text-xs">
          {/* AI Model selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#434655] uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-[#004ac6]">auto_awesome</span>
              Gemini AI Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-[#f2f4f6] border border-[#c3c6d7] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#191c1e] outline-none focus:border-[#004ac6]"
            >
              <option value="gemini-3.6-flash">gemini-3.6-flash (Fast & Accurate)</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex Reasoning)</option>
            </select>
          </div>

          {/* Grid background style */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#434655] uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-[#004ac6]">grid_view</span>
              Canvas Background Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onChangeGridStyle && onChangeGridStyle('dot')}
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  gridStyle === 'dot'
                    ? 'border-2 border-[#004ac6] bg-blue-50 text-[#004ac6] shadow-xs'
                    : 'border border-[#c3c6d7] bg-white text-[#434655] hover:bg-[#f2f4f6]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#004ac6]"></span> Dot Grid
              </button>
              <button
                type="button"
                onClick={() => onChangeGridStyle && onChangeGridStyle('line')}
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  gridStyle === 'line'
                    ? 'border-2 border-[#004ac6] bg-blue-50 text-[#004ac6] shadow-xs'
                    : 'border border-[#c3c6d7] bg-white text-[#434655] hover:bg-[#f2f4f6]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">grid_4x4</span> Line Grid
              </button>
              <button
                type="button"
                onClick={() => onChangeGridStyle && onChangeGridStyle('blank')}
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  gridStyle === 'blank'
                    ? 'border-2 border-[#004ac6] bg-blue-50 text-[#004ac6] shadow-xs'
                    : 'border border-[#c3c6d7] bg-white text-[#434655] hover:bg-[#f2f4f6]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">crop_square</span> Blank White
              </button>
            </div>
          </div>

          {/* Cloud Integrations Section */}
          <div className="border-t border-[#c3c6d7]/30 pt-4 flex flex-col gap-2">
            <label className="text-[10px] font-bold text-[#434655] uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-[#004ac6]">cloud_sync</span>
              Cloud Integrations
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {onOpenDriveModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDriveModal();
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl font-bold text-emerald-800 transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-base text-emerald-600">add_to_drive</span>
                  Drive
                </button>
              )}
              {onOpenSupabaseModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSupabaseModal();
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-base text-emerald-400">database</span>
                  Supabase DB
                </button>
              )}
              {onOpenJwtModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenJwtModal();
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-base text-amber-300">key</span>
                  JWT Worker
                </button>
              )}
            </div>
          </div>

          {/* Auto-save & sync */}
          <div className="flex items-center justify-between border-t border-[#c3c6d7]/30 pt-4">
            <div>
              <div className="text-xs font-bold text-[#191c1e]">Real-time Auto Save</div>
              <div className="text-[11px] text-[#737686]">Sync workspace changes to Express Cloud API</div>
            </div>
            <button
              type="button"
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${
                autoSaveEnabled ? 'bg-[#004ac6]' : 'bg-[#c3c6d7]'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                  autoSaveEnabled ? 'right-1' : 'left-1'
                }`}
              ></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
