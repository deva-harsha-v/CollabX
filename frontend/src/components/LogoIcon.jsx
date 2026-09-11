import React from 'react';

/**
 * CollabX Constellation X Logo Icon
 * Matches the official CollabX emblem with connected neural nodes and electric cyan glow.
 */
const LogoIcon = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    xs: 'w-6 h-6 rounded-lg p-[1px]',
    sm: 'w-8 h-8 rounded-xl p-[1.5px]',
    md: 'w-9 h-9 sm:w-10 sm:h-10 rounded-2xl p-[1.5px]',
    lg: 'w-12 h-12 sm:w-14 sm:h-14 rounded-3xl p-[2px]',
  };

  const innerSizeMap = {
    xs: 'rounded-[6px]',
    sm: 'rounded-[10px]',
    md: 'rounded-[14px]',
    lg: 'rounded-[20px]',
  };

  const iconSizeMap = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5 sm:w-6 sm:h-6',
    lg: 'w-7 h-7 sm:w-8 sm:h-8',
  };

  return (
    <div className={`relative flex items-center justify-center bg-gradient-to-tr from-[#0ea5e9] via-[#0b2240] to-[#38bdf8] shadow-lg shadow-[#0ea5e9]/25 shrink-0 ${sizeMap[size] || sizeMap.md} ${className}`}>
      <div className={`w-full h-full bg-[#06142e] flex items-center justify-center ${innerSizeMap[size] || innerSizeMap.md}`}>
        <svg
          className={`${iconSizeMap[size] || 'w-5 h-5'} text-[#38bdf8] group-hover:rotate-12 transition-transform duration-300`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
          <circle cx="12" cy="12" r="2.5" fill="#38bdf8" />
          <circle cx="6" cy="6" r="1.5" fill="#0ea5e9" />
          <circle cx="18" cy="6" r="1.5" fill="#38bdf8" />
          <circle cx="6" cy="18" r="1.5" fill="#38bdf8" />
          <circle cx="18" cy="18" r="1.5" fill="#0ea5e9" />
        </svg>
      </div>
    </div>
  );
};

export default LogoIcon;
