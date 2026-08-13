import React, { useState } from 'react';
import { Project, KnowledgeDoc } from '../types';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
  onUpdateProject?: (updated: Partial<Project>) => void;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
}) => {
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<'pdf' | 'doc' | 'notes' | 'spec' | 'url'>('notes');
  const [docContent, setDocContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const docs = project?.knowledgeDocs || [];

  const handleAddDocument = () => {
    if (!docTitle.trim() || !docContent.trim() || !project || !onUpdateProject) return;

    const newDoc: KnowledgeDoc = {
      id: `doc-${Date.now()}`,
      title: docTitle.trim(),
      type: docType,
      content: docContent.trim(),
      updatedAt: new Date().toLocaleDateString(),
    };

    onUpdateProject({
      knowledgeDocs: [newDoc, ...docs],
    });

    setDocTitle('');
    setDocContent('');
  };

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-[#121215] border border-white/15 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">menu_book</span>
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">Workspace Knowledge Base</h3>
              <p className="text-xs text-slate-400">RAG context & documents for FlowBoard AI agents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-hidden flex-1">
          
          {/* Left: Add Document */}
          <div className="p-5 space-y-4 overflow-y-auto">
            <h4 className="text-xs font-extrabold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">note_add</span>
              Add Knowledge Document
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. System Architecture Spec v2"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e: any) => setDocType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
              >
                <option value="notes">Meeting Notes</option>
                <option value="spec">Specification / PRD</option>
                <option value="pdf">PDF Document</option>
                <option value="doc">Word / Google Doc</option>
                <option value="url">External Link / URL</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Content / Notes
              </label>
              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                rows={6}
                placeholder="Paste specifications, API requirements, business rules, or notes..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-medium resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAddDocument}
              disabled={!docTitle.trim() || !docContent.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">cloud_upload</span>
              <span>Save Knowledge Document</span>
            </button>
          </div>

          {/* Right: Existing Documents */}
          <div className="p-5 space-y-4 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">library_books</span>
                Stored Documents ({docs.length})
              </h4>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 pl-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <span className="material-symbols-outlined text-sm text-slate-500 absolute left-2.5 top-2">
                search
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
              {filteredDocs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
                  <span className="material-symbols-outlined text-3xl mb-1 block">description</span>
                  <p className="text-xs font-medium">No knowledge documents stored yet.</p>
                </div>
              ) : (
                filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-white/5 border border-white/5 rounded-xl hover:border-purple-500/30 transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[180px]">
                        {doc.title}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase">
                        {doc.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {doc.content}
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono pt-1">
                      Updated: {doc.updatedAt}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
