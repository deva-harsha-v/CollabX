import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, User, Mail, Lock, Upload, ArrowRight, AlertCircle, Image as ImageIcon, X, KeyRound } from 'lucide-react';
import { signUp, signIn, adminSignIn } from '../lib/storage';
import { useApp } from '../context/AppContext';
import RoleAutocompleteInput from '../components/RoleAutocompleteInput';

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
  const [skills, setSkills] = useState([]);
  const [docName, setDocName] = useState('');
  const [docBase64, setDocBase64] = useState(null);

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
        setErrorMsg('Please enter a valid email address.');
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
        email,
        password,
        avatar: avatarPreview || getInitialsAvatar(name),
        skills,
        verificationDocument: docBase64 ? { name: docName, base64: docBase64 } : null,
      });

      setIsSubmitting(false);

      if (error) {
        setErrorMsg(error.message || 'Registration failed. Please try again.');
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
        setErrorMsg(error.message || 'Invalid credentials.');
        return;
      }

      loginUser(user);
      navigate('/feed');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#502D55] cyber-grid overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#935073]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#935073]/25 rounded-full blur-[140px] pointer-events-none" />

      {/* Brand Header */}
      <Link to="/" className="relative z-10 flex items-center gap-3 mb-8 group">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#935073] to-[#F6DBC0] p-[1.5px] shadow-lg shadow-[#935073]/20 group-hover:scale-105 transition-transform duration-300">
          <div className="w-full h-full bg-[#502D55] rounded-[14px] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#F6DBC0] group-hover:rotate-12 transition-transform duration-300" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-['Outfit'] font-black text-2xl tracking-tight text-[#F8F4E9] flex items-center">
            Collab<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#935073] to-[#F6DBC0]">X</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-[#F6DBC0]/80 font-mono -mt-1 font-semibold">Challenge Grid</span>
        </div>
      </Link>

      {/* Auth Card Shell */}
      <div className="relative z-10 w-full max-w-md p-8 bg-[#935073]/90 border border-[#935073]/40 rounded-3xl backdrop-blur-2xl shadow-[0_0_50px_rgba(147, 80, 115,0.25)]">
        
        {/* Toggle Mode Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 mb-6 bg-[#502D55]/80 border border-[#935073]/30 rounded-2xl">
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-[#935073] to-[#935073] text-[#F8F4E9] shadow-md border border-[#F6DBC0]/30'
                : 'text-[#F6DBC0]/70 hover:text-[#F8F4E9]'
            }`}
          >
            Create Account
          </button>

          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(''); }}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'signin'
                ? 'bg-gradient-to-r from-[#935073] to-[#935073] text-[#F8F4E9] shadow-md border border-[#F6DBC0]/30'
                : 'text-[#F6DBC0]/70 hover:text-[#F8F4E9]'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Card Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold font-['Outfit'] text-[#F8F4E9]">
            {mode === 'signup' ? 'Join the CollabX Network' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-[#F6DBC0]/80 mt-1">
            {mode === 'signup'
              ? 'Universal account for problem solvers, researchers & innovators'
              : 'Enter your credentials to access the verified challenge feed'}
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
          
          {/* Avatar / Picture (Sign Up Only) */}
          {mode === 'signup' && (
            <div className="flex items-center gap-4 mb-2">
              <div className="relative w-14 h-14 rounded-full border border-[#935073]/40 bg-[#502D55] overflow-hidden flex items-center justify-center shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-[#F6DBC0]/60" />
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#502D55] hover:bg-[#935073] border border-[#935073]/40 text-xs font-medium text-[#F6DBC0] hover:text-[#F8F4E9] cursor-pointer transition-colors">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{avatarPreview ? 'Change Photo' : 'Upload Avatar'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
                <p className="text-[10px] text-[#F6DBC0]/60 font-mono mt-1">Optional profile picture</p>
              </div>
            </div>
          )}

          {/* Full Name (Sign Up Only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#F6DBC0] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F6DBC0]/60" />
                <input
                  type="text"
                  required
                  placeholder="Dr. Jane Doe / John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#502D55]/80 border border-[#935073]/40 rounded-xl text-sm text-[#F8F4E9] placeholder:text-[#F6DBC0]/40 focus:outline-none focus:border-[#F6DBC0] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#F6DBC0] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F6DBC0]/60" />
              <input
                type="email"
                required
                placeholder="name@university.edu or organization.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#502D55]/80 border border-[#935073]/40 rounded-xl text-sm text-[#F8F4E9] placeholder:text-[#F6DBC0]/40 focus:outline-none focus:border-[#F6DBC0] transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#F6DBC0] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F6DBC0]/60" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#502D55]/80 border border-[#935073]/40 rounded-xl text-sm text-[#F8F4E9] placeholder:text-[#F6DBC0]/40 focus:outline-none focus:border-[#F6DBC0] transition-colors"
              />
            </div>
          </div>

          {/* Confirm Password (Sign Up Only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#F6DBC0] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F6DBC0]/60" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#502D55]/80 border border-[#935073]/40 rounded-xl text-sm text-[#F8F4E9] placeholder:text-[#F6DBC0]/40 focus:outline-none focus:border-[#F6DBC0] transition-colors"
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

          {/* Optional Verification Document (Sign Up only) */}
          {mode === 'signup' && (
            <div className="pt-2">
              <div className="p-3.5 rounded-xl bg-[#502D55]/60 border border-dashed border-[#935073]/40 text-xs">
                <div className="flex items-start gap-2.5">
                  <Upload className="w-4 h-4 text-[#F6DBC0] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-[#F8F4E9]">
                      Upload Verification Document <span className="text-[10px] text-[#F6DBC0] font-mono font-normal">(Optional)</span>
                    </p>
                    <p className="text-[11px] text-[#F6DBC0]/80 mt-0.5 leading-snug">
                      Optional — you can verify your credentials later. Accepts PDF/PNG proof.
                    </p>
                    <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#935073] border border-[#935073]/40 text-[11px] font-medium text-[#F6DBC0] hover:bg-[#935073]/30 cursor-pointer transition-colors">
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
      </div>

      {/* Discrete Bottom-Right Shield Icon Button for Admin Access */}
      <button
        type="button"
        onClick={() => { setShowAdminModal(true); setAdminError(''); }}
        title="Admin Supervisory Portal"
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-[#935073]/90 hover:bg-red-950/80 border-2 border-red-500/50 text-red-400 hover:text-red-300 shadow-[0_0_25px_rgba(239,68,68,0.45)] backdrop-blur-md transition-all hover:scale-110 group"
      >
        <ShieldAlert className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform" />
      </button>

      {/* Admin Sign In Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 sm:p-8 bg-[#935073]/95 border-2 border-red-500/50 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.3)] text-[#F8F4E9]">
            <button
              onClick={() => setShowAdminModal(false)}
              className="absolute top-6 right-6 p-2 text-[#F6DBC0] hover:text-[#F8F4E9] rounded-full bg-white/5 hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-['Outfit'] text-[#F8F4E9]">
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
                <label className="block text-xs font-mono uppercase tracking-wider text-[#F6DBC0] mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F6DBC0]/60" />
                  <input
                    type="email"
                    required
                    placeholder="admin@collabx.org"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#502D55] border border-[#935073]/40 rounded-xl text-xs text-[#F8F4E9] placeholder:text-[#F6DBC0]/40 focus:outline-none focus:border-red-400 transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#F6DBC0] mb-1.5">
                  Admin Key / Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F6DBC0]/60" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#502D55] border border-[#935073]/40 rounded-xl text-xs text-[#F8F4E9] placeholder:text-[#F6DBC0]/40 focus:outline-none focus:border-red-400 transition-colors font-mono"
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
                <span className="text-[#F6DBC0]/60">Single Set Credentials</span>
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
