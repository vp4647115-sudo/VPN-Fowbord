import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SkillRole } from '@/lib/skillEngine/types';

interface SkillEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: SkillRole;
}

export function SkillEngineModal({ isOpen, onClose, currentUserRole = 'Editor' }: SkillEngineModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'persona' | 'rules' | 'workflows' | 'permissions' | 'tester'>('overview');
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Test execution state
  const [testPrompt, setTestPrompt] = useState<string>('Design a high-scale microservices architecture for flash sales with Kafka and Redis');
  const [testRole, setTestRole] = useState<SkillRole>(currentUserRole);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/skill-engine/status');
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch (e) {
      console.warn('Failed to fetch skill engine status:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPipelineTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/skill-engine/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: testPrompt,
          userRole: testRole,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      }
    } catch (e: any) {
      console.warn('Pipeline test error:', e);
      setTestResult({ error: e.message || 'Pipeline execution failed' });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none animate-in fade-in">
      <div className="w-full max-w-5xl bg-[#121215] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 bg-[#1a1a1e] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
              ⚡
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                AI Skill Engine Architecture
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest font-mono">
                  ACTIVE ENGINE v2.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Primary Operational Behavior Controller, Skill Parser & Runtime Decision Pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 bg-[#0a0a0c] border-b border-white/10 overflow-x-auto text-xs font-semibold text-slate-400">
          {[
            { id: 'overview', label: '📊 Skill Overview' },
            { id: 'persona', label: '👤 Persona & Core' },
            { id: 'rules', label: '🛡️ Rule Engine & Guardrails' },
            { id: 'workflows', label: '⚙️ Workflows & Algorithms' },
            { id: 'permissions', label: '🔐 Permissions Matrix' },
            { id: 'tester', label: '🚀 Pipeline Tester' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-300 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Parsing active skill.md instructions...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-[#1a1a1e] border border-white/10 text-center">
                      <span className="text-2xl font-black text-blue-400">{statusData?.rulesCount || 0}</span>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-1">Parsed Rules</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#1a1a1e] border border-white/10 text-center">
                      <span className="text-2xl font-black text-emerald-400">{statusData?.workflowsCount || 0}</span>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-1">State Workflows</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#1a1a1e] border border-white/10 text-center">
                      <span className="text-2xl font-black text-purple-400">{statusData?.algorithmsCount || 0}</span>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-1">Algorithms</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#1a1a1e] border border-white/10 text-center">
                      <span className="text-2xl font-black text-amber-400">{statusData?.permissionsCount || 0}</span>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-1">Role Permissions</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#1a1a1e] border border-white/10 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🎯 Active Skill Engine Persona</span>
                    </h3>
                    <div className="text-xs space-y-1.5 text-slate-300">
                      <p><strong className="text-slate-400">Role:</strong> {statusData?.persona?.role}</p>
                      <p><strong className="text-slate-400">Title:</strong> {statusData?.persona?.title}</p>
                      <p><strong className="text-slate-400">Tone:</strong> {statusData?.persona?.tone}</p>
                      <p><strong className="text-slate-400">Expertise:</strong> {statusData?.persona?.expertise?.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PERSONA */}
              {activeTab === 'persona' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-[#1a1a1e] border border-white/10 space-y-3">
                    <h3 className="text-sm font-bold text-white">System Prompt Header Injection</h3>
                    <pre className="p-4 rounded-xl bg-black/50 border border-slate-800 text-xs font-mono text-blue-300 whitespace-pre-wrap leading-relaxed">
                      {statusData?.persona?.systemPromptHeader}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: RULES & GUARDRAILS */}
              {activeTab === 'rules' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white mb-2">Mandatory & Prohibited Rule Engine Policies</h3>
                  <div className="space-y-2.5">
                    {[
                      { title: 'TypeScript Strict Mode', cat: 'mandatory', desc: 'Never use any. Define explicit discriminated unions and domain interfaces in src/types.ts.', severity: 'critical' },
                      { title: 'Early Returns & Guard Clauses', cat: 'mandatory', desc: 'Validate inputs immediately and return fast before processing main logic.', severity: 'high' },
                      { title: 'Security Isolation', cat: 'security', desc: 'Lazy-initialize Gemini API keys server-side only in server.ts. Never expose secrets to client bundle.', severity: 'critical' },
                      { title: 'Prohibited Actions', cat: 'prohibited', desc: 'Strictly forbid unindexed SQL queries, single points of failure, and unauthenticated service boundaries.', severity: 'critical' },
                    ].map((rule, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-[#1a1a1e] border border-white/10 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-white">{rule.title}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              rule.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {rule.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{rule.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: WORKFLOWS & ALGORITHMS */}
              {activeTab === 'workflows' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white">Parsed Executable State Workflows</h3>
                  <div className="p-4 rounded-2xl bg-[#1a1a1e] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-400">wf-diagram-synthesis (AI Diagram Synthesis)</span>
                      <span className="text-[10px] text-slate-400">Trigger: generate_diagram</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">1. Parse Prompt → Extract nodes & connections</div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">2. Validate Permissions → Verify Editor or Owner role</div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">3. Grid Layout Simulation → Compute non-overlapping (x, y) coordinates</div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">4. Format Output → Render strict FlowBoard JSON structure</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PERMISSIONS MATRIX */}
              {activeTab === 'permissions' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white">Role-Based Permission System Matrix</h3>
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1a1a1e]">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="bg-black/40 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
                        <tr>
                          <th className="p-3">Role</th>
                          <th className="p-3">Allowed Actions</th>
                          <th className="p-3">Prohibited Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {[
                          { role: 'Student / Guest', allowed: 'view_diagram, read_documentation, export_png', prohibited: 'delete_workspace, manage_billing, drop_database' },
                          { role: 'Editor / Teacher', allowed: 'create_diagram, edit_diagram, query_ai, execute_workflow', prohibited: 'delete_workspace, modify_security_rules' },
                          { role: 'Admin / Principal / Owner', allowed: '* (Full Wildcard Access)', prohibited: 'None' },
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-white/5">
                            <td className="p-3 font-bold text-white">{row.role}</td>
                            <td className="p-3 text-emerald-400">{row.allowed}</td>
                            <td className="p-3 text-rose-400">{row.prohibited}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: RUNTIME PIPELINE TESTER */}
              {activeTab === 'tester' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Test Prompt Execution Through Skill Pipeline
                    </label>
                    <textarea
                      rows={3}
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      className="w-full bg-[#1a1a1e] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-[11px] text-slate-400 font-semibold">Simulated User Role</label>
                      <select
                        value={testRole}
                        onChange={(e) => setTestRole(e.target.value as SkillRole)}
                        className="w-full bg-[#1a1a1e] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none cursor-pointer"
                      >
                        {['Guest', 'Student', 'Teacher', 'Parent', 'Viewer', 'Editor', 'Admin', 'Principal', 'HOD', 'Owner'].map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      onClick={handleRunPipelineTest}
                      disabled={testing}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 h-10 rounded-xl shadow-md transition-all cursor-pointer mt-5"
                    >
                      {testing ? 'Executing Pipeline...' : '⚡ Execute Pipeline'}
                    </Button>
                  </div>

                  {testResult && (
                    <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4 animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <span>✓ Intent Detected:</span>
                          <code className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-mono">{testResult.intent}</code>
                        </span>
                        <span className={`text-xs font-bold ${testResult.permissionCheck?.allowed ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {testResult.permissionCheck?.allowed ? 'Permission Granted' : 'Permission Denied'}
                        </span>
                      </div>

                      {testResult.workflowExecution && (
                        <div className="space-y-1.5 text-xs">
                          <span className="font-bold text-slate-300">Active Workflow Step:</span>
                          <p className="p-2.5 rounded-lg bg-[#1a1a1e] border border-slate-800 text-slate-300 font-mono">
                            {testResult.workflowExecution.currentStep?.name}: {testResult.workflowExecution.currentStep?.action}
                          </p>
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs">
                        <span className="font-bold text-slate-300">Token-Optimized System Context Prompt:</span>
                        <pre className="p-3 rounded-xl bg-[#121215] border border-slate-800 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {testResult.optimizedPrompt}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#1a1a1e] border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            FlowBoard.ai AI Skill Behavior Engine v2.0
          </span>
          <Button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-5 h-9 rounded-xl transition-colors cursor-pointer"
          >
            Close Inspector
          </Button>
        </div>

      </div>
    </div>
  );
}
