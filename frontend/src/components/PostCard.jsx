import React, { useState, useEffect } from 'react';
import { Eye, Tag, Calendar, UserCheck, Trash2, CheckCircle2, Building2, Users } from 'lucide-react';
import PostDetailModal from './PostDetailModal';
import UserBadge from './UserBadge';

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
    if (pct >= 75) return { label: 'Testing & Review', color: 'text-red-300 border-red-500/50 bg-red-950/60' };
    if (pct >= 50) return { label: 'Solution in Progress', color: 'text-red-300 border-red-500/50 bg-red-950/60' };
    if (pct >= 25) return { label: 'Active Collaboration', color: 'text-red-300 border-red-500/50 bg-red-950/60' };
    return { label: 'Open for Collaboration', color: 'text-red-300/80 border-red-500/40 bg-red-950/40' };
  };

  const currentStage = getProgressStage(localProgress);
  const isOrgOnly = (post.solver_requirement || post.solverRequirement) === 'organisation_only';

  return (
    <>
      {/* Compact Horizontal Bar View */}
      <div className={`p-4 sm:p-5 rounded-2xl transition-all duration-300 backdrop-blur-xl shadow-xl group ${
        post.is_emergency
          ? 'bg-gradient-to-r from-red-950/40 via-[#0b2240]/90 to-[#0b2240]/90 border-2 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.25)] hover:border-red-400'
          : 'bg-[#0b2240]/85 border border-[#0ea5e9]/35 hover:border-[#38bdf8]/70'
      }`}>
        <div className="flex items-center justify-between gap-4">

          {/* Left Column: Post Content Snippet */}
          <div className="flex-1 min-w-0 text-left">

            {/* Header Strip: Emergency, Author, Badges, Date, Solver Req, Status Tag */}
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              {post.is_emergency && (
                <span className="px-2.5 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500 text-[10px] font-mono font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
                  <span>🚨 EMERGENCY CRISIS</span>
                </span>
              )}

              <span className="text-xs font-semibold text-[#f0f9ff] flex items-center gap-1.5 truncate">
                <span>{post.author_name || post.authorName || 'Verified Author'}</span>
                <UserBadge user={{ account_type: post.author_account_type, email: post.author_email }} size="xs" />
              </span>
              <span className="text-[#0b2240]/60">•</span>
              <span className="text-[11px] font-mono text-[#38bdf8]/80 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#38bdf8]" />
                <span>{formatDate(post.created_at || post.createdAt)}</span>
              </span>

              {/* Solver Requirement Pill */}
              {isOrgOnly ? (
                <span className="px-2 py-0.5 rounded-md bg-[#06142e] text-[#38bdf8] border border-[#0ea5e9]/60 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm">
                  <Building2 className="w-3 h-3 text-[#38bdf8]" /> ORG MEMBERS ONLY
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-[#06142e] text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm">
                  <Users className="w-3 h-3 text-cyan-300" /> OPEN TO PUBLIC
                </span>
              )}

              {/* Post Status Tag */}
              {post.status === 'completed' && (
                <span className="px-2 py-0.5 rounded-md bg-[#06142e] text-emerald-300 border border-emerald-500/50 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" /> RESOLVED
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-['Outfit'] font-bold text-lg sm:text-xl text-[#f0f9ff] truncate group-hover:text-[#38bdf8] transition-colors mb-1">
              {post.title}
            </h3>

            {/* Truncated Description */}
            <p className="text-xs text-[#38bdf8]/90 leading-relaxed line-clamp-2 mb-2.5">
              {truncatedDesc}
            </p>

            {/* Skills Pills */}
            {post.skills && Array.isArray(post.skills) && post.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <Tag className="w-3 h-3 text-[#38bdf8] shrink-0" />
                {post.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 rounded-md bg-[#06142e]/80 border border-[#0ea5e9]/35 text-[#38bdf8] text-[11px] font-mono"
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
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-[#0ea5e9]/35 bg-[#06142e] shrink-0 hidden sm:block">
                <img src={mediaUrl} alt={post.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Actions Block */}
            <div className="flex flex-col sm:flex-row items-center gap-2">

              {/* "Review" Button (Opens Detail View) — Styled Red */}
              <button
                type="button"
                onClick={() => setIsDetailOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-400/50 text-white font-['Outfit'] font-bold text-xs transition-all shadow-md shadow-red-950/50 hover:shadow-red-600/30 hover:scale-105"
              >
                <Eye className="w-4 h-4 text-white" />
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#06142e] hover:bg-[#0b2240] border border-[#0ea5e9]/35 text-[#38bdf8] font-semibold text-xs transition-colors"
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

        {/* Live Glowing Red Progress Bar — ALWAYS VISIBLE ACROSS ALL PAGES FOR ALL USERS */}
        <div className="mt-4 pt-3 border-t border-[#0ea5e9]/30">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#f0f9ff] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
                <span>{isAuthorView ? 'Resolution Progress (Author Control)' : 'Resolution Progress'}</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold ${currentStage.color}`}>
                {currentStage.label}
              </span>
            </div>
            
            {/* Glowing Red Percentage Badge */}
            <div className="px-2.5 py-0.5 rounded-full bg-[#06142e] border border-red-500/80 text-red-400 text-xs font-mono font-black shadow-[0_0_12px_rgba(239,68,68,0.35)]">
              {localProgress}%
            </div>
          </div>

          {/* Glowing Red Track & Fill */}
          <div className="relative w-full h-3 rounded-full bg-[#06142e] border border-red-950/70 p-[1.5px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-950 via-red-600 to-red-500 transition-all duration-500 relative"
              style={{
                width: `${Math.max(localProgress, 2)}%`,
                boxShadow: localProgress > 0 ? '0 0 14px rgba(239, 68, 68, 0.9), 0 0 24px rgba(220, 38, 38, 0.7)' : 'none'
              }}
            >
              {/* Glowing Beacon Head */}
              {localProgress > 5 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ef4444] animate-ping opacity-75" />
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
                className="w-full accent-red-500 cursor-pointer h-1.5 bg-[#06142e] rounded-lg"
              />
              <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                {[25, 50, 75, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                      localProgress === preset
                        ? 'bg-red-600 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                        : 'bg-[#06142e] text-red-300/80 border-red-500/30 hover:bg-red-950/50 hover:text-red-200'
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
