import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Bell, LogOut, FileText, ChevronDown, Sparkles, Lightbulb, Menu, X as CloseIcon } from 'lucide-react';
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
  const [showMobileNav, setShowMobileNav] = useState(false);

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
            ? 'py-0 px-0 bg-[#221226]/95 backdrop-blur-2xl border-b border-[#935073]/30 shadow-[0_4px_30px_rgba(0,0,0,0.8)]'
            : 'py-2.5 px-4 sm:px-8 bg-transparent'
        }`}
      >
        <div
          className={`max-w-7xl mx-auto flex items-center justify-between transition-all duration-500 ease-in-out ${
            isScrolled
              ? 'px-6 sm:px-10 py-2 rounded-none bg-transparent border-transparent shadow-none'
              : 'px-5 sm:px-6 py-2 rounded-full bg-[#3a1e3e]/85 backdrop-blur-xl border border-[#F6DBC0]/20 shadow-[0_10px_35px_rgba(0,0,0,0.5)]'
          }`}
        >
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#935073] via-[#F6DBC0] to-[#502D55] p-[1.5px] shadow-lg shadow-[#935073]/25">
              <div className="w-full h-full bg-[#221226] rounded-[10px] flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-[#F6DBC0] group-hover:rotate-12 transition-transform duration-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                  <circle cx="12" cy="12" r="2.5" fill="#F6DBC0" />
                  <circle cx="6" cy="6" r="1.5" fill="#935073" />
                  <circle cx="18" cy="6" r="1.5" fill="#F6DBC0" />
                  <circle cx="6" cy="18" r="1.5" fill="#F6DBC0" />
                  <circle cx="18" cy="18" r="1.5" fill="#935073" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-['Outfit'] font-black text-lg sm:text-xl tracking-tight text-[#F8F4E9] flex items-center">
                Collab<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F6DBC0] to-[#935073]">X</span>
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#F6DBC0]/80 font-mono -mt-1 font-semibold">Civic Grid</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#F8F4E9]/80">
            <Link to="/" className="hover:text-[#F6DBC0] transition-all duration-300 border-b border-transparent hover:border-[#F6DBC0]/40 pb-0.5">The Mission</Link>
            <a href="#how-it-works" className="hover:text-[#F6DBC0] transition-all duration-300 border-b border-transparent hover:border-[#F6DBC0]/40 pb-0.5">How It Works</a>
            <a href="#security" className="hover:text-[#F6DBC0] transition-all duration-300 border-b border-transparent hover:border-[#F6DBC0]/40 pb-0.5">Security & Trust</a>
            {currentUser && (
              <Link
                to="/feed"
                onClick={() => setFeedFilter('all')}
                className="text-[#F6DBC0] font-semibold flex items-center gap-1 hover:text-[#F8F4E9] transition-colors"
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
                  className="relative p-2 rounded-xl bg-[#3a1e3e]/80 hover:bg-[#502D55] border border-[#935073]/30 text-[#F8F4E9] hover:text-[#F6DBC0] transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-[#F8F4E9]/80" />
                  
                  {/* Unread Glowing Mauve/Peach Badge Dot */}
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#F6DBC0] shadow-[0_0_8px_#F6DBC0] animate-pulse" />
                  )}
                </button>

                {/* Notification Dropdown Panel */}
                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 p-4 bg-[#221226]/95 border border-[#935073]/40 rounded-2xl backdrop-blur-2xl shadow-2xl z-50 text-xs">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#935073]/30">
                      <span className="font-bold text-[#F8F4E9] font-['Outfit'] text-sm">Notifications</span>
                      <span className="text-[10px] font-mono text-[#F6DBC0] font-semibold uppercase">
                        {notifications.length} Total
                      </span>
                    </div>

                    {notifications.length > 0 ? (
                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className="p-2.5 rounded-xl bg-[#3a1e3e]/60 hover:bg-[#502D55]/80 border border-[#935073]/30 flex items-start gap-2.5 cursor-pointer transition-colors"
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${n.read ? 'bg-[#935073]/40' : 'bg-[#F6DBC0]'}`} />
                            <div className="flex-1">
                              <p className="text-[#F8F4E9] font-medium leading-snug">
                                {n.message || n.payload?.message || 'New Notification'}
                              </p>
                              <span className="text-[10px] text-[#F8F4E9]/50 font-mono mt-1 block">
                                {new Date(n.created_at || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-[#F8F4E9]/60 font-mono">
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
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-[#3a1e3e]/80 hover:bg-[#502D55] border border-[#935073]/30 text-[#F8F4E9] transition-all group"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-[#F6DBC0]/40 bg-[#221226] shrink-0">
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
                  <span className="text-xs font-semibold text-[#F8F4E9] max-w-[100px] truncate hidden sm:inline">
                    {currentUser.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#F8F4E9]/60 group-hover:text-[#F6DBC0] transition-colors" />
                </button>

                {/* Profile Glassmorphic Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 py-2 bg-[#221226]/95 border border-[#935073]/40 rounded-2xl backdrop-blur-2xl shadow-2xl z-50 text-xs">
                    <div className="px-3.5 py-2 border-b border-[#935073]/30 mb-1">
                      <p className="font-bold text-[#F8F4E9] truncate">{currentUser.name}</p>
                      <p className="text-[10px] text-[#F8F4E9]/60 font-mono truncate">{currentUser.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleMyPostsClick}
                      className="w-full px-3.5 py-2 text-left text-[#F8F4E9]/80 hover:text-[#F6DBC0] hover:bg-[#502D55]/60 flex items-center gap-2 transition-colors font-medium"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#F6DBC0]" />
                      <span>My Posts</span>
                    </button>

                    {/* PHASE 6: My Ideas Section */}
                    <button
                      type="button"
                      onClick={handleMyIdeasClick}
                      className="w-full px-3.5 py-2 text-left text-[#F8F4E9]/80 hover:text-[#F6DBC0] hover:bg-[#502D55]/60 flex items-center gap-2 transition-colors font-medium"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-[#935073]" />
                      <span>My Ideas</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-3.5 py-2 text-left text-red-300 hover:text-red-200 hover:bg-red-950/40 flex items-center gap-2 transition-colors font-medium border-t border-[#935073]/30 mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-400" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Logged Out CTA Button */
            <button
              onClick={() => navigate('/auth')}
              className="red-pill-button px-4 sm:px-6 py-2 text-xs sm:text-sm shadow-md"
            >
              <span>Join CollabX</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 hidden sm:inline" />
            </button>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="md:hidden p-2 rounded-xl bg-[#3a1e3e]/80 hover:bg-[#502D55] border border-[#935073]/30 text-[#F8F4E9] hover:text-[#F6DBC0] transition-colors"
            aria-label="Toggle mobile menu"
          >
            {showMobileNav ? <CloseIcon className="w-5 h-5 text-[#F6DBC0]" /> : <Menu className="w-5 h-5 text-[#F8F4E9]" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {showMobileNav && (
          <div className="md:hidden mx-4 mt-2 p-4 bg-[#221226]/95 border border-[#935073]/40 rounded-2xl backdrop-blur-2xl shadow-2xl flex flex-col gap-3 text-sm text-[#F8F4E9] animate-fade-in">
            <Link 
              to="/" 
              onClick={() => setShowMobileNav(false)}
              className="py-2 px-3 rounded-lg hover:bg-[#502D55]/60 hover:text-[#F6DBC0] transition-colors"
            >
              The Mission
            </Link>
            <a 
              href="#how-it-works" 
              onClick={() => setShowMobileNav(false)}
              className="py-2 px-3 rounded-lg hover:bg-[#502D55]/60 hover:text-[#F6DBC0] transition-colors"
            >
              How It Works
            </a>
            <a 
              href="#security" 
              onClick={() => setShowMobileNav(false)}
              className="py-2 px-3 rounded-lg hover:bg-[#502D55]/60 hover:text-[#F6DBC0] transition-colors"
            >
              Security & Trust
            </a>
            {currentUser && (
              <Link
                to="/feed"
                onClick={() => { setFeedFilter('all'); setShowMobileNav(false); }}
                className="py-2 px-3 rounded-lg text-[#F6DBC0] font-semibold bg-[#502D55]/60 border border-[#935073]/40 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#F6DBC0]" /> Live Feed
              </Link>
            )}
          </div>
        )}
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
