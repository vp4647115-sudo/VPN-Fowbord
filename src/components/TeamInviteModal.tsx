import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { getApiUrl } from '../lib/api';

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  activeTeamName: string;
  onUpdateTeamName: (name: string) => void;
}

export const TeamInviteModal: React.FC<TeamInviteModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeTeamName,
  onUpdateTeamName,
}) => {
  const [teamName, setTeamName] = useState(activeTeamName || 'Engineering Flow Team');
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [role, setRole] = useState<'Editor' | 'Viewer'>('Editor');
  const [copiedLink, setCopiedLink] = useState(false);
  const [sentEmailNotice, setSentEmailNotice] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteNoticeMessage, setInviteNoticeMessage] = useState('');

  const [members, setMembers] = useState([
    {
      id: 'm1',
      name: currentUser?.displayName || 'Team Creator (You)',
      email: currentUser?.email || 'you@company.com',
      role: 'Owner',
      avatar: currentUser?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner',
      status: 'Active',
    },
    {
      id: 'm2',
      name: 'Sarah Jenkins',
      email: 'sarah.j@company.com',
      role: 'Editor',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwPBGHiOhZQZOdBeV8jg-VDavja64yLgjjMDzT8VLXOLOE5m3n39kWdGTwR035aAGQxuoH7At2YohrrZOCcH1FkZ-LfdM-Z_LRpIuFvT8Eem4s2ZiCtiyx5cMifY-jZCT8ZpN2y0awNo5TDlHpjvMxf4st5EHgESaAAwIGz7LEOjSHWGl2nnEZKaTETi1GeQh6J6c5i_g43LuO5F50RVSuewQ8uPmyAukbGw8DdUt6PQwkCDEOUYuQ3w',
      status: 'Active',
    },
    {
      id: 'm3',
      name: 'David Miller',
      email: 'david.m@company.com',
      role: 'Viewer',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBG6BJB04lreGcQ9jGuinsqXqlQC98P_TTwybxHyrZyC5lFrY7UzMMXC0GUcomI5OS8cbQNbAInTPEe1kT6okUXeGJpjyOiC4a-FdxfjXYMGX5khcf7va0pNooUya0k7FBJ342gCRxHvrr8q78pOFAlizh3CHkp5PNanbFRmv61bvYKZ9I57-4xeywqKKamMLgpqcAo2zjo75-hpNKy63LGBan6DXMyxByWs-4IviOdW9Fthw2BdVrpNw',
      status: 'Active',
    },
  ]);

  const teamId = 'team-' + teamName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const directJoinUrl = `${window.location.origin}${window.location.pathname}?joinTeam=${encodeURIComponent(
    teamId
  )}&teamName=${encodeURIComponent(teamName)}`;

  if (!isOpen) return null;

  const handleSaveTeamName = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim()) {
      onUpdateTeamName(teamName.trim());
      setIsEditingTeam(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    const emailToInvite = emailInput.trim();
    setSendingInvite(true);

    try {
      const res = await fetch(getApiUrl('/api/team/invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToInvite,
          role,
          teamName,
          redirectUrl: directJoinUrl,
        }),
      });
      const data = await res.json();

      const newMember = {
        id: 'm-' + Date.now(),
        name: emailToInvite.split('@')[0],
        email: emailToInvite,
        role: role,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailToInvite}`,
        status: 'Invited (Pending)',
      };

      setMembers((prev) => [...prev, newMember]);
      setEmailInput('');
      setSentEmailNotice(true);
      setInviteNoticeMessage(data.message || `Invitation email sent directly to ${emailToInvite} via Supabase!`);
      setTimeout(() => setSentEmailNotice(false), 5000);
    } catch (err) {
      console.error('Invite error:', err);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directJoinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-[#c3c6d7] rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#c3c6d7]/30 flex items-center justify-between bg-gradient-to-r from-[#004ac6] to-[#2563eb] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-xs">
              <span className="material-symbols-outlined text-white text-2xl">groups</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                {isEditingTeam ? (
                  <form onSubmit={handleSaveTeamName} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="bg-white/20 border border-white/40 rounded-lg px-2.5 py-0.5 text-sm font-bold text-white outline-none focus:bg-white/30"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="bg-white text-[#004ac6] px-2 py-0.5 rounded-md text-xs font-bold"
                    >
                      Save
                    </button>
                  </form>
                ) : (
                  <>
                    <h2 className="font-headline font-bold text-lg text-white">{teamName}</h2>
                    <button
                      onClick={() => setIsEditingTeam(true)}
                      className="text-white/80 hover:text-white p-1 rounded-md"
                      title="Edit Team Name"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-blue-100 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Online Team Collaboration & Instant Real-time Sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Invite Form */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#191c1e] text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#004ac6] text-base">mail</span>
                Invite Team Member via Supabase Email
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Direct Supabase Mail
              </span>
            </div>

            <form onSubmit={handleSendInvite} className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter member's email address..."
                className="flex-1 bg-white border border-[#c3c6d7] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]"
                required
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="bg-white border border-[#c3c6d7] rounded-xl px-3 py-2.5 text-xs font-bold text-[#191c1e] outline-none"
              >
                <option value="Editor">Can Edit</option>
                <option value="Viewer">Can View</option>
              </select>
              <button
                type="submit"
                disabled={sendingInvite}
                className="bg-[#004ac6] hover:bg-[#2563eb] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">
                  {sendingInvite ? 'sync' : 'send'}
                </span>
                {sendingInvite ? 'Sending...' : 'Send Email'}
              </button>
            </form>

            {sentEmailNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-base text-emerald-600">
                  mark_email_read
                </span>
                {inviteNoticeMessage}
              </div>
            )}

            {/* Direct Join Link Bar */}
            <div className="pt-2 border-t border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#64748b] text-[11px] truncate max-w-[340px]">
                <span className="material-symbols-outlined text-sm text-[#004ac6]">link</span>
                <span className="truncate">{directJoinUrl}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="bg-white hover:bg-[#f1f5f9] border border-[#cbd5e1] text-[#0f172a] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors shadow-xs shrink-0"
              >
                <span className="material-symbols-outlined text-sm text-[#004ac6]">
                  {copiedLink ? 'check' : 'content_copy'}
                </span>
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#191c1e] text-xs uppercase tracking-wider">
                Team Members ({members.length})
              </span>
              <span className="text-[11px] text-[#737686]">Online real-time active</span>
            </div>

            <div className="divide-y divide-[#c3c6d7]/30 border border-[#c3c6d7]/40 rounded-2xl overflow-hidden bg-white">
              {members.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between hover:bg-[#f8fafc] transition-colors">
                  <div className="flex items-center gap-3">
                    <img
                      src={m.avatar}
                      alt={m.name}
                      className="w-9 h-9 rounded-full object-cover border border-[#c3c6d7]"
                    />
                    <div>
                      <div className="font-bold text-xs text-[#191c1e] flex items-center gap-1.5">
                        {m.name}
                        {m.role === 'Owner' && (
                          <span className="bg-[#004ac6]/10 text-[#004ac6] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Owner
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#737686]">{m.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        m.status.includes('Invited')
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {m.status}
                    </span>
                    <span className="text-xs font-semibold text-[#434655] bg-[#e0e3e5] px-2.5 py-1 rounded-full">
                      {m.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#c3c6d7]/30 bg-[#f8fafc] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full text-xs font-bold bg-[#004ac6] text-white hover:bg-[#2563eb] transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
