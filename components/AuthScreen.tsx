import React, { useState, useMemo, useRef } from 'react';
import {
  LogIn,
  UserPlus,
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Receipt,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Briefcase,
  Check,
  Trash2,
  X,
  ChevronDown,
  Mail,
  Send,
  RefreshCw,
  HelpCircle,
  Key,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { UserAccount, UserRole } from '../types';

export const AuthScreen: React.FC = () => {
  const { login, register, deleteUser, users, resetPasswordWithEmail } = useAuth();
  const { settings } = useDatabase();

  const [activeMode, setActiveMode] = useState<'signin' | 'signup'>('signin');

  // Sign In State
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [signInSuccess, setSignInSuccess] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Account Deletion State
  const [accountToDelete, setAccountToDelete] = useState<UserAccount | null>(null);

  // Sign Up State
  const [signUpName, setSignUpName] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpRole, setSignUpRole] = useState<UserRole>('cashier');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpError, setSignUpError] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState('');

  // Email Account Support / Recovery State (Forgot Password with Email Code)
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportStep, setSupportStep] = useState<'input' | 'verify' | 'new_password'>('input');
  const [supportIdentifier, setSupportIdentifier] = useState('');
  const [supportFoundUser, setSupportFoundUser] = useState<UserAccount | null>(null);
  const [supportOtp, setSupportOtp] = useState('');
  const [supportCodeInput, setSupportCodeInput] = useState('');
  const [supportNewPassword, setSupportNewPassword] = useState('');
  const [supportConfirmPassword, setSupportConfirmPassword] = useState('');
  const [showSupportPassword, setShowSupportPassword] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [supportSuccess, setSupportSuccess] = useState('');
  const [isSupportSubmitting, setIsSupportSubmitting] = useState(false);

  // Validation Barrier checks for Sign Up
  const barrierValidation = useMemo(() => {
    const isNameValid = signUpName.trim().length >= 3;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(signUpEmail.trim().toLowerCase());
    const isPasswordValid = signUpPassword.length >= 6;
    const isConfirmValid = !signUpConfirmPassword || signUpPassword === signUpConfirmPassword;
    const isUsernameValid = !signUpUsername.trim() || (/^[a-zA-Z0-9_]+$/.test(signUpUsername.trim()) && signUpUsername.trim().length >= 3);

    const allPassed = isNameValid && isEmailValid && isPasswordValid && isConfirmValid && isUsernameValid;

    return {
      allPassed,
      isNameValid,
      isUsernameValid,
      isEmailValid,
      isPasswordValid,
      isConfirmValid,
    };
  }, [signUpName, signUpUsername, signUpEmail, signUpPassword, signUpConfirmPassword]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Sign In submission
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    setSignInSuccess('');
    setIsSubmitting(true);

    try {
      const res = await login(signInIdentifier, signInPassword);
      if (!res.success) {
        setSignInError(res.message || 'ناوی بەکارهێنەر یان ژمارەی نهێنی هەڵەیە');
      } else {
        setSignInSuccess('بە سەرکەوتوویی چووە ژوورەوە!');
      }
    } catch (err: any) {
      setSignInError('هەڵەیەک ڕوویدا لە کاتی چوونەژوورەوە');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Sign Up submission with Firebase Auth
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');
    setSignUpSuccess('');

    // Strict Validation
    if (!barrierValidation.isNameValid) {
      setSignUpError('تکایە ناوی تەواو بنووسە (لانیکەم ٣ پیت)');
      return;
    }
    if (!barrierValidation.isEmailValid) {
      setSignUpError('تکایە ئیمەیڵێکی دروست بنووسە (نموونە: example@gmail.com)');
      return;
    }
    if (signUpPassword.length < 6) {
      setSignUpError('ژمارەی نهێنی دەبێت لانیکەم ٦ پیت یان ژمارە بێت (ستانداردی فایەربەیس)');
      return;
    }
    if (signUpConfirmPassword && signUpPassword !== signUpConfirmPassword) {
      setSignUpError('ژمارەی نهێنی و دووبارەکردنەوەی وەک یەک نین!');
      return;
    }

    const cleanEmail = signUpEmail.trim().toLowerCase();
    const cleanUsername = signUpUsername.trim().toLowerCase() || cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');

    // Check if username or email already exists locally
    if (signUpUsername.trim()) {
      const isUserTaken = users.some((u) => u.username.toLowerCase() === cleanUsername);
      if (isUserTaken) {
        setSignUpError('ئەم ناوی بەکارهێنەرە پێشتر بەکارهاتووە! تکایە ناوێکی تر بنووسە.');
        return;
      }
    }

    const isEmailTaken = users.some((u) => u.email && u.email.toLowerCase() === cleanEmail);
    if (isEmailTaken) {
      setSignUpError('ئەم ئیمەیڵە پێشتر بۆ هەژمارێکی تر تۆمارکراوە!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        name: signUpName.trim(),
        username: cleanUsername,
        phone: '',
        email: cleanEmail,
        role: signUpRole,
        password: signUpPassword,
      });

      if (!res.success) {
        setSignUpError(res.message || 'هەڵە ڕویدا لە دروستکردنی هەژمار');
      } else {
        setSignUpSuccess('هەژمارەکە دروستکرا و نامەی ڤێریفیکەیشن نێردرا بۆ ئیمەیڵەکەت!');
        setSignInIdentifier(cleanUsername || cleanEmail);
        setSignInPassword(signUpPassword);
        // Switch to sign in mode with helpful message
        setTimeout(() => {
          setActiveMode('signin');
          setSignInSuccess('هەژمارەکە دروستکرا و نامەی ڤێریفیکەیشن نێردرا بۆ ئیمەیڵەکەت! ئێستا دەتوانیت بچیتە ژوورەوە.');
        }, 2400);
      }
    } catch (err: any) {
      setSignUpError('هەڵە ڕویدا: ' + (err?.message || 'هەڵەیەک ڕوویدا لە دروستکردنی هەژمار'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Email Account Support / Recovery: Step 1 (Send Code)
  const handleSendSupportCode = (e: React.FormEvent) => {
    e.preventDefault();
    setSupportError('');
    setSupportSuccess('');

    const cleanInput = supportIdentifier.trim().toLowerCase();
    if (!cleanInput) {
      setSupportError('تکایە ئیمەیڵ بنووسە.');
      return;
    }

    const found = users.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanInput) ||
        u.username.toLowerCase() === cleanInput
    );

    if (!found) {
      setSupportError('هیچ هەژمارێک بەم ئیمەیڵە نەدۆزرایەوە!');
      return;
    }

    if (!found.email) {
      setSupportError(`هەژماری (${found.name}) ئیمەیڵی پشتگیری بۆ دانەنراوە! تکایە پەیوەندی بە بەڕێوەبەر (Admin) بکە.`);
      return;
    }

    // Generate 6-digit code for account support
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setSupportFoundUser(found);
    setSupportOtp(otp);
    setSupportCodeInput('');
    setSupportStep('verify');
    setSupportSuccess(`کۆدی پشتگیری بۆ ئیمەیڵی (${found.email}) ئامادەکرا!`);
  };

  // Handle Email Account Support / Recovery: Step 2 (Verify Code)
  const handleVerifySupportCode = (e: React.FormEvent) => {
    e.preventDefault();
    setSupportError('');
    setSupportSuccess('');

    if (supportCodeInput.trim() !== supportOtp) {
      setSupportError('کۆدی داخڵکراو هەڵەیە! تکایە کۆدی دروست بنووسە.');
      return;
    }

    setSupportStep('new_password');
    setSupportSuccess('کۆدی ئیمەیڵ پەسەندکرا! ئێستا دەتوانیت ژمارەی نهێنی نوێ دابنێیت.');
  };

  // Handle Email Account Support / Recovery: Step 3 (Set New Password)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportError('');
    setSupportSuccess('');

    if (supportNewPassword.length < 4) {
      setSupportError('ژمارەی نهێنی نوێ دەبێت لانیکەم ٤ پیت یان ژمارە بێت.');
      return;
    }

    if (supportNewPassword !== supportConfirmPassword) {
      setSupportError('ژمارەی نهێنی نوێ و دووبارەکردنەوەی وەک یەک نین!');
      return;
    }

    if (!supportFoundUser) {
      setSupportError('هەڵەیەک ڕوویدا، هەژمار نەدۆزرایەوە.');
      return;
    }

    setIsSupportSubmitting(true);
    try {
      const res = await resetPasswordWithEmail(supportFoundUser.username, supportNewPassword);
      if (!res.success) {
        setSupportError(res.message || 'هەڵەیەک ڕوویدا لە گۆڕینی ژمارەی نهێنی.');
      } else {
        setSignInIdentifier(supportFoundUser.username);
        setSignInPassword(supportNewPassword);
        setSignInSuccess(`ژمارەی نهێنی هەژماری (${supportFoundUser.name}) بە سەرکەوتوویی گۆڕدرا! ئێستا دەتوانیت بچیتە ژوورەوە.`);
        setSupportSuccess('ژمارەی نهێنی نوێ بە سەرکەوتوویی پاشەکەوت کرا.');
        setTimeout(() => {
          setShowSupportModal(false);
          setSupportStep('input');
          setSupportIdentifier('');
          setSupportFoundUser(null);
          setSupportOtp('');
          setSupportCodeInput('');
          setSupportNewPassword('');
          setSupportConfirmPassword('');
        }, 1200);
      }
    } catch (err: any) {
      setSupportError('هەڵەیەک ڕوویدا لە پەیوەندیدا.');
    } finally {
      setIsSupportSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-3 sm:p-5 py-4 sm:py-6 text-slate-100 font-['Vazirmatn',sans-serif]" dir="rtl">
      {/* Subtle Background Glow Accent */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 left-1/3 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md sm:max-w-lg z-10">
        {/* Top Branding Section - Compact and visually balanced */}
        <div className="text-center mb-2.5 sm:mb-4 space-y-1 sm:space-y-1.5">
          <div className="inline-flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-950/60 border border-emerald-400/30">
            <Receipt className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {settings.storeName || 'سیستەمی کۆگا و فرۆشتن'}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-600">
              تکایە هەژمارەکەت تۆمار بکە یان بچۆ ژوورەوە بۆ بەکارهێنانی بەرنامە
            </p>
          </div>
        </div>

        {/* Auth Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
          {/* Mode Switcher Tabs */}
          <div className="p-2 bg-slate-950/80 border-b border-slate-800/80">
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl sm:rounded-2xl border border-slate-800/80">
              <button
                type="button"
                id="tab-signin-btn"
                onClick={() => {
                  setActiveMode('signin');
                  setSignInError('');
                  setSignUpError('');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer ${
                  activeMode === 'signin'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-1 ring-emerald-400/50'
                    : 'bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/70'
                }`}
              >
                <LogIn className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeMode === 'signin' ? 'text-white' : 'text-slate-400'}`} />
                <span>چوونە ژوورەوە</span>
              </button>

              <button
                type="button"
                id="tab-signup-btn"
                onClick={() => {
                  setActiveMode('signup');
                  setSignInError('');
                  setSignUpError('');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer ${
                  activeMode === 'signup'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-1 ring-emerald-400/50'
                    : 'bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/70'
                }`}
              >
                <UserPlus className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeMode === 'signup' ? 'text-white' : 'text-slate-400'}`} />
                <span>دروستکردنی هەژمار</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 sm:p-6">
            {/* =========================================================================
                1. SIGN IN FORM
                ========================================================================= */}
            {activeMode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-3 sm:space-y-3.5">
                {signInError && (
                  <div className="p-2.5 sm:p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{signInError}</span>
                  </div>
                )}

                {signInSuccess && (
                  <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{signInSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-200 mb-1 text-right">
                    ناوی بەکارهێنەر:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="signin-username-input"
                      value={signInIdentifier}
                      onChange={(e) => setSignInIdentifier(e.target.value)}
                      placeholder="ناوی بەکارهێنەر بنووسە..."
                      className="w-full bg-slate-950/90 border border-slate-700/90 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 rounded-lg sm:rounded-xl pr-9 pl-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all text-right font-medium"
                      required
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-200 mb-1 text-right">
                    ژمارەی نهێنی:
                  </label>
                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      type={showSignInPassword ? 'text' : 'password'}
                      id="signin-password-input"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/90 border border-slate-700/90 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 rounded-lg sm:rounded-xl pr-9 pl-10 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all text-right font-mono"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                      title={showSignInPassword ? 'شاردنەوەی ژمارەی نهێنی' : 'پیشاندانی ژمارەی نهێنی'}
                    >
                      {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-start items-center pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSupportModal(true);
                      setSupportStep('input');
                      setSupportIdentifier(signInIdentifier || '');
                      setSupportError('');
                      setSupportSuccess('');
                    }}
                    className="text-emerald-400/90 hover:text-emerald-300 font-bold transition-colors cursor-pointer flex items-center gap-1.5 py-0.5 px-1 rounded-lg hover:bg-emerald-500/10 text-xs"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>وشەی نهێنیت لەبیرچووە؟</span>
                  </button>
                </div>

                <button
                  type="submit"
                  id="submit-signin-btn"
                  disabled={isSubmitting}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2 mt-2 sm:mt-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                      <span>تکایە چاوەڕوان بە...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 shrink-0" />
                      <span>چوونە ژوورەوە بۆ بەرنامە</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* =========================================================================
                2. SIGN UP FORM (Firebase Auth + Email Verification)
                ========================================================================= */}
            {activeMode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-2 sm:space-y-2.5">
                {signUpError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{signUpError}</span>
                  </div>
                )}

                {signUpSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span id="message">{signUpSuccess}</span>
                  </div>
                )}

                {/* 1. Full Name */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] sm:text-xs font-bold text-slate-200">
                      ناوی تەواو: <span className="text-rose-400">*</span>
                    </label>
                    {barrierValidation.isNameValid && (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="signup-name-input"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      placeholder="نموونە: بەکارهێنەر"
                      className="w-full bg-slate-950/90 border border-slate-700/90 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 rounded-lg sm:rounded-xl pr-9 pl-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all text-right font-medium"
                      required
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 2. Username */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] sm:text-xs font-bold text-slate-200">
                      ناوی بەکارهێنەر: <span className="text-rose-400">*</span>
                    </label>
                    {barrierValidation.isUsernameValid && (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="signup-username-input"
                      value={signUpUsername}
                      onChange={(e) => setSignUpUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="username123"
                      className="w-full bg-slate-950/90 border border-slate-700/90 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 rounded-lg sm:rounded-xl pr-9 pl-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all text-right font-mono"
                      required
                    />
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 3. Email */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] sm:text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>ئیمەیڵ:</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    {barrierValidation.isEmailValid && (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      id="signup-email-input"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="w-full bg-slate-950/90 border border-slate-700/90 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 rounded-lg sm:rounded-xl pr-9 pl-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all text-left font-mono"
                      dir="ltr"
                      required
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 4. Role Selection */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-200 mb-0.5 text-right">
                    ڕۆڵ و دەسەڵات لە سیستەم:
                  </label>
                  <div className="relative">
                    <select
                      id="signup-role-select"
                      value={signUpRole}
                      onChange={(e) => setSignUpRole(e.target.value as UserRole)}
                      className="w-full bg-slate-950/90 border border-slate-700/90 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 rounded-lg sm:rounded-xl pr-9 pl-8 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-100 outline-none transition-all appearance-none text-right font-medium cursor-pointer"
                    >
                      <option value="accountant" className="bg-slate-900 text-slate-100">ژمێریاری گشتی</option>
                      <option value="cashier" className="bg-slate-900 text-slate-100">ژمێریار /بێژەری خاڵی فرۆشتن</option>
                      <option value="owner" className="bg-slate-900 text-slate-100">خاوەنی کار</option>
                      <option value="admin" className="bg-slate-900 text-slate-100">بەڕێوەبەری گشتی سیستەم</option>
                    </select>
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 5. Password & Confirm Password in 2 Columns on sm, tight rows on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[11px] sm:text-xs font-bold text-slate-200">
                        ژمارەی نهێنی: <span className="text-rose-400">*</span>
                      </label>
                      {barrierValidation.isPasswordValid && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showSignUpPassword ? 'text' : 'password'}
                        id="signup-password-input"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950/90 border border-slate-700/90 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 rounded-lg sm:rounded-xl pr-9 pl-9 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all text-right font-mono"
                        required
                        minLength={4}
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-md transition-colors cursor-pointer"
                        title={showSignUpPassword ? 'شاردنەوەی ژمارەی نهێنی' : 'پیشاندانی ژمارەی نهێنی'}
                      >
                        {showSignUpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[11px] sm:text-xs font-bold text-slate-200">
                        دووبارەکردنەوە: <span className="text-rose-400">*</span>
                      </label>
                      {barrierValidation.isConfirmValid && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showSignUpPassword ? 'text' : 'password'}
                        id="signup-confirm-password-input"
                        value={signUpConfirmPassword}
                        onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950/90 border border-slate-700/90 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 rounded-lg sm:rounded-xl pr-9 pl-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all text-right font-mono"
                        required
                      />
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  id="submit-signup-btn"
                  disabled={!barrierValidation.allPassed || isSubmitting}
                  className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 mt-2 sm:mt-2.5 cursor-pointer ${
                    barrierValidation.allPassed && !isSubmitting
                      ? 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white shadow-emerald-500/25 active:scale-98'
                      : 'bg-slate-800 text-slate-400 border border-slate-700/60 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                      <span>تکایە چاوەڕوان بە...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 shrink-0" />
                      <span>دروستکردنی هەژمار</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Email Account Support & Password Recovery Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl shadow-black/60 relative text-right flex flex-col gap-4 font-['Vazirmatn',sans-serif]">
            
            {/* Header with balanced spacing and aligned close button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-100">هێنانەوەی وشەی نهێنی</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSupportModal(false);
                  setSupportStep('input');
                  setSupportError('');
                  setSupportSuccess('');
                }}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="داخستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {supportError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{supportError}</span>
              </div>
            )}

            {supportSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{supportSuccess}</span>
              </div>
            )}

            {/* Step 1: Input Email */}
            {supportStep === 'input' && (
              <form onSubmit={handleSendSupportCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-2 text-right">
                    ئیمەیڵ:
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={supportIdentifier}
                      onChange={(e) => setSupportIdentifier(e.target.value)}
                      placeholder="example@gmail.com"
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 rounded-xl pr-10 pl-4 py-3 text-sm text-slate-100 outline-none text-right font-medium placeholder:text-slate-500 transition-colors"
                      required
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>ناردنی کۆد</span>
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Verify Code */}
            {supportStep === 'verify' && (
              <form onSubmit={handleVerifySupportCode} className="space-y-4">
                <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 text-xs text-slate-200 space-y-2.5">
                  <div>ئیمەیڵی هەژمار: <span className="font-mono text-emerald-400 font-bold" dir="ltr">{supportFoundUser?.email}</span></div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-emerald-500/40 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-300">کۆدی ئیمەیڵ:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lg text-amber-300 tracking-widest">{supportOtp}</span>
                      <button
                        type="button"
                        onClick={() => setSupportCodeInput(supportOtp)}
                        className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-500/40 cursor-pointer transition-colors"
                      >
                        پڕکردنەوە
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-2 text-right">
                    کۆدی ٦ ژمارەیی بنووسە:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={supportCodeInput}
                    onChange={(e) => setSupportCodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 rounded-xl px-4 py-3 text-center text-xl text-white font-mono tracking-widest outline-none font-bold"
                    required
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>پشتڕاستکردنەوە</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupportStep('input')}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-white font-bold text-sm transition-all cursor-pointer"
                  >
                    گەڕانەوە
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Set New Password */}
            {supportStep === 'new_password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-2 text-right">
                    ژمارەی نهێنی نوێ:
                  </label>
                  <div className="relative">
                    <input
                      type={showSupportPassword ? 'text' : 'password'}
                      value={supportNewPassword}
                      onChange={(e) => setSupportNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 rounded-xl pr-10 pl-10 py-3 text-sm text-slate-100 outline-none text-right font-mono"
                      required
                      minLength={4}
                    />
                    <Lock className="w-4 h-4 text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowSupportPassword(!showSupportPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 p-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {showSupportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-2 text-right">
                    دووبارەکردنەوەی ژمارەی نهێنی نوێ:
                  </label>
                  <div className="relative">
                    <input
                      type={showSupportPassword ? 'text' : 'password'}
                      value={supportConfirmPassword}
                      onChange={(e) => setSupportConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 rounded-xl pr-10 pl-4 py-3 text-sm text-slate-100 outline-none text-right font-mono"
                      required
                    />
                    <ShieldCheck className="w-4 h-4 text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSupportSubmitting}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    <span>{isSupportSubmitting ? 'نوێکردنەوە...' : 'تۆمارکردنی ژمارەی نهێنی نوێ'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Security Passcode Delete Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4 text-right">
            <button
              onClick={() => setAccountToDelete(null)}
              className="absolute top-4 left-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100">سڕینەوەی هەژماری خەزنکراو</h3>
                <p className="text-xs text-slate-300">هەژماری ({accountToDelete.name}) - @{accountToDelete.username}</p>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              ئایا دڵنیایت لە سڕینەوەی هەژماری خەزنکراوی (<span className="text-rose-400 font-bold">{accountToDelete.name}</span>)؟ لە دوای سڕینەوە ئیتر ئەم هەژمارە نیشان نادڕێتەوە.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  deleteUser(accountToDelete.id);
                  setSignInSuccess(`هەژماری (${accountToDelete.name}) بە سەرکەوتوویی بۆ هەمیشە سڕایەوە.`);
                  setAccountToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>سڕینەوەی هەژمار</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                پەشیمانبوونەوە
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
