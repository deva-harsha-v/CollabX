import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Mission from '../components/Mission';
import HowItWorks from '../components/HowItWorks';
import Security from '../components/Security';
import CTAFooter from '../components/CTAFooter';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#221226] text-[#F8F4E9] selection:bg-[#935073]/40 selection:text-[#F6DBC0]">
      {/* Top Floating Glassmorphic Navigation */}
      <Navbar />

      {/* Main Sections */}
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
