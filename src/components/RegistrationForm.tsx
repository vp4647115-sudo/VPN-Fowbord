import React, { useState, useEffect } from 'react';
import { UserProfileData } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { getApiUrl } from '../lib/api';
import { sendProfileToAny2Webhook } from '../lib/webhookEngine';

interface RegistrationFormProps {
  initialEmail?: string;
  initialName?: string;
  onComplete: (profile: UserProfileData) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  buttonText?: string;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  initialEmail = '',
  initialName = '',
  onComplete,
  onCancel,
  title = 'Complete Your Profile',
  subtitle = 'Please fill out your details to continue to the website',
  buttonText = 'Complete & Enter Website →',
}) => {
  const [firstName, setFirstName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [otherDetails, setOtherDetails] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Check saved local profile first
    const saved = localStorage.getItem('flowboard_user_profile');
    if (saved) {
      try {
        const parsed: UserProfileData = JSON.parse(saved);
        setFirstName(parsed.firstName || initialName.split(' ')[0] || '');
        setPhoneNumber(parsed.phoneNumber || '');
        setEmail(parsed.email || initialEmail || '');
        setLocation(parsed.location || '');
        setOtherDetails(parsed.otherDetails || '');
        return;
      } catch (e) {
        // Ignore
      }
    }

    setFirstName(initialName.split(' ')[0] || '');
    setEmail(initialEmail || '');
  }, [initialEmail, initialName]);

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/[^0-9+() -]/g, '');
    return cleaned.length >= 7;
  };

  const validateEmail = (e: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanFirstName = firstName.trim();
    const cleanPhone = phoneNumber.trim();
    const cleanEmail = email.trim();
    const cleanLocation = location.trim();
    const cleanOther = otherDetails.trim();

    if (!cleanFirstName) {
      setError('First name is required.');
      return;
    }

    if (!cleanPhone) {
      setError('Phone number is required.');
      return;
    }

    if (!validatePhone(cleanPhone)) {
      setError('Please enter a valid phone number (at least 7 digits).');
      return;
    }

    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!cleanLocation) {
      setError('Location is required.');
      return;
    }

    setLoading(true);

    const profileData: UserProfileData = {
      firstName: cleanFirstName,
      phoneNumber: cleanPhone,
      email: cleanEmail,
      location: cleanLocation,
      otherDetails: cleanOther,
      updatedAt: new Date().toISOString(),
      isProfileCompleted: true,
    };

    try {
      // 1. Save to local storage
      localStorage.setItem('flowboard_user_profile', JSON.stringify(profileData));

      // Update flowboard_user session object if present
      const savedUser = localStorage.getItem('flowboard_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          parsed.displayName = cleanFirstName;
          parsed.phoneNumber = cleanPhone;
          parsed.location = cleanLocation;
          parsed.email = cleanEmail;
          localStorage.setItem('flowboard_user', JSON.stringify(parsed));
        } catch (err) {
          // Ignore
        }
      }

      // 2. Sync to backend API & dispatch webhook silently in background
      let webhookDispatched = false;
      try {
        const res = await fetch(getApiUrl('/api/user/profile'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData),
        });
        const data = await res.json();
        if (data?.webhookResult?.success) {
          webhookDispatched = true;
        }
      } catch (err) {
        console.warn('Backend sync error:', err);
      }

      // Silent fallback direct webhook trigger if server proxy had issues
      if (!webhookDispatched) {
        await sendProfileToAny2Webhook(profileData).catch(() => {});
      }

      setSuccess('✓ Profile completed! Entering website...');

      setTimeout(() => {
        onComplete(profileData);
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white text-slate-900 border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-2xl font-sans">
      
      {/* Form Header */}
      <div className="mb-8 border-b border-slate-100 pb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold uppercase tracking-wider mb-3">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          User Registration Details
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-slate-600 font-normal mt-1 leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Error & Success Alerts */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
          <span className="material-symbols-outlined text-lg text-red-600 shrink-0">error</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
          <span className="material-symbols-outlined text-lg text-emerald-600 shrink-0">check_circle</span>
          <span>{success}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Field 1: First Name */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-firstName" className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center justify-between">
            <span>First Name <span className="text-red-500">*</span></span>
          </Label>
          <Input
            id="reg-firstName"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Alex"
            className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl h-11 text-sm font-medium"
          />
        </div>

        {/* Field 2 & 3: Phone Number & Email ID Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="reg-phone" className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reg-phone"
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 019-2834"
              className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl h-11 text-sm font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-email" className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Email ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl h-11 text-sm font-medium"
            />
          </div>
        </div>

        {/* Field 4: Location */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-location" className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Location <span className="text-red-500">*</span>
          </Label>
          <Input
            id="reg-location"
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. San Francisco, CA or London, UK"
            className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl h-11 text-sm font-medium"
          />
        </div>

        {/* Field 5: Other Details */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-other" className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Other Details
          </Label>
          <textarea
            id="reg-other"
            rows={3}
            value={otherDetails}
            onChange={(e) => setOtherDetails(e.target.value)}
            placeholder="Enter job role, department, project requirements, or preferences..."
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl p-3 text-sm font-medium outline-none transition-all resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-between gap-3">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          ) : <div />}

          <Button
            type="submit"
            disabled={loading}
            className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-8 h-12 rounded-xl shadow-lg transition-all active:scale-98 cursor-pointer flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                <span>Submitting Form...</span>
              </>
            ) : (
              <span>{buttonText}</span>
            )}
          </Button>
        </div>

      </form>
    </div>
  );
};
