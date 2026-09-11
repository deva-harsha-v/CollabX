import React, { useState, useEffect, useCallback } from 'react';
import { X, ShieldCheck, Check, XCircle, FileText, ExternalLink, AlertCircle, UserCheck } from 'lucide-react';
import { updateContactRequestStatus, createSignedVerificationUrl } from '../lib/storage';

const ContactRequestReviewModal = ({ notification, isOpen, onClose, onRefresh }) => {
  const [signedDocUrl, setSignedDocUrl] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const payload = notification?.payload || {};
  const solverId = payload.solver_id;
  const requestId = payload.request_id;
  const postId = payload.post_id;
  const solverName = payload.solver_name || 'Solver Applicant';
  const solverAvatar = payload.solver_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(solverName)}`;

  // Request time-limited signed URL (60-second expiry)
  const fetchSignedUrl = useCallback(async () => {
    setLoadingDoc(true);
    setSignedDocUrl(null);
    const { data } = await createSignedVerificationUrl(solverId);
    setLoadingDoc(false);
    if (data) {
      setSignedDocUrl(data);
    }
  }, [solverId]);

  useEffect(() => {
    if (isOpen && solverId) {
      fetchSignedUrl();
    }
  }, [isOpen, solverId, fetchSignedUrl]);

  if (!isOpen || !notification) return null;

  const handleAction = async (status) => {
    setIsSubmitting(true);
    setErrorMsg('');

    const { error } = await updateContactRequestStatus(requestId, status, postId, solverId);
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (onRefresh) onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-8 bg-[#0b2240]/95 border border-[#0ea5e9]/35 rounded-3xl shadow-[0_0_60px_rgba(14, 165, 233, 0.35)] text-[#f0f9ff] backdrop-blur-2xl">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0b2240]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#38bdf8] hover:text-[#f0f9ff] rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#0b2240]/20 border border-[#0ea5e9]/35 flex items-center justify-center text-[#38bdf8]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-['Outfit'] text-[#f0f9ff]">Review Solver Credentials</h3>
            <p className="text-xs text-[#38bdf8] font-mono tracking-wider uppercase">Contact Request Audit</p>
          </div>
        </div>

        {/* Solver Card */}
        <div className="p-4 rounded-2xl bg-[#06142e]/80 border border-[#0ea5e9]/30 flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-[#0ea5e9]/35 bg-[#06142e] shrink-0">
            <img src={solverAvatar} alt={solverName} className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="text-base font-bold text-[#f0f9ff] flex items-center gap-1.5">
              <span>{solverName}</span>
              <UserCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
            </h4>
            <p className="text-xs text-[#38bdf8]/80 font-mono">
              Request for: <span className="text-[#f0f9ff] font-semibold">{payload.post_title || 'Open Challenge'}</span>
            </p>
          </div>
        </div>

        {/* Time-Limited Verification Document Access */}
        <div className="p-4 rounded-2xl bg-[#06142e]/80 border border-[#0ea5e9]/35 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#f0f9ff] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#38bdf8]" />
              Institutional Proof Document
            </span>
            <span className="text-[10px] font-mono text-[#f0f9ff] bg-[#0b2240] px-2 py-0.5 rounded border border-[#0ea5e9]/35 font-bold">
              60s Signed URL
            </span>
          </div>

          {loadingDoc ? (
            <div className="py-4 text-center text-xs text-[#38bdf8] font-mono flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
              <span>Generating Secure Time-Limited Signed URL...</span>
            </div>
          ) : signedDocUrl ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0b2240]/80 border border-[#0ea5e9]/35">
              <div className="flex items-center gap-2 text-xs text-[#38bdf8] font-mono truncate">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">verification_document.pdf</span>
              </div>
              <a
                href={signedDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#06142e] hover:bg-[#0b2240] border border-[#0ea5e9]/35 text-[#38bdf8] text-xs font-semibold transition-colors shrink-0"
              >
                <span>Inspect Doc</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <p className="text-xs text-[#38bdf8]/70 font-mono py-2 text-center">
              No verification document available or URL expired.
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Accept / Reject Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleAction('rejected')}
            className="py-3 px-4 rounded-xl bg-[#06142e] hover:bg-[#0b2240] border border-[#0ea5e9]/30 text-[#38bdf8] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4 text-[#38bdf8]/60" />
            <span>Reject Request</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleAction('accepted')}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#0b2240] to-[#0b2240] hover:from-[#0b2240]/80 hover:to-[#0b2240]/80 text-[#f0f9ff] text-xs font-bold border border-[#38bdf8]/30 flex items-center justify-center gap-1.5 transition-all shadow-lg disabled:opacity-50"
          >
            <Check className="w-4 h-4 text-[#f0f9ff]" />
            <span>Accept & Unlock Contact</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ContactRequestReviewModal;
