import React, { useState } from 'react';
import { X, MapPin, Navigation, Building2, Upload, AlertCircle, Sparkles, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import RoleAutocompleteInput from './RoleAutocompleteInput';

const CreatePostModal = ({ isOpen, onClose }) => {
  const { addNewPost } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
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
    setSkills([]);
    setOrganization('');
    setAddress('');
    setMediaPreview(null);
    setCoordinates(null);
    setGeoError('');
    setErrorMsg('');
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
    if (!phoneNumber.trim()) {
      setErrorMsg('Please enter a valid phone number for verification.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await addNewPost({
      title,
      description,
      phone_number: phoneNumber,
      skills: skills.length > 0 ? skills : null, // Optional
      organization: organization || null,
      address: address || null,
      coordinates: coordinates || null, // Full unrounded float numbers
      media: mediaPreview || null,
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
          <div className="w-10 h-10 rounded-xl bg-[#0b2240]/20 border border-[#0ea5e9]/35 flex items-center justify-center text-[#38bdf8]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-2xl font-bold font-['Outfit'] text-[#f0f9ff]">Post a Challenge</h3>
            <p className="text-xs text-[#38bdf8] font-mono tracking-wider uppercase">Publish to Verified Solvers</p>
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

          {/* Phone Number (Required - Gated Privacy) */}
          <div>
            <label className="block text-xs font-semibold text-[#38bdf8] uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Phone Number <span className="text-[#38bdf8]">*</span></span>
              <span className="text-[10px] text-[#38bdf8] font-mono font-normal">🔒 Gated: Hidden until accepted</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#38bdf8]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                placeholder="+1 (555) 000-0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-sm text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors"
              />
            </div>
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

          {/* Submit CTA (Red Pill Button - THE ONLY RED ELEMENT UNTOUCHED) */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full red-pill-button py-3 text-base font-bold shadow-lg disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Posting Challenge...' : 'Post Challenge'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
