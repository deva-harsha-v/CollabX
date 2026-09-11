import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, Navigation, Phone, Mail, Building2, Tag, Calendar, UserCheck, ShieldCheck, Send, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { getPostDetails, createContactRequest } from '../lib/storage';
import { useApp } from '../context/AppContext';
import UploadVerificationModal from './UploadVerificationModal';

const PostDetailModal = ({ postId, isOpen, onClose }) => {
  const { currentUser } = useApp();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVerifOpen, setIsVerifOpen] = useState(false);
  
  const [contactStatus, setContactStatus] = useState('none'); // 'none' | 'pending' | 'accepted' | 'rejected' | 'author'
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Scroll reactivity ref for Contact button
  const scrollContainerRef = useRef(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const fetchDetails = useCallback(async () => {
    if (!postId || !isOpen) return;
    setLoading(true);
    setErrorMsg('');
    const { data, error } = await getPostDetails(postId);
    setLoading(false);

    if (data) {
      setPost(data);
      setContactStatus(data.user_contact_status || 'none');
    } else if (error) {
      setErrorMsg(error.message);
    }
  }, [postId, isOpen]);

  useEffect(() => {
    fetchDetails();
  }, [postId, isOpen]);

  // Handle smooth scroll tracking for reactive contact button
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const st = scrollContainerRef.current.scrollTop;
      setScrollOffset(Math.min(st * 0.1, 20));
    }
  };

  if (!isOpen) return null;

  const handleContactClick = async () => {
    if (!currentUser) return;

    // Check verification status
    if (!currentUser.verification_uploaded) {
      setIsVerifOpen(true);
      return;
    }

    // Directly submit contact request
    await executeContactSubmission();
  };

  const executeContactSubmission = async () => {
    setIsSubmittingContact(true);
    setErrorMsg('');

    const { data, error } = await createContactRequest(postId);
    setIsSubmittingContact(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (data) {
      setContactStatus('pending');
      fetchDetails(); // Refresh unlocked data if any
    }
  };

  const formatDate = (isoString) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative w-[95vw] sm:w-full max-w-3xl max-h-[90vh] p-5 sm:p-8 bg-[#0b2240]/95 border border-[#0ea5e9]/35 rounded-3xl shadow-[0_0_60px_rgba(14, 165, 233, 0.35)] text-[#f0f9ff] overflow-y-auto backdrop-blur-2xl"
        >
          
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#0b2240]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="sticky top-0 float-right z-30 p-2 text-[#38bdf8] hover:text-[#f0f9ff] rounded-full bg-[#06142e]/80 backdrop-blur-md border border-[#0ea5e9]/35 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {loading ? (
            <div className="py-20 text-center text-[#38bdf8] font-mono text-xs flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-ping" />
              <span>Fetching Post Telemetry & Verification...</span>
            </div>
          ) : post ? (
            <div className="space-y-6">
              
              {/* Prominent Bubbly Unlocked Banner for Accepted Solvers */}
              {post.is_authorized && contactStatus === 'accepted' && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b2240] via-[#06142e] to-[#0b2240] border-2 border-[#0ea5e9]/60 shadow-[0_0_30px_rgba(14, 165, 233, 0.35)] animate-fade-in">
                  <div className="flex items-center gap-2 text-[#38bdf8] font-mono text-xs font-bold uppercase tracking-wider mb-2">
                    <CheckCircle2 className="w-5 h-5 text-[#38bdf8]" />
                    <span>Contact Request Accepted — Access Unlocked</span>
                  </div>
                  <h4 className="text-lg font-bold font-['Outfit'] text-[#f0f9ff] mb-4">
                    Full Direct Communication & Geographic Coordinates
                  </h4>

                  <div className="grid grid-cols-1 gap-3 text-xs font-mono">
                    {post.phone_number && (
                      <div className="p-3 rounded-xl bg-[#06142e]/80 border border-[#0ea5e9]/35 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <Phone className="w-4 h-4 text-[#38bdf8] shrink-0" />
                          <div>
                            <span className="text-[10px] text-[#38bdf8]/70 block">Poster Direct Phone</span>
                            <span className="text-sm font-bold text-[#f0f9ff]">{post.phone_number}</span>
                          </div>
                        </div>
                        <a
                          href={`tel:${post.phone_number}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b2240]/30 hover:bg-[#0b2240]/50 border border-[#0ea5e9]/60 text-[#f0f9ff] font-semibold text-xs transition-colors"
                        >
                          📞 Call Them
                        </a>
                      </div>
                    )}

                    {post.author_email && (
                      <div className="p-3 rounded-xl bg-[#06142e]/80 border border-[#0ea5e9]/35 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <Mail className="w-4 h-4 text-[#38bdf8] shrink-0" />
                          <div>
                            <span className="text-[10px] text-[#38bdf8]/70 block">Poster Verified Email</span>
                            <span className="text-sm font-bold text-[#f0f9ff]">{post.author_email}</span>
                          </div>
                        </div>
                        <a
                          href={`mailto:${post.author_email}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b2240]/30 hover:bg-[#0b2240]/50 border border-[#0ea5e9]/60 text-[#f0f9ff] font-semibold text-xs transition-colors"
                        >
                          ✉️ Mail Them
                        </a>
                      </div>
                    )}

                    {(post.latitude !== null && post.longitude !== null) && (
                      <div className="p-3 rounded-xl bg-[#06142e]/80 border border-[#0ea5e9]/35 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <Navigation className="w-4 h-4 text-[#38bdf8] shrink-0" />
                          <div>
                            <span className="text-[10px] text-[#38bdf8]/70 block">Exact GPS Coordinates (Unrounded)</span>
                            <span className="text-sm font-bold text-[#f0f9ff]">
                              Lat: {post.latitude} &nbsp;•&nbsp; Lng: {post.longitude}
                            </span>
                          </div>
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${post.latitude},${post.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b2240]/30 hover:bg-[#0b2240]/50 border border-[#0ea5e9]/60 text-[#f0f9ff] font-semibold text-xs transition-colors"
                        >
                          🗺️ Go There
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Author & Organization Header */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#0ea5e9]/30">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-[#0ea5e9]/60 overflow-hidden bg-[#06142e] shrink-0">
                    <img
                      src={post.author_avatar || post.authorAvatar}
                      alt={post.author_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#f0f9ff] flex items-center gap-2">
                      <span>{post.author_name}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-[#38bdf8] bg-[#06142e] px-2 py-0.5 rounded-full border border-[#0ea5e9]/35">
                        <UserCheck className="w-3 h-3 text-[#38bdf8]" /> VERIFIED POSTER
                      </span>
                    </h4>
                    {post.organization && (
                      <p className="text-xs text-[#38bdf8] font-medium flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{post.organization}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs text-[#38bdf8]/80 font-mono">
                  <span className="flex items-center gap-1 justify-end text-[#38bdf8] mb-0.5">
                    <Calendar className="w-3.5 h-3.5" /> {formatDate(post.created_at)}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#06142e] text-[#38bdf8] border border-[#0ea5e9]/35 text-[10px] font-bold uppercase">
                    STATUS: {post.status}
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Glowing Resolution Progress Bar in Detail Modal */}
              <div className="p-4 rounded-2xl bg-[#06142e]/80 border border-red-950/60 shadow-lg">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#f0f9ff]">
                      Challenge Resolution Progress
                    </span>
                    <span className="px-2 py-0.5 rounded-full border border-red-500/50 bg-red-950/60 text-[10px] font-mono text-red-300">
                      {(post.progress ?? 0) >= 100 ? 'Resolved & Completed' : (post.progress ?? 0) >= 75 ? 'Testing & Review' : (post.progress ?? 0) >= 50 ? 'Solution in Progress' : (post.progress ?? 0) >= 25 ? 'Active Collaboration' : 'Open for Collaboration'}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#06142e] border border-red-500/80 text-red-400 text-xs font-mono font-black shadow-[0_0_10px_rgba(239,68,68,0.35)]">
                    {post.progress ?? 0}%
                  </span>
                </div>
                <div className="relative w-full h-3 rounded-full bg-[#06142e] border border-red-950/70 p-[1.5px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-950 via-red-600 to-red-500 transition-all duration-500 relative"
                    style={{
                      width: `${Math.max(post.progress ?? 0, 2)}%`,
                      boxShadow: (post.progress ?? 0) > 0 ? '0 0 14px rgba(239, 68, 68, 0.9), 0 0 24px rgba(220, 38, 38, 0.7)' : 'none'
                    }}
                  />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit'] text-[#f0f9ff]">
                {post.title}
              </h2>

              {/* Full Description */}
              <div className="prose prose-invert max-w-none text-sm text-[#f0f9ff] leading-relaxed whitespace-pre-line bg-[#06142e]/80 p-5 rounded-2xl border border-[#0ea5e9]/30">
                {post.description}
              </div>

              {/* Required Skills */}
              {post.skills && Array.isArray(post.skills) && post.skills.length > 0 && (
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#38bdf8]/80 block mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#38bdf8]" /> Required Skills & Roles:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {post.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-xl bg-[#06142e] border border-[#0ea5e9]/35 text-[#38bdf8] text-xs font-mono font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Media Attachment */}
              {post.media_url && (
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#38bdf8]/80 block mb-2">
                    Attached Media / Technical Diagram:
                  </span>
                  <div className="rounded-2xl overflow-hidden border border-[#0ea5e9]/30 max-h-96 bg-[#06142e]">
                    <img src={post.media_url} alt={post.title} className="w-full h-full object-contain max-h-96" />
                  </div>
                </div>
              )}

              {/* General Physical Address (If provided) */}
              {post.address && (
                <div className="p-4 rounded-xl bg-[#06142e]/60 border border-[#0ea5e9]/30 flex items-center gap-2.5 text-xs text-[#f0f9ff] font-mono">
                  <MapPin className="w-4 h-4 text-[#38bdf8] shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#38bdf8]/70 block">General Address / Region</span>
                    <span className="text-[#f0f9ff] font-semibold">{post.address}</span>
                  </div>
                </div>
              )}

              {/* Unlocked / Locked Coordinates Info Box for Non-Accepted Viewers */}
              {!post.is_authorized && (
                <div className="p-4 rounded-xl bg-[#06142e]/60 border border-[#0ea5e9]/30 flex items-center justify-between gap-4 text-xs font-mono text-[#38bdf8]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#38bdf8] shrink-0" />
                    <span>Exact GPS Coordinates & Phone Number are locked for public privacy.</span>
                  </div>
                  <span className="text-[10px] bg-[#06142e] px-2 py-1 rounded border border-[#0ea5e9]/35 text-[#38bdf8] font-bold">
                    RLS PROTECTED
                  </span>
                </div>
              )}

              {/* Persistent, Scroll-Reactive "Contact" Button */}
              {currentUser && contactStatus !== 'author' && (
                <div 
                  className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-[#0b2240] via-[#0b2240]/90 to-transparent flex justify-center sm:justify-end z-20"
                  style={{ transform: `translateY(-${scrollOffset}px)`, transition: 'transform 0.15s ease-out' }}
                >
                  {contactStatus === 'pending' ? (
                    <div className="w-full sm:w-auto justify-center px-6 py-3.5 rounded-full bg-[#06142e] border border-[#0ea5e9]/50 text-[#38bdf8] font-mono text-xs font-bold flex items-center gap-2 shadow-lg">
                      <Clock className="w-4 h-4 text-[#38bdf8] animate-pulse" />
                      <span>Contact Request Pending Poster Review</span>
                    </div>
                  ) : contactStatus === 'accepted' ? (
                    <div className="w-full sm:w-auto justify-center px-6 py-3.5 rounded-full bg-[#06142e] border border-[#0ea5e9]/50 text-[#38bdf8] font-mono text-xs font-bold flex items-center gap-2 shadow-lg">
                      <CheckCircle2 className="w-4 h-4 text-[#38bdf8]" />
                      <span>Connected — Solver Access Granted</span>
                    </div>
                  ) : contactStatus === 'rejected' ? (
                    <div className="w-full sm:w-auto justify-center px-6 py-3.5 rounded-full bg-[#06142e] border border-[#0ea5e9]/30 text-[#38bdf8]/60 font-mono text-xs font-medium">
                      <span>Request Not Selected</span>
                    </div>
                  ) : (
                    /* Red Pill Button - THE ONLY RED ELEMENT UNTOUCHED */
                    <button
                      type="button"
                      onClick={handleContactClick}
                      disabled={isSubmittingContact}
                      className="w-full sm:w-auto justify-center red-pill-button px-8 py-3.5 text-sm font-bold shadow-xl flex items-center gap-2 transition-transform hover:scale-105"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmittingContact ? 'Sending Request...' : 'Contact Poster & Request Access'}</span>
                    </button>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="py-12 text-center text-[#38bdf8]/70 font-mono text-xs">
              Post not found or unavailable.
            </div>
          )}

        </div>
      </div>

      {/* Upload Verification Document Gate Modal */}
      <UploadVerificationModal
        isOpen={isVerifOpen}
        onClose={() => setIsVerifOpen(false)}
        onSuccess={executeContactSubmission}
      />
    </>
  );
};

export default PostDetailModal;
