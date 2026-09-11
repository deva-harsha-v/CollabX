import React from 'react';
import { 
  ShieldCheck, 
  FileCheck2, 
  Award, 
  Lock, 
  CheckCircle2, 
  KeyRound, 
  Fingerprint, 
  ShieldAlert,
  BadgeCheck
} from 'lucide-react';
import Reveal from './Reveal';

const Security = () => {
  return (
    <section 
      id="security" 
      className="relative min-h-screen py-28 flex flex-col justify-center items-center bg-[#0A1931] border-t border-[#1A3D63]/20"
    >
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#1A3D63]/15 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 w-full">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Reveal animation="fade-down">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1A3D63]/80 border border-[#1A3D63]/40 text-[#B3CFE5] text-xs font-mono uppercase tracking-wider mb-4 shadow-md backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B3CFE5]" />
              <span>Cryptographic Trust Architecture</span>
            </div>
          </Reveal>

          <Reveal animation="fade-up" delay={150}>
            <h2 className="font-['Outfit'] font-extrabold text-3xl sm:text-5xl md:text-6xl text-[#F6FAFD] tracking-tight leading-tight mb-6">
              Vetted Expertise.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1A3D63] via-[#B3CFE5] to-[#F6FAFD]">
                Zero Imposters.
              </span>
            </h2>
          </Reveal>

          <Reveal animation="fade-up" delay={250}>
            <p className="text-base sm:text-lg text-[#B3CFE5] leading-relaxed">
              Real challenges deal with mission-critical systems, technical infrastructure, data privacy, and organizational goals. CollabX enforces three strict cryptographic trust barriers so only genuine authority enters the arena.
            </p>
          </Reveal>
        </div>

        {/* 3 Main Trust Pillars with Scaling Icon Animation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Pillar 1: Document Upload */}
          <Reveal animation="scale-in" delay={150} className="h-full">
            <div className="h-full p-8 rounded-3xl bg-[#1A3D63]/80 border border-[#1A3D63]/30 hover:border-[#1A3D63]/60 transition-all duration-300 hover:-translate-y-2 group backdrop-blur-xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-[#1A3D63]/20 border border-[#1A3D63]/40 flex items-center justify-center text-[#B3CFE5] mb-6 group-hover:scale-110 transition-all">
                  <FileCheck2 className="w-8 h-8" />
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono uppercase text-[#B3CFE5] font-bold tracking-wider">
                    Requirement 01
                  </span>
                </div>

                <h3 className="font-['Outfit'] font-bold text-2xl text-[#F6FAFD] mb-3 group-hover:text-[#B3CFE5] transition-colors">
                  Mandatory Document Upload
                </h3>

                <p className="text-sm text-[#B3CFE5]/90 leading-relaxed mb-6">
                  Solvers cannot apply with anonymous accounts. Every applicant must submit verifiable institutional documents: university faculty accreditation, government ID, corporate patents, or peer-reviewed research record proofs.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-[#1A3D63]/25 text-xs text-[#B3CFE5]/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B3CFE5] shrink-0" />
                  <span>ORCID / Institutional Email Validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B3CFE5] shrink-0" />
                  <span>Automated Cryptographic Hash Verification</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Pillar 2: Forced Review Protocol */}
          <Reveal animation="scale-in" delay={300} className="h-full">
            <div className="h-full p-8 rounded-3xl bg-[#1A3D63]/80 border border-[#1A3D63]/30 hover:border-[#1A3D63]/60 transition-all duration-300 hover:-translate-y-2 group backdrop-blur-xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-[#1A3D63]/20 border border-[#1A3D63]/40 flex items-center justify-center text-[#B3CFE5] mb-6 group-hover:scale-110 transition-all">
                  <Lock className="w-8 h-8" />
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono uppercase text-[#B3CFE5] font-bold tracking-wider">
                    Requirement 02
                  </span>
                </div>

                <h3 className="font-['Outfit'] font-bold text-2xl text-[#F6FAFD] mb-3 group-hover:text-[#B3CFE5] transition-colors">
                  Forced Document Review
                </h3>

                <p className="text-sm text-[#B3CFE5]/90 leading-relaxed mb-6">
                  To eliminate blind acceptances and favoritism, problem posters are systematically forced to review and digitally certify the solver’s uploaded credential dossiers before contract signing is unlocked.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-[#1A3D63]/25 text-xs text-[#B3CFE5]/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B3CFE5] shrink-0" />
                  <span>Mandatory In-App Dossier Inspection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B3CFE5] shrink-0" />
                  <span>Immutable Audit Log for Municipal Compliance</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Pillar 3: Verified Badge System */}
          <Reveal animation="scale-in" delay={450} className="h-full">
            <div className="h-full p-8 rounded-3xl bg-[#1A3D63]/80 border border-[#1A3D63]/30 hover:border-[#1A3D63]/60 transition-all duration-300 hover:-translate-y-2 group backdrop-blur-xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-[#1A3D63]/20 border border-[#1A3D63]/40 flex items-center justify-center text-[#B3CFE5] mb-6 group-hover:scale-110 transition-all">
                  <BadgeCheck className="w-8 h-8" />
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono uppercase text-[#B3CFE5] font-bold tracking-wider">
                    Requirement 03
                  </span>
                </div>

                <h3 className="font-['Outfit'] font-bold text-2xl text-[#F6FAFD] mb-3 group-hover:text-[#B3CFE5] transition-colors">
                  "Verified" Badge Hierarchy
                </h3>

                <p className="text-sm text-[#B3CFE5]/90 leading-relaxed mb-6">
                  Community members instantly identify trust tiers: Verified Academic Fellow, Certified Municipal Partner, or Industrial Engineering Lead. Each badge is backed by tamper-proof cryptographic proofs.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-[#1A3D63]/25 text-xs text-[#B3CFE5]/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B3CFE5] shrink-0" />
                  <span>Cryptographically Signed Metadata</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B3CFE5] shrink-0" />
                  <span>Public Verification Ledger for Citizens</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Security Architecture Interactive Proof Card */}
        <Reveal animation="fade-up" delay={550}>
          <div className="p-8 rounded-3xl bg-gradient-to-r from-[#0A1931] via-[#1A3D63] to-[#0A1931] border border-[#1A3D63]/40 flex flex-col lg:flex-row items-center justify-between gap-8 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-[#1A3D63]/20 border border-[#1A3D63]/40 flex items-center justify-center text-[#B3CFE5] shrink-0">
                <Fingerprint className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-[#F6FAFD] font-['Outfit']">End-to-End Cryptographic Handshake</h4>
                <p className="text-sm text-[#B3CFE5] max-w-xl">
                  Every agreement is sealed with SHA-256 document hashing and mutual digital signatures, guaranteeing accountability for public funding and community safety.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="px-4 py-2 rounded-xl bg-[#0A1931] border border-[#1A3D63]/40 text-[#B3CFE5]">
                <span>KYC Standard: LEVEL-3 ACADEMIC</span>
              </div>
              <div className="px-4 py-2 rounded-xl bg-[#0A1931] border border-[#1A3D63]/40 text-[#F6FAFD]">
                <span>ENCRYPTION: AES-256 GCM</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Security;
