import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4">
      <div className="modal-panel rounded-2xl w-full max-w-md overflow-hidden shadow-2xl bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#c3c6d7]/30 flex items-center justify-between">
          <h3 className="font-headline font-bold text-lg text-[#191c1e]">
            Workspace Settings
          </h3>
          <button
            onClick={onClose}
            className="text-[#434655] hover:bg-[#e0e3e5] p-1.5 rounded-full"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5">
          {/* AI Model selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#434655] uppercase tracking-wider">
              Gemini AI Model
            </label>
            <select className="w-full bg-[#f2f4f6] border border-[#c3c6d7] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#191c1e] outline-none">
              <option value="gemini-3.6-flash">gemini-3.6-flash (Fast & Accurate)</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex Reasoning)</option>
            </select>
          </div>

          {/* Grid background style */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#434655] uppercase tracking-wider">
              Canvas Background
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button className="border-2 border-[#004ac6] bg-white p-2 rounded-xl text-xs font-bold text-[#004ac6] flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#004ac6]"></span> Dot Grid
              </button>
              <button className="border border-[#c3c6d7] bg-white p-2 rounded-xl text-xs font-bold text-[#434655] hover:bg-[#f2f4f6]">
                Line Grid
              </button>
              <button className="border border-[#c3c6d7] bg-white p-2 rounded-xl text-xs font-bold text-[#434655] hover:bg-[#f2f4f6]">
                Blank White
              </button>
            </div>
          </div>

          {/* Auto-save & sync */}
          <div className="flex items-center justify-between border-t border-[#c3c6d7]/30 pt-4">
            <div>
              <div className="text-xs font-bold text-[#191c1e]">Real-time Auto Save</div>
              <div className="text-[11px] text-[#737686]">Sync workspace changes to Express Cloud API</div>
            </div>
            <div className="w-10 h-6 bg-[#004ac6] rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
            </div>
          </div>

          {/* Export Options */}
          <div className="border-t border-[#c3c6d7]/30 pt-4 flex justify-between items-center">
            <span className="text-xs font-bold text-[#191c1e]">Export Board Data</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  alert('Exporting workspace as JSON...');
                  onClose();
                }}
                className="px-3 py-1.5 bg-[#f2f4f6] hover:bg-[#e0e3e5] rounded-lg text-xs font-bold text-[#191c1e]"
              >
                JSON
              </button>
              <button
                onClick={() => {
                  alert('Exporting canvas as PNG...');
                  onClose();
                }}
                className="px-3 py-1.5 bg-[#004ac6] text-white rounded-lg text-xs font-bold"
              >
                PNG Image
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
