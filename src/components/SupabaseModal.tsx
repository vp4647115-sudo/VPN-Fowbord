import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../lib/api';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [tableReady, setTableReady] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl('/api/supabase/status'));
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.success) {
        setIsConfigured(data.configured);
        setTableReady(data.tableReady);
        setRowCount(data.rowCount || 0);
        if (data.supabaseUrl) setSupabaseUrl(data.supabaseUrl);
      }
    } catch (e) {
      console.error('Failed to fetch Supabase status', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl || !supabaseKey) {
      setMessage({ text: 'Please fill out both Supabase URL and Key', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(getApiUrl('/api/supabase/credentials'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl, supabaseKey }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Supabase database connected successfully!', type: 'success' });
        fetchStatus();
      } else {
        setMessage({ text: data.error || 'Failed to connect Supabase', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error updating credentials', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const sqlSchemaSnippet = `CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'My Projects',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  nodes JSONB,
  connectors JSONB,
  comments JSONB,
  chat JSONB
);`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-[#c3c6d7] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#c3c6d7]/30 flex items-center justify-between bg-gradient-to-r from-[#111827] to-[#1f2937] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3ecf8e]/20 flex items-center justify-center border border-[#3ecf8e]/40 shadow-xs">
              <span className="material-symbols-outlined text-[#3ecf8e] text-2xl">database</span>
            </div>
            <div>
              <h2 className="font-headline font-bold text-lg text-white">Supabase Cloud Storage</h2>
              <p className="text-xs text-[#9ca3af]">Store all diagrams & canvas data in PostgreSQL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-[#9ca3af] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
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

          {/* Connection Status Banner */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1e293b] flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isConfigured ? 'bg-[#3ecf8e] animate-pulse' : 'bg-amber-400'
                  }`}
                ></span>
                Supabase Connection Status
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isConfigured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isConfigured ? 'Active / Configured' : 'Using Local DB Fallback'}
              </span>
            </div>

            {isConfigured && (
              <div className="text-[11px] text-[#64748b] space-y-1 pt-1 border-t border-[#e2e8f0]">
                <div>
                  <span className="font-semibold text-[#334155]">Supabase Table (projects):</span>{' '}
                  {tableReady ? (
                    <span className="text-emerald-600 font-bold">✓ Ready ({rowCount} rows)</span>
                  ) : (
                    <span className="text-amber-600 font-bold">⚠️ Table not detected yet</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSaveCredentials} className="space-y-3 bg-[#f1f5f9]/50 p-4 rounded-2xl border border-[#cbd5e1]/60">
            <h3 className="font-bold text-[#0f172a] text-xs">Supabase Credentials</h3>

            <div>
              <label className="block text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full bg-white border border-[#cbd5e1] rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-[#3ecf8e]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">
                Supabase API Key (Anon or Service Role)
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full bg-white border border-[#cbd5e1] rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-[#3ecf8e]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#111827] hover:bg-[#1f2937] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Updating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Supabase Settings
                </>
              )}
            </button>
          </form>

          {/* SQL Table Schema helper */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1e293b] text-[11px]">Recommended Supabase SQL Table Schema:</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(sqlSchemaSnippet)}
                className="text-[10px] text-[#2563eb] font-bold hover:underline"
              >
                Copy SQL
              </button>
            </div>
            <pre className="bg-[#0f172a] text-[#3ecf8e] font-mono text-[10px] p-3 rounded-xl overflow-x-auto leading-relaxed border border-[#1e293b]">
              {sqlSchemaSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#c3c6d7]/30 bg-[#f8fafc] flex justify-end">
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
