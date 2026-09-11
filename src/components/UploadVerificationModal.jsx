import React, { useState } from 'react';
import { X, Upload, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { updateVerificationDoc } from '../lib/storage';
import { useApp } from '../context/AppContext';

const UploadVerificationModal = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser, setCurrentUser } = useApp();
  const [docFile, setDocFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Document must be under 10MB.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocFile(reader.result);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!docFile) {
      setErrorMsg('Please select a verification document (PDF or Image).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const { error } = await updateVerificationDoc(currentUser.id, docFile);
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // Update local user state
    if (setCurrentUser && currentUser) {
      setCurrentUser({
        ...currentUser,
        verification_uploaded: true,
      });
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-8 bg-[#1A3D63]/95 border border-[#1A3D63]/40 rounded-3xl shadow-[0_0_50px_rgba(74, 127, 167,0.3)] text-[#F6FAFD] backdrop-blur-2xl">
        
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#1A3D63]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#B3CFE5] hover:text-[#F6FAFD] rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#1A3D63]/20 border border-[#1A3D63]/40 flex items-center justify-center text-[#B3CFE5]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-['Outfit'] text-[#F6FAFD]">Verification Document Required</h3>
            <p className="text-xs text-[#B3CFE5] font-mono tracking-wider uppercase">CollabX Trust Architecture</p>
          </div>
        </div>

        <p className="text-xs text-[#B3CFE5] mb-6 leading-relaxed">
          Before contacting problem posters, you must upload institutional verification proof (university badge, ORCID token, or research letterhead). Your document is securely stored and only accessible to post authors during review.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0A1931]/80 border border-dashed border-[#1A3D63]/40 flex flex-col items-center justify-center text-center">
            <Upload className="w-8 h-8 text-[#B3CFE5] mb-2" />
            <p className="text-xs font-semibold text-[#F6FAFD]">
              {fileName || 'Select Institutional Verification PDF / Image'}
            </p>
            <p className="text-[10px] text-[#B3CFE5]/70 mt-1">PDF, PNG, JPG up to 10MB</p>

            <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A3D63] hover:bg-[#244b78] border border-[#1A3D63]/40 text-xs font-medium text-[#B3CFE5] cursor-pointer transition-colors">
              <span>{fileName ? 'Choose Different File' : 'Browse Document'}</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full red-pill-button py-3.5 text-sm font-bold shadow-lg disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Uploading & Verifying...' : 'Verify & Send Contact Request'}</span>
            <ArrowRight className="w-4 h-4 ml-2 inline" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadVerificationModal;
