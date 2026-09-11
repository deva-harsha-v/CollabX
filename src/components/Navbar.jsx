import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Bell, LogOut, FileText, ChevronDown, Sparkles, Lightbulb } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ContactRequestReviewModal from './ContactRequestReviewModal';
import PostDetailModal from './PostDetailModal';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    currentUser, 
    logoutUser, 
    notifications, 
    unreadCount, 
    markNotificationsAsRead,
    setFeedFilter,
    refreshPosts
  } = useApp();

  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Notification Modals
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [detailModalPostId, setDetailModalPostId] = useState(null);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotif = () => {
    if (!showNotifMenu) {
      markNotificationsAsRead();
    }
    setShowNotifMenu(!showNotifMenu);
    setShowProfileMenu(false);
  };

  const handleToggleProfile = () => {
    setShowProfileMenu(!showProfileMenu);
    setShowNotifMenu(false);
  };

  const handleMyPostsClick = () => {
    setFeedFilter('my_posts');
    setShowProfileMenu(false);
    if (location.pathname !== '/feed') {
      navigate('/feed');
    }
  };

  const handleMyIdeasClick = () => {
    setFeedFilter('my_ideas');
    setShowProfileMenu(false);
    if (location.pathname !== '/feed') {
      navigate('/feed');
    }
  };

  const handleNotifClick = (n) => {
    setShowNotifMenu(false);
    setSelectedNotif(n);

    if (n.type === 'contact_request') {
      setReviewModalOpen(true);
    } else if (n.type === 'contact_accepted' || n.type === 'post_live') {
      const pId = n.payload?.post_id || n.payload?.postId;
      if (pId) {
        setDetailModalPostId(pId);
      }
    }
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    logoutUser();
    navigate('/');
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ease-in-out ${
          isScrolled
            ? 'py-0 px-0 bg-[#060911]/95 backdrop-blur-2xl border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.8)]'
            : 'py-2.5 px-4 sm:px-8 bg-transparent'
        }`}
      >
        <div
          className={`max-w-7xl mx-auto flex items-center justify-between transition-all duration-500 ease-in-out ${
            isScrolled
              ? 'px-6 sm:px-10 py-2 rounded-none bg-transparent border-transparent shadow-none'
              : 'px-5 sm:px-6 py-2 rounded-full bg-[#0b1222]/80 backdrop-blur-xl border border-cyan-500/20 shadow-[0_10px_35px_rgba(0,0,0,0.5)]'
          }`}
        >
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-blue-600 p-[1.5px] shadow-lg shadow-cyan-500/25">
              <div className="w-full h-full bg-[#070d1a] rounded-[10px] flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300"
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
              <span className="font-['Outfit'] font-black text-lg sm:text-xl tracking-tight text-white flex items-center">
                Collab<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">X</span>
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-cyan-400/80 font-mono -mt-1 font-semibold">Civic Grid</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <Link to="/" className="hover:text-cyan-400 transition-all duration-300 border-b border-transparent hover:border-cyan-400/40 pb-0.5">The Mission</Link>
            <a href="#how-it-works" className="hover:text-cyan-400 transition-all duration-300 border-b border-transparent hover:border-cyan-400/40 pb-0.5">How It Works</a>
            <a href="#security" className="hover:text-cyan-400 transition-all duration-300 border-b border-transparent hover:border-cyan-400/40 pb-0.5">Security & Trust</a>
            {currentUser && (
              <Link
                to="/feed"
                onClick={() => setFeedFilter('all')}
                className="text-cyan-300 font-semibold flex items-center gap-1 hover:text-cyan-200 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> Live Feed
              </Link>
            )}
          </nav>

          {/* Right Section: Auth State dependent UI */}
          {currentUser ? (
            <div className="flex items-center gap-3">
              
              {/* Notification Bell Button */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={handleToggleNotif}
                  className="relative p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-slate-300" />
                  
                  {/* Unread Glowing Cyan/Teal Badge Dot */}
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                  )}
                </button>

                {/* Notification Dropdown Panel */}
                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 p-4 bg-[#0c1322]/95 border border-cyan-500/30 rounded-2xl backdrop-blur-2xl shadow-2xl z-50 text-xs">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                      <span className="font-bold text-white font-['Outfit'] text-sm">Notifications</span>
                      <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase">
                        {notifications.length} Total
                      </span>
                    </div>

                    {notifications.length > 0 ? (
                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-cyan-950/40 border border-slate-800/80 flex items-start gap-2.5 cursor-pointer transition-colors"
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${n.read ? 'bg-slate-600' : 'bg-cyan-400'}`} />
                            <div className="flex-1">
                              <p className="text-slate-200 font-medium leading-snug">
                                {n.message || n.payload?.message || 'New Notification'}
                              </p>
                              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                                {new Date(n.created_at || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400 font-mono">
                        No notifications yet
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Avatar & Dropdown Button */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={handleToggleProfile}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/30 text-white transition-all group"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-cyan-400/50 bg-slate-800 shrink-0">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`;
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate hidden sm:inline">
                    {currentUser.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </button>

                {/* Profile Glassmorphic Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 py-2 bg-[#0c1322]/95 border border-cyan-500/30 rounded-2xl backdrop-blur-2xl shadow-2xl z-50 text-xs">
                    <div className="px-3.5 py-2 border-b border-slate-800 mb-1">
                      <p className="font-bold text-white truncate">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{currentUser.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleMyPostsClick}
                      className="w-full px-3.5 py-2 text-left text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/50 flex items-center gap-2 transition-colors font-medium"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>My Posts</span>
                    </button>

                    {/* PHASE 6: My Ideas Section */}
                    <button
                      type="button"
                      onClick={handleMyIdeasClick}
                      className="w-full px-3.5 py-2 text-left text-slate-300 hover:text-teal-300 hover:bg-teal-950/50 flex items-center gap-2 transition-colors font-medium"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-teal-400" />
                      <span>My Ideas</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-3.5 py-2 text-left text-red-300 hover:text-red-200 hover:bg-red-950/40 flex items-center gap-2 transition-colors font-medium border-t border-slate-800/80 mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-400" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* Logged Out CTA Button - Navigates to /auth */
            <button
              onClick={() => navigate('/auth')}
              className="red-pill-button px-4 sm:px-6 py-2 text-xs sm:text-sm shadow-md"
            >
              <span>Join CollabX</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 hidden sm:inline" />
            </button>
          )}
        </div>
      </header>

      {/* Poster Contact Request Review Modal */}
      <ContactRequestReviewModal
        notification={selectedNotif}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onRefresh={refreshPosts}
      />

      {/* Unlocked Detail View Modal */}
      <PostDetailModal
        postId={detailModalPostId}
        isOpen={!!detailModalPostId}
        onClose={() => setDetailModalPostId(null)}
      />
    </>
  );
};

export default Navbar;
