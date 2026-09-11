import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Upload, Building, GraduationCap, Users, ArrowRight } from 'lucide-react';

const JoinModal = ({ isOpen, onClose }) => {
  const [role, setRole] = useState('solver'); // 'poster' | 'solver'
  const [submitted, setSubmitted] = useState(false);
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setFileName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl p-8 bg-[#0c1322] border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleReset}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold font-['Outfit'] text-white">Join the CollabX Network</h3>
                <p className="text-xs text-cyan-400 font-mono tracking-wider uppercase">Verified Collaborative Ecosystem</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mt-2 mb-6 leading-relaxed">
              Connect with vetted stakeholders to solve high-stakes societal challenges. Select your primary role to proceed.
            </p>

            {/* Role Selector Tabs */}
            <div className="grid grid-cols-2 gap-3 p-1.5 mb-6 bg-slate-900/90 border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setRole('poster')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                  role === 'poster'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Problem Poster</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('solver')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                  role === 'solver'
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Verified Solver</span>
              </button>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name & Credentials
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Priya Raman / Sarah Jenkins"
                  className="w-full px-4 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Official Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@institution.edu"
                    className="w-full px-4 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {role === 'poster' ? 'Organization / Body' : 'University / Lab / Firm'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={role === 'poster' ? 'e.g. Clean Water NGO, Municipal Dept' : 'e.g. Stanford AI Lab, Siemens R&D'}
                    className="w-full px-4 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>

              {/* Verification Upload Requirement */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-dashed border-cyan-500/40">
                <div className="flex items-start gap-3">
                  <Upload className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-200">
                      {role === 'solver'
                        ? 'Mandatory Solver Verification Document'
                        : 'Institutional Representation Document'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Upload institutional proof (ID badge, ORCID token, or official letterhead). PDF/PNG up to 10MB.
                    </p>
                    <label className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-xs font-medium text-cyan-300 hover:bg-cyan-900/60 cursor-pointer transition-colors">
                      <span>{fileName || 'Choose Document'}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Red Pill Submit Button - Notice it is the CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full red-pill-button py-3.5 text-base font-bold shadow-lg"
                >
                  Complete Verification & Join CollabX
                  <ArrowRight className="w-4 h-4 ml-2 inline" />
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-400">
                🔒 Protected by End-to-End Cryptographic Audit Trail • Zero Spam Policy
              </p>
            </form>
          </div>
        ) : (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-500/20 border border-teal-500/50 flex items-center justify-center text-teal-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold font-['Outfit'] text-white mb-2">Verification Dossier Submitted!</h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto mb-6 leading-relaxed">
              Your credentials are now undergoing review in accordance with the CollabX Trust Protocol. A secure authentication key has been sent to your institutional email.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-950/60 border border-teal-500/30 text-teal-300 text-xs font-mono mb-6">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              Status: KYC_STAGE_PENDING_REVIEW (ID: #CX-9042)
            </div>
            <div>
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors"
              >
                Back to Platform
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinModal;
