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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative w-full max-w-3xl max-h-[90vh] p-6 sm:p-8 bg-[#0c1322] border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.25)] text-slate-100 overflow-y-auto"
        >
          
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="sticky top-0 float-right z-30 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {loading ? (
            <div className="py-20 text-center text-cyan-400 font-mono text-xs flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Fetching Post Telemetry & Verification...</span>
            </div>
          ) : post ? (
            <div className="space-y-6">
              
              {/* PHASE 5: Prominent Bubbly Unlocked Banner for Accepted Solvers */}
              {post.is_authorized && contactStatus === 'accepted' && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-950/90 via-[#0c2438] to-cyan-950/90 border-2 border-teal-400/60 shadow-[0_0_30px_rgba(20,184,166,0.3)] animate-fade-in">
                  <div className="flex items-center gap-2 text-teal-300 font-mono text-xs font-bold uppercase tracking-wider mb-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-400" />
                    <span>Contact Request Accepted — Access Unlocked</span>
                  </div>
                  <h4 className="text-lg font-bold font-['Outfit'] text-white mb-4">
                    Full Direct Communication & Geographic Coordinates
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    {post.phone_number && (
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-teal-500/30 flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">Poster Direct Phone</span>
                          <span className="text-sm font-bold text-white">{post.phone_number}</span>
                        </div>
                      </div>
                    )}

                    {post.author_email && (
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-teal-500/30 flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">Poster Verified Email</span>
                          <span className="text-sm font-bold text-white">{post.author_email}</span>
                        </div>
                      </div>
                    )}

                    {(post.latitude !== null && post.longitude !== null) && (
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-teal-500/30 flex items-center gap-2.5 sm:col-span-2">
                        <Navigation className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">Exact Float GPS Coordinates (Unrounded)</span>
                          <span className="text-sm font-bold text-cyan-300">
                            Lat: {post.latitude} &nbsp;•&nbsp; Lng: {post.longitude}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Author & Organization Header */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-cyan-500/40 overflow-hidden bg-slate-900 shrink-0">
                    <img
                      src={post.author_avatar || post.authorAvatar}
                      alt={post.author_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{post.author_name}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-500/30">
                        <UserCheck className="w-3 h-3" /> VERIFIED POSTER
                      </span>
                    </h4>
                    {post.organization && (
                      <p className="text-xs text-cyan-400 font-medium flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{post.organization}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1 justify-end text-cyan-300 mb-0.5">
                    <Calendar className="w-3.5 h-3.5" /> {formatDate(post.created_at)}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold uppercase">
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

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit'] text-white">
                {post.title}
              </h2>

              {/* Full Description */}
              <div className="prose prose-invert max-w-none text-sm text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950/40 p-5 rounded-2xl border border-slate-800">
                {post.description}
              </div>

              {/* Required Skills */}
              {post.skills && Array.isArray(post.skills) && post.skills.length > 0 && (
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-cyan-400" /> Required Skills & Roles:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {post.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-medium"
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
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2">
                    Attached Media / Technical Diagram:
                  </span>
                  <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-96 bg-slate-950">
                    <img src={post.media_url} alt={post.title} className="w-full h-full object-contain max-h-96" />
                  </div>
                </div>
              )}

              {/* General Physical Address (If provided) */}
              {post.address && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-300 font-mono">
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">General Address / Region</span>
                    <span className="text-slate-200 font-semibold">{post.address}</span>
                  </div>
                </div>
              )}

              {/* Unlocked / Locked Coordinates Info Box for Non-Accepted Viewers */}
              {!post.is_authorized && (
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between gap-4 text-xs font-mono text-cyan-400">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span>Exact GPS Coordinates & Phone Number are locked for public privacy.</span>
                  </div>
                  <span className="text-[10px] bg-cyan-950 px-2 py-1 rounded border border-cyan-500/30 text-cyan-300 font-bold">
                    RLS PROTECTED
                  </span>
                </div>
              )}

              {/* PHASE 4: Persistent, Scroll-Reactive "Contact" Button */}
              {currentUser && contactStatus !== 'author' && (
                <div 
                  className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-[#0c1322] via-[#0c1322]/90 to-transparent flex justify-end z-20"
                  style={{ transform: `translateY(-${scrollOffset}px)`, transition: 'transform 0.15s ease-out' }}
                >
                  {contactStatus === 'pending' ? (
                    <div className="px-6 py-3.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono text-xs font-bold flex items-center gap-2 shadow-lg">
                      <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span>Contact Request Pending Poster Review</span>
                    </div>
                  ) : contactStatus === 'accepted' ? (
                    <div className="px-6 py-3.5 rounded-full bg-teal-950/80 border border-teal-500/50 text-teal-300 font-mono text-xs font-bold flex items-center gap-2 shadow-lg">
                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                      <span>Connected — Solver Access Granted</span>
                    </div>
                  ) : contactStatus === 'rejected' ? (
                    <div className="px-6 py-3.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 font-mono text-xs font-medium">
                      <span>Request Not Selected</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleContactClick}
                      disabled={isSubmittingContact}
                      className="red-pill-button px-8 py-3.5 text-sm font-bold shadow-xl flex items-center gap-2 transition-transform hover:scale-105"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmittingContact ? 'Sending Request...' : 'Contact Poster & Request Access'}</span>
                    </button>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
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
