import React from 'react';
import { AlertCircle, BrainCircuit, Network, CheckCircle2, HelpCircle } from 'lucide-react';
import Reveal from './Reveal';

const Mission = () => {
  return (
    <section 
      id="mission" 
      className="relative min-h-screen py-28 flex flex-col justify-center items-center bg-[#221226] border-t border-[#935073]/20"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-[#935073]/15 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 w-full">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Reveal animation="fade-down">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#502D55]/80 border border-[#935073]/40 text-[#F6DBC0] text-xs font-mono uppercase tracking-wider mb-4">
              <HelpCircle className="w-3.5 h-3.5 text-[#F6DBC0]" />
              <span>The Civic Disconnect</span>
            </div>
          </Reveal>

          <Reveal animation="fade-up" delay={150}>
            <h2 className="font-['Outfit'] font-extrabold text-3xl sm:text-5xl md:text-6xl text-[#F8F4E9] tracking-tight leading-tight mb-6">
              Critical Problems Go Unsolved Because They Never Reach the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F6DBC0] via-[#935073] to-[#F8F4E9]">
                Right Minds
              </span>
            </h2>
          </Reveal>

          <Reveal animation="fade-up" delay={250}>
            <p className="text-base sm:text-lg text-[#F8F4E9]/80 leading-relaxed">
              Every day, citizens, grassroots NGOs, and overburdened municipal departments identify real-world emergencies. Yet without direct pipelines to specialized researchers and industry engineers, these issues linger in isolation.
            </p>
          </Reveal>
        </div>

        {/* 3-Column Glassmorphic Problem -> Mission Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: The Civic Need */}
          <Reveal animation="fade-up" delay={100} className="h-full">
            <div className="relative h-full p-8 rounded-3xl bg-[#3a1e3e]/80 border border-[#935073]/30 hover:border-[#F6DBC0]/50 transition-all duration-300 hover:-translate-y-2 group shadow-xl backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#935073]/20 border border-[#935073]/40 flex items-center justify-center text-[#F6DBC0] mb-6 group-hover:scale-110 group-hover:bg-[#935073]/30 transition-all">
                <AlertCircle className="w-7 h-7" />
              </div>

              <span className="text-xs font-mono uppercase tracking-widest text-[#F6DBC0] font-bold block mb-2">
                01 • The Problem
              </span>

              <h3 className="font-['Outfit'] font-bold text-2xl text-[#F8F4E9] mb-4 group-hover:text-[#F6DBC0] transition-colors">
                Grassroots Invisibility
              </h3>

              <p className="text-sm text-[#F8F4E9]/80 leading-relaxed mb-6">
                Citizens and localized NGOs experience frontline failures — contamination, traffic hazards, climate disasters — but lack access to institutional labs, computational power, and scientific domain specialists.
              </p>

              <div className="pt-4 border-t border-[#935073]/30 flex items-center justify-between text-xs text-[#F8F4E9]/60 font-mono">
                <span>Stalled Initiatives:</span>
                <span className="font-bold text-[#F6DBC0]">84% Lack Technical Teams</span>
              </div>
            </div>
          </Reveal>

          {/* Card 2: The Untapped Expertise */}
          <Reveal animation="fade-up" delay={250} className="h-full">
            <div className="relative h-full p-8 rounded-3xl bg-[#3a1e3e]/80 border border-[#935073]/30 hover:border-[#F6DBC0]/50 transition-all duration-300 hover:-translate-y-2 group shadow-xl backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#502D55]/60 border border-[#935073]/40 flex items-center justify-center text-[#F6DBC0] mb-6 group-hover:scale-110 group-hover:bg-[#502D55]/80 transition-all">
                <BrainCircuit className="w-7 h-7" />
              </div>

              <span className="text-xs font-mono uppercase tracking-widest text-[#F6DBC0] font-bold block mb-2">
                02 • The Opportunity
              </span>

              <h3 className="font-['Outfit'] font-bold text-2xl text-[#F8F4E9] mb-4 group-hover:text-[#F6DBC0] transition-colors">
                Siloed Academic R&D
              </h3>

              <p className="text-sm text-[#F8F4E9]/80 leading-relaxed mb-6">
                Elite professors, PhD scholars, and corporate researchers possess unmatched technical competence, but their discoveries often remain confined to journals rather than tangible civic deployments.
              </p>

              <div className="pt-4 border-t border-[#935073]/30 flex items-center justify-between text-xs text-[#F8F4E9]/60 font-mono">
                <span>Published Research:</span>
                <span className="font-bold text-[#F6DBC0]">2.5M+ Papers Untested in Field</span>
              </div>
            </div>
          </Reveal>

          {/* Card 3: The CollabX Mission */}
          <Reveal animation="fade-up" delay={400} className="h-full">
            <div className="relative h-full p-8 rounded-3xl bg-gradient-to-b from-[#502D55] to-[#3a1e3e] border border-[#F6DBC0]/40 hover:border-[#F6DBC0] transition-all duration-300 hover:-translate-y-2 group shadow-[0_10px_40px_rgba(147,80,115,0.2)] backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#935073]/30 border border-[#F6DBC0]/40 flex items-center justify-center text-[#F6DBC0] mb-6 group-hover:scale-110 transition-all">
                <Network className="w-7 h-7" />
              </div>

              <span className="text-xs font-mono uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#F6DBC0] to-[#F8F4E9] font-bold block mb-2">
                03 • The CollabX Engine
              </span>

              <h3 className="font-['Outfit'] font-bold text-2xl text-[#F8F4E9] mb-4 group-hover:text-[#F6DBC0] transition-colors">
                Verified Civic Synthesis
              </h3>

              <p className="text-sm text-[#F8F4E9]/80 leading-relaxed mb-6">
                CollabX establishes a verified pipeline. We validate real problem briefs, vet solver credentials through rigorous document review, and oversee collaborative milestones until the civic problem is solved.
              </p>

              <div className="pt-4 border-t border-[#935073]/30 flex items-center justify-between text-xs text-[#F8F4E9]/60 font-mono">
                <span>Verified Matching:</span>
                <span className="font-bold text-[#F6DBC0]">Under 72 Hours</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Supporting Trust Banner */}
        <Reveal animation="fade-in" delay={500} className="mt-16">
          <div className="p-6 rounded-2xl bg-[#3a1e3e]/60 border border-[#935073]/30 flex flex-wrap items-center justify-around gap-6 text-center">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#F6DBC0]" />
              <span className="text-sm font-medium text-[#F8F4E9]">Zero Commercial Advertisements</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#F6DBC0]" />
              <span className="text-sm font-medium text-[#F8F4E9]">100% Institutional Document Vetting</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#F6DBC0]" />
              <span className="text-sm font-medium text-[#F8F4E9]">Public Impact Transparency Logs</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Mission;
