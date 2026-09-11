import React, { useState } from 'react';
import { Eye, Tag, Calendar, UserCheck, Trash2, CheckCircle2 } from 'lucide-react';
import PostDetailModal from './PostDetailModal';

const PostCard = ({ post, isAuthorView, onDelete, onComplete }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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

  return (
    <>
      {/* Compact Horizontal Bar View */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#3a1e3e]/80 border border-[#935073]/30 hover:border-[#F6DBC0]/50 transition-all duration-300 backdrop-blur-xl shadow-lg flex items-center justify-between gap-4 group">
        
        {/* Left Column: Post Content Snippet */}
        <div className="flex-1 min-w-0 text-left">
          
          {/* Header Strip: Author, Date, Status Tag */}
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold text-[#F8F4E9] flex items-center gap-1 truncate">
              <span>{post.author_name || post.authorName || 'Verified Author'}</span>
              <UserCheck className="w-3 h-3 text-[#F6DBC0] shrink-0" />
            </span>
            <span className="text-[#935073]/60">•</span>
            <span className="text-[11px] font-mono text-[#F8F4E9]/60 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#F6DBC0]" />
              <span>{formatDate(post.created_at || post.createdAt)}</span>
            </span>

            {/* Post Status Tag */}
            {post.status === 'completed' && (
              <span className="px-2 py-0.5 rounded bg-[#502D55] text-[#F6DBC0] border border-[#F6DBC0]/40 text-[10px] font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> COMPLETED
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-['Outfit'] font-bold text-lg sm:text-xl text-[#F8F4E9] truncate group-hover:text-[#F6DBC0] transition-colors mb-1">
            {post.title}
          </h3>

          {/* Truncated Description */}
          <p className="text-xs text-[#F8F4E9]/80 leading-relaxed line-clamp-2 mb-2.5">
            {truncatedDesc}
          </p>

          {/* Skills Pills */}
          {post.skills && Array.isArray(post.skills) && post.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <Tag className="w-3 h-3 text-[#F6DBC0] shrink-0" />
              {post.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded-md bg-[#502D55]/80 border border-[#935073]/40 text-[#F6DBC0] text-[11px] font-mono"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Small Media Thumbnail & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Small Right-Docked Image Thumbnail (Fixed 72-84px) */}
          {mediaUrl && (
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-[#935073]/40 bg-[#221226] shrink-0 hidden sm:block">
              <img src={mediaUrl} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Actions Block */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            
            {/* "Review" Button (Opens Detail View) */}
            <button
              type="button"
              onClick={() => setIsDetailOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#502D55]/80 hover:bg-[#502D55] border border-[#935073]/40 text-[#F6DBC0] font-['Outfit'] font-semibold text-xs transition-all shadow-md hover:scale-105"
            >
              <Eye className="w-4 h-4 text-[#F6DBC0]" />
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
                    className="p-2 rounded-xl bg-[#502D55] hover:bg-[#935073] border border-[#F6DBC0]/40 text-[#F6DBC0] text-xs transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(post.id)}
                    title="Delete Post"
                    className="p-2 rounded-xl bg-red-950/80 hover:bg-red-900/80 border border-red-500/40 text-red-300 text-xs transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

          </div>

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
