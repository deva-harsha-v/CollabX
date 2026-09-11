import React, { useState, useEffect } from 'react';
import { Eye, Tag, Calendar, UserCheck, Trash2, CheckCircle2 } from 'lucide-react';
import PostDetailModal from './PostDetailModal';

const PostCard = ({ post, isAuthorView, onDelete, onComplete, onProgressChange }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [localProgress, setLocalProgress] = useState(post?.progress ?? 0);

  if (!post) return null;

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  // Truncate description to ~100 characters with ellipsis
  const truncatedDesc = post.description
    ? (post.description.length > 105 ? `${post.description.substring(0, 100)}...` : post.description)
    : '';

  const mediaUrl = post.media_url || post.media;

  useEffect(() => {
    setLocalProgress(post?.progress ?? 0);
  }, [post?.progress]);

  const handleProgressChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setLocalProgress(val);
    if (onProgressChange) onProgressChange(post.id, val);
  };

  const handlePresetClick = (preset) => {
    setLocalProgress(preset);
    if (onProgressChange) onProgressChange(post.id, preset);
  };

  const getProgressStage = (pct) => {
    if (pct >= 100) return { label: 'Resolved & Completed', color: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/60' };
    if (pct >= 75) return { label: 'Testing & Review', color: 'text-[#B3CFE5] border-[#4A7FA7]/60 bg-[#0A1931]/80' };
    if (pct >= 50) return { label: 'Solution in Progress', color: 'text-[#B3CFE5] border-[#4A7FA7]/60 bg-[#0A1931]/80' };
    if (pct >= 25) return { label: 'Active Collaboration', color: 'text-[#B3CFE5] border-[#4A7FA7]/60 bg-[#0A1931]/80' };
    return { label: 'Open for Collaboration', color: 'text-[#B3CFE5]/80 border-[#4A7FA7]/40 bg-[#0A1931]/60' };
  };

  const currentStage = getProgressStage(localProgress);

  return (
    <>
      {/* Compact Horizontal Bar View */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#1A3D63]/85 border border-[#4A7FA7]/40 hover:border-[#4A7FA7]/80 transition-all duration-300 backdrop-blur-xl shadow-xl group">
        <div className="flex items-center justify-between gap-4">

          {/* Left Column: Post Content Snippet */}
          <div className="flex-1 min-w-0 text-left">

            {/* Header Strip: Author, Date, Status Tag */}
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <span className="text-xs font-semibold text-[#F6FAFD] flex items-center gap-1 truncate">
                <span>{post.author_name || post.authorName || 'Verified Author'}</span>
                <UserCheck className="w-3 h-3 text-[#B3CFE5] shrink-0" />
              </span>
              <span className="text-[#4A7FA7]/60">•</span>
              <span className="text-[11px] font-mono text-[#B3CFE5]/80 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#B3CFE5]" />
                <span>{formatDate(post.created_at || post.createdAt)}</span>
              </span>

              {/* Post Status Tag */}
              {post.status === 'completed' && (
                <span className="px-2 py-0.5 rounded-md bg-[#0A1931] text-[#B3CFE5] border border-[#4A7FA7]/50 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-[#B3CFE5]" /> RESOLVED
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-['Outfit'] font-bold text-lg sm:text-xl text-[#F6FAFD] truncate group-hover:text-[#B3CFE5] transition-colors mb-1">
              {post.title}
            </h3>

            {/* Truncated Description */}
            <p className="text-xs text-[#B3CFE5]/90 leading-relaxed line-clamp-2 mb-2.5">
              {truncatedDesc}
            </p>

            {/* Skills Pills */}
            {post.skills && Array.isArray(post.skills) && post.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <Tag className="w-3 h-3 text-[#B3CFE5] shrink-0" />
                {post.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 rounded-md bg-[#0A1931]/80 border border-[#4A7FA7]/40 text-[#B3CFE5] text-[11px] font-mono"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Small Media Thumbnail & Actions */}
          <div className="flex items-center gap-3 shrink-0">

            {/* Small Right-Docked Image Thumbnail */}
            {mediaUrl && (
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-[#4A7FA7]/40 bg-[#0A1931] shrink-0 hidden sm:block">
                <img src={mediaUrl} alt={post.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Actions Block */}
            <div className="flex flex-col sm:flex-row items-center gap-2">

              {/* "Review" Button (Opens Detail View) */}
              <button
                type="button"
                onClick={() => setIsDetailOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A1931] hover:bg-[#1A3D63] border border-[#4A7FA7]/40 text-[#F6FAFD] font-['Outfit'] font-semibold text-xs transition-all shadow-md hover:scale-105"
              >
                <Eye className="w-4 h-4 text-[#B3CFE5]" />
                <span>Review</span>
              </button>

              {/* Author Management Actions in "My Posts" */}
              {isAuthorView && (
                <div className="flex items-center gap-1.5">
                  {post.status === 'live' && onComplete && (
                    <button
                      type="button"
                      onClick={() => onComplete(post.id)}
                      title="Mark Completed"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A1931] hover:bg-[#1A3D63] border border-[#4A7FA7]/40 text-[#B3CFE5] font-semibold text-xs transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Done</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(post.id)}
                      title="Delete Post"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900/80 border border-red-500/40 text-red-300 font-semibold text-xs transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}

            </div>

          </div>
        </div>

        {/* Live Glowing Progress Bar — ALWAYS VISIBLE ACROSS ALL PAGES FOR ALL USERS */}
        <div className="mt-4 pt-3 border-t border-[#4A7FA7]/30">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#F6FAFD] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#B3CFE5] shadow-[0_0_8px_#B3CFE5] animate-pulse" />
                <span>{isAuthorView ? 'Resolution Progress (Author Control)' : 'Resolution Progress'}</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold ${currentStage.color}`}>
                {currentStage.label}
              </span>
            </div>
            
            {/* Glowing Percentage Badge */}
            <div className="px-2.5 py-0.5 rounded-full bg-[#0A1931] border border-[#4A7FA7]/80 text-[#B3CFE5] text-xs font-mono font-black shadow-[0_0_12px_rgba(179,207,229,0.3)]">
              {localProgress}%
            </div>
          </div>

          {/* Glowing Track & Fill */}
          <div className="relative w-full h-3 rounded-full bg-[#0A1931] border border-[#4A7FA7]/50 p-[1.5px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1A3D63] via-[#4A7FA7] to-[#B3CFE5] transition-all duration-500 relative"
              style={{
                width: `${Math.max(localProgress, 2)}%`,
                boxShadow: localProgress > 0 ? '0 0 14px rgba(179, 207, 229, 0.9), 0 0 24px rgba(74, 127, 167, 0.7)' : 'none'
              }}
            >
              {/* Glowing Beacon Head */}
              {localProgress > 5 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#F6FAFD] animate-ping opacity-75" />
              )}
            </div>
          </div>

          {/* Interactive Author Slider & Preset Controls */}
          {isAuthorView && (
            <div className="mt-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 pt-1.5">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={localProgress}
                onChange={handleProgressChange}
                className="w-full accent-[#B3CFE5] cursor-pointer h-1.5 bg-[#0A1931] rounded-lg"
              />
              <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                {[25, 50, 75, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                      localProgress === preset
                        ? 'bg-[#4A7FA7] text-[#F6FAFD] border-[#B3CFE5]'
                        : 'bg-[#0A1931] text-[#B3CFE5] border-[#4A7FA7]/40 hover:bg-[#1A3D63]'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Post Detail Modal */}
      <PostDetailModal
        postId={post.id}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </>
  );
};

export default PostCard;
