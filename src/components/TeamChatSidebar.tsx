import React, { useState } from 'react';
import { ChatMessage } from '../types';

interface TeamChatSidebarProps {
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const TeamChatSidebar: React.FC<TeamChatSidebarProps> = ({
  chatMessages,
  onSendMessage,
  isOpen,
  onToggleOpen,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');
    onSendMessage(text);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        className="fixed right-4 top-20 z-40 bg-white/90 backdrop-blur-md border border-white/80 text-[#004ac6] hover:bg-[#004ac6] hover:text-white p-3 rounded-2xl shadow-xl flex items-center gap-2 transition-all hover:scale-105 group glass-panel"
        title="Open Team Chat"
      >
        <span className="material-symbols-outlined text-xl">forum</span>
        <span className="text-xs font-bold hidden sm:inline">Team Chat</span>
        {chatMessages.length > 0 && (
          <span className="w-2 h-2 rounded-full bg-[#004ac6] animate-ping"></span>
        )}
      </button>
    );
  }

  return (
    <aside className="fixed right-0 top-16 bottom-0 w-80 bg-white/95 backdrop-blur-2xl border-l border-[#c3c6d7]/40 shadow-2xl flex flex-col z-40 transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-[#c3c6d7]/30 flex justify-between items-center bg-[#f7f9fb]/90">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#004ac6] text-xl">
            forum
          </span>
          <h2 className="font-bold text-sm text-[#191c1e]">Team Chat</h2>
        </div>
        <button
          onClick={onToggleOpen}
          className="text-[#737686] hover:text-[#191c1e] hover:bg-[#e0e3e5] p-1 rounded-lg transition-colors"
          title="Hide Sidebar"
        >
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-[#f7f9fb]/40">
        {chatMessages.map((msg) => {
          if (msg.author === 'System') {
            return (
              <div
                key={msg.id}
                className="text-center text-[11px] text-[#737686] my-1 font-medium bg-[#e0e3e5]/50 py-1 px-3 rounded-full mx-auto"
              >
                {msg.text}
              </div>
            );
          }

          const isSelf = msg.author === 'You';

          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${
                isSelf ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-1.5 px-0.5">
                <span
                  className={`text-[11px] font-bold ${
                    isSelf ? 'text-[#004ac6]' : 'text-[#191c1e]'
                  }`}
                >
                  {msg.author}
                </span>
                <span className="text-[10px] text-[#737686]">{msg.time}</span>
              </div>

              <div
                className={`p-3 rounded-2xl text-xs max-w-[88%] leading-relaxed ${
                  isSelf
                    ? 'bg-[#004ac6] text-white rounded-tr-none shadow-xs'
                    : 'bg-[#f2f4f6] text-[#191c1e] rounded-tl-none border border-[#c3c6d7]/30'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-[#c3c6d7]/30 bg-white">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-[#f2f4f6] border border-[#c3c6d7] focus:border-[#004ac6] focus:bg-white rounded-xl py-2 pl-3.5 pr-10 text-xs font-normal text-[#191c1e] outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 text-[#004ac6] hover:text-[#2563eb] disabled:opacity-40 p-1"
          >
            <span className="material-symbols-outlined text-lg">send</span>
          </button>
        </form>
      </div>
    </aside>
  );
};
