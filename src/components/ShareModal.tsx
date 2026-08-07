import React, { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  projectTitle,
}) => {
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState([
    { name: 'Sarah J.', email: 'sarah.j@company.com', role: 'Editor', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwPBGHiOhZQZOdBeV8jg-VDavja64yLgjjMDzT8VLXOLOE5m3n39kWdGTwR035aAGQxuoH7At2YohrrZOCcH1FkZ-LfdM-Z_LRpIuFvT8Eem4s2ZiCtiyx5cMifY-jZCT8ZpN2y0awNo5TDlHpjvMxf4st5EHgESaAAwIGz7LEOjSHWGl2nnEZKaTETi1GeQh6J6c5i_g43LuO5F50RVSuewQ8uPmyAukbGw8DdUt6PQwkCDEOUYuQ3w' },
    { name: 'David M.', email: 'david.m@company.com', role: 'Viewer', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBG6BJB04lreGcQ9jGuinsqXqlQC98P_TTwybxHyrZyC5lFrY7UzMMXC0GUcomI5OS8cbQNbAInTPEe1kT6okUXeGJpjyOiC4a-FdxfjXYMGX5khcf7va0pNooUya0k7FBJ342gCRxHvrr8q78pOFAlizh3CHkp5PNanbFRmv61bvYKZ9I57-4xeywqKKamMLgpqcAo2zjo75-hpNKy63LGBan6DXMyxByWs-4IviOdW9Fthw2BdVrpNw' },
    { name: 'Alex R.', email: 'alex.r@company.com', role: 'Editor', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuASR1Q7GbHoE5Zk8G-Gq5xGBlkP90eE0_D-W_8ecaz9Kihkp7803rm1ZKosh7DJU4Rf9nAswY1Nc6L0hecHPyIyNJBXN__Au-I-xQJQ0VFxXRAhZW-yGoO-XtGSzHORFX0pDX7EQ7BktSqPV2fJEj7KGzuIjpIjKEPKTwqOYaVDRq8m0v23KTdtY3tczSjjECiejktG2kiFOnb4TfAp2i6NRGNCtcPN5IfKxBiBDZV5TCaPAa_4eF_gQQ' },
  ]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    const targetEmail = emailInput.trim();

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          role: role === 'editor' ? 'Editor' : 'Viewer',
          teamName: projectTitle,
          redirectUrl: window.location.href,
        }),
      });
      const data = await res.json();
      setInviteNotice(data.message || `Invitation sent to ${targetEmail} via Supabase Mail`);
      setTimeout(() => setInviteNotice(null), 4000);
    } catch (err) {
      console.error(err);
    }

    setCollaborators([
      ...collaborators,
      {
        name: targetEmail.split('@')[0],
        email: targetEmail,
        role: role === 'editor' ? 'Editor' : 'Viewer',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetEmail}`,
      },
    ]);
    setEmailInput('');
  };

  return (
    <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4">
      <div className="modal-panel rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#c3c6d7]/30 flex items-center justify-between">
          <div>
            <h3 className="font-headline font-bold text-lg text-[#191c1e]">
              Share "{projectTitle}"
            </h3>
            <p className="text-xs text-[#434655]">
              Invite team members or copy the share link
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#434655] hover:bg-[#e0e3e5] p-1.5 rounded-full"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Email Invite Form */}
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Add people or emails..."
              className="flex-1 bg-[#f2f4f6] border border-[#c3c6d7] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#004ac6] focus:bg-white"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="bg-[#f2f4f6] border border-[#c3c6d7] rounded-xl px-3 py-2.5 text-xs font-semibold outline-none text-[#191c1e]"
            >
              <option value="editor">Can edit</option>
              <option value="viewer">Can view</option>
            </select>
            <button
              type="submit"
              className="bg-[#004ac6] hover:bg-[#2563eb] text-white px-4 py-2.5 rounded-xl font-medium text-xs transition-colors"
            >
              Invite
            </button>
          </form>

          {inviteNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-base text-emerald-600">
                mark_email_read
              </span>
              {inviteNotice}
            </div>
          )}

          {/* Collaborator List */}
          <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
            <span className="text-xs font-bold text-[#434655] uppercase tracking-wider">
              People with access
            </span>
            {collaborators.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f2f4f6] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#c3c6d7]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#191c1e]">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-[#737686]">{c.email}</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#434655] bg-[#e0e3e5] px-2.5 py-1 rounded-full">
                  {c.role}
                </span>
              </div>
            ))}
          </div>

          {/* Share Link Copy */}
          <div className="border-t border-[#c3c6d7]/30 pt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#434655]">
              <span className="material-symbols-outlined text-lg text-[#004ac6]">
                link
              </span>
              <span>Anyone with the link can view</span>
            </div>
            <button
              onClick={handleCopy}
              className="bg-[#f2f4f6] hover:bg-[#e0e3e5] border border-[#c3c6d7] text-[#191c1e] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-base">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
