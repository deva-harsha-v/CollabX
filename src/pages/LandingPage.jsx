import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Mission from '../components/Mission';
import HowItWorks from '../components/HowItWorks';
import Security from '../components/Security';
import CTAFooter from '../components/CTAFooter';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Floating Glassmorphic Navigation */}
      <Navbar />

      {/* Main 5 Full-Height Sections */}
      <main>
        {/* Section 1: Hero */}
        <Hero />

        {/* Section 2: The Problem / Mission */}
        <Mission />

        {/* Section 3: How It Works */}
        <HowItWorks />

        {/* Section 4: Security & Trust */}
        <Security />

        {/* Section 5: Final CTA & Minimal Team CollabX Footer */}
        <CTAFooter />
      </main>
    </div>
  );
};

export default LandingPage;
