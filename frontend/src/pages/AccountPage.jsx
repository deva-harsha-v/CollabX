import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Camera, Check, AlertCircle, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useApp } from '../context/AppContext';
import { updateUserProfile, changeUserPassword } from '../lib/storage';
import RoleAutocompleteInput from '../components/RoleAutocompleteInput';
import UserBadge from '../components/UserBadge';

const AccountPage = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useApp();

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [skills, setSkills] = useState(currentUser?.skills || []);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
      setAvatarFile(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    const cleanPhone = phone.replace(/\D/g, '');
    if (phone.trim() && cleanPhone.length !== 10) {
      setProfileErrorMsg('Please enter a valid 10-digit phone number (numbers only, e.g. 9876543210).');
      return;
    }

    setIsSavingProfile(true);

    const { data: updated, error } = await updateUserProfile(currentUser.id, {
      name: name.trim(),
      phone: cleanPhone || null,
      avatar: avatarFile || avatarPreview,
      skills,
    });

    setIsSavingProfile(false);

    if (error) {
      setProfileErrorMsg(error.message || 'Failed to update profile.');
      return;
    }

    if (updated) {
      setCurrentUser((prev) => ({ ...prev, ...updated }));
      setProfileSuccessMsg('Profile updated successfully!');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    if (!currentPassword) {
      setPasswordErrorMsg('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);

    const { error } = await changeUserPassword({
      email: currentUser?.email,
      currentPassword,
      newPassword,
    });

    setIsChangingPassword(false);

    if (error) {
      setPasswordErrorMsg(error.message || 'Failed to change password.');
      return;
    }

    setPasswordSuccessMsg('Password changed successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccessMsg(''), 4000);
  };

  return (
    <div className="min-h-screen bg-[#06142e] text-[#f0f9ff] cyber-grid relative">
      <div className="absolute top-20 left-1/3 w-[600px] h-[400px] bg-[#0ea5e9]/15 rounded-full blur-[160px] pointer-events-none" />

      <Navbar />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-32">
        {/* Back Link */}
        <button
          type="button"
          onClick={() => navigate('/feed')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0b2240] hover:bg-[#143d6e] border border-[#0ea5e9]/35 text-[#38bdf8] hover:text-[#f0f9ff] text-xs font-semibold mb-6 transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-[#38bdf8]" />
          <span>Back to Feed</span>
        </button>

        {/* Page Header */}
        <div className="mb-8 border-b border-[#0ea5e9]/30 pb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0b2240]/80 border border-[#0ea5e9]/35 text-[#38bdf8] text-xs font-mono uppercase tracking-wider mb-3 shadow-md backdrop-blur-md">
            <User className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Account Settings</span>
          </div>
          <h1 className="font-['Outfit'] font-extrabold text-3xl sm:text-4xl text-[#f0f9ff] tracking-tight">
            My Profile & Security
          </h1>
          <p className="text-sm text-[#38bdf8] mt-1">
            Manage your personal profile details and update your account credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Profile Information */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0b2240]/80 border border-[#0ea5e9]/35 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
                <h2 className="font-['Outfit'] font-bold text-xl text-[#f0f9ff] flex items-center gap-2">
                  <User className="w-5 h-5 text-[#38bdf8]" />
                  <span>Profile Information</span>
                </h2>
                <UserBadge user={currentUser} size="sm" />
              </div>

              {profileErrorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              {profileSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Avatar Preview & Upload */}
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#0ea5e9] bg-[#06142e] shrink-0">
                    <img
                      src={avatarPreview}
                      alt={name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}`;
                      }}
                    />
                  </div>
                  <div>
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#06142e] hover:bg-[#0b2240] border border-[#0ea5e9]/35 text-[#38bdf8] hover:text-[#f0f9ff] text-xs font-semibold cursor-pointer transition-colors shadow-md">
                      <Camera className="w-4 h-4 text-[#38bdf8]" />
                      <span>Change Picture</span>
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </label>
                    <p className="text-[10px] text-[#38bdf8]/60 font-mono mt-1.5">PNG, JPG or WEBP up to 5MB</p>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors font-medium"
                    />
                  </div>
                </div>

                {/* Email (Read Only) */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5">
                    Email Address (Read-Only)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 bg-[#06142e]/40 border border-[#0ea5e9]/25 rounded-xl text-xs text-[#38bdf8]/60 cursor-not-allowed font-mono"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5 flex items-center justify-between">
                    <span>Phone Number</span>
                    <span className="text-[10px] text-[#38bdf8]/60 font-normal">10 Digits</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
                    <input
                      type="tel"
                      value={phone}
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* My Skills & Roles */}
                <div>
                  <RoleAutocompleteInput
                    selectedRoles={skills}
                    onChange={setSkills}
                    label="My Skills & Roles"
                    placeholder="Search & add your roles (e.g. 'hy' for Hydrologist)..."
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0b2240] to-[#0b2240] border border-[#38bdf8]/30 text-[#f0f9ff] font-semibold text-xs transition-all shadow-md hover:scale-[1.02] disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Card 2: Password & Security */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0b2240]/80 border border-[#0ea5e9]/35 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
            <div>
              <h2 className="font-['Outfit'] font-bold text-xl text-[#f0f9ff] mb-6 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#38bdf8]" />
                <span>Change Password</span>
              </h2>

              {passwordErrorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{passwordErrorMsg}</span>
                </div>
              )}

              {passwordSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-5">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5">
                    Current Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-[#38bdf8]/60 font-mono mt-1">
                    Required to authorize password change
                  </p>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Min 6 characters"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0b2240] to-[#0b2240] border border-[#38bdf8]/30 text-[#f0f9ff] font-semibold text-xs transition-all shadow-md hover:scale-[1.02] disabled:opacity-50"
                  >
                    {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AccountPage;