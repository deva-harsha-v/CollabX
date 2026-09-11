import React, { useEffect, useRef, useState } from 'react';

/**
 * Reveal Component: Triggers smooth scroll-based animations when element enters viewport.
 * Uses IntersectionObserver with progressive fallback.
 */
const Reveal = ({
  children,
  className = '',
  animation = 'fade-up', // 'fade-up' | 'slide-left' | 'slide-right' | 'scale-in' | 'fade-in'
  delay = 0, // delay in ms
  threshold = 0.15,
  triggerOnce = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef(null);

  useEffect(() => {
    // If IntersectionObserver is not available, reveal immediately
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce && domRef.current) {
            observer.unobserve(domRef.current);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    const currentElem = domRef.current;
    if (currentElem) {
      observer.observe(currentElem);
    }

    return () => {
      if (currentElem) {
        observer.unobserve(currentElem);
      }
    };
  }, [threshold, triggerOnce]);

  // Define initial and revealed transition styles
  const getAnimationStyles = () => {
    const baseTransition = {
      transitionProperty: 'opacity, transform, filter',
      transitionDuration: '800ms',
      transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      transitionDelay: `${delay}ms`,
    };

    if (!isVisible) {
      switch (animation) {
        case 'fade-up':
          return {
            ...baseTransition,
            opacity: 0,
            transform: 'translateY(40px)',
            filter: 'blur(4px)',
          };
        case 'slide-left':
          return {
            ...baseTransition,
            opacity: 0,
            transform: 'translateX(-50px)',
            filter: 'blur(4px)',
          };
        case 'slide-right':
          return {
            ...baseTransition,
            opacity: 0,
            transform: 'translateX(50px)',
            filter: 'blur(4px)',
          };
        case 'scale-in':
          return {
            ...baseTransition,
            opacity: 0,
            transform: 'scale(0.88)',
            filter: 'blur(4px)',
          };
        case 'fade-in':
        default:
          return {
            ...baseTransition,
            opacity: 0,
            transform: 'translateY(0)',
          };
      }
    }

    return {
      ...baseTransition,
      opacity: 1,
      transform: 'translate(0, 0) scale(1)',
      filter: 'blur(0)',
    };
  };

  return (
    <div
      ref={domRef}
      style={getAnimationStyles()}
      className={`will-change-[transform,opacity] ${className}`}
    >
      {children}
    </div>
  );
};

export default Reveal;
