import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Navigation, Building2, Upload, AlertCircle, Sparkles, Phone, UserCheck, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getUserEmergencyPostStatus } from '../lib/storage';
import RoleAutocompleteInput from './RoleAutocompleteInput';

const CreatePostModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { addNewPost, currentUser } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [solverRequirement, setSolverRequirement] = useState('organisation_only'); // 'organisation_only' | 'public_open'
  
  // Emergency challenge selection (1 per week limit)
  const [isEmergencyOption, setIsEmergencyOption] = useState(false);
  const [emergencyQuota, setEmergencyQuota] = useState({
    loading: true,
    canPostEmergency: true,
    remainingDays: 0,
    remainingHours: 0,
    nextAvailableDate: null,
  });

  // Roles / Skills list
  const [skills, setSkills] = useState([]);

  const [organization, setOrganization] = useState('');
  const [address, setAddress] = useState('');

  // Media preview
  const [mediaPreview, setMediaPreview] = useState(null);

  // High-accuracy Geolocation coordinates
  const [coordinates, setCoordinates] = useState(null); // { latitude: float, longitude: float }
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check emergency quota whenever modal opens or user changes
  useEffect(() => {
    if (isOpen && currentUser?.id) {
      setEmergencyQuota(prev => ({ ...prev, loading: true }));
      getUserEmergencyPostStatus(currentUser.id).then(status => {
        setEmergencyQuota({
          loading: false,
          canPostEmergency: Boolean(status.canPostEmergency),
          remainingDays: status.remainingDays || 0,
          remainingHours: status.remainingHours || 0,
          nextAvailableDate: status.nextAvailableDate || null,
        });
        if (!status.canPostEmergency) {
          setIsEmergencyOption(false);
        }
      });
    }
  }, [isOpen, currentUser?.id]);

  if (!isOpen) return null;

  // Media File Upload
  const handleMediaChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Media file must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // High Accuracy Geolocation API Request
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false);
        // Store exact, unrounded Float numbers from the browser API
        const exactLat = position.coords.latitude;
        const exactLng = position.coords.longitude;
        
        setCoordinates({
          latitude: exactLat,
          longitude: exactLng,
        });
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied by user.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError('Location information is unavailable.');
        } else {
          setGeoError('Location request timed out or failed.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setPhoneNumber('');
    setSolverRequirement('organisation_only');
    setSkills([]);
    setOrganization('');
    setAddress('');
    setMediaPreview(null);
    setCoordinates(null);
    setGeoError('');
    setErrorMsg('');
    setIsEmergencyOption(false);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a title for the challenge.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please provide a description of the problem.');
      return;
    }
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit phone number (numbers only, e.g. 9876543210).');
      return;
    }

    const postAsEmergency = Boolean(isEmergencyOption && emergencyQuota.canPostEmergency);

    setIsSubmitting(true);

    const { error } = await addNewPost({
      title,
      description,
      phone_number: cleanPhone,
      solver_requirement: solverRequirement,
      skills: skills.length > 0 ? skills : null, // Optional
      organization: organization || null,
      address: address || null,
      coordinates: coordinates || null, // Full unrounded float numbers
      media: mediaPreview || null,
      is_emergency: postAsEmergency,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    handleReset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-8 bg-[#0b2240]/95 border border-[#0ea5e9]/35 rounded-3xl shadow-[0_0_50px_rgba(14, 165, 233, 0.35)] text-[#f0f9ff] my-auto backdrop-blur-2xl">
        
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0b2240]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#0b2240]/25 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleReset}
          className="absolute top-6 right-6 p-2 text-[#38bdf8] hover:text-[#f0f9ff] rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isEmergencyOption && emergencyQuota.canPostEmergency 
              ? 'bg-red-950/80 border border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
              : 'bg-[#0b2240]/20 border border-[#0ea5e9]/35 text-[#38bdf8]'
          }`}>
            {isEmergencyOption && emergencyQuota.canPostEmergency ? (
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold font-['Outfit'] text-[#f0f9ff]">
              {isEmergencyOption && emergencyQuota.canPostEmergency ? '🚨 Post Emergency Challenge' : 'Post a Challenge'}
            </h3>
            <p className="text-xs text-[#38bdf8] font-mono tracking-wider uppercase">
              {isEmergencyOption && emergencyQuota.canPostEmergency ? 'Priority Live Feed Placement • 1 Allowed Per Week' : 'Publish to Verified Solvers'}
            </p>
          </div>
        </div>

        {/* EMERGENCY OPTION SELECTOR (1 Per Week Limit) */}
        <div className={`mb-5 p-4 rounded-2xl border transition-all ${
          isEmergencyOption && emergencyQuota.canPostEmergency
            ? 'bg-red-950/70 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.35)]'
            : (emergencyQuota.canPostEmergency
                ? 'bg-[#06142e]/90 border-red-500/40 hover:border-red-500/70 shadow-md'
                : 'bg-[#06142e]/70 border-gray-700/60 opacity-90')
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                isEmergencyOption && emergencyQuota.canPostEmergency
                  ? 'bg-red-600 text-white shadow-lg'
                  : (emergencyQuota.canPostEmergency ? 'bg-red-950/80 text-red-400 border border-red-500/40' : 'bg-gray-800 text-gray-400')
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-sm text-[#f0f9ff] font-['Outfit']">
                    🚨 Post as Emergency / Crisis Challenge
                  </h4>
                  {emergencyQuota.loading ? (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-[#38bdf8]">Checking quota...</span>
                  ) : emergencyQuota.canPostEmergency ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                      1 Allowed / Week (Available)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold">
                      Weekly Limit Reached (0/1 Available)
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#38bdf8]/80 mt-1 leading-snug">
                  Emergency challenges are given highest priority and pinned to the very top of the live feed across all users and devices.
                </p>
                {!emergencyQuota.loading && !emergencyQuota.canPostEmergency && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] font-mono text-amber-200/90 space-y-1">
                    <p>🔒 <strong>Weekly Quota Limit Active:</strong> Each user can only publish 1 emergency post per 7 days.</p>
                    <p className="text-amber-300 font-bold">
                      Next emergency post quota unlocks in ~{emergencyQuota.remainingDays > 1 ? `${emergencyQuota.remainingDays} days` : `${emergencyQuota.remainingHours || 24} hours`}
                      {emergencyQuota.nextAvailableDate ? ` (${new Date(emergencyQuota.nextAvailableDate).toLocaleDateString()})` : ''}.
                    </p>
                    <p className="text-gray-300 text-[10px]">All other posts within this 7-day period must be submitted as normal challenges.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                disabled={!emergencyQuota.canPostEmergency || emergencyQuota.loading}
                checked={isEmergencyOption && emergencyQuota.canPostEmergency}
                onChange={(e) => setIsEmergencyOption(e.target.checked)}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                !emergencyQuota.canPostEmergency ? 'cursor-not-allowed opacity-50' : 'peer-checked:bg-red-600'
              }`}></div>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Title (Required) */}
          <div>
            <label className="block text-xs font-semibold text-[#38bdf8] uppercase tracking-wider mb-1">
              Title <span className="text-[#38bdf8]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sub-Surface Arsenic Contamination Mapping"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-sm text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors"
            />
          </div>

          {/* Direct Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-[#38bdf8] uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Direct Phone Number <span className="text-[#38bdf8]">* (10 Digits)</span></span>
              <span className="text-[10px] text-[#38bdf8]/60 font-mono font-normal">Locked until solver accepted</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
              <input
                type="tel"
                required
                placeholder="9876543210"
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]{10}"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full pl-10 pr-4 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-sm text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors font-mono"
              />
            </div>
            <p className="text-[10px] text-[#38bdf8]/60 font-mono mt-1">
              Must be exactly 10 numeric digits
            </p>
          </div>

          {/* Description (Required) */}
          <div>
            <label className="block text-xs font-semibold text-[#38bdf8] uppercase tracking-wider mb-1">
              Description <span className="text-[#38bdf8]">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe the societal crisis, parameters, affected area, and scientific support needed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-sm text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors resize-none"
            />
          </div>

          {/* Solver Type Requirement (Mandatory & Prominently Highlighted Above Skills/Roles) */}
          <div className="p-3.5 rounded-2xl bg-[#06142e]/90 border border-[#0ea5e9]/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#f0f9ff] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Required Solver Eligibility <span className="text-red-400">*</span></span>
              </label>
              <span className="text-[10px] font-mono text-[#38bdf8]/80">Access Control Level</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setSolverRequirement('organisation_only')}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  solverRequirement === 'organisation_only'
                    ? 'bg-gradient-to-r from-[#0b2240] to-[#143d6e] border-[#38bdf8] ring-1 ring-[#38bdf8]/50 shadow-lg text-[#f0f9ff]'
                    : 'bg-[#06142e]/60 border-[#0ea5e9]/30 text-[#38bdf8]/70 hover:text-[#f0f9ff] hover:bg-[#0b2240]/40'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Building2 className="w-4 h-4 text-[#38bdf8] shrink-0" />
                  <span>🏢 Organisation Member Needed</span>
                </div>
                <p className="text-[10px] text-[#38bdf8]/80 font-mono leading-tight">
                  Restricted to verified institutional & organisation accounts only.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSolverRequirement('public_open')}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  solverRequirement === 'public_open'
                    ? 'bg-gradient-to-r from-[#0b2240] to-[#143d6e] border-[#38bdf8] ring-1 ring-[#38bdf8]/50 shadow-lg text-[#f0f9ff]'
                    : 'bg-[#06142e]/60 border-[#0ea5e9]/30 text-[#38bdf8]/70 hover:text-[#f0f9ff] hover:bg-[#0b2240]/40'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <UserCheck className="w-4 h-4 text-[#38bdf8] shrink-0" />
                  <span>👥 Public Member / Any Solver</span>
                </div>
                <p className="text-[10px] text-[#38bdf8]/80 font-mono leading-tight">
                  Open to all verified solvers & public accounts across the network.
                </p>
              </button>
            </div>
          </div>

          {/* Skills / Roles Autocomplete (Curated list of 130+ professional roles) */}
          <div>
            <RoleAutocompleteInput
              selectedRoles={skills}
              onChange={setSkills}
              label="Required Roles / Skills"
              placeholder="Search roles (e.g. 'hy' for Hydrologist, 'gis' for GIS Specialist)..."
            />
          </div>

          {/* Organization & Physical Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#38bdf8] uppercase tracking-wider mb-1">
                Posting Organization <span className="text-[10px] text-[#38bdf8]/70 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#38bdf8]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Clean Water NGO / Municipal Dept"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors"
                />
              </div>
            </div>

            {/* Address (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-[#38bdf8] uppercase tracking-wider mb-1">
                Physical Address <span className="text-[10px] text-[#38bdf8]/70 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#38bdf8]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Sector 4 Aquifer Zone, Bengaluru"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Geolocation Button & Coordinates Display */}
          <div className="p-3.5 rounded-xl bg-[#06142e]/60 border border-[#0ea5e9]/30 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-[#f0f9ff] flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#38bdf8]" />
                Exact Coordinates <span className="text-[10px] text-[#38bdf8] font-mono font-normal">🔒 Gated: Hidden until accepted</span>
              </span>

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={geoLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b2240] hover:bg-[#143d6e] border border-[#0ea5e9]/35 text-[#38bdf8] text-xs font-medium transition-colors"
              >
                <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
                <span>{geoLoading ? 'Acquiring GPS...' : 'Use My Current Location'}</span>
              </button>
            </div>

            {/* Geolocation Error */}
            {geoError && (
              <p className="text-xs text-red-400 font-mono flex items-center gap-1 pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{geoError}</span>
              </p>
            )}

            {/* Revealed Coordinates Field */}
            {coordinates && (
              <div className="p-2.5 rounded-lg bg-[#0b2240]/80 border border-[#0ea5e9]/35 text-xs font-mono flex items-center justify-between text-[#38bdf8] animate-fade-in">
                <span>Latitude: {coordinates.latitude}</span>
                <span>Longitude: {coordinates.longitude}</span>
              </div>
            )}
          </div>

          {/* Optional Media Input & Thumbnail Preview */}
          <div>
            <label className="block text-xs font-semibold text-[#38bdf8] uppercase tracking-wider mb-1">
              Attach Image / Diagram <span className="text-[10px] text-[#38bdf8]/70 font-normal">(Optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#06142e]/80 border border-[#0ea5e9]/35 text-xs text-[#38bdf8] hover:text-[#f0f9ff] hover:border-[#38bdf8]/60 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-[#38bdf8]" />
                <span>{mediaPreview ? 'Change Attachment' : 'Upload File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleMediaChange}
                />
              </label>
              {mediaPreview && (
                <div className="relative w-12 h-12 rounded-lg border border-[#0ea5e9]/35 overflow-hidden shrink-0">
                  <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setMediaPreview(null)}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 text-base font-bold shadow-lg transition-all rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 ${
                isEmergencyOption && emergencyQuota.canPostEmergency
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] border border-red-400/50 cursor-pointer'
                  : 'red-pill-button'
              }`}
            >
              <span>
                {isSubmitting 
                  ? 'Posting Challenge...' 
                  : (isEmergencyOption && emergencyQuota.canPostEmergency ? '🚨 Publish Priority Emergency Challenge' : 'Post Challenge')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
