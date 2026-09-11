import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Sparkles, ArrowLeft, Layers, Lightbulb, MessageSquare, Filter, Search, X, Tag, SlidersHorizontal, RotateCcw, AlertCircle, Lock } from 'lucide-react';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import ChatRoomModal from '../components/ChatRoomModal';
import { AVAILABLE_ROLES } from '../data/rolesData';
import { 
  getAllPosts, 
  getPostsByUser, 
  getMyIdeas, 
  softDeletePost, 
  completePost, 
  updatePostProgress 
} from '../lib/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';

const FeedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useApp();

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeChatPost, setActiveChatPost] = useState(null); // { id, title }

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [progressFilter, setProgressFilter] = useState('all'); // 'all' | 'lt25' | '25to50' | '50to75' | 'gt75' | 'completed'
  const [eligibilityFilter, setEligibilityFilter] = useState('all'); // 'all' | 'organisation_only' | 'public_open'

  const isMyPosts = location.pathname === '/my-posts';
  const isMyIdeas = location.pathname === '/my-ideas';
  const isFiltered = isMyPosts || isMyIdeas;

  const loadFeedData = useCallback(async () => {
    setLoadingPosts(true);
    if (isMyPosts && currentUser?.id) {
      const { data } = await getPostsByUser(currentUser.id);
      setPosts(data || []);
    } else if (isMyIdeas && currentUser?.id) {
      const { data } = await getMyIdeas();
      setPosts(data || []);
    } else {
      const { data } = await getAllPosts();
      setPosts(data || []);
    }
    setLoadingPosts(false);
  }, [isMyPosts, isMyIdeas, currentUser]);

  useEffect(() => {
    loadFeedData();

    const handleFeedUpdate = () => {
      loadFeedData();
    };
    window.addEventListener('collabx_posts_update', handleFeedUpdate);
    window.addEventListener('storage', handleFeedUpdate);

    let channel = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel('collabx_live_feed')
        .on('broadcast', { event: 'new_post' }, () => {
          loadFeedData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          loadFeedData();
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('collabx_posts_update', handleFeedUpdate);
      window.removeEventListener('storage', handleFeedUpdate);
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadFeedData]);

  const hasAutoOpenedRef = useRef(false);
  const [showSetupRequiredModal, setShowSetupRequiredModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isEmergencyAction = params.get('action') === 'emergency_post';
    const isPendingFirstPost = Boolean(
      currentUser?.is_emergency && 
      currentUser?.emergency_first_post_pending && 
      !currentUser?.has_made_emergency_post
    );

    if ((isEmergencyAction || isPendingFirstPost) && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      setIsCreateOpen(true);
      if (isEmergencyAction) {
        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.search, location.pathname, currentUser, navigate]);

  const handleOpenCreate = () => {
    if (currentUser?.is_emergency && currentUser?.has_made_emergency_post && !currentUser?.has_password) {
      setShowSetupRequiredModal(true);
      return;
    }
    setIsCreateOpen(true);
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    if (location.search.includes('action=emergency_post')) {
      navigate(location.pathname, { replace: true });
    }
    loadFeedData();
  };

  const handleDeletePost = async (postId) => {
    await softDeletePost(postId);
    loadFeedData();
  };

  const handleCompletePost = async (postId) => {
    await completePost(postId);
    loadFeedData();
  };

  const handleProgressUpdate = async (postId, percentage) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, progress: percentage } : p));
    await updatePostProgress(postId, percentage);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedRoleFilter('');
    setProgressFilter('all');
    setEligibilityFilter('all');
  };

  const isAnyFilterActive = searchQuery.trim() !== '' || selectedRoleFilter !== '' || progressFilter !== 'all' || eligibilityFilter !== 'all';

  // Extract unique roles present in loaded posts + popular roles
  const activePostRoles = useMemo(() => {
    const set = new Set();
    posts.forEach(p => {
      if (Array.isArray(p.skills)) {
        p.skills.forEach(s => set.add(s));
      }
    });
    return Array.from(set).sort();
  }, [posts]);

  // Combined Real-time Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (post.title || '').toLowerCase().includes(q);
        const matchDesc = (post.description || '').toLowerCase().includes(q);
        const matchOrg = (post.organization || '').toLowerCase().includes(q);
        const matchSkills = (post.skills || []).some(s => s.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchOrg && !matchSkills) return false;
      }

      // 2. Role Filter
      if (selectedRoleFilter) {
        const skills = Array.isArray(post.skills) ? post.skills : [];
        const hasRole = skills.some(s => s.toLowerCase() === selectedRoleFilter.toLowerCase());
        if (!hasRole) return false;
      }

      // 3. Progress Filter
      const prog = post.progress ?? 0;
      if (progressFilter === 'lt25' && prog >= 25) return false;
      if (progressFilter === '25to50' && (prog < 25 || prog > 50)) return false;
      if (progressFilter === '50to75' && (prog < 50 || prog > 75)) return false;
      if (progressFilter === 'gt75' && prog < 75) return false;
      if (progressFilter === 'completed' && prog < 100) return false;

      // 4. Eligibility Filter
      const req = post.solver_requirement || post.solverRequirement || 'organisation_only';
      if (eligibilityFilter === 'organisation_only' && req !== 'organisation_only') return false;
      if (eligibilityFilter === 'public_open' && req !== 'public_open') return false;

      return true;
    });
  }, [posts, searchQuery, selectedRoleFilter, progressFilter, eligibilityFilter]);

  const getHeaderTitle = () => {
    if (isMyPosts) return 'Your Posted Challenges';
    if (isMyIdeas) return 'Your Accepted Ideas & Collaborations';
    return 'Live Open Challenges';
  };

  const getHeaderSubtext = () => {
    if (isMyPosts) return 'Manage your posted challenges, update resolution progress, and launch collaboration chat rooms.';
    if (isMyIdeas) return 'Challenge briefs where your solver proposal was accepted by the problem author.';
    return 'Real community & technical challenges meeting verified solvers.';
  };

  return (
    <div className="min-h-screen bg-[#06142e] text-[#f0f9ff] selection:bg-[#0b2240]/30 selection:text-[#f0f9ff] cyber-grid relative">
      {/* Background ambient lighting */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#0ea5e9]/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[600px] h-[400px] bg-[#38bdf8]/20 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Navigation */}
      <Navbar />

      {/* Main Feed Container */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-32">
        
        {/* Feed Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#0ea5e9]/30 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0b2240]/80 border border-[#0ea5e9]/35 text-[#38bdf8] text-xs font-mono uppercase tracking-wider mb-3 shadow-md backdrop-blur-md">
              {isMyIdeas ? (
                <Lightbulb className="w-3.5 h-3.5 text-[#38bdf8]" />
              ) : isMyPosts ? (
                <Layers className="w-3.5 h-3.5 text-[#38bdf8]" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
              )}
              <span>{isMyIdeas ? 'Accepted Solutions' : isMyPosts ? 'Author Dashboard' : 'Verified Challenge Feed'}</span>
            </div>

            <h1 className="font-['Outfit'] font-extrabold text-3xl sm:text-4xl text-[#f0f9ff] tracking-tight flex items-center gap-3">
              {getHeaderTitle()}
            </h1>
            
            <p className="text-sm text-[#38bdf8] mt-1 max-w-xl">
              {getHeaderSubtext()}
            </p>
          </div>

          {/* Back to All Posts Button */}
          {isFiltered && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/feed')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0b2240] hover:bg-[#143d6e] border border-[#0ea5e9]/35 text-[#38bdf8] hover:text-[#f0f9ff] text-xs font-semibold transition-all shadow-md"
              >
                <ArrowLeft className="w-4 h-4 text-[#38bdf8]" />
                <span>Back to Live Feed</span>
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Live Filter Controls */}
        {!isFiltered && (
          <div className="mb-6 p-4 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/35 backdrop-blur-xl shadow-lg space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search by Keywords */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
                <input
                  type="text"
                  placeholder="Search challenges by title, description, or organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-[#38bdf8] transition-colors font-mono"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#38bdf8]/60 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                {/* Role / Skill Filter */}
                <div className="relative min-w-[170px] flex-1 sm:flex-initial">
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] focus:outline-none focus:border-[#38bdf8] font-mono cursor-pointer"
                  >
                    <option value="" className="bg-[#06142e] text-[#f0f9ff]">All Roles / Skills</option>
                    {/* First list roles present in active posts */}
                    {activePostRoles.length > 0 && (
                      <optgroup label="Active in Feed" className="bg-[#06142e] text-[#38bdf8] font-bold">
                        {activePostRoles.map(r => (
                          <option key={`active_${r}`} value={r} className="bg-[#06142e] text-[#f0f9ff]">
                            {r}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="All Roles Directory" className="bg-[#06142e] text-[#38bdf8] font-bold">
                      {AVAILABLE_ROLES.filter(r => !activePostRoles.includes(r)).map(r => (
                        <option key={`all_${r}`} value={r} className="bg-[#06142e] text-[#f0f9ff]">
                          {r}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Solver Eligibility Filter */}
                <div className="relative min-w-[170px] flex-1 sm:flex-initial">
                  <select
                    value={eligibilityFilter}
                    onChange={(e) => setEligibilityFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] focus:outline-none focus:border-[#38bdf8] font-mono cursor-pointer"
                  >
                    <option value="all" className="bg-[#06142e]">All Eligibility</option>
                    <option value="organisation_only" className="bg-[#06142e]">🏢 Org Members Only</option>
                    <option value="public_open" className="bg-[#06142e]">👥 Open to Public</option>
                  </select>
                </div>

                {/* Progress Percentage Filter */}
                <div className="relative min-w-[150px] flex-1 sm:flex-initial">
                  <select
                    value={progressFilter}
                    onChange={(e) => setProgressFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#06142e]/80 border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] focus:outline-none focus:border-[#38bdf8] font-mono cursor-pointer"
                  >
                    <option value="all" className="bg-[#06142e]">All Progress</option>
                    <option value="lt25" className="bg-[#06142e]">Under 25% (Just Started)</option>
                    <option value="25to50" className="bg-[#06142e]">25% - 50% (In Progress)</option>
                    <option value="50to75" className="bg-[#06142e]">50% - 75% (Advancing)</option>
                    <option value="gt75" className="bg-[#06142e]">75%+ (Near Completion)</option>
                    <option value="completed" className="bg-[#06142e]">100% (Completed)</option>
                  </select>
                </div>

                {/* Reset Filters CTA */}
                {isAnyFilterActive && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="p-2.5 rounded-xl bg-red-950/80 hover:bg-red-900/80 border border-red-500/40 text-red-300 hover:text-red-200 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                    title="Reset All Filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Pill Bar & Results Count */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#0ea5e9]/25 text-xs font-mono">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[#38bdf8]/60 text-[11px]">Filtered by:</span>
                {selectedRoleFilter ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#06142e] border border-red-500/50 text-red-300 text-[11px]">
                    <span>Role: {selectedRoleFilter}</span>
                    <button type="button" onClick={() => setSelectedRoleFilter('')} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : (
                  <span className="text-[#f0f9ff]/80 text-[11px]">Any Role</span>
                )}
                {eligibilityFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#06142e] border border-[#0ea5e9]/50 text-[#38bdf8] text-[11px]">
                    <span>
                      {eligibilityFilter === 'organisation_only' ? '🏢 Org Members Only' : '👥 Open to Public'}
                    </span>
                    <button type="button" onClick={() => setEligibilityFilter('all')} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {progressFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#06142e] border border-red-500/50 text-red-300 text-[11px]">
                    <span>
                      Progress: {
                        progressFilter === 'lt25' ? '< 25%' :
                        progressFilter === '25to50' ? '25% - 50%' :
                        progressFilter === '50to75' ? '50% - 75%' :
                        progressFilter === 'gt75' ? '75%+' : '100%'
                      }
                    </span>
                    <button type="button" onClick={() => setProgressFilter('all')} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <span className="text-[#38bdf8]/70 text-[11px]">
                Showing {filteredPosts.length} of {posts.length} challenges
              </span>
            </div>
          </div>
        )}

        {/* Posts List or Centered Empty State */}
        {loadingPosts ? (
          <div className="py-20 text-center text-[#38bdf8] font-mono text-xs flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-ping" />
            <span>Loading challenge records...</span>
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div key={post.id} className="relative group">
                <PostCard
                  post={post}
                  isAuthorView={isMyPosts || (currentUser?.id && currentUser.id === (post.author_id || post.authorId))}
                  onDelete={handleDeletePost}
                  onComplete={handleCompletePost}
                  onProgressChange={handleProgressUpdate}
                />

                {/* Chat Room Launcher Button in My Posts / My Ideas */}
                {isFiltered && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveChatPost({ id: post.id, title: post.title })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0b2240] hover:bg-[#143d6e] border border-[#0ea5e9]/35 text-[#f0f9ff] text-xs font-bold transition-all shadow-md"
                    >
                      <MessageSquare className="w-4 h-4 text-[#38bdf8]" />
                      <span>Open Realtime Chat Room</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 px-6 rounded-3xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 text-center backdrop-blur-xl flex flex-col items-center justify-center my-8 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#0b2240]/20 border border-[#0ea5e9]/35 flex items-center justify-center text-[#38bdf8] mb-4">
              {isMyIdeas ? (
                <Lightbulb className="w-8 h-8 text-[#38bdf8]" />
              ) : (
                <Layers className="w-8 h-8 text-[#38bdf8]" />
              )}
            </div>

            <h3 className="font-['Outfit'] font-bold text-xl text-[#f0f9ff] mb-2">
              {isAnyFilterActive
                ? 'No Challenges Match Your Filter Criteria'
                : isMyPosts
                ? "You Haven't Posted Any Challenges Yet"
                : isMyIdeas
                ? 'No Accepted Ideas Yet'
                : 'No Posts Yet'}
            </h3>

            <p className="text-sm text-[#38bdf8] max-w-md mx-auto mb-6 leading-relaxed">
              {isAnyFilterActive
                ? 'Try adjusting your role or progress filters to see more challenges.'
                : isMyPosts
                ? 'When you post a challenge brief, it will appear here for progress tracking and management.'
                : isMyIdeas
                ? 'When a poster accepts your contact request, the project will appear here with unlocked details and chat.'
                : 'Be the first to post a challenge and connect with verified solvers.'}
            </p>

            {isAnyFilterActive ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-5 py-2.5 rounded-full bg-[#06142e] hover:bg-[#0b2240] text-xs font-semibold text-[#38bdf8] border border-[#0ea5e9]/35 transition-colors"
              >
                Clear All Filters
              </button>
            ) : isFiltered ? (
              <button
                type="button"
                onClick={() => navigate('/feed')}
                className="px-5 py-2.5 rounded-full bg-[#06142e] hover:bg-[#0b2240] text-xs font-semibold text-[#38bdf8] border border-[#0ea5e9]/35 transition-colors"
              >
                View Public Live Feed
              </button>
            ) : (
              <button
                onClick={handleOpenCreate}
                className="red-pill-button px-6 py-3 text-sm font-bold"
              >
                <Plus className="w-4 h-4 ml-0 mr-2 inline" />
                <span>Post a Challenge</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Fixed Floating Red Pill "Post" Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          onClick={handleOpenCreate}
          className="red-pill-button px-6 py-4 text-base font-bold shadow-[0_10px_35px_rgba(239,68,68,0.5)] flex items-center gap-2"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Post</span>
        </button>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal isOpen={isCreateOpen} onClose={handleCloseCreate} />

      {/* Account Setup Required Modal (If emergency post already exhausted and password not set) */}
      {showSetupRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg p-6 sm:p-8 bg-[#0b2240]/95 border-2 border-amber-500/50 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.3)] text-[#f0f9ff] backdrop-blur-2xl space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-['Outfit'] text-[#f0f9ff]">
                  Emergency Post Limit (1) Reached
                </h3>
                <p className="text-xs text-amber-300 font-mono">
                  Setup Account Details to Post Regular Challenges
                </p>
              </div>
            </div>

            <p className="text-xs text-[#38bdf8] leading-relaxed">
              Your emergency fast-track registration included <strong>exactly 1 emergency crisis challenge</strong>, which is currently live and pinned to the feed.
            </p>

            <div className="p-3.5 rounded-2xl bg-[#06142e]/90 border border-amber-500/30 text-xs text-amber-100/90 space-y-2 font-mono">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓ 1st Challenge:</span>
                <span>Emergency post completed & pinned to feed.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">ℹ 2nd Challenge:</span>
                <span>Must be posted as a standard regular challenge.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">🔒 Action Needed:</span>
                <span>Set your password in Account Settings to unlock regular posting.</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSetupRequiredModal(false);
                  navigate('/account');
                }}
                className="w-full sm:flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs tracking-wide shadow-lg transition-all"
              >
                Go to Account Settings
              </button>
              <button
                type="button"
                onClick={() => setShowSetupRequiredModal(false)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#f0f9ff]/70 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Realtime Chat Room Modal */}
      <ChatRoomModal
        postId={activeChatPost?.id}
        postTitle={activeChatPost?.title}
        isOpen={!!activeChatPost}
        onClose={() => setActiveChatPost(null)}
      />
    </div>
  );
};

export default FeedPage;
