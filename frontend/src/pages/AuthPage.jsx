import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, User, Mail, Lock, Upload, ArrowRight, AlertCircle, Image as ImageIcon, X, KeyRound, Phone, Building2, UserCheck, FileCheck, CheckCircle2, RotateCcw } from 'lucide-react';
import { signUp, signIn, resendVerificationEmail, isValidOrgEmail } from '../lib/storage';
import { useApp } from '../context/AppContext';
import RoleAutocompleteInput from '../components/RoleAutocompleteInput';
import LogoIcon from '../components/LogoIcon';

const AuthPage = () => {
  const navigate = useNavigate();
  const { currentUser, loginUser } = useApp();

  const [mode, setMode] = useState('signup'); // 'signup' | 'signin'
  const [accountType, setAccountType] = useState('organisation'); // 'organisation' (default) | 'public'
  
  // Sign Up Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null); // base64 string
  const [skills, setSkills] = useState([]);
  const [docName, setDocName] = useState('');
  const [docBase64, setDocBase64] = useState(null);

  // Email Confirmation & Resend States
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(null); // email string if waiting for verification
  const [isResending, setIsResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(null);

  // Error & Loading States
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');
    setIsAdminSubmitting(true);
    const { data, error } = await adminSignIn(adminEmail, adminPassword);
    setIsAdminSubmitting(false);

    if (error) {
      setAdminError(error.message);
      return;
    }

    if (data) {
      navigate('/admin');
    }
  };

  const handleResend = async (targetEmail) => {
    const toEmail = targetEmail || email || confirmationEmailSent || unconfirmedEmail;
    if (!toEmail) return;

    setIsResending(true);
    setResendMsg('');
    setErrorMsg('');

    const { error } = await resendVerificationEmail(toEmail);
    setIsResending(false);

    if (error) {
      setErrorMsg(error.message || 'Failed to resend confirmation email.');
    } else {
      setResendMsg(`Confirmation link has been resent to ${toEmail}. Please check your inbox and spam folder.`);
      setTimeout(() => setResendMsg(''), 8000);
    }
  };

  // Handle Profile Picture File Change
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, JPEG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle Verification Document Change
  const handleDocChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setDocBase64(reader.result);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  // Generate Initials Avatar Data URL if no image provided
  const getInitialsAvatar = (userName) => {
    const nameStr = userName.trim() || 'User';
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameStr)}&backgroundColor=0284c7,0d9488,06b6d4`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setResendMsg('');
    setUnconfirmedEmail(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (!email.trim()) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }

      // Organization Account Validation: Must match approved domain (without revealing domain hints)
      if (accountType === 'organisation') {
        if (!isValidOrgEmail(email)) {
          setErrorMsg('Invalid organization email address. Please use your official organization email.');
          return;
        }
      }

      // Phone Number Validation: Mandatory 10 numeric digits for Public accounts, and 10 digits if provided for Org
      const cleanPhone = phone.replace(/\D/g, '');
      if (accountType === 'public') {
        if (!cleanPhone || cleanPhone.length !== 10) {
          setErrorMsg('Please enter a valid 10-digit phone number (numbers only, e.g. 9876543210).');
          return;
        }
        if (!docBase64) {
          setErrorMsg('Official verification document upload is mandatory for public accounts (Aadhaar, Driving License, PAN card, etc.).');
          return;
        }
      } else if (phone.trim() && cleanPhone.length !== 10) {
        setErrorMsg('Please enter a valid 10-digit phone number (numbers only, e.g. 9876543210).');
        return;
      }

      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      setIsSubmitting(true);

      const { data: newUser, error } = await signUp({
        name,
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || null,
        account_type: accountType,
        avatar: avatarPreview || getInitialsAvatar(name),
        skills,
        verificationDocument: docBase64 ? { name: docName, base64: docBase64 } : null,
      });

      setIsSubmitting(false);

      if (error) {
        setErrorMsg(error.message || 'Registration failed. Please try again.');
        return;
      }

      // If email confirmation is required, display confirmation screen
      if (newUser?.needsEmailConfirmation) {
        setConfirmationEmailSent(email.trim().toLowerCase());
        return;
      }

      loginUser(newUser);
      navigate('/feed');
    } else {
      // Sign In
      if (!email.trim() || !password) {
        setErrorMsg('Please provide both email and password.');
        return;
      }

      setIsSubmitting(true);

      const { data: user, error } = await signIn(email, password);

      setIsSubmitting(false);

      if (error) {
        if (error.isEmailUnconfirmed) {
          setUnconfirmedEmail(error.email || email.trim().toLowerCase());
        }
        setErrorMsg(error.message || 'Invalid credentials.');
        return;
      }

      loginUser(user);
      navigate('/feed');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#06142e] cyber-grid overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0b2240]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0b2240]/25 rounded-full blur-[140px] pointer-events-none" />

      {/* Brand Header */}
      <Link to={currentUser ? "/feed" : "/"} className="relative z-10 flex items-center gap-3 mb-8 group">
        <LogoIcon size="md" />
        <div className="flex flex-col">
          <span className="font-['Outfit'] font-black text-2xl tracking-tight text-[#f0f9ff] flex items-center">
            Collab<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8]">X</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-[#38bdf8]/80 font-mono -mt-1 font-semibold">Challenge Grid</span>
        </div>
      </Link>

      {/* Auth Card Shell */}
      <div className="relative z-10 w-full max-w-md p-8 bg-[#0b2240]/90 border border-[#0ea5e9]/35 rounded-3xl backdrop-blur-2xl shadow-[0_0_50px_rgba(74, 127, 167,0.25)]">
        
        {/* EMAIL CONFIRMATION REQUIRED SCREEN */}
        {confirmationEmailSent ? (
          <div className="text-center py-4 animate-fade-in space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#0b2240] via-[#06142e] to-[#0ea5e9]/40 border border-[#0ea5e9]/60 mx-auto flex items-center justify-center shadow-lg shadow-[#0ea5e9]/20">
              <Mail className="w-8 h-8 text-[#38bdf8] animate-pulse" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono text-[10px] font-bold uppercase mb-2">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                <span>Verification Email Dispatched</span>
              </div>
              <h2 className="text-2xl font-bold font-['Outfit'] text-[#f0f9ff]">
                Verify Your Account
              </h2>
              <p className="text-xs text-[#38bdf8]/80 mt-2 leading-relaxed">
                We've sent an official confirmation link to:
              </p>
              <div className="mt-2 p-2.5 rounded-xl bg-[#06142e] border border-[#0ea5e9]/40 font-mono text-xs font-bold text-[#38bdf8] truncate shadow-inner">
                {confirmationEmailSent}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#06142e]/80 border border-[#0ea5e9]/30 text-left text-xs font-mono text-[#38bdf8]/90 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[#38bdf8] font-bold">1.</span>
                <span>Open your inbox and click the verification link.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#38bdf8] font-bold">2.</span>
                <span>Check your <b className="text-[#f0f9ff]">Spam / Junk</b> folder if not in primary inbox.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#38bdf8] font-bold">3.</span>
                <span>Return and sign in to activate your platform access.</span>
              </div>
            </div>

            {resendMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{resendMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmationEmailSent(null);
                  setMode('signin');
                  setEmail(confirmationEmailSent);
                  setErrorMsg('');
                  setResendMsg('');
                }}
                className="w-full red-pill-button py-3 text-sm font-bold shadow-xl flex items-center justify-center gap-2"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleResend(confirmationEmailSent)}
                disabled={isResending}
                className="w-full py-2.5 px-4 rounded-xl bg-[#06142e] hover:bg-[#0b2240] border border-[#0ea5e9]/35 text-[#38bdf8] hover:text-[#f0f9ff] text-xs font-semibold font-mono flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>{isResending ? 'Resending Link...' : 'Resend Verification Link'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Toggle Mode Tabs (Create Account / Sign In) */}
            <div className="grid grid-cols-2 gap-2 p-1.5 mb-3 bg-[#06142e]/80 border border-[#0ea5e9]/30 rounded-2xl">
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMsg(''); setResendMsg(''); setUnconfirmedEmail(null); }}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-gradient-to-r from-[#0b2240] to-[#0b2240] text-[#f0f9ff] shadow-md border border-[#38bdf8]/30'
                    : 'text-[#38bdf8]/70 hover:text-[#f0f9ff]'
                }`}
              >
                Create Account
              </button>

              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMsg(''); setResendMsg(''); }}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === 'signin'
                    ? 'bg-gradient-to-r from-[#0b2240] to-[#0b2240] text-[#f0f9ff] shadow-md border border-[#38bdf8]/30'
                    : 'text-[#38bdf8]/70 hover:text-[#f0f9ff]'
                }`}
              >
                Sign In
              </button>
            </div>

            {/* Account Type Selector (Organisation vs Public) - Positioned directly below Create Account / Sign In */}
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-2 p-1.5 mb-6 bg-[#06142e]/90 border border-[#0ea5e9]/40 rounded-2xl">
                <button
                  type="button"
                  onClick={() => { setAccountType('organisation'); setErrorMsg(''); }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    accountType === 'organisation'
                      ? 'bg-gradient-to-r from-[#0b2240] to-[#143d6e] text-[#f0f9ff] shadow-md border border-[#38bdf8]/60 ring-1 ring-[#38bdf8]/40'
                      : 'text-[#38bdf8]/70 hover:text-[#f0f9ff]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Organisation Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setAccountType('public'); setErrorMsg(''); }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    accountType === 'public'
                      ? 'bg-gradient-to-r from-[#0b2240] to-[#143d6e] text-[#f0f9ff] shadow-md border border-[#38bdf8]/60 ring-1 ring-[#38bdf8]/40'
                      : 'text-[#38bdf8]/70 hover:text-[#f0f9ff]'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Public Account</span>
                </button>
              </div>
            )}

            {/* Card Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-['Outfit'] text-[#f0f9ff]">
                {mode === 'signup' 
                  ? (accountType === 'organisation' ? 'Organisation Member Registration' : 'Public Solver Registration')
                  : 'Welcome Back'}
              </h2>
              <p className="text-xs text-[#38bdf8]/80 mt-1">
                {mode === 'signup'
                  ? (accountType === 'organisation'
                      ? 'Institutional registration — email verification required before login'
                      : 'Public registration with identity verification — email verification required')
                  : 'Enter your credentials to access the verified challenge feed'}
              </p>
            </div>

            {/* Resend Success Message */}
            {resendMsg && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{resendMsg}</span>
              </div>
            )}

            {/* Inline Error Message */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs space-y-2 animate-fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>

                {/* Resend Link Button for Unconfirmed Email */}
                {unconfirmedEmail && (
                  <div className="pt-2 border-t border-red-500/30 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-red-300">Need a new link?</span>
                    <button
                      type="button"
                      onClick={() => handleResend(unconfirmedEmail)}
                      disabled={isResending}
                      className="px-3 py-1 rounded-lg bg-red-900/80 hover:bg-red-800 border border-red-400/50 text-white font-mono text-[11px] font-bold transition-colors disabled:opacity-50"
                    >
                      {isResending ? 'Sending...' : 'Resend Email'}
                    </button>
                  </div>
                )}
              </div>
            )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Avatar / Picture (Sign Up Only) */}
          {mode === 'signup' && (
            <div className="flex items-center gap-4 mb-2">
              <div className="relative w-14 h-14 rounded-full border border-[#0ea5e9]/35 bg-[#06142e] overflow-hidden flex items-center justify-center shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-[#38bdf8]/60" />
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#06142e] hover:bg-[#0b2240] border border-[#0ea5e9]/35 text-xs font-medium text-[#38bdf8] hover:text-[#f0f9ff] cursor-pointer transition-colors">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{avatarPreview ? 'Change Photo' : 'Upload Avatar'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
                <p className="text-[10px] text-[#38bdf8]/60 font-mono mt-1">Optional profile picture</p>
              </div>
            </div>
          )}

          {/* Full Name (Sign Up Only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
                <input
                  type="text"
                  required
                  placeholder="Dr. Jane Doe / John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-sm text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5 flex items-center justify-between">
              <span>{accountType === 'organisation' ? 'Official Organization Email' : 'Email Address'} <span className="text-[#38bdf8]">*</span></span>
              {accountType === 'organisation' && (
                <span className="text-[10px] text-[#38bdf8]/80 font-mono">Approved Org Domains Only</span>
              )}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
              <input
                type="email"
                required
                placeholder={accountType === 'organisation' ? 'your.name@organisation.domain' : 'your.email@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-sm text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors font-mono"
              />
            </div>
          </div>

          {/* Phone Number (MANDATORY for Public Account, Optional for Organisation) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5 flex items-center justify-between">
                <span>Phone Number {accountType === 'public' ? <span className="text-red-400 font-bold">* (10 Digits)</span> : <span className="text-[10px] text-[#38bdf8]/60 font-normal">(Optional · 10 Digits)</span>}</span>
                {accountType === 'public' && <span className="text-[10px] text-red-400 font-mono font-normal">Mandatory for Public</span>}
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
                <input
                  type="tel"
                  required={accountType === 'public'}
                  placeholder="9876543210"
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full pl-10 pr-4 py-3 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-sm text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors font-mono"
                />
              </div>
              <p className="text-[10px] text-[#38bdf8]/60 font-mono mt-1">Must be exactly 10 numeric digits</p>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-sm text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors"
              />
            </div>
          </div>

          {/* Confirm Password (Sign Up Only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-sm text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Roles & Skills Selection (Sign Up Only) */}
          {mode === 'signup' && (
            <div>
              <RoleAutocompleteInput
                selectedRoles={skills}
                onChange={setSkills}
                label="My Skills & Roles (Optional)"
                placeholder="Choose your skills (e.g. 'hy' for Hydrologist)..."
              />
            </div>
          )}

          {/* Verification Document Section */}
          {mode === 'signup' && accountType === 'public' && (
            <div className="pt-2">
              <div className="p-3.5 rounded-xl bg-[#06142e]/80 border border-dashed border-red-500/50 text-xs shadow-inner">
                <div className="flex items-start gap-2.5">
                  <Upload className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-[#f0f9ff] flex items-center justify-between">
                      <span>Official Verification Document <span className="text-red-400 font-bold">* (Mandatory)</span></span>
                    </p>
                    <p className="text-[11px] text-[#38bdf8]/80 mt-0.5 leading-snug">
                      Mandatory for Public Accounts. Upload Aadhaar, Driving License, PAN card, or Government Photo ID (PDF, PNG, JPG).
                    </p>
                    <label className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b2240] hover:bg-[#143d6e] border border-[#0ea5e9]/40 text-[11px] font-medium text-[#38bdf8] hover:text-[#f0f9ff] cursor-pointer transition-colors shadow">
                      <span>{docName || 'Select ID Document'}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={handleDocChange}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Organisation Account Direct Verification Note */}
          {mode === 'signup' && accountType === 'organisation' && (
            <div className="p-3 rounded-xl bg-[#06142e]/60 border border-[#0ea5e9]/40 text-xs flex items-center gap-2.5 text-[#38bdf8]">
              <ShieldCheck className="w-4 h-4 text-[#38bdf8] shrink-0" />
              <p className="text-[11px] leading-snug">
                <span className="font-bold text-[#f0f9ff]">Institutional Clearance:</span> No document upload needed. Verified via your official organization domain.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full red-pill-button py-3.5 text-base font-bold shadow-lg disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Processing...' : mode === 'signup' ? 'Complete Sign Up & Join' : 'Sign In to CollabX'}</span>
              <ArrowRight className="w-4 h-4 ml-2 inline" />
            </button>
            </div>
          </form>
        </>
      )}
      </div>

      {/* Discrete Bottom-Right Shield Icon Button for Admin Access */}
      <button
        type="button"
        onClick={() => { setShowAdminModal(true); setAdminError(''); }}
        title="Admin Supervisory Portal"
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-[#0b2240]/90 hover:bg-red-950/80 border-2 border-red-500/50 text-red-400 hover:text-red-300 shadow-[0_0_25px_rgba(239,68,68,0.45)] backdrop-blur-md transition-all hover:scale-110 group"
      >
        <ShieldAlert className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform" />
      </button>

      {/* Admin Sign In Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 sm:p-8 bg-[#0b2240]/95 border-2 border-red-500/50 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.3)] text-[#f0f9ff]">
            <button
              onClick={() => setShowAdminModal(false)}
              className="absolute top-6 right-6 p-2 text-[#38bdf8] hover:text-[#f0f9ff] rounded-full bg-white/5 hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-['Outfit'] text-[#f0f9ff]">
                  Admin Supervisory Portal
                </h3>
                <p className="text-xs text-red-300 font-mono">Assigned Owner / Admin Access</p>
              </div>
            </div>

            {adminError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
                  <input
                    type="email"
                    required
                    placeholder="admin@collabx.org"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#06142e] border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-red-400 transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5">
                  Admin Key / Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#06142e] border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-red-400 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Quick Fill Helper for Assigned Credentials */}
              <div className="pt-1 flex justify-between items-center text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setAdminEmail('admin@collabx.org');
                    setAdminPassword('AdminCollabX2026!Secure');
                  }}
                  className="text-red-400 hover:text-red-300 underline cursor-pointer"
                >
                  Fill Assigned Credentials
                </button>
                <span className="text-[#38bdf8]/60">Single Set Credentials</span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isAdminSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-800 border border-red-400/40 text-white font-bold text-xs transition-all shadow-lg hover:brightness-110 disabled:opacity-50"
                >
                  {isAdminSubmitting ? 'Authenticating Command...' : 'Enter Admin Supervisory Command'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
