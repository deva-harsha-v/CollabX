import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import Reveal from './Reveal';
import { useApp } from '../context/AppContext';

const CTAFooter = () => {
  const navigate = useNavigate();
  const { currentUser } = useApp();

  const handleJoinClick = () => {
    if (currentUser) {
      navigate('/feed');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="relative bg-[#0A1931] border-t border-[#4A7FA7]/20">
      {/* Final CTA Section */}
      <section 
        id="join" 
        className="relative py-16 flex flex-col justify-center items-center overflow-hidden"
      >
        {/* Ambient Glowing Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] bg-gradient-to-tr from-[#4A7FA7]/20 via-[#1A3D63]/15 to-[#4A7FA7]/20 rounded-full blur-[160px]" />
          <div className="absolute inset-0 cyber-grid opacity-30" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 text-center flex flex-col items-center">
          <Reveal animation="fade-down">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A3D63]/80 border border-[#4A7FA7]/40 text-[#B3CFE5] text-xs sm:text-sm font-mono uppercase tracking-wider mb-6 shadow-md backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-[#B3CFE5]" />
              <span>Launch Your Impact Today</span>
            </div>
          </Reveal>

          <Reveal animation="fade-up" delay={150}>
            <h2 className="font-['Outfit'] font-black text-4xl sm:text-5xl md:text-6xl text-[#F6FAFD] tracking-tight leading-[1.08] mb-6">
              Have a Crisis to Solve or the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4A7FA7] via-[#B3CFE5] to-[#F6FAFD]">
                Genius to Solve It?
              </span>
            </h2>
          </Reveal>

          {/* Short Closing Tagline */}
          <Reveal animation="fade-up" delay={250}>
            <p className="text-base sm:text-xl text-[#B3CFE5] max-w-2xl font-light leading-relaxed mb-8">
              Join the CollabX network. Where verified university labs and industry minds turn community emergencies into solved history.
            </p>
          </Reveal>

          {/* Repeat the "Join CollabX" Red Button (The ONLY Red Element) */}
          <Reveal animation="scale-in" delay={350}>
            <div className="flex flex-col items-center">
              <button
                onClick={handleJoinClick}
                className="red-pill-button px-10 py-4 text-lg sm:text-xl font-black uppercase tracking-wider shadow-2xl"
              >
                <span>{currentUser ? 'Explore Live Feed' : 'Join CollabX'}</span>
                <ArrowRight className="w-6 h-6 ml-3 inline" />
              </button>

              <span className="text-xs text-[#B3CFE5]/80 mt-3 font-mono">
                🔒 Free for NGOs & Academic Researchers • Verified Onboarding
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Compact Minimal Footer with Team Name CollabX */}
      <footer className="relative z-10 border-t border-[#4A7FA7]/30 bg-[#0A1931] py-6 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Team */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#4A7FA7] to-[#B3CFE5] p-[1.5px]">
              <div className="w-full h-full bg-[#0A1931] rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#B3CFE5]" />
              </div>
            </div>
            <div>
              <span className="font-['Outfit'] font-black text-lg text-[#F6FAFD]">
                Collab<span className="text-[#B3CFE5]">X</span>
              </span>
              <p className="text-[11px] text-[#B3CFE5]/80 font-mono">Engineered by Team CollabX</p>
            </div>
          </div>

          {/* Navigation links */}
          <div className="flex items-center gap-6 text-xs text-[#B3CFE5]/80 font-medium">
            <a href="#hero" className="hover:text-[#F6FAFD] transition-colors">Hero</a>
            <a href="#mission" className="hover:text-[#F6FAFD] transition-colors">Mission</a>
            <a href="#how-it-works" className="hover:text-[#F6FAFD] transition-colors">How It Works</a>
            <a href="#security" className="hover:text-[#F6FAFD] transition-colors">Security & Trust</a>
          </div>

          {/* Copyright & Tagline */}
          <div className="text-center sm:text-right text-xs text-[#B3CFE5]/70 font-mono">
            <span>© {new Date().getFullYear()} CollabX Platform. All Rights Reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CTAFooter;
