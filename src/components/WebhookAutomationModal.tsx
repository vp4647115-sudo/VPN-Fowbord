import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { getApiUrl, safeFetchJson } from '../lib/api';
import {
  DEFAULT_ANY2_WEBHOOK_URL,
  EMAIL_SUBJECT,
  generateAny2HtmlEmail,
  buildAny2WebhookPayload,
  sendProfileToAny2Webhook,
} from '../lib/webhookEngine';
import { UserProfileData } from '../types';

interface WebhookAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  currentDisplayName?: string;
}

export const WebhookAutomationModal: React.FC<WebhookAutomationModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail = '',
  currentDisplayName = '',
}) => {
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_ANY2_WEBHOOK_URL);
  const [activeTab, setActiveTab] = useState<'overview' | 'payload' | 'html-preview' | 'logs'>('overview');
  
  // Sample test profile
  const [testProfile, setTestProfile] = useState<UserProfileData>({
    firstName: currentDisplayName || 'Alex Morgan',
    phoneNumber: '+1 (555) 019-2834',
    email: currentUserEmail || 'client@example.com',
    location: 'San Francisco, CA',
    otherDetails: 'Interested in enterprise cloud architecture blueprint and automated workflow setup.',
    updatedAt: new Date().toISOString(),
    isProfileCompleted: true,
  });

  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const fetchLogs = async () => {
    try {
      const result = await safeFetchJson<{ logs?: any[] }>(getApiUrl('/api/webhook/logs'));
      if (result.ok && result.data?.logs) {
        setLogs(result.data.logs);
      }
    } catch (e) {
      console.warn('Could not fetch webhook logs', e);
    }
  };

  if (!isOpen) return null;

  const currentPayload = buildAny2WebhookPayload(testProfile);
  const currentHtml = generateAny2HtmlEmail(testProfile);

  const handleTestTrigger = async () => {
    setLoading(true);
    setTestResult(null);

    const res = await sendProfileToAny2Webhook(testProfile, webhookUrl);
    
    if (res.success) {
      setTestResult({
        success: true,
        message: `✓ Any2 Webhook triggered successfully! (Status: ${res.status || 200})`,
        details: res.responseText || 'Expression payload delivered to n8n workflow.',
      });
    } else {
      setTestResult({
        success: false,
        message: `✕ Webhook trigger error: ${res.error || 'Failed to connect'}`,
        details: res.responseText || 'Check Webhook URL and CORS configuration.',
      });
    }

    fetchLogs();
    setLoading(false);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(currentHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(currentPayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#121215] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 border-b border-white/10 relative">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md">
              <span className="material-symbols-outlined text-2xl">webhook</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Any2 / n8n Automation
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Expression Type
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Webhook Email Automation
              </h2>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-white/10 -mb-6 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-base">settings</span>
              Webhook & Config
            </button>

            <button
              onClick={() => setActiveTab('payload')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'payload'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-base">code</span>
              Expression Payload
            </button>

            <button
              onClick={() => setActiveTab('html-preview')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'html-preview'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-base">mark_email_unread</span>
              HTML Email Format
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              Logs ({logs.length})
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* TAB 1: OVERVIEW & CONFIG */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs space-y-2">
                <div className="font-bold flex items-center gap-2 text-sm text-blue-300">
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  Any2 / n8n Automation Engine Connected
                </div>
                <p className="text-slate-300 leading-relaxed">
                  When a new user logs in and submits their registration details form (First Name, Phone Number, Email ID, Location, and Other details), an automated webhook is triggered to send an HTML formatted email.
                </p>
              </div>

              {/* Webhook Endpoint Configuration */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>Target Any2 Webhook URL (Expression Mode)</span>
                  <span className="text-[10px] text-emerald-400 font-normal">Active & Ready</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-xs font-mono rounded-xl h-11"
                  />
                  <Button
                    type="button"
                    onClick={() => setWebhookUrl(DEFAULT_ANY2_WEBHOOK_URL)}
                    className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 rounded-xl cursor-pointer shrink-0"
                  >
                    Reset Default
                  </Button>
                </div>
              </div>

              {/* Email Subject Display */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-200">
                  Configured Email Subject Header
                </Label>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400 text-base">mail</span>
                  <span>{EMAIL_SUBJECT}</span>
                </div>
              </div>

              {/* Test Data Form Controls */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400 text-base">vaping_rooms</span>
                  Live Test Payload Generator
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">First Name</label>
                    <input
                      type="text"
                      value={testProfile.firstName}
                      onChange={(e) => setTestProfile({ ...testProfile, firstName: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">Email ID</label>
                    <input
                      type="email"
                      value={testProfile.email}
                      onChange={(e) => setTestProfile({ ...testProfile, email: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={testProfile.phoneNumber}
                      onChange={(e) => setTestProfile({ ...testProfile, phoneNumber: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">Location</label>
                    <input
                      type="text"
                      value={testProfile.location}
                      onChange={(e) => setTestProfile({ ...testProfile, location: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Other Details</label>
                  <textarea
                    rows={2}
                    value={testProfile.otherDetails}
                    onChange={(e) => setTestProfile({ ...testProfile, otherDetails: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Trigger Test Button */}
                <div className="pt-2 flex items-center justify-between">
                  <Button
                    onClick={handleTestTrigger}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                        <span>Dispatching Webhook...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">send</span>
                        <span>Send Test Automation Webhook</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs flex flex-col gap-1.5 ${
                    testResult.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-950/60 border-red-500/40 text-red-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      {testResult.success ? 'check_circle' : 'error'}
                    </span>
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.details && (
                    <p className="text-[11px] font-mono opacity-80 break-all">{testResult.details}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPRESSION PAYLOAD */}
          {activeTab === 'payload' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-300 font-medium">
                  This JSON payload is sent in <span className="text-blue-400 font-semibold">Expression Mode</span> to Any2 / n8n:
                </p>
                <button
                  onClick={handleCopyPayload}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copiedPayload ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedPayload ? 'Copied JSON!' : 'Copy Expression JSON'}</span>
                </button>
              </div>

              <pre className="p-4 bg-black/80 border border-white/10 rounded-2xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-[350px]">
                {JSON.stringify(currentPayload, null, 2)}
              </pre>
            </div>
          )}

          {/* TAB 3: HTML EMAIL PREVIEW */}
          {activeTab === 'html-preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Subject: {EMAIL_SUBJECT}</h4>
                  <p className="text-[11px] text-slate-400">Rendered HTML email delivered to clients upon form completion.</p>
                </div>
                <button
                  onClick={handleCopyHtml}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copiedHtml ? 'check' : 'code'}
                  </span>
                  <span>{copiedHtml ? 'Copied HTML!' : 'Copy Raw HTML'}</span>
                </button>
              </div>

              <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900 shadow-inner max-h-[420px] overflow-y-auto p-2">
                <iframe
                  title="HTML Email Format Preview"
                  srcDoc={currentHtml}
                  className="w-full h-[380px] bg-slate-950 rounded-xl"
                />
              </div>
            </div>
          )}

          {/* TAB 4: EXECUTION LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white">Recent Automation Execution History</h4>
                <button
                  onClick={fetchLogs}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  <span>Refresh Logs</span>
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-white/5 border border-white/10 rounded-2xl">
                  No webhook execution logs recorded yet. Submit the user registration form to generate a trigger log!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.status === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {log.status}
                          </span>
                          <span className="text-white font-semibold">{log.clientEmail}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">{log.url}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        {log.statusCode && (
                          <div className="text-[11px] font-bold text-blue-400">HTTP {log.statusCode}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-[#0e0e11] border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Target Webhook: <strong className="text-slate-200">Any2 / n8n</strong>
          </span>
          <Button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-5 py-2 rounded-xl cursor-pointer"
          >
            Close
          </Button>
        </div>

      </div>
    </div>
  );
};
