import React, { useState, useEffect } from 'react';
import { Project } from '../types';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project | null;
  onProjectImported?: (project: Project) => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  size?: string;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onProjectImported,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportingId, setIsImportingId] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [linkedFolderUrl, setLinkedFolderUrl] = useState<string>('https://drive.google.com/drive/folders/1UEWnpeuRRhMsBv67HQouRUo-yjDYeDuI?usp=sharing');
  const [linkedFolderId, setLinkedFolderId] = useState<string>('1UEWnpeuRRhMsBv67HQouRUo-yjDYeDuI');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const checkStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/drive/status');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      
      const data = await res.json();
      if (data && data.success) {
        setIsConnected(data.connected);
        if (data.linkedFolderUrl) setLinkedFolderUrl(data.linkedFolderUrl);
        if (data.linkedFolderId) setLinkedFolderId(data.linkedFolderId);

        if (data.connected) {
          fetchFiles();
        }
      }
    } catch (e) {
      console.warn('Drive status endpoint not available:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/drive/files');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;

      const data = await res.json();
      if (data && data.success && Array.isArray(data.files)) {
        setFiles(data.files);
      }
    } catch (e) {
      console.warn('Drive files endpoint not available:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  // Listen for popup auth completion message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GOOGLE_DRIVE_AUTH_SUCCESS') {
        setIsConnected(true);
        setMessage({ text: 'Google Drive connected successfully!', type: 'success' });
        fetchFiles();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnect = async () => {
    try {
      setMessage(null);
      const res = await fetch('/api/drive/auth-url');
      const data = await res.json();
      if (data.success && data.url) {
        // Open OAuth consent in a popup window
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(
          data.url,
          'GoogleDriveAuth',
          `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
        );
      } else {
        setMessage({ text: data.error || 'Failed to get auth URL', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Error connecting to Google Drive', type: 'error' });
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/drive/disconnect', { method: 'POST' });
      setIsConnected(false);
      setFiles([]);
      setMessage({ text: 'Disconnected from Google Drive', type: 'success' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async () => {
    if (!currentProject) return;
    try {
      setIsExporting(true);
      setMessage(null);
      const res = await fetch('/api/drive/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: currentProject }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message || 'Diagram exported to Google Drive!', type: 'success' });
        fetchFiles();
      } else {
        setMessage({ text: data.error || 'Failed to export to Google Drive', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Error exporting to Google Drive', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (fileId: string) => {
    try {
      setIsImportingId(fileId);
      setMessage(null);
      const res = await fetch(`/api/drive/import/${fileId}`);
      const data = await res.json();
      if (data.success && data.project) {
        setMessage({ text: `Imported "${data.project.title}" to Canvas!`, type: 'success' });
        if (onProjectImported) {
          onProjectImported(data.project);
        }
        setTimeout(() => onClose(), 1200);
      } else {
        setMessage({ text: data.error || 'Failed to import file', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Error importing file from Google Drive', type: 'error' });
    } finally {
      setIsImportingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-[#c3c6d7] rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#c3c6d7]/30 flex items-center justify-between bg-gradient-to-r from-[#f0f4f9] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f0fe] flex items-center justify-center border border-[#1a73e8]/20 shadow-xs">
              <svg className="w-6 h-6" viewBox="0 0 87.3 78">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l13.75 23.8z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h27.5c0-1.55-.4-3.1-1.2-4.5l-25.4-44c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8z" fill="#ffba00"/>
                <path d="m27.5 53 13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h18.5c1.6 0 3.15-.45 4.5-1.2l-13.75-23.8z" fill="#2684fc"/>
              </svg>
            </div>
            <div>
              <h2 className="font-headline font-bold text-lg text-[#191c1e]">Google Drive Cloud Sync</h2>
              <p className="text-xs text-[#737686]">Save & load diagrams directly from your Drive folder</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#e0e3e5] flex items-center justify-center text-[#434655] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Notification Message */}
          {message && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {message.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{message.text}</span>
            </div>
          )}

          {/* Linked Folder Banner */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-[#1a73e8]">folder_shared</span>
              <div>
                <div className="text-xs font-bold text-[#1e293b] flex items-center gap-1.5">
                  Linked Google Drive Folder
                  <span className="bg-[#e0f2fe] text-[#0369a1] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <div className="text-[11px] text-[#64748b] font-mono truncate max-w-xs">
                  ID: {linkedFolderId}
                </div>
              </div>
            </div>
            <a
              href={linkedFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-[#1a73e8] hover:underline flex items-center gap-1 self-end sm:self-center bg-white px-3 py-1.5 rounded-xl border border-[#cbd5e1] shadow-xs hover:bg-[#f1f5f9] transition-colors"
            >
              Open in Drive
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>
          </div>

          {/* Connection Card */}
          {isLoading ? (
            <div className="py-8 flex items-center justify-center text-[#737686] text-xs font-semibold gap-2">
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              Checking Google Drive authorization...
            </div>
          ) : !isConnected ? (
            <div className="text-center py-8 border-2 border-dashed border-[#c3c6d7] rounded-3xl p-6 bg-[#fafafa]">
              <div className="w-14 h-14 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mx-auto mb-3 text-2xl">
                <span className="material-symbols-outlined text-3xl">cloud_sync</span>
              </div>
              <h3 className="font-bold text-sm text-[#191c1e] mb-1">Connect Your Google Drive</h3>
              <p className="text-xs text-[#737686] max-w-sm mx-auto mb-5">
                Authorize FlowBoard AI to view files and save diagram files directly into your connected Google Drive folder.
              </p>
              <button
                onClick={handleConnect}
                className="bg-[#1a73e8] hover:bg-[#1557b0] text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-md transition-all flex items-center gap-2 mx-auto active:scale-95"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 87.3 78">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#ffffff"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#ffffff"/>
                </svg>
                Authorize & Connect Google Drive
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Connected Status header */}
              <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-900">Connected to Google Drive</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                >
                  Disconnect
                </button>
              </div>

              {/* Save Current Diagram to Drive */}
              {currentProject && (
                <div className="bg-gradient-to-r from-[#eef2ff] to-[#f0fdf4] border border-[#c7d2fe] p-4 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-[#1e1b4b]">Save Current Canvas to Drive</h4>
                    <p className="text-[11px] text-[#4338ca] font-medium">
                      "{currentProject.title}" ({currentProject.nodes.length} nodes)
                    </p>
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="bg-[#004ac6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {isExporting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">cloud_upload</span>
                        Save to Drive
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Files List in Linked Folder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-[#191c1e] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#1a73e8]">folder</span>
                    Diagrams & Files in Linked Folder
                  </h4>
                  <button
                    onClick={fetchFiles}
                    className="text-xs font-semibold text-[#004ac6] hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Refresh List
                  </button>
                </div>

                {files.length === 0 ? (
                  <div className="p-8 text-center text-[#737686] bg-[#f8fafc] rounded-2xl border border-[#e2e8f0]">
                    <span className="material-symbols-outlined text-3xl text-[#94a3b8] mb-1">description</span>
                    <p className="text-xs font-semibold">No diagrams or files found in this Drive folder yet.</p>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5">Click "Save to Drive" above to upload your first diagram!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 bg-white border border-[#e2e8f0] hover:border-[#1a73e8] rounded-2xl flex items-center justify-between gap-3 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">
                              {file.name.endsWith('.json') || file.name.endsWith('.flow.json')
                                ? 'schema'
                                : 'description'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#1e293b] truncate">{file.name}</div>
                            <div className="text-[10px] text-[#64748b]">
                              {file.modifiedTime
                                ? new Date(file.modifiedTime).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Google Drive File'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-[#64748b] hover:text-[#1a73e8] hover:bg-[#f1f5f9] rounded-lg transition-colors"
                              title="View file in Google Drive"
                            >
                              <span className="material-symbols-outlined text-base">open_in_new</span>
                            </a>
                          )}
                          <button
                            onClick={() => handleImport(file.id)}
                            disabled={isImportingId === file.id}
                            className="bg-[#1a73e8] hover:bg-[#1557b0] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs disabled:opacity-50"
                          >
                            {isImportingId === file.id ? (
                              <>
                                <span className="material-symbols-outlined animate-spin text-xs">progress_activity</span>
                                Loading...
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-xs">file_download</span>
                                Import
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#c3c6d7]/30 bg-[#f8fafc] flex items-center justify-between">
          <a
            href={linkedFolderUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#64748b] hover:text-[#1a73e8] font-medium flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">folder</span>
            Folder ID: {linkedFolderId.slice(0, 8)}...
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full text-xs font-bold bg-[#e0e3e5] hover:bg-[#c3c6d7] text-[#191c1e] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
