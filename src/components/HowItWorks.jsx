import React from 'react';
import { 
  FileText, 
  UserCheck, 
  ClipboardCheck, 
  Handshake, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  UploadCloud, 
  Code,
  Workflow
} from 'lucide-react';
import Reveal from './Reveal';

const steps = [
  {
    number: '01',
    title: 'Post a Civic Challenge',
    actor: 'Citizens • NGOs • Municipal Bodies',
    desc: 'Articulate the societal crisis with verifiable parameters, impact milestones, raw sensor data, and geographic boundaries. CollabX structures the brief into an actionable technical RFP.',
    icon: FileText,
    accent: 'cyan',
    microCard: (
      <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-cyan-500/20 text-xs">
        <div className="flex items-center justify-between text-cyan-400 font-mono text-[11px] mb-2">
          <span>Brief ID: #CX-POST-014</span>
          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300">Public RFP</span>
        </div>
        <div className="font-semibold text-white">Urban Heat Island Mitigation & Tree Canopy Optimization</div>
        <div className="flex gap-2 mt-2 text-[10px] text-slate-400 font-mono">
          <span className="bg-slate-900 px-2 py-1 rounded">GIS Data Included</span>
          <span className="bg-slate-900 px-2 py-1 rounded">60-Day Target</span>
        </div>
      </div>
    ),
  },
  {
    number: '02',
    title: 'Verified Solvers Apply',
    actor: 'University Labs • PhD Candidates • Industry R&D',
    desc: 'Only certified solvers with institutional credentials can apply. They submit technical methodology dossiers, laboratory access clearances, and estimated delivery timelines.',
    icon: UserCheck,
    accent: 'teal',
    microCard: (
      <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-teal-500/20 text-xs">
        <div className="flex items-center justify-between text-teal-400 font-mono text-[11px] mb-2">
          <span>Applicant: Dr. Elena Rostova</span>
          <span className="flex items-center gap-1 text-teal-300 font-bold">
            <ShieldCheck className="w-3 h-3" /> ORCID Verified
          </span>
        </div>
        <div className="text-white font-medium">Department of Climate Informatics & Urban Sensing</div>
        <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2">
          <span className="text-teal-400">● 14 Peer-reviewed Papers</span>
          <span>• 3 Municipal Pilots Delivered</span>
        </div>
      </div>
    ),
  },
  {
    number: '03',
    title: 'Mandatory Review & Handshake',
    actor: 'Forced Document Audit • Escrow Agreement',
    desc: 'Posters are required to review the solver’s official identity, credentials, and proposed technical blueprint before accepting. No blind approvals or unverified contractors.',
    icon: ClipboardCheck,
    accent: 'cyan',
    microCard: (
      <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-cyan-500/20 text-xs">
        <div className="text-xs font-semibold text-slate-200 mb-2 flex items-center justify-between">
          <span>Verification Checklist:</span>
          <span className="text-cyan-400 font-mono text-[10px]">ALL CLEARED</span>
        </div>
        <div className="space-y-1.5 text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-teal-400" />
            <span>Institutional Accreditation Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-teal-400" />
            <span>Scope of Work & Data Governance Accepted</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: '04',
    title: 'Collaborate to Resolve',
    actor: 'Milestone Execution • Public Impact',
    desc: 'Work directly in CollabX secure project sandboxes. Track real-time deliverables, exchange research telemetry, and publish open solutions that genuinely transform the community.',
    icon: Handshake,
    accent: 'teal',
    microCard: (
      <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-teal-500/20 text-xs">
        <div className="flex justify-between text-xs text-slate-300 mb-1.5">
          <span>Resolution Milestones</span>
          <span className="font-mono text-teal-400 font-bold">75% Complete</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="w-3/4 h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full" />
        </div>
        <div className="mt-2.5 flex justify-between text-[10px] text-slate-400 font-mono">
          <span>Phase 3: Sensor Array Live</span>
          <span className="text-cyan-300">Deploying in 12 Days</span>
        </div>
      </div>
    ),
  },
];

const HowItWorks = () => {
  return (
    <section 
      id="how-it-works" 
      className="relative min-h-screen py-28 flex flex-col justify-center items-center bg-[#060911] border-t border-cyan-500/10"
    >
      {/* Background glow orbs */}
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 w-full">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Reveal animation="fade-down">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase tracking-wider mb-4">
              <Workflow className="w-3.5 h-3.5 text-cyan-400" />
              <span>Verified Execution Pipeline</span>
            </div>
          </Reveal>

          <Reveal animation="fade-up" delay={150}>
            <h2 className="font-['Outfit'] font-extrabold text-3xl sm:text-5xl md:text-6xl text-white tracking-tight leading-tight mb-6">
              How CollabX Solves Real Problems in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-sky-400">
                Four Steps
              </span>
            </h2>
          </Reveal>

          <Reveal animation="fade-up" delay={250}>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Every step is engineered to filter out noise, eliminate unverified claims, and channel genuine expertise straight to the community frontline.
            </p>
          </Reveal>
        </div>

        {/* The 4 Steps Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isTeal = step.accent === 'teal';

            return (
              <Reveal 
                key={step.number} 
                animation="slide-left" 
                delay={idx * 150} 
                className="h-full flex flex-col"
              >
                <div className="relative h-full flex flex-col justify-between p-6 rounded-3xl bg-[#0c1426]/90 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-2 group backdrop-blur-xl shadow-xl">
                  {/* Step Header */}
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="font-['Outfit'] font-black text-3xl text-slate-600 group-hover:text-cyan-400 transition-colors">
                        {step.number}
                      </span>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${
                        isTeal 
                          ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' 
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>

                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-cyan-400 block mb-1">
                      {step.actor}
                    </span>

                    <h3 className="font-['Outfit'] font-bold text-xl text-white mb-3 group-hover:text-cyan-200 transition-colors">
                      {step.title}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  {/* Micro Visual Card Preview */}
                  <div className="mt-4">
                    {step.microCard}
                  </div>

                  {/* Connecting Arrow for Desktop */}
                  {idx < steps.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20">
                      <div className="w-6 h-6 rounded-full bg-[#0c1426] border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
