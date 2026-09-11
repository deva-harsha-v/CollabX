import React, { useState } from 'react';
import { Plus, Sparkles, ArrowLeft, Layers, Lightbulb, MessageSquare } from 'lucide-react';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import ChatRoomModal from '../components/ChatRoomModal';
import { softDeletePost, completePost, updatePostProgress } from '../lib/storage';
import { useApp } from '../context/AppContext';

const FeedPage = () => {
  const { posts, feedFilter, setFeedFilter, refreshPosts } = useApp();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeChatPost, setActiveChatPost] = useState(null); // { id, title }

  const handleOpenCreate = () => setIsCreateOpen(true);
  const handleCloseCreate = () => setIsCreateOpen(false);

  const handleDeletePost = async (postId) => {
    await softDeletePost(postId);
    refreshPosts();
  };

  const handleCompletePost = async (postId) => {
    await completePost(postId);
    refreshPosts();
  };

  const handleProgressUpdate = async (postId, percentage) => {
    await updatePostProgress(postId, percentage);
    // No full refresh needed — PostCard manages local state optimistically
  };

  const isFiltered = feedFilter === 'my_posts' || feedFilter === 'my_ideas';

  const getHeaderTitle = () => {
    if (feedFilter === 'my_posts') return 'Your Posted Challenges';
    if (feedFilter === 'my_ideas') return 'Your Accepted Ideas & Collaborations';
    return 'Live Open Challenges';
  };

  const getHeaderSubtext = () => {
    if (feedFilter === 'my_posts') return 'Manage your posted challenges, mark completions, or launch project chat rooms.';
    if (feedFilter === 'my_ideas') return 'Challenge briefs where your contact request was accepted by the poster.';
    return 'Real community challenges meeting verified research solvers.';
  };

  return (
    <div className="min-h-screen bg-[#0A1931] text-[#F6FAFD] selection:bg-[#4A7FA7]/30 selection:text-[#F6FAFD] cyber-grid relative">
      {/* Background ambient lighting */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#4A7FA7]/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[600px] h-[400px] bg-[#1A3D63]/25 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Navigation */}
      <Navbar />

      {/* Main Feed Container */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-32">
        
        {/* Feed Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#4A7FA7]/30 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1A3D63]/80 border border-[#4A7FA7]/40 text-[#B3CFE5] text-xs font-mono uppercase tracking-wider mb-3 shadow-md backdrop-blur-md">
              {feedFilter === 'my_ideas' ? (
                <Lightbulb className="w-3.5 h-3.5 text-[#B3CFE5]" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#B3CFE5]" />
              )}
              <span>{feedFilter === 'my_ideas' ? 'Accepted Solutions' : 'Verified Challenge Feed'}</span>
            </div>

            <h1 className="font-['Outfit'] font-extrabold text-3xl sm:text-4xl text-[#F6FAFD] tracking-tight flex items-center gap-3">
              {getHeaderTitle()}
            </h1>
            
            <p className="text-sm text-[#B3CFE5] mt-1 max-w-xl">
              {getHeaderSubtext()}
            </p>
          </div>

          {/* Back to All Posts Button */}
          {isFiltered && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFeedFilter('all')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A3D63] hover:bg-[#244b78] border border-[#4A7FA7]/40 text-[#B3CFE5] hover:text-[#F6FAFD] text-xs font-semibold transition-all shadow-md"
              >
                <ArrowLeft className="w-4 h-4 text-[#B3CFE5]" />
                <span>Back to All Posts</span>
              </button>
            </div>
          )}
        </div>

        {/* Posts List or Centered Empty State */}
        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="relative group">
                <PostCard
                  post={post}
                  isAuthorView={feedFilter === 'my_posts'}
                  onDelete={handleDeletePost}
                  onComplete={handleCompletePost}
                  onProgressChange={feedFilter === 'my_posts' ? handleProgressUpdate : undefined}
                />

                {/* Chat Room Launcher Button in My Posts / My Ideas */}
                {isFiltered && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveChatPost({ id: post.id, title: post.title })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A3D63] hover:bg-[#244b78] border border-[#4A7FA7]/40 text-[#F6FAFD] text-xs font-bold transition-all shadow-md"
                    >
                      <MessageSquare className="w-4 h-4 text-[#B3CFE5]" />
                      <span>Open Realtime Chat Room</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 px-6 rounded-3xl bg-[#1A3D63]/80 border border-[#4A7FA7]/30 text-center backdrop-blur-xl flex flex-col items-center justify-center my-8 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#4A7FA7]/20 border border-[#4A7FA7]/40 flex items-center justify-center text-[#B3CFE5] mb-4">
              {feedFilter === 'my_ideas' ? (
                <Lightbulb className="w-8 h-8 text-[#B3CFE5]" />
              ) : (
                <Layers className="w-8 h-8 text-[#B3CFE5]" />
              )}
            </div>

            <h3 className="font-['Outfit'] font-bold text-xl text-[#F6FAFD] mb-2">
              {feedFilter === 'my_posts'
                ? "You Haven't Posted Any Challenges Yet"
                : feedFilter === 'my_ideas'
                ? 'No Accepted Ideas Yet'
                : 'No Posts Yet'}
            </h3>

            <p className="text-sm text-[#B3CFE5] max-w-md mx-auto mb-6 leading-relaxed">
              {feedFilter === 'my_posts'
                ? 'When you post a challenge brief, it will appear here for management.'
                : feedFilter === 'my_ideas'
                ? 'When a poster accepts your contact request, the project will appear here with unlocked details and chat.'
                : 'Be the first to post a challenge and connect with verified solvers.'}
            </p>

            {isFiltered ? (
              <button
                type="button"
                onClick={() => setFeedFilter('all')}
                className="px-5 py-2.5 rounded-full bg-[#0A1931] hover:bg-[#1A3D63] text-xs font-semibold text-[#B3CFE5] border border-[#4A7FA7]/40 transition-colors"
              >
                View Public Live Feed
              </button>
            ) : (
              <button
                onClick={handleOpenCreate}
                className="red-pill-button px-6 py-3 text-sm font-bold"
              >
                <Plus className="w-4 h-4 ml-0 mr-2 inline" />
                <span>Post a Civic Challenge</span>
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
