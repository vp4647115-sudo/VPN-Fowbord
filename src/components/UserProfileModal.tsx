import React, { useState, useEffect } from 'react';
import { UserProfileData } from '../types';
import { Button } from './ui/button';
import { ProfileEditDialog } from './ui/profile-dialog-demo';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  currentDisplayName?: string;
  onProfileSaved?: (profile: UserProfileData) => void;
  isFirstTime?: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail = '',
  currentDisplayName = '',
  onProfileSaved,
  isFirstTime = false,
}) => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Load existing profile when modal opens
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('flowboard_user_profile');
      if (saved) {
        try {
          const parsed: UserProfileData = JSON.parse(saved);
          setProfile(parsed);
          setIsEditing(false); // Default to Display Mode when profile exists
          return;
        } catch (e) {
          console.warn('Stale user profile stored', e);
        }
      }

      // If no saved profile or first time onboarding, start in edit mode
      setProfile(null);
      setIsEditing(true);
    }
  }, [isOpen, isFirstTime]);

  if (!isOpen) return null;

  const handleEditComplete = (updatedProfile: UserProfileData) => {
    setProfile(updatedProfile);
    setIsEditing(false); // Switch back to Read-Only Display Mode after editing
    if (onProfileSaved) {
      onProfileSaved(updatedProfile);
    }
  };

  return (
    <>
      {/* EDIT MODE: ProfileEditDialog component with Background & Avatar */}
      {isEditing && (
        <ProfileEditDialog
          open={isEditing}
          onOpenChange={(open) => {
            if (!open) {
              if (profile) {
                setIsEditing(false);
              } else {
                onClose();
              }
            }
          }}
          initialData={{
            firstName: profile?.firstName || currentDisplayName.split(' ')[0] || '',
            phoneNumber: profile?.phoneNumber || '',
            email: profile?.email || currentUserEmail || '',
            location: profile?.location || '',
            otherDetails: profile?.otherDetails || '',
          }}
          onSave={handleEditComplete}
        />
      )}

      {/* DISPLAY MODE: Read-Only Clean White Details View with Edit button */}
      {!isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl my-6">
            <div className="w-full bg-white text-slate-900 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl font-sans relative overflow-hidden">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-5 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                    {profile?.firstName ? profile.firstName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      Verified Profile
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {profile?.firstName || 'User'}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {profile?.email || currentUserEmail}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  type="button"
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Close"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Information Grid */}
              <div className="space-y-4 mb-8">
                
                {/* First Name & Phone Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-500">person</span>
                      First Name
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {profile?.firstName || 'Not provided'}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-500">call</span>
                      Phone Number
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {profile?.phoneNumber || 'Not provided'}
                    </div>
                  </div>
                </div>

                {/* Email ID & Location Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-500">mail</span>
                      Email ID
                    </div>
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {profile?.email || currentUserEmail || 'Not provided'}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-500">location_on</span>
                      Location
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {profile?.location || 'Not provided'}
                    </div>
                  </div>
                </div>

                {/* Other Details */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-slate-500">notes</span>
                    Other Details / Bio
                  </div>
                  <div className="text-sm font-medium text-slate-800 whitespace-pre-wrap">
                    {profile?.otherDetails || 'No additional details specified.'}
                  </div>
                </div>

              </div>

              {/* Action Bar */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Close
                </button>

                <Button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-6 h-11 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  <span>Edit Profile</span>
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
