import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, ArrowUpRight } from 'lucide-react';
import Reveal from './Reveal';
import { useApp } from '../context/AppContext';

const Hero = () => {
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
    <section 
      id="hero" 
      className="relative min-h-screen pt-20 pb-16 flex items-center overflow-hidden bg-[#06142e]"
    >
      {/* Background Image with Right Alignment */}
      <div 
        className="absolute inset-0 bg-cover bg-right bg-no-repeat pointer-events-none z-0"
        style={{ backgroundImage: "url('/background.png')" }}
      >
        {/* Horizontal Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#06142e]/85 via-[#06142e]/50 to-[#06142e]/10" />
      </div>

      {/* Main Container - Pushed closer to the left edge (24px to 40px padding) */}
      <div className="relative z-10 w-full px-6 sm:px-8 lg:px-10 flex items-center min-h-[calc(100vh-80px)]">
        {/* Left Column: ~45% width, left-aligned, vertically centered */}
        <div className="w-full lg:w-[48%] max-w-[540px] text-left flex flex-col items-start my-auto">
          
          {/* Top Innovation Pill Badge */}
          <Reveal animation="fade-down" delay={100}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0b2240]/90 border border-[#0ea5e9]/35 text-[#38bdf8] text-xs sm:text-sm font-medium mb-6 shadow-[0_0_20px_rgba(14, 165, 233, 0.25)] backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-[#38bdf8] animate-ping" />
              <Sparkles className="w-4 h-4 text-[#38bdf8]" />
              <span>Bridging Tough Challenges With Verified Brainpower</span>
            </div>
          </Reveal>

          {/* Left-Aligned Headline */}
          <Reveal animation="fade-up" delay={200}>
            <h1 className="font-['Outfit'] font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight text-[#f0f9ff] leading-[1.12] mb-6">
              Turning Real-World <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0b2240] via-[#38bdf8] to-[#f0f9ff]">
                Tough Challenges
              </span>{' '}
              Into Solutions
            </h1>
          </Reveal>

          {/* Left-Aligned Subtext (max-width ~500px) */}
          <Reveal animation="fade-up" delay={300}>
            <p className="text-base sm:text-lg text-[#38bdf8] font-normal max-w-[500px] leading-relaxed mb-8">
              A trusted platform connecting organizations, teams, and problem creators with verified researchers and industry specialists to solve technical, operational, and community challenges together.
            </p>
          </Reveal>

          {/* Left-Aligned CTA Buttons (Side-by-Side) */}
          <Reveal animation="scale-in" delay={400}>
            <div className="flex flex-row items-center gap-4 sm:gap-5 justify-start flex-wrap">
              <button
                onClick={handleJoinClick}
                className="red-pill-button px-8 py-4 text-base sm:text-lg tracking-wider uppercase"
              >
                <span>{currentUser ? 'Explore Feed' : 'Join CollabX'}</span>
                <ArrowRight className="w-5 h-5 ml-2.5 inline" />
              </button>

              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#0b2240]/80 hover:bg-[#143d6e] border border-[#0ea5e9]/35 text-[#f0f9ff] font-['Outfit'] font-semibold text-sm sm:text-base transition-all hover:border-[#0ea5e9]/40/70 shadow-lg"
              >
                <span>Explore Process</span>
                <ArrowUpRight className="w-4 h-4 text-[#38bdf8]" />
              </a>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
};

export default Hero;
