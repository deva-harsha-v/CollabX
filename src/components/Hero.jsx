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
      className="relative min-h-screen pt-20 pb-16 flex items-center overflow-hidden bg-[#221226]"
    >
      {/* Background Image with Right Alignment */}
      <div 
        className="absolute inset-0 bg-cover bg-right bg-no-repeat pointer-events-none z-0 opacity-40"
        style={{ backgroundImage: "url('/background.png')" }}
      >
        {/* Horizontal Dark Gradient Overlay: Violet Dusk */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#221226]/90 via-[#221226]/60 to-[#221226]/10" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full px-6 sm:px-8 lg:px-10 flex items-center min-h-[calc(100vh-80px)]">
        <div className="w-full lg:w-[48%] max-w-[540px] text-left flex flex-col items-start my-auto">
          
          {/* Top Innovation Pill Badge */}
          <Reveal animation="fade-down" delay={100}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#502D55]/90 border border-[#F6DBC0]/30 text-[#F6DBC0] text-xs sm:text-sm font-medium mb-6 shadow-[0_0_25px_rgba(147,80,115,0.25)] backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-[#F6DBC0] animate-ping" />
              <Sparkles className="w-4 h-4 text-[#F6DBC0]" />
              <span>Bridging Civic Challenges With Verified Brainpower</span>
            </div>
          </Reveal>

          {/* Left-Aligned Headline */}
          <Reveal animation="fade-up" delay={200}>
            <h1 className="font-['Outfit'] font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight text-[#F8F4E9] leading-[1.12] mb-6">
              Turning Real-World <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F6DBC0] via-[#935073] to-[#F8F4E9]">
                Civic Problems
              </span>{' '}
              Into Solutions
            </h1>
          </Reveal>

          {/* Subtext */}
          <Reveal animation="fade-up" delay={300}>
            <p className="text-base sm:text-lg text-[#F6DBC0]/80 font-normal max-w-[500px] leading-relaxed mb-8">
              A trusted platform connecting citizens, NGOs, and government bodies with verified university researchers and industry innovators to resolve societal challenges together.
            </p>
          </Reveal>

          {/* CTA Buttons */}
          <Reveal animation="scale-in" delay={400}>
            <div className="flex flex-row items-center gap-4 sm:gap-5 justify-start flex-wrap">
              <button
                onClick={handleJoinClick}
                className="red-pill-button px-8 py-4 text-base sm:text-lg tracking-wider uppercase min-h-[44px]"
              >
                <span>{currentUser ? 'Explore Feed' : 'Join CollabX'}</span>
                <ArrowRight className="w-5 h-5 ml-2.5 inline" />
              </button>

              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#502D55]/80 hover:bg-[#935073]/40 border border-[#F6DBC0]/30 text-[#F8F4E9] font-['Outfit'] font-semibold text-sm sm:text-base transition-all hover:border-[#F6DBC0]/60 min-h-[44px]"
              >
                <span>Explore Process</span>
                <ArrowUpRight className="w-4 h-4 text-[#F6DBC0]" />
              </a>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
};

export default Hero;
