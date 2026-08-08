import React, { useState } from 'react';
import { getApiUrl } from '../lib/api';

interface JwtAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JwtAuthModal: React.FC<JwtAuthModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'jwt' | 'worker'>('jwt');

  // Form fields
  const [email, setEmail] = useState('user@edge.microsoft.com');
  const [provider, setProvider] = useState('Microsoft Edge Email');
  const [role, setRole] = useState('authenticated');
  const [apiKey, setApiKey] = useState('https://hlgmhevrxoqutyeqesik.supabase.co');

  // Issue Token Result
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  // Worker Execution State
  const [workerAction, setWorkerAction] = useState('process_task');
  const [workerPayload, setWorkerPayload] = useState('{\n  "task": "generate_diagram",\n  "project": "erp-arch"\n}');
  const [workerExecuting, setWorkerExecuting] = useState(false);
  const [workerResponse, setWorkerResponse] = useState<any>(null);
  const [statusNotice, setStatusNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  if (!isOpen) return null;

  const handleIssueJwt = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusNotice(null);
    setVerifyResult(null);

    try {
      const res = await fetch(getApiUrl('/api/auth/jwt/issue'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, provider, role, apiKey }),
      });

      const data = await res.json();
      if (data.success) {
        setIssuedToken(data.token);
        setTokenInfo(data.user);
        setStatusNotice({ text: 'JWT Token issued successfully!', type: 'success' });
      } else {
        setStatusNotice({ text: data.error || 'Failed to issue JWT token', type: 'error' });
      }
    } catch (err: any) {
      setStatusNotice({ text: err.message || 'Error connecting to server', type: 'error' });
    }
  };

  const handleVerifyJwt = async () => {
    if (!issuedToken) {
      setStatusNotice({ text: 'Please issue or enter a JWT token first.', type: 'error' });
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/jwt/verify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${issuedToken}`,
        },
        body: JSON.stringify({ token: issuedToken }),
      });

      const data = await res.json();
      setVerifyResult(data);
      if (data.valid) {
        setStatusNotice({ text: 'JWT Token signature and claims verified!', type: 'success' });
      } else {
        setStatusNotice({ text: data.error || 'JWT Token verification failed', type: 'error' });
      }
    } catch (err: any) {
      setStatusNotice({ text: err.message || 'Verification failed', type: 'error' });
    } finally {
      setVerifying(false);
    }
  };

  const handleExecuteWorker = async () => {
    setWorkerExecuting(true);
    setWorkerResponse(null);
    setStatusNotice(null);

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(workerPayload);
    } catch (e) {
      setStatusNotice({ text: 'Invalid JSON payload. Please fix syntax before executing.', type: 'error' });
      setWorkerExecuting(false);
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/supabase/dynamic-worker'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(issuedToken ? { Authorization: `Bearer ${issuedToken}` } : {}),
        },
        body: JSON.stringify({
          action: workerAction,
          payload: parsedPayload,
          apiKey,
          token: issuedToken,
        }),
      });

      const data = await res.json();
      setWorkerResponse(data);

      if (data.success) {
        setStatusNotice({ text: 'Dynamic worker task processed successfully!', type: 'success' });
      } else {
        setStatusNotice({
          text: `Worker responded with status ${data.status || 'Error'}: ${data.error || 'Check details below'}`,
          type: 'info',
        });
      }
    } catch (err: any) {
      setStatusNotice({ text: err.message || 'Failed to reach Supabase worker endpoint', type: 'error' });
    } finally {
      setWorkerExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#111827] text-[#191c1e] dark:text-gray-100 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#c3c6d7]/50 relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#004ac6] to-emerald-500 text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-2xl">key</span>
            </div>
            <div>
              <h2 className="text-lg font-bold font-headline leading-snug">JWT Auth & Supabase Dynamic Worker</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Email Authentication, JWT Keys & Edge Worker API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Status Alert Banner */}
        {statusNotice && (
          <div
            className={`mt-4 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
              statusNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                : statusNotice.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
                : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {statusNotice.type === 'success' ? 'check_circle' : statusNotice.type === 'error' ? 'error' : 'info'}
            </span>
            <span>{statusNotice.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('jwt')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'jwt'
                ? 'bg-white dark:bg-[#1f2937] text-[#004ac6] dark:text-blue-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">verified_user</span>
            Issue & Verify JWT
          </button>
          <button
            onClick={() => setActiveTab('worker')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'worker'
                ? 'bg-white dark:bg-[#1f2937] text-[#004ac6] dark:text-blue-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">bolt</span>
            Dynamic Worker Endpoint
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
          
          {/* TAB 1: JWT AUTH & EMAIL SETUP */}
          {activeTab === 'jwt' && (
            <form onSubmit={handleIssueJwt} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Email Account (Microsoft Edge / Custom)
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@edge.microsoft.com"
                    className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#004ac6]"
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setEmail('vp4647115@gmail.com')}
                      className="text-[10px] text-blue-600 dark:text-blue-400 underline"
                    >
                      Use vp4647115@gmail.com
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmail('edge.user@microsoft.com')}
                      className="text-[10px] text-blue-600 dark:text-blue-400 underline"
                    >
                      Use Microsoft Edge Email
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Auth Provider / Client
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#004ac6]"
                  >
                    <option value="Microsoft Edge Email">Microsoft Edge Email (SSO Key)</option>
                    <option value="Supabase Auth API Key">Supabase Auth API Key</option>
                    <option value="Custom JWT Token">Custom JWT Auth</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Supabase API Key / Key Reference
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="https://hlgmhevrxoqutyeqesik.supabase.co"
                  className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#004ac6]"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 bg-[#004ac6] hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98"
                >
                  <span className="material-symbols-outlined text-base">key</span>
                  Issue Signed JWT Auth Token
                </button>
              </div>

              {/* JWT Output Console */}
              {issuedToken && (
                <div className="bg-gray-900 text-gray-100 rounded-2xl p-4 space-y-3 border border-gray-800 animate-in fade-in">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Signed JWT Token
                    </span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(issuedToken)}
                      className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">content_copy</span>
                      Copy
                    </button>
                  </div>

                  <p className="text-[11px] font-mono break-all text-blue-300 bg-gray-950 p-2.5 rounded-xl border border-gray-800/80">
                    {issuedToken}
                  </p>

                  <div className="flex justify-between items-center pt-1">
                    <button
                      type="button"
                      onClick={handleVerifyJwt}
                      disabled={verifying}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">published_with_changes</span>
                      {verifying ? 'Verifying...' : 'Verify Signature & Claims'}
                    </button>
                  </div>

                  {verifyResult && (
                    <div className="bg-gray-950 p-3 rounded-xl border border-emerald-500/30 text-xs font-mono space-y-1">
                      <p className="text-emerald-400 font-bold">✓ Signature Verified via Supabase JWT Secret</p>
                      <pre className="text-[10px] text-gray-300 overflow-x-auto pt-1">
                        {JSON.stringify(verifyResult.decoded, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}

          {/* TAB 2: SUPABASE DYNAMIC WORKER ENDPOINT TESTER */}
          {activeTab === 'worker' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg mt-0.5">hub</span>
                <div>
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">Supabase Edge Function Endpoint</h4>
                  <p className="text-[11px] font-mono text-blue-700 dark:text-blue-300 mt-0.5 break-all">
                    https://hlgmhevrxoqutyeqesik.supabase.co/functions/v1/dynamic-worker
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Worker Action
                </label>
                <select
                  value={workerAction}
                  onChange={(e) => setWorkerAction(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#004ac6]"
                >
                  <option value="process_task">process_task (Execute general dynamic task)</option>
                  <option value="execute_workflow">execute_workflow (Trigger architecture pipeline)</option>
                  <option value="sync_board_state">sync_board_state (Sync canvas whiteboard nodes)</option>
                  <option value="validate_jwt">validate_jwt (Check Supabase auth worker permissions)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  JSON Payload
                </label>
                <textarea
                  rows={4}
                  value={workerPayload}
                  onChange={(e) => setWorkerPayload(e.target.value)}
                  className="w-full text-xs font-mono bg-gray-900 text-emerald-400 border border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#004ac6]"
                />
              </div>

              <button
                onClick={handleExecuteWorker}
                disabled={workerExecuting}
                className="w-full bg-[#004ac6] hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">send</span>
                {workerExecuting ? 'Executing Dynamic Worker...' : 'Execute Task on Supabase Dynamic Worker'}
              </button>

              {/* Response Log */}
              {workerResponse && (
                <div className="bg-gray-950 text-gray-200 rounded-2xl p-4 border border-gray-800 space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      Worker Response ({workerResponse.status || 200})
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>

                  <pre className="text-[10px] font-mono text-gray-300 overflow-x-auto max-h-48 p-2 bg-gray-900 rounded-xl">
                    {JSON.stringify(workerResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold rounded-full transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
