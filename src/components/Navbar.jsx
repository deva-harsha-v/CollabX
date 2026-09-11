import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

const Navbar = ({ onOpenJoin }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Trigger transition once user scrolls past the initial hero view
      if (window.scrollY > 60) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ease-in-out ${
        isScrolled
          ? 'py-0 px-0 bg-[#060911]/95 backdrop-blur-2xl border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.8)]'
          : 'py-4 px-4 sm:px-8 bg-transparent'
      }`}
    >
      <div
        className={`max-w-7xl mx-auto flex items-center justify-between transition-all duration-500 ease-in-out ${
          isScrolled
            ? 'px-6 sm:px-10 py-3 rounded-none bg-transparent border-transparent shadow-none'
            : 'px-6 py-3 rounded-full bg-[#0b1222]/80 backdrop-blur-xl border border-cyan-500/20 shadow-[0_10px_35px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Brand Logo */}
        <a href="#hero" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-blue-600 p-[2px] shadow-lg shadow-cyan-500/25">
            <div className="w-full h-full bg-[#070d1a] rounded-[14px] flex items-center justify-center">
              <svg
                className="w-6 h-6 text-cyan-400 group-hover:rotate-12 transition-transform duration-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
                <circle cx="12" cy="12" r="2.5" fill="#22d3ee" />
                <circle cx="6" cy="6" r="1.5" fill="#0284c7" />
                <circle cx="18" cy="6" r="1.5" fill="#14b8a6" />
                <circle cx="6" cy="18" r="1.5" fill="#14b8a6" />
                <circle cx="18" cy="18" r="1.5" fill="#0284c7" />
              </svg>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-['Outfit'] font-black text-xl tracking-tight text-white flex items-center">
              Collab<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">X</span>
            </span>
            <span className="text-[9px] uppercase tracking-widest text-cyan-400/80 font-mono -mt-1 font-semibold">Civic Grid</span>
          </div>
        </a>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#mission" className="hover:text-cyan-400 transition-all duration-300 border-b border-transparent hover:border-cyan-400/40 pb-1">The Mission</a>
          <a href="#how-it-works" className="hover:text-cyan-400 transition-all duration-300 border-b border-transparent hover:border-cyan-400/40 pb-1">How It Works</a>
          <a href="#security" className="hover:text-cyan-400 transition-all duration-300 border-b border-transparent hover:border-cyan-400/40 pb-1">Security & Trust</a>
        </nav>

        {/* CTA Button - Bold Red Pill Button (The ONLY Red Element) */}
        <button
          onClick={onOpenJoin}
          className="red-pill-button px-5 sm:px-7 py-2.5 text-xs sm:text-sm shadow-md"
        >
          <span>Join CollabX</span>
          <ArrowRight className="w-4 h-4 ml-1.5 hidden sm:inline" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
