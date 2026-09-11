import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Sparkles, ArrowLeft, Layers, Lightbulb, MessageSquare } from 'lucide-react';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import ChatRoomModal from '../components/ChatRoomModal';
import { 
  getAllPosts, 
  getPostsByUser, 
  getMyIdeas, 
  softDeletePost, 
  completePost, 
  updatePostProgress 
} from '../lib/storage';
import { useApp } from '../context/AppContext';

const FeedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useApp();

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeChatPost, setActiveChatPost] = useState(null); // { id, title }

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
  }, [loadFeedData]);

  const handleOpenCreate = () => setIsCreateOpen(true);
  const handleCloseCreate = () => {
    setIsCreateOpen(false);
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
    <div className="min-h-screen bg-[#502D55] text-[#F8F4E9] selection:bg-[#935073]/30 selection:text-[#F8F4E9] cyber-grid relative">
      {/* Background ambient lighting */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#935073]/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[600px] h-[400px] bg-[#935073]/25 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Navigation */}
      <Navbar />

      {/* Main Feed Container */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-32">
        
        {/* Feed Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#935073]/30 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#935073]/80 border border-[#935073]/40 text-[#F6DBC0] text-xs font-mono uppercase tracking-wider mb-3 shadow-md backdrop-blur-md">
              {isMyIdeas ? (
                <Lightbulb className="w-3.5 h-3.5 text-[#F6DBC0]" />
              ) : isMyPosts ? (
                <Layers className="w-3.5 h-3.5 text-[#F6DBC0]" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#F6DBC0]" />
              )}
              <span>{isMyIdeas ? 'Accepted Solutions' : isMyPosts ? 'Author Dashboard' : 'Verified Challenge Feed'}</span>
            </div>

            <h1 className="font-['Outfit'] font-extrabold text-3xl sm:text-4xl text-[#F8F4E9] tracking-tight flex items-center gap-3">
              {getHeaderTitle()}
            </h1>
            
            <p className="text-sm text-[#F6DBC0] mt-1 max-w-xl">
              {getHeaderSubtext()}
            </p>
          </div>

          {/* Back to All Posts Button */}
          {isFiltered && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/feed')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#935073] hover:bg-[#244b78] border border-[#935073]/40 text-[#F6DBC0] hover:text-[#F8F4E9] text-xs font-semibold transition-all shadow-md"
              >
                <ArrowLeft className="w-4 h-4 text-[#F6DBC0]" />
                <span>Back to Live Feed</span>
              </button>
            </div>
          )}
        </div>

        {/* Posts List or Centered Empty State */}
        {loadingPosts ? (
          <div className="py-20 text-center text-[#F6DBC0] font-mono text-xs flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F6DBC0] animate-ping" />
            <span>Loading challenge records...</span>
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
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
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#935073] hover:bg-[#244b78] border border-[#935073]/40 text-[#F8F4E9] text-xs font-bold transition-all shadow-md"
                    >
                      <MessageSquare className="w-4 h-4 text-[#F6DBC0]" />
                      <span>Open Realtime Chat Room</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 px-6 rounded-3xl bg-[#935073]/80 border border-[#935073]/30 text-center backdrop-blur-xl flex flex-col items-center justify-center my-8 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#935073]/20 border border-[#935073]/40 flex items-center justify-center text-[#F6DBC0] mb-4">
              {isMyIdeas ? (
                <Lightbulb className="w-8 h-8 text-[#F6DBC0]" />
              ) : (
                <Layers className="w-8 h-8 text-[#F6DBC0]" />
              )}
            </div>

            <h3 className="font-['Outfit'] font-bold text-xl text-[#F8F4E9] mb-2">
              {isMyPosts
                ? "You Haven't Posted Any Challenges Yet"
                : isMyIdeas
                ? 'No Accepted Ideas Yet'
                : 'No Posts Yet'}
            </h3>

            <p className="text-sm text-[#F6DBC0] max-w-md mx-auto mb-6 leading-relaxed">
              {isMyPosts
                ? 'When you post a challenge brief, it will appear here for progress tracking and management.'
                : isMyIdeas
                ? 'When a poster accepts your contact request, the project will appear here with unlocked details and chat.'
                : 'Be the first to post a challenge and connect with verified solvers.'}
            </p>

            {isFiltered ? (
              <button
                type="button"
                onClick={() => navigate('/feed')}
                className="px-5 py-2.5 rounded-full bg-[#502D55] hover:bg-[#935073] text-xs font-semibold text-[#F6DBC0] border border-[#935073]/40 transition-colors"
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
