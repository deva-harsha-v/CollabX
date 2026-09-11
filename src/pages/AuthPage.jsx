import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, User, Mail, Lock, Upload, ArrowRight, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { signUp, signIn } from '../lib/storage';
import { useApp } from '../context/AppContext';

const AuthPage = () => {
  const navigate = useNavigate();
  const { loginUser } = useApp();

  const [mode, setMode] = useState('signup'); // 'signup' | 'signin'
  
  // Sign Up Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null); // base64 string
  const [docName, setDocName] = useState('');
  const [docBase64, setDocBase64] = useState(null);

  // Error & Loading States
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Profile Picture File Change
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Profile picture must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      // NOTE: This base64 data URL will be replaced with a Supabase Storage bucket URL in production.
      setAvatarPreview(reader.result);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  // Handle Verification Document Change (Optional)
  const handleDocChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocBase64(reader.result);
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

    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (!email.trim()) {
        setErrorMsg('Please enter your official email address.');
        return;
      }
      if (!password) {
        setErrorMsg('Please enter a password.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      setIsSubmitting(true);
      const finalAvatar = avatarPreview || getInitialsAvatar(name);

      const { data, error } = await signUp({
        name,
        email,
        password,
        avatar: finalAvatar,
        verificationDoc: docBase64 || null,
      });

      setIsSubmitting(false);

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      loginUser(data);
      navigate('/feed');
    } else {
      // Sign In Flow
      if (!email.trim() || !password) {
        setErrorMsg('Please enter both email and password.');
        return;
      }

      setIsSubmitting(true);
      const { data, error } = await signIn(email, password);
      setIsSubmitting(false);

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      loginUser(data);
      navigate('/feed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1931] text-[#F6FAFD] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden cyber-grid">
      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#4A7FA7]/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#1A3D63]/25 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Brand Link */}
      <Link to="/" className="flex items-center gap-3 mb-8 group z-10">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4A7FA7] via-[#1A3D63] to-[#B3CFE5] p-[2px] shadow-lg shadow-[#4A7FA7]/25">
          <div className="w-full h-full bg-[#0A1931] rounded-[14px] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#B3CFE5] group-hover:rotate-12 transition-transform duration-300" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-['Outfit'] font-black text-2xl tracking-tight text-[#F6FAFD] flex items-center">
            Collab<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4A7FA7] to-[#B3CFE5]">X</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-[#B3CFE5]/80 font-mono -mt-1 font-semibold">Civic Grid</span>
        </div>
      </Link>

      {/* Auth Card Shell */}
      <div className="relative z-10 w-full max-w-md p-8 bg-[#1A3D63]/90 border border-[#4A7FA7]/40 rounded-3xl backdrop-blur-2xl shadow-[0_0_50px_rgba(74,127,167,0.25)]">
        
        {/* Toggle Mode Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 mb-6 bg-[#0A1931]/80 border border-[#4A7FA7]/30 rounded-2xl">
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-[#4A7FA7] to-[#1A3D63] text-[#F6FAFD] shadow-md border border-[#B3CFE5]/30'
                : 'text-[#B3CFE5]/70 hover:text-[#F6FAFD]'
            }`}
          >
            Create Account
          </button>

          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(''); }}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'signin'
                ? 'bg-gradient-to-r from-[#4A7FA7] to-[#1A3D63] text-[#F6FAFD] shadow-md border border-[#B3CFE5]/30'
                : 'text-[#B3CFE5]/70 hover:text-[#F6FAFD]'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Card Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold font-['Outfit'] text-[#F6FAFD]">
            {mode === 'signup' ? 'Join the CollabX Network' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-[#B3CFE5]/80 mt-1">
            {mode === 'signup'
              ? 'Universal account for civic problem solvers & community partners'
              : 'Enter your credentials to access the verified feed'}
          </p>
        </div>

        {/* Inline Error Message */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Sign Up Avatar Upload Preview */}
          {mode === 'signup' && (
            <div className="flex flex-col items-center justify-center mb-5">
              <div className="relative w-20 h-20 rounded-full border-2 border-[#4A7FA7]/60 bg-[#0A1931] flex items-center justify-center overflow-hidden shadow-inner group">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#B3CFE5]/80 group-hover:text-[#F6FAFD] transition-colors">
                    <User className="w-8 h-8" />
                    <span className="text-[10px] font-mono mt-0.5">Photo</span>
                  </div>
                )}
              </div>
              
              <label className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A1931]/80 border border-[#4A7FA7]/40 text-[#B3CFE5] text-xs font-medium hover:bg-[#4A7FA7]/30 cursor-pointer transition-colors">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{avatarPreview ? 'Change Photo' : 'Upload Profile Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
          )}

          {/* Full Name (Sign Up only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-[#B3CFE5] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#B3CFE5]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Priya Raman"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0A1931]/80 border border-[#4A7FA7]/40 rounded-xl text-sm text-[#F6FAFD] placeholder:text-[#B3CFE5]/40 focus:outline-none focus:border-[#B3CFE5] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-[#B3CFE5] uppercase tracking-wider mb-1.5">
              Official Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#B3CFE5]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@institution.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0A1931]/80 border border-[#4A7FA7]/40 rounded-xl text-sm text-[#F6FAFD] placeholder:text-[#B3CFE5]/40 focus:outline-none focus:border-[#B3CFE5] transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-[#B3CFE5] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#B3CFE5]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0A1931]/80 border border-[#4A7FA7]/40 rounded-xl text-sm text-[#F6FAFD] placeholder:text-[#B3CFE5]/40 focus:outline-none focus:border-[#B3CFE5] transition-colors"
              />
            </div>
          </div>

          {/* Confirm Password (Sign Up only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-[#B3CFE5] uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#B3CFE5]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0A1931]/80 border border-[#4A7FA7]/40 rounded-xl text-sm text-[#F6FAFD] placeholder:text-[#B3CFE5]/40 focus:outline-none focus:border-[#B3CFE5] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Optional Verification Document (Sign Up only) */}
          {mode === 'signup' && (
            <div className="pt-2">
              <div className="p-3.5 rounded-xl bg-[#0A1931]/60 border border-dashed border-[#4A7FA7]/40 text-xs">
                <div className="flex items-start gap-2.5">
                  <Upload className="w-4 h-4 text-[#B3CFE5] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-[#F6FAFD]">
                      Upload Verification Document <span className="text-[10px] text-[#B3CFE5] font-mono font-normal">(Optional)</span>
                    </p>
                    <p className="text-[11px] text-[#B3CFE5]/80 mt-0.5 leading-snug">
                      Optional — you can verify your credentials later. Accepts PDF/PNG proof.
                    </p>
                    <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1A3D63] border border-[#4A7FA7]/40 text-[11px] font-medium text-[#B3CFE5] hover:bg-[#4A7FA7]/30 cursor-pointer transition-colors">
                      <span>{docName || 'Choose File'}</span>
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

          {/* Submit Button (Red Pill Button - THE ONLY RED ELEMENT UNTOUCHED) */}
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
      </div>
    </div>
  );
};

export default AuthPage;
