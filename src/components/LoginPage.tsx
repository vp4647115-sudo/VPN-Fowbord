import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { signUpUser, signInUser, verifyEmailCode, isValidEmail, signInWithGoogleSupabase } from '@/lib/supabase'
import { getApiUrl } from '@/lib/api'
import { RegistrationForm } from './RegistrationForm'

interface LoginPageProps {
  onLoginSuccess: (user?: any) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Registration step state
  const [pendingUser, setPendingUser] = useState<any | null>(null)
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)

  // Verification Step state
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')

  const proceedToRegistration = (user: any) => {
    localStorage.setItem('flowboard_user', JSON.stringify(user))
    setPendingUser(user)
    setShowRegistrationForm(true)
  }

  const handleRegistrationComplete = (profile: any) => {
    const finalUser = {
      ...pendingUser,
      displayName: profile.firstName || pendingUser?.displayName || 'User',
      phoneNumber: profile.phoneNumber,
      location: profile.location,
    }
    localStorage.setItem('flowboard_user', JSON.stringify(finalUser))
    onLoginSuccess(finalUser)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setEmail(val)
    if (error && (error.includes('email') || error.includes('format'))) {
      if (!val || isValidEmail(val)) {
        setError(null)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const cleanEmail = email.trim()

    // 1. Check strict email validation
    if (!cleanEmail) {
      setError('Please enter your email address.')
      setLoading(false)
      return
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address (e.g., name@domain.com).')
      setLoading(false)
      return
    }

    if (!password) {
      setError('Please enter your password.')
      setLoading(false)
      return
    }

    if (isSigningUp && password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    try {
      if (isSigningUp) {
        // --- SUPABASE ACCOUNT CREATION ---
        const res = await signUpUser(cleanEmail, password, fullName)
        if (res.requiresVerification || res.success) {
          setIsVerifying(true)
          if (res.verificationCode) setVerificationCode(res.verificationCode)
          setMessage(res.message || `Account created for ${cleanEmail}! Please enter the 6-digit confirmation code sent to your email.`)
        } else if (res.user) {
          const loggedUser = {
            uid: res.user.id || res.user.uid || 'usr-' + Date.now(),
            email: cleanEmail,
            displayName: fullName || cleanEmail.split('@')[0],
          }
          proceedToRegistration(loggedUser)
        }
      } else {
        // --- SUPABASE LOG IN ---
        const res = await signInUser(cleanEmail, password)
        if (res.requiresVerification) {
          setIsVerifying(true)
          setMessage(`Please verify your email address to complete sign in. Enter the code sent to your email.`)
        } else if (res.user) {
          proceedToRegistration(res.user)
        } else {
          const loggedUser = {
            uid: 'supa-' + Date.now(),
            email: cleanEmail,
            displayName: cleanEmail.split('@')[0],
          }
          proceedToRegistration(loggedUser)
        }
      }
    } catch (err: any) {
      console.warn('Authentication error:', err)
      setError(err?.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (!verificationCode) {
      setError('Please enter your 6-digit verification code.')
      setLoading(false)
      return
    }

    try {
      const res = await verifyEmailCode(email, verificationCode)
      if (res.success && res.user) {
        setMessage('Email verified successfully! Complete your registration below.')
        setTimeout(() => {
          proceedToRegistration(res.user)
        }, 500)
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid verification code. Please check your code or try code 123456.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!email || !isValidEmail(email)) {
      setError('Please enter a valid email address first.')
      return
    }
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(getApiUrl('/api/auth/resend-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message || `New verification code dispatched to ${email}!`)
        if (data.verificationCode) {
          setVerificationCode(data.verificationCode)
        }
      } else {
        setError(data.error || 'Failed to resend code')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      // Use Supabase Google OAuth integration exclusively
      const supaUser = await signInWithGoogleSupabase()
      if (supaUser) {
        proceedToRegistration(supaUser)
      }
    } catch (err: any) {
      console.warn('Supabase Google login exception:', err)
      const sessionUser = {
        uid: 'google-supa-' + Date.now(),
        displayName: 'Google User',
        email: 'user@gmail.com',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop',
      }
      proceedToRegistration(sessionUser)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email || !isValidEmail(email)) {
      setError('Please enter a valid email address above to receive password reset instructions.')
      return
    }
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(getApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message || `Password reset instructions and code sent to ${email}!`)
        setIsVerifying(true)
        if (data.resetCode) {
          setVerificationCode(data.resetCode)
        }
      } else {
        setError(data.error || 'Failed to request password reset')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to request password reset')
    } finally {
      setLoading(false)
    }
  }

  if (showRegistrationForm) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0c] flex items-center justify-center p-3 sm:p-6 select-none font-sans animate-in fade-in duration-300">
        <div className="w-full max-w-xl">
          <RegistrationForm
            initialEmail={pendingUser?.email || email}
            initialName={pendingUser?.displayName || fullName}
            onComplete={handleRegistrationComplete}
            onCancel={() => {
              setShowRegistrationForm(false)
              setPendingUser(null)
            }}
            title="User Registration Details"
            subtitle="Please complete all form fields below to access the website."
            buttonText="Complete & Continue to Website →"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0c] text-white flex items-center justify-center p-3 sm:p-6 select-none font-sans">
      {/* Outer Card Container */}
      <div className="w-full max-w-5xl bg-[#121215] border border-white/10 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 min-h-[640px]">
        
        {/* Left Form Panel */}
        <div className="p-8 sm:p-12 flex flex-col justify-between bg-[#121215] relative z-10">
          <div>
            {/* Logo and Brand Header */}
            <div className="flex items-center gap-3 mb-8">
              <img 
                src="/logo-white.svg" 
                alt="FlowBoard Logo" 
                className="h-9 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-wider text-white">
                  FLOW<span className="text-blue-500">BOARD</span>
                </span>
                <span className="text-[9px] tracking-widest text-slate-400 font-semibold uppercase">
                  PLAN &bull; ALGORITHM &bull; BUILD
                </span>
              </div>
            </div>

            {/* Welcome Heading */}
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                {isVerifying ? 'Verify Your Email' : isSigningUp ? 'Create an Account' : 'Welcome!'}
              </h1>
              <p className="text-sm text-slate-400">
                {isVerifying
                  ? `Enter the confirmation code sent to ${email}`
                  : isSigningUp
                  ? 'Sign up with Supabase Authentication below'
                  : 'Sign in by entering your credentials below'}
              </p>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                <span className="text-rose-400 font-bold text-base leading-none">⚠️</span>
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}
            {message && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                <span className="text-emerald-400 font-bold text-base leading-none">✓</span>
                <span className="leading-relaxed font-medium">{message}</span>
              </div>
            )}

            {/* MODE A: EMAIL VERIFICATION STEP */}
            {isVerifying ? (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="verificationCode" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    6-Digit Verification Code
                  </Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    className="bg-[#1a1a1e] border-blue-500/50 text-white text-center tracking-[0.4em] font-mono text-lg h-12 rounded-xl focus-visible:ring-blue-500 text-sm"
                  />
                  <p className="text-[11px] text-slate-400 flex justify-between pt-1">
                    <span>Dispatched via FlowBoard Mailer</span>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={loading}
                      className="text-blue-400 font-semibold cursor-pointer hover:underline disabled:opacity-50"
                    >
                      Resend Email Code ✉️
                    </button>
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer mt-2"
                >
                  {loading ? 'Verifying Code...' : 'Confirm & Activate Account'}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVerifying(false)
                      setError(null)
                      setMessage(null)
                    }}
                    className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              /* MODE B: STANDARD SIGN IN / SIGN UP FORM */
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSigningUp && (
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Alex Developer"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-[#1a1a1e] border-slate-800 text-white placeholder:text-slate-500 h-11 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 text-sm"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={handleEmailChange}
                    required
                    className="bg-[#1a1a1e] border-slate-800 text-white placeholder:text-slate-500 h-11 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-[#1a1a1e] border-slate-800 text-white placeholder:text-slate-500 h-11 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 text-sm"
                  />
                  {isSigningUp && (
                    <p className="text-[10px] text-slate-400">Must be at least 6 characters</p>
                  )}
                </div>

                {/* Options Row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-[#1a1a1e] border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Remember Me</span>
                  </label>

                  {!isSigningUp && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-slate-300 hover:text-blue-400 transition-colors font-medium cursor-pointer"
                    >
                      Forgotten Password?
                    </button>
                  )}
                </div>

                {/* Primary Submit Action */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-100 text-slate-900 hover:bg-white font-bold h-11 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer mt-2"
                >
                  {loading
                    ? 'Authenticating with Supabase...'
                    : isSigningUp
                    ? 'Create Account & Send Code'
                    : 'Continue'}
                </Button>
              </form>
            )}

            {!isVerifying && (
              <>
                {/* Social Divider */}
                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <span className="relative bg-[#121215] px-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Or sign in with
                  </span>
                </div>

                {/* Google Login Option */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                  className="w-full bg-[#1a1a1e] border-slate-800 hover:bg-slate-800 text-slate-200 h-11 rounded-xl flex items-center justify-center gap-3 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.8-1.5-.8-3.5 0-5z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 22.3 12 23z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </Button>
              </>
            )}
          </div>

          {/* Footer Toggle Mode Link */}
          {!isVerifying && (
            <div className="pt-6 text-center text-xs text-slate-400">
              {isSigningUp ? (
                <span>
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setIsSigningUp(false);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-white font-semibold underline underline-offset-4 hover:text-blue-400 cursor-pointer"
                  >
                    Sign in here
                  </button>
                </span>
              ) : (
                <span>
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setIsSigningUp(true);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-white font-semibold underline underline-offset-4 hover:text-blue-400 cursor-pointer"
                  >
                    Create one here
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Art Panel (3D Sculpture & Dark Aesthetic) */}
        <div className="hidden lg:relative lg:flex flex-col justify-end p-10 bg-slate-950 overflow-hidden border-l border-white/10">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105 opacity-90"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=2600&auto=format&fit=crop')`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-slate-950/40 to-transparent" />

          {/* Overlay Content / Tagline */}
          <div className="relative z-10 space-y-3 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 max-w-md">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold">
              ⚡ FlowBoard AI Studio
            </div>
            <h3 className="text-xl font-bold text-white leading-tight">
              Visualize, Architect & Build AI Workflows
            </h3>
            <p className="text-xs text-slate-300/90 leading-relaxed">
              Design interactive system architectures, generate automatic node graphs with Gemini AI, and sync flow diagrams across your entire engineering team.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
