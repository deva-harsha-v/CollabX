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
      <div className="relative w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-8 bg-[#221226] border border-[#935073]/40 rounded-3xl shadow-[0_0_60px_rgba(147,80,115,0.25)] text-[#F8F4E9]">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#935073]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#F8F4E9]/60 hover:text-[#F8F4E9] rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#502D55]/60 border border-[#935073]/40 flex items-center justify-center text-[#F6DBC0]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-['Outfit'] text-[#F8F4E9]">Review Solver Credentials</h3>
            <p className="text-xs text-[#F6DBC0] font-mono tracking-wider uppercase">Contact Request Audit</p>
          </div>
        </div>

        {/* Solver Card */}
        <div className="p-4 rounded-2xl bg-[#3a1e3e]/70 border border-[#935073]/30 flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-[#935073]/40 bg-[#221226] shrink-0">
            <img src={solverAvatar} alt={solverName} className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="text-base font-bold text-[#F8F4E9] flex items-center gap-1.5">
              <span>{solverName}</span>
              <UserCheck className="w-3.5 h-3.5 text-[#F6DBC0]" />
            </h4>
            <p className="text-xs text-[#F8F4E9]/60 font-mono">
              Request for: <span className="text-[#F6DBC0] font-semibold">{payload.post_title || 'Civic Challenge'}</span>
            </p>
          </div>
        </div>

        {/* Time-Limited Verification Document Access */}
        <div className="p-4 rounded-2xl bg-[#3a1e3e]/50 border border-[#935073]/30 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#F8F4E9] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#F6DBC0]" />
              Institutional Proof Document
            </span>
            <span className="text-[10px] font-mono text-[#F6DBC0] bg-[#502D55] px-2 py-0.5 rounded border border-[#F6DBC0]/40 font-bold">
              60s Signed URL
            </span>
          </div>

          {loadingDoc ? (
            <div className="py-4 text-center text-xs text-[#F6DBC0] font-mono flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F6DBC0] animate-ping" />
              <span>Generating Secure Time-Limited Signed URL...</span>
            </div>
          ) : signedDocUrl ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#502D55]/40 border border-[#935073]/30">
              <div className="flex items-center gap-2 text-xs text-[#F6DBC0] font-mono truncate">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">verification_document.pdf</span>
              </div>
              <a
                href={signedDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#502D55] hover:bg-[#935073] border border-[#935073]/40 text-[#F6DBC0] text-xs font-semibold transition-colors shrink-0"
              >
                <span>Inspect Doc</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <p className="text-xs text-[#F8F4E9]/60 font-mono py-2 text-center">
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
            className="py-3 px-4 rounded-xl bg-[#3a1e3e] hover:bg-[#502D55] border border-[#935073]/30 text-[#F8F4E9]/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4 text-[#F8F4E9]/60" />
            <span>Reject Request</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleAction('accepted')}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#935073] to-[#502D55] hover:from-[#935073] hover:to-[#3a1e3e] text-[#F8F4E9] text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-[#935073]/30 disabled:opacity-50"
          >
            <Check className="w-4 h-4 text-[#F8F4E9]" />
            <span>Accept & Unlock Contact</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ContactRequestReviewModal;
