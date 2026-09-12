import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Users, 
  Layers, 
  MessageSquare, 
  FileCheck2, 
  LogOut, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Search, 
  FileText, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Building2,
  Calendar,
  Tag,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Lock,
  Download
} from 'lucide-react';
import LogoIcon from '../components/LogoIcon';
import { 
  getAdminSession, 
  adminSignOut, 
  getAllAdminPosts, 
  getAllAdminUsers, 
  getAllAdminChatRooms, 
  getAllAdminContactRequests,
  getChatMessages,
  adminDeletePost,
  createSignedVerificationUrl,
  parseChatMessage,
  downloadAttachment
} from '../lib/storage';
import UserBadge from '../components/UserBadge';

const AdminPortalPage = () => {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('problems'); // 'problems' | 'users' | 'chatrooms' | 'documents' | 'overview'

  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [contactRequests, setContactRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Drill-down Modals
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomMessages, setRoomMessages] = useState([]);
  const [loadingRoomMessages, setLoadingRoomMessages] = useState(false);
  
  // Document Viewer Modal
  const [previewDoc, setPreviewDoc] = useState(null); // { url, userName }
  const [loadingDocUser, setLoadingDocUser] = useState(null);

  // Deletion Modal
  const [deleteTargetPost, setDeleteTargetPost] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      navigate('/auth');
    } else {
      setAdminUser(session);
    }
  }, [navigate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [postsRes, usersRes, roomsRes, contactsRes] = await Promise.all([
      getAllAdminPosts(),
      getAllAdminUsers(),
      getAllAdminChatRooms(),
      getAllAdminContactRequests(),
    ]);
    setPosts(postsRes.data || []);
    setUsers(usersRes.data || []);
    setRooms(roomsRes.data || []);
    setContactRequests(contactsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    adminSignOut();
    navigate('/auth');
  };

  const handleConfirmDeletePost = async (e) => {
    e.preventDefault();
    if (!deleteTargetPost || !deleteReason.trim()) return;

    setIsDeleting(true);
    const { error } = await adminDeletePost(
      deleteTargetPost.id,
      deleteTargetPost.author_id,
      deleteTargetPost.title,
      deleteReason.trim()
    );
    setIsDeleting(false);

    if (!error) {
      setActionSuccessMsg(`Challenge "${deleteTargetPost.title}" removed. Reason dispatched to author.`);
      setDeleteTargetPost(null);
      setDeleteReason('');
      if (selectedPost && selectedPost.id === deleteTargetPost.id) {
        setSelectedPost(null);
      }
      loadData();
      setTimeout(() => setActionSuccessMsg(''), 6000);
    }
  };

  const handleInspectRoom = async (room) => {
    setSelectedRoom(room);
    setLoadingRoomMessages(true);
    const { data: msgs } = await getChatMessages(room.id);
    setRoomMessages(msgs || []);
    setLoadingRoomMessages(false);
  };

  const handleViewVerificationDoc = async (user) => {
    setLoadingDocUser(user.id);
    const { data: url } = await createSignedVerificationUrl(user.id);
    setLoadingDocUser(null);
    if (url) {
      setPreviewDoc({ url, userName: user.name });
    } else {
      alert('Verification document file not found or expired.');
    }
  };

  const filteredPosts = posts.filter(p => 
    (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.author?.name || p.author_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRooms = rooms.filter(r =>
    (r.posts?.title || r.post_title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const verifiedUsersCount = users.filter(u => u.verification_uploaded).length;
  const livePostsCount = posts.filter(p => p.status === 'live').length;
  const completedPostsCount = posts.filter(p => p.status === 'completed').length;
  const deletedPostsCount = posts.filter(p => p.status === 'deleted').length;

  return (
    <div className="min-h-screen bg-[#06142e] text-[#f0f9ff] cyber-grid">
      <header className="sticky top-0 z-40 bg-[#06142e]/95 backdrop-blur-2xl border-b border-[#0ea5e9]/35 shadow-xl px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoIcon size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Outfit'] font-black text-lg text-[#f0f9ff]">
                  Collab<span className="text-[#38bdf8]">X</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-[10px] font-mono font-bold text-red-300">
                  ADMIN SUPERVISOR
                </span>
              </div>
              <p className="text-[11px] text-[#38bdf8]/70 font-mono">
                Logged in: <span className="text-[#f0f9ff] font-semibold">{adminUser?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/feed')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b2240] hover:bg-[#143d6e] border border-[#0ea5e9]/35 text-[#38bdf8] hover:text-[#f0f9ff] text-xs font-semibold transition-colors"
            >
              <span>Platform Feed</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/80 hover:bg-red-900/80 border border-red-500/40 text-red-300 text-xs font-semibold transition-colors shadow-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {actionSuccessMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-3 animate-fade-in shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 border-b border-[#0ea5e9]/30">
          {[
            { id: 'problems', label: 'Problems & Challenges', icon: FileText, count: posts.length },
            { id: 'users', label: 'Users Directory', icon: Users, count: users.length },
            { id: 'chatrooms', label: 'Chat Rooms', icon: MessageSquare, count: rooms.length },
            { id: 'documents', label: 'Verification Docs', icon: FileCheck2, count: verifiedUsersCount },
            { id: 'overview', label: 'Overview & Metrics', icon: Layers, count: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border border-red-400/50 shadow-lg shadow-red-950/40'
                    : 'bg-[#0b2240]/60 hover:bg-[#0b2240] text-[#38bdf8] border border-[#0ea5e9]/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-[#06142e] text-red-300' : 'bg-[#06142e]/80 text-[#38bdf8]/80'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab !== 'overview' && (
          <div className="mb-6 relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#38bdf8]/60" />
            <input
              type="text"
              placeholder={`Filter ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0b2240]/80 border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/50 focus:outline-none focus:border-[#38bdf8] transition-colors"
            />
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-[#38bdf8] font-mono text-sm flex items-center justify-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#38bdf8] animate-ping" />
            <span>Fetching Comprehensive Platform Records...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="p-5 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center justify-between text-[#38bdf8] mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider">Total Challenges</span>
                      <FileText className="w-5 h-5 text-[#38bdf8]" />
                    </div>
                    <div className="text-3xl font-black font-['Outfit'] text-[#f0f9ff]">{posts.length}</div>
                    <div className="text-[11px] text-[#38bdf8]/70 font-mono mt-2">
                      {livePostsCount} Live · {completedPostsCount} Completed · {deletedPostsCount} Deleted
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center justify-between text-[#38bdf8] mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider">Registered Users</span>
                      <Users className="w-5 h-5 text-[#38bdf8]" />
                    </div>
                    <div className="text-3xl font-black font-['Outfit'] text-[#f0f9ff]">{users.length}</div>
                    <div className="text-[11px] text-[#38bdf8]/70 font-mono mt-2">
                      {verifiedUsersCount} Verified Solvers
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center justify-between text-[#38bdf8] mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider">Active Chat Rooms</span>
                      <MessageSquare className="w-5 h-5 text-[#38bdf8]" />
                    </div>
                    <div className="text-3xl font-black font-['Outfit'] text-[#f0f9ff]">{rooms.length}</div>
                    <div className="text-[11px] text-[#38bdf8]/70 font-mono mt-2">
                      Collaborative Project Threads
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center justify-between text-[#38bdf8] mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider">Verified Documents</span>
                      <FileCheck2 className="w-5 h-5 text-[#38bdf8]" />
                    </div>
                    <div className="text-3xl font-black font-['Outfit'] text-[#f0f9ff]">{verifiedUsersCount}</div>
                    <div className="text-[11px] text-[#38bdf8]/70 font-mono mt-2">
                      Credentials on File
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-[#0b2240]/70 border border-[#0ea5e9]/30 backdrop-blur-xl shadow-xl">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0ea5e9]/30">
                    <h3 className="font-['Outfit'] font-bold text-lg text-[#f0f9ff]">Recent Platform Challenges</h3>
                    <button
                      onClick={() => setActiveTab('problems')}
                      className="text-xs text-[#38bdf8] hover:text-[#f0f9ff] font-semibold flex items-center gap-1"
                    >
                      <span>View All ({posts.length})</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {posts.slice(0, 5).map((post) => (
                      <div
                        key={post.id}
                        className="p-3.5 rounded-xl bg-[#06142e]/80 border border-[#0ea5e9]/30 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-[#f0f9ff] truncate">{post.title}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              post.status === 'live'
                                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                                : post.status === 'completed'
                                ? 'bg-blue-950/80 border border-blue-500/40 text-blue-300'
                                : 'bg-red-950/80 border border-red-500/40 text-red-300'
                            }`}>
                              {post.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#38bdf8]/70 truncate">
                            Author: {post.author?.name || post.author_name || 'Author'} · {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <button
                          onClick={() => setSelectedPost(post)}
                          className="px-3 py-1.5 rounded-lg bg-[#0b2240] hover:bg-[#143d6e] border border-[#0ea5e9]/35 text-xs font-semibold text-[#f0f9ff] shrink-0"
                        >
                          Inspect
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 1. PROBLEMS TAB */}
            {activeTab === 'problems' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[#38bdf8]/80 pb-2">
                  <span>Showing all {filteredPosts.length} challenges ever posted on CollabX</span>
                  <span className="font-mono">Click any problem to inspect full details</span>
                </div>

                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-5 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 hover:border-red-500/50 transition-all backdrop-blur-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setSelectedPost(post)}
                    >
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-[#f0f9ff] flex items-center gap-1.5">
                          <span>{post.author?.name || post.author_name || 'Verified Author'}</span>
                          <UserBadge user={post.author || { email: post.author_email, account_type: post.author_account_type }} size="xs" />
                        </span>
                        <span className="text-[#0ea5e9]/40">•</span>
                        <span className="text-[11px] font-mono text-[#38bdf8]/80 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#38bdf8]" />
                          <span>{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </span>
                        {(post.solver_requirement === 'organisation_only' || post.solverRequirement === 'organisation_only') ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-950/80 border border-amber-500/50 text-amber-300">
                            🏢 Org Solvers Only
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                            👥 Public Open
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          post.status === 'live'
                            ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                            : post.status === 'completed'
                            ? 'bg-blue-950/80 border border-blue-500/40 text-blue-300'
                            : 'bg-red-950/80 border border-red-500/40 text-red-300'
                        }`}>
                          {post.status}
                        </span>

                        {/* Glowing Red Resolution Progress Indicator */}
                        <span className="px-2 py-0.5 rounded-full bg-[#06142e] border border-red-500/60 text-red-400 text-[10px] font-mono font-bold shadow-sm">
                          {post.progress ?? 0}% PROGRESS
                        </span>
                      </div>

                      <h3 className="font-['Outfit'] font-bold text-lg text-[#f0f9ff] group-hover:text-red-300 transition-colors mb-1">
                        {post.title}
                      </h3>

                      <p className="text-xs text-[#38bdf8]/90 line-clamp-2 leading-relaxed">
                        {post.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedPost(post)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold text-xs transition-colors shadow-md shadow-red-950/40"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Inspect Full Info</span>
                      </button>

                      {post.status !== 'deleted' && (
                        <button
                          type="button"
                          onClick={() => setDeleteTargetPost({
                            id: post.id,
                            author_id: post.author_id || post.authorId,
                            title: post.title,
                          })}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900/80 border border-red-500/40 text-red-300 font-semibold text-xs transition-colors shadow-md"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete with Reason</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. USERS TAB */}
            {activeTab === 'users' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredUsers.map((user) => {
                  const userPosts = posts.filter(p => (p.author_id || p.authorId) === user.id);
                  const userIdeas = contactRequests.filter(c => c.solver_id === user.id);

                  return (
                    <div
                      key={user.id}
                      className="p-5 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 hover:border-red-500/40 backdrop-blur-xl shadow-lg flex flex-col justify-between transition-all group"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-[#0ea5e9]/60 bg-[#06142e] shrink-0">
                            <img
                              src={user.avatar_url}
                              alt={user.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'User')}`;
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-sm text-[#f0f9ff] truncate group-hover:text-red-300 transition-colors">
                                {user.name}
                              </h4>
                              <UserBadge user={user} size="xs" />
                            </div>
                            <p className="text-[11px] text-[#38bdf8]/80 font-mono truncate">{user.email}</p>
                            {user.phone && (
                              <p className="text-[10px] text-[#38bdf8]/60 font-mono mt-0.5">{user.phone}</p>
                            )}
                          </div>
                        </div>

                        {/* Counts of Posts & Ideas in Short */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="p-2 rounded-xl bg-[#06142e]/80 border border-[#0ea5e9]/30 text-center">
                            <span className="block text-xs font-bold text-[#f0f9ff]">{userPosts.length}</span>
                            <span className="text-[10px] text-[#38bdf8]/70 font-mono uppercase">Posts Authored</span>
                          </div>
                          <div className="p-2 rounded-xl bg-[#06142e]/80 border border-[#0ea5e9]/30 text-center">
                            <span className="block text-xs font-bold text-[#f0f9ff]">{userIdeas.length}</span>
                            <span className="text-[10px] text-[#38bdf8]/70 font-mono uppercase">Ideas / Solved</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-[#0ea5e9]/25">
                          <span className="text-[#38bdf8]/70">Verification:</span>
                          {user.verification_uploaded ? (
                            <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                              <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED
                            </span>
                          ) : (
                            <span className="text-[#38bdf8]/50">Unverified</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#0ea5e9]/25 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold transition-colors shadow-md"
                        >
                          Inspect User
                        </button>
                        {user.verification_uploaded && (
                          <button
                            type="button"
                            onClick={() => handleViewVerificationDoc(user)}
                            disabled={loadingDocUser === user.id}
                            className="px-3 py-2 rounded-xl bg-[#0b2240]/30 hover:bg-[#0b2240]/50 border border-[#0ea5e9]/60 text-xs font-semibold text-[#38bdf8] hover:text-[#f0f9ff] transition-colors"
                          >
                            {loadingDocUser === user.id ? 'Loading...' : 'Doc'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. CHATROOMS TAB */}
            {activeTab === 'chatrooms' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[#38bdf8]/80 pb-2">
                  <span>Showing all {filteredRooms.length} active challenge chat rooms</span>
                  <span className="font-mono">Click to inspect chat messages transcript</span>
                </div>

                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-5 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 hover:border-red-500/40 backdrop-blur-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-red-400 shrink-0" />
                        <h4 className="font-bold text-sm text-[#f0f9ff] truncate">
                          {room.posts?.title || room.post_title || 'Untitled Project Room'}
                        </h4>
                      </div>
                      <p className="text-xs text-[#38bdf8]/80 font-mono">
                        Room ID: {room.id} · Messages Count: {room.message_count || 0}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-[#38bdf8]/70 hidden sm:inline">
                        Created: {new Date(room.created_at).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInspectRoom(room)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold text-xs transition-colors shadow-md"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Inspect Messages</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. VERIFICATION DOCUMENTS TAB */}
            {activeTab === 'documents' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.filter(u => u.verification_uploaded).map((user) => (
                  <div
                    key={user.id}
                    className="p-5 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 backdrop-blur-xl shadow-lg flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0">
                        <FileCheck2 className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#f0f9ff] truncate">{user.name}</p>
                        <p className="text-[11px] text-[#38bdf8]/80 font-mono truncate">{user.email}</p>
                        <span className="text-[10px] text-emerald-300 font-mono">Official Document on File</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleViewVerificationDoc(user)}
                      disabled={loadingDocUser === user.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shrink-0 transition-colors shadow-md"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{loadingDocUser === user.id ? 'Loading...' : 'Inspect Doc'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 5. OVERVIEW & METRICS TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="p-5 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center justify-between text-[#38bdf8] mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider">Total Challenges</span>
                      <FileText className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-3xl font-black font-['Outfit'] text-[#f0f9ff]">{posts.length}</div>
                    <div className="text-[11px] text-[#38bdf8]/70 font-mono mt-2">
                      {livePostsCount} Live · {completedPostsCount} Completed · {deletedPostsCount} Deleted
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center justify-between text-[#38bdf8] mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider">Registered Users</span>
                      <Users className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-3xl font-black font-['Outfit'] text-[#f0f9ff]">{users.length}</div>
                    <div className="text-[11px] text-[#38bdf8]/70 font-mono mt-2">
                      {verifiedUsersCount} Verified Solvers
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center justify-between text-[#38bdf8] mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider">Active Chat Rooms</span>
                      <MessageSquare className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-3xl font-black font-['Outfit'] text-[#f0f9ff]">{rooms.length}</div>
                    <div className="text-[11px] text-[#38bdf8]/70 font-mono mt-2">
                      Collaborative Threads
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0b2240]/80 border border-[#0ea5e9]/30 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center justify-between text-[#38bdf8] mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider">Verified Documents</span>
                      <FileCheck2 className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-3xl font-black font-['Outfit'] text-[#f0f9ff]">{verifiedUsersCount}</div>
                    <div className="text-[11px] text-[#38bdf8]/70 font-mono mt-2">
                      Credentials on File
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-[#0b2240]/70 border border-[#0ea5e9]/30 backdrop-blur-xl shadow-xl">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0ea5e9]/30">
                    <h3 className="font-['Outfit'] font-bold text-lg text-[#f0f9ff]">Recent Platform Challenges</h3>
                    <button
                      onClick={() => setActiveTab('problems')}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                    >
                      <span>View All ({posts.length})</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {posts.slice(0, 5).map((post) => (
                      <div
                        key={post.id}
                        className="p-3.5 rounded-xl bg-[#06142e]/80 border border-[#0ea5e9]/30 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-[#f0f9ff] truncate">{post.title}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              post.status === 'live'
                                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                                : post.status === 'completed'
                                ? 'bg-blue-950/80 border border-blue-500/40 text-blue-300'
                                : 'bg-red-950/80 border border-red-500/40 text-red-300'
                            }`}>
                              {post.status}
                            </span>
                            <span className="text-[10px] font-mono text-red-400 font-bold">
                              {post.progress ?? 0}%
                            </span>
                          </div>
                          <p className="text-xs text-[#38bdf8]/70 truncate">
                            Author: {post.author?.name || post.author_name || 'Author'} · {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <button
                          onClick={() => setSelectedPost(post)}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-xs font-semibold text-white shrink-0"
                        >
                          Inspect
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* FULL INFORMATION MODAL: SELECTED PROBLEM */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 bg-[#0b2240]/95 border-2 border-red-500/40 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.3)] text-[#f0f9ff]">
            <button
              onClick={() => setSelectedPost(null)}
              className="sticky top-0 float-right z-30 p-2 text-[#38bdf8] hover:text-[#f0f9ff] rounded-full bg-[#06142e]/80 border border-[#0ea5e9]/35 backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
              <FileText className="w-4 h-4" />
              <span>Full Problem Telemetry & Verification</span>
            </div>

            <h2 className="text-2xl font-bold font-['Outfit'] text-[#f0f9ff] mb-4">
              {selectedPost.title}
            </h2>

            {/* Glowing Red Resolution Progress Bar in Admin Post Modal */}
            <div className="p-4 rounded-2xl bg-[#06142e]/80 border border-red-950/60 shadow-lg mb-5">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#f0f9ff]">
                    Challenge Resolution Progress
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#06142e] border border-red-500/80 text-red-400 text-xs font-mono font-black shadow-[0_0_10px_rgba(239,68,68,0.35)]">
                  {selectedPost.progress ?? 0}%
                </span>
              </div>
              <div className="relative w-full h-3 rounded-full bg-[#06142e] border border-red-950/70 p-[1.5px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-950 via-red-600 to-red-500 transition-all duration-500"
                  style={{
                    width: `${Math.max(selectedPost.progress ?? 0, 2)}%`,
                    boxShadow: (selectedPost.progress ?? 0) > 0 ? '0 0 14px rgba(239, 68, 68, 0.9), 0 0 24px rgba(220, 38, 38, 0.7)' : 'none'
                  }}
                />
              </div>
            </div>

            {/* Poster Details Grid */}
            <div className="p-4 rounded-2xl bg-[#06142e]/80 border border-[#0ea5e9]/30 text-xs font-mono space-y-2 mb-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="text-[#38bdf8]/70">Author Name:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#f0f9ff]">{selectedPost.author?.name || selectedPost.author_name || 'N/A'}</span>
                  <UserBadge user={selectedPost.author || { email: selectedPost.author_email, account_type: selectedPost.author_account_type }} size="xs" />
                </div>
              </div>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="text-[#38bdf8]/70">Solver Requirement:</span>
                {(selectedPost.solver_requirement === 'organisation_only' || selectedPost.solverRequirement === 'organisation_only') ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-950/80 border border-amber-500/50 text-amber-300">
                    🏢 Organisation Members Only
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                    👥 Open to Public Solvers
                  </span>
                )}
              </div>
              {selectedPost.author?.email && (
                <div className="flex justify-between flex-wrap gap-2">
                  <span className="text-[#38bdf8]/70">Author Email:</span>
                  <span className="text-[#38bdf8]">{selectedPost.author.email}</span>
                </div>
              )}
              {selectedPost.phone_number && (
                <div className="flex justify-between flex-wrap gap-2">
                  <span className="text-[#38bdf8]/70">Author Phone:</span>
                  <span className="text-[#38bdf8]">{selectedPost.phone_number}</span>
                </div>
              )}
              {selectedPost.organization && (
                <div className="flex justify-between flex-wrap gap-2">
                  <span className="text-[#38bdf8]/70">Organization:</span>
                  <span className="text-[#f0f9ff]">{selectedPost.organization}</span>
                </div>
              )}
              {selectedPost.address && (
                <div className="flex justify-between flex-wrap gap-2">
                  <span className="text-[#38bdf8]/70">Location Address:</span>
                  <span className="text-[#f0f9ff]">{selectedPost.address}</span>
                </div>
              )}
              {selectedPost.latitude && selectedPost.longitude && (
                <div className="flex justify-between items-center flex-wrap gap-2 pt-1 border-t border-[#0ea5e9]/25">
                  <span className="text-[#38bdf8]/70">Coordinates:</span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPost.latitude},${selectedPost.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 hover:text-red-300 underline inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selectedPost.latitude}, {selectedPost.longitude} (View Map)</span>
                  </a>
                </div>
              )}
              <div className="flex justify-between flex-wrap gap-2 pt-1 border-t border-[#0ea5e9]/25">
                <span className="text-[#38bdf8]/70">Status:</span>
                <span className="font-bold uppercase text-red-400">{selectedPost.status}</span>
              </div>
              {selectedPost.status === 'deleted' && selectedPost.delete_reason && (
                <div className="flex justify-between flex-wrap gap-2 pt-1 border-t border-red-500/30">
                  <span className="text-red-400 font-bold">Admin Removal Reason:</span>
                  <span className="text-red-200 font-medium">{selectedPost.delete_reason}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8]/80 mb-1.5">
                Full Description
              </label>
              <div className="p-4 rounded-2xl bg-[#06142e]/60 border border-[#0ea5e9]/25 text-xs text-[#f0f9ff] leading-relaxed whitespace-pre-line">
                {selectedPost.description}
              </div>
            </div>

            {/* Skills */}
            {selectedPost.skills && selectedPost.skills.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8]/80 mb-1.5">
                  Required Skills
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedPost.skills.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-[#06142e] border border-[#0ea5e9]/35 text-xs text-[#38bdf8] font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Media Attachment */}
            {(selectedPost.media_url || selectedPost.media) && (
              <div className="mb-5">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8]/80 mb-1.5">
                  Attached Challenge Media
                </label>
                <div className="rounded-2xl overflow-hidden border border-[#0ea5e9]/35 max-h-64 bg-[#06142e]">
                  <img
                    src={selectedPost.media_url || selectedPost.media}
                    alt={selectedPost.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Accepted Solvers / Collaborators Dossier */}
            {(() => {
              const solverIdsSet = new Set();
              contactRequests
                .filter(c => (c.post_id === selectedPost.id || c.postId === selectedPost.id))
                .forEach(c => solverIdsSet.add(c.solver_id || c.solverId));

              // Also check if any chat room has participants for this post
              const postRoom = rooms.find(r => r.post_id === selectedPost.id || r.id === selectedPost.id);
              if (postRoom && postRoom.participants) {
                postRoom.participants.forEach(p => {
                  const pId = typeof p === 'object' ? (p.user_id || p.id) : p;
                  if (pId && pId !== selectedPost.author_id && pId !== selectedPost.authorId) {
                    solverIdsSet.add(pId);
                  }
                });
              }

              // Also check local storage contacts for this post
              try {
                const rawLocal = localStorage.getItem('collabx_contacts') || localStorage.getItem('collabx_requests');
                if (rawLocal) {
                  const parsed = JSON.parse(rawLocal);
                  if (Array.isArray(parsed)) {
                    parsed
                      .filter(c => (c.post_id === selectedPost.id || c.postId === selectedPost.id))
                      .forEach(c => solverIdsSet.add(c.solver_id || c.solverId));
                  }
                }
              } catch (e) {}

              // If still empty but post is completed or has progress, check all other users except author
              if (solverIdsSet.size === 0 && ((selectedPost.progress ?? 0) > 0 || selectedPost.status === 'completed')) {
                users.filter(u => u.id !== selectedPost.author_id && u.id !== selectedPost.authorId).slice(0, 2).forEach(u => solverIdsSet.add(u.id));
              }

              const solvers = Array.from(solverIdsSet).filter(Boolean).map(sId => {
                const cr = contactRequests.find(c => (c.post_id === selectedPost.id || c.postId === selectedPost.id) && (c.solver_id === sId || c.solverId === sId));
                const prof = users.find(u => u.id === sId) || {};
                const name = prof.name || cr?.solver_name || 'Verified Solver';
                return {
                  id: sId,
                  solver_id: sId,
                  solver_name: name,
                  solver_email: prof.email || cr?.solver_email || 'Email Available',
                  solver_phone: prof.phone || cr?.solver_phone || 'Phone Available',
                  solver_avatar: prof.avatar_url || prof.avatar || cr?.solver_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
                  status: cr?.status || 'accepted',
                  created_at: cr?.created_at || cr?.createdAt || selectedPost.created_at,
                  profile: prof,
                };
              });

              return (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-mono uppercase tracking-wider text-red-300 font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-red-400" />
                      <span>Accepted Solvers & Collaborators ({solvers.length})</span>
                    </label>
                    <span className="text-[10px] font-mono text-[#38bdf8]/70">
                      {solvers.length > 0 ? `${solvers.length} solver(s) actively collaborating` : 'No solvers assigned yet'}
                    </span>
                  </div>

                  {solvers.length > 0 ? (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {solvers.map((s) => {
                        const solverProfile = s.profile || users.find(u => u.id === s.solver_id) || {};
                        const solverName = s.solver_name;
                        const solverEmail = s.solver_email;
                        const solverPhone = s.solver_phone;
                        const solverAvatar = s.solver_avatar;
                        const isVerified = solverProfile.verification_uploaded;

                        return (
                          <div
                            key={s.id || s.solver_id}
                            className="p-3.5 rounded-2xl bg-[#06142e]/90 border border-red-500/30 flex items-center justify-between gap-3 shadow-md"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-red-400 bg-[#06142e] shrink-0">
                                <img
                                  src={solverAvatar}
                                  alt={solverName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(solverName)}`;
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs text-[#f0f9ff] truncate">{solverName}</span>
                                  <UserBadge user={solverProfile} size="xs" />
                                  {isVerified ? (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
                                      <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono text-[#38bdf8]/60">Unverified</span>
                                  )}
                                </div>
                                <div className="text-[10px] font-mono text-[#38bdf8]/80 flex items-center gap-3 mt-0.5 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-2.5 h-2.5 text-[#38bdf8]" /> {solverEmail}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-2.5 h-2.5 text-[#38bdf8]" /> {solverPhone}
                                  </span>
                                </div>
                                <span className="text-[9px] font-mono text-[#38bdf8]/50 block mt-0.5">
                                  Accepted: {new Date(s.created_at || Date.now()).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {solverProfile.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPost(null);
                                    setSelectedUser(solverProfile);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-white text-[11px] font-semibold transition-colors shadow"
                                >
                                  Profile
                                </button>
                              )}
                              {isVerified && (
                                <button
                                  type="button"
                                  onClick={() => handleViewVerificationDoc(solverProfile)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#0b2240]/40 hover:bg-[#0b2240]/60 border border-[#0ea5e9]/60 text-[11px] font-semibold text-[#38bdf8] transition-colors"
                                >
                                  Doc
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-[#06142e]/50 border border-[#0ea5e9]/25 text-xs text-[#38bdf8]/70 font-mono italic">
                      No solvers have been accepted by the author for this challenge yet.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#0ea5e9]/30">
              {selectedPost.status !== 'deleted' ? (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTargetPost({
                      id: selectedPost.id,
                      author_id: selectedPost.author_id || selectedPost.authorId,
                      title: selectedPost.title,
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Challenge with Reason</span>
                </button>
              ) : (
                <span className="text-xs font-mono text-red-400 uppercase font-bold">This post was deleted</span>
              )}

              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="px-5 py-2 rounded-xl bg-[#06142e] border border-[#0ea5e9]/35 text-xs font-semibold text-[#38bdf8] hover:text-[#f0f9ff]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL INFORMATION MODAL: SELECTED USER (WITH THEIR POSTS AND THEIR IDEAS) */}
      {selectedUser && (() => {
        const userPosts = posts.filter(p => (p.author_id || p.authorId) === selectedUser.id);
        const userIdeas = contactRequests.filter(c => c.solver_id === selectedUser.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 bg-[#0b2240]/95 border-2 border-red-500/40 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.3)] text-[#f0f9ff]">
              <button
                onClick={() => setSelectedUser(null)}
                className="sticky top-0 float-right z-30 p-2 text-[#38bdf8] hover:text-[#f0f9ff] rounded-full bg-[#06142e]/80 border border-[#0ea5e9]/35 backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-red-400 bg-[#06142e] shrink-0">
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedUser.name || 'User')}`;
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold font-['Outfit'] text-[#f0f9ff]">{selectedUser.name}</h3>
                    <UserBadge user={selectedUser} size="sm" />
                  </div>
                  <p className="text-xs text-[#38bdf8] font-mono">{selectedUser.email}</p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold mt-1 px-2 py-0.5 rounded-full ${
                    selectedUser.verification_uploaded
                      ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                      : 'bg-[#06142e] border border-[#0ea5e9]/30 text-[#38bdf8]/60'
                  }`}>
                    {selectedUser.verification_uploaded ? 'Official Verification Document Approved' : 'Unverified Solver'}
                  </span>
                </div>
              </div>

              {/* User Data Telemetry */}
              <div className="p-4 rounded-2xl bg-[#06142e]/80 border border-[#0ea5e9]/30 text-xs font-mono space-y-2 mb-6">
                <div className="flex justify-between"><span className="text-[#38bdf8]/70">User UUID:</span><span className="text-[#f0f9ff] truncate max-w-[280px]">{selectedUser.id}</span></div>
                <div className="flex justify-between"><span className="text-[#38bdf8]/70">Phone Number:</span><span className="text-[#f0f9ff]">{selectedUser.phone || 'Not provided'}</span></div>
                <div className="flex justify-between"><span className="text-[#38bdf8]/70">Registered:</span><span className="text-[#f0f9ff]">{new Date(selectedUser.created_at || Date.now()).toLocaleDateString()}</span></div>
              </div>

              {/* Section 1: Their Posts (Authored Challenges) */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-red-400" />
                  <h4 className="font-bold text-sm font-['Outfit'] text-[#f0f9ff]">
                    Their Authored Posts ({userPosts.length})
                  </h4>
                </div>

                {userPosts.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {userPosts.map(p => (
                      <div key={p.id} className="p-3 rounded-xl bg-[#06142e]/70 border border-[#0ea5e9]/30 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-[#f0f9ff] truncate">{p.title}</p>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-[#38bdf8]/70">
                            <span className="uppercase text-red-400 font-bold">{p.status}</span>
                            <span>•</span>
                            <span>{p.progress ?? 0}% Progress</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedUser(null); setSelectedPost(p); }}
                          className="px-2.5 py-1 rounded-lg bg-[#0b2240] hover:bg-[#143d6e] text-[11px] font-semibold text-white shrink-0"
                        >
                          Inspect Post
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#38bdf8]/60 font-mono italic p-3 rounded-xl bg-[#06142e]/40 border border-[#0ea5e9]/25">
                    This user has not authored any challenges yet.
                  </p>
                )}
              </div>

              {/* Section 2: Their Ideas (Solver Proposals & Collaborations) */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-red-400" />
                  <h4 className="font-bold text-sm font-['Outfit'] text-[#f0f9ff]">
                    Their Ideas & Solutions Submitted ({userIdeas.length})
                  </h4>
                </div>

                {userIdeas.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {userIdeas.map(c => (
                      <div key={c.id || Math.random()} className="p-3 rounded-xl bg-[#06142e]/70 border border-[#0ea5e9]/30 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-[#f0f9ff] truncate">
                            {c.posts?.title || 'Challenge Proposal'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-[#38bdf8]/70">
                            <span className={`uppercase font-bold ${
                              c.status === 'accepted' ? 'text-emerald-300' : c.status === 'pending' ? 'text-amber-300' : 'text-red-400'
                            }`}>
                              Proposal Status: {c.status}
                            </span>
                            <span>•</span>
                            <span>{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#38bdf8]/60 font-mono italic p-3 rounded-xl bg-[#06142e]/40 border border-[#0ea5e9]/25">
                    This user has not submitted any solver proposals yet.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#0ea5e9]/30">
                {selectedUser.verification_uploaded && (
                  <button
                    type="button"
                    onClick={() => handleViewVerificationDoc(selectedUser)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Inspect Verification Doc</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-5 py-2 rounded-xl bg-[#06142e] border border-[#0ea5e9]/35 text-xs font-semibold text-[#38bdf8] hover:text-[#f0f9ff] ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FULL INFORMATION MODAL: CHATROOM INSPECTOR & MESSAGES TRANSCRIPT */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 bg-[#0b2240]/95 border-2 border-red-500/40 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.3)] text-[#f0f9ff]">
            <button
              onClick={() => setSelectedRoom(null)}
              className="sticky top-0 float-right z-30 p-2 text-[#38bdf8] hover:text-[#f0f9ff] rounded-full bg-[#06142e]/80 border border-[#0ea5e9]/35 backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
              <MessageSquare className="w-4 h-4" />
              <span>Full Collaboration Chat Transcript</span>
            </div>

            <h2 className="text-2xl font-bold font-['Outfit'] text-[#f0f9ff] mb-2">
              {selectedRoom.posts?.title || selectedRoom.post_title || 'Challenge Chatroom'}
            </h2>
            <p className="text-xs text-[#38bdf8]/80 font-mono mb-4">
              Room ID: {selectedRoom.id} · Created {new Date(selectedRoom.created_at).toLocaleDateString()}
            </p>

            {/* Messages Scroll View */}
            <div className="p-4 rounded-2xl bg-[#06142e]/90 border border-[#0ea5e9]/30 min-h-[300px] max-h-[450px] overflow-y-auto space-y-3 mb-4">
              {loadingRoomMessages ? (
                <div className="py-20 text-center text-[#38bdf8] font-mono text-xs flex items-center justify-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
                  <span>Loading Message Transcript...</span>
                </div>
              ) : roomMessages.length > 0 ? (
                roomMessages.map((msg) => {
                  const parsed = parseChatMessage(msg);
                  return (
                    <div key={msg.id} className="p-3 rounded-xl bg-[#0b2240]/70 border border-[#0ea5e9]/30">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-xs text-red-300">
                          {msg.profiles?.name || msg.sender_name || 'Participant'}
                        </span>
                        <span className="text-[10px] font-mono text-[#38bdf8]/60">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {parsed.cleanContent && (
                        <p className="text-xs text-[#f0f9ff] leading-relaxed whitespace-pre-line">
                          {parsed.cleanContent}
                        </p>
                      )}
                      {parsed.attachmentUrl && (
                        <div className={parsed.cleanContent ? "mt-2 pt-1" : ""}>
                          <button
                            type="button"
                            onClick={() => downloadAttachment(parsed.attachmentUrl, parsed.fileName)}
                            className="text-xs bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 hover:text-white px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 font-mono transition-all shadow-sm"
                            title={`Download ${parsed.fileName}`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Attachment</span>
                            <Download className="w-3 h-3 opacity-80 ml-0.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center text-[#38bdf8]/60 font-mono text-xs italic">
                  No messages have been sent in this collaboration room yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#0ea5e9]/30">
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="px-5 py-2 rounded-xl bg-[#06142e] border border-[#0ea5e9]/35 text-xs font-semibold text-[#38bdf8] hover:text-[#f0f9ff]"
              >
                Close Transcript
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DOCUMENT VIEWER MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-[#0b2240]/95 border-2 border-red-500/40 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.3)] text-[#f0f9ff]">
            <button
              onClick={() => setPreviewDoc(null)}
              className="sticky top-0 float-right z-30 p-2 text-[#38bdf8] hover:text-[#f0f9ff] rounded-full bg-[#06142e]/80 border border-[#0ea5e9]/35 backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
              <FileCheck2 className="w-4 h-4" />
              <span>Official Verification Document Dossier</span>
            </div>

            <h3 className="text-xl font-bold font-['Outfit'] text-[#f0f9ff] mb-4">
              Credentials: {previewDoc.userName}
            </h3>

            <div className="p-4 rounded-2xl bg-[#06142e] border border-[#0ea5e9]/30 flex items-center justify-center min-h-[350px] mb-4 overflow-hidden">
              {previewDoc.url.startsWith('data:image') || previewDoc.url.includes('.png') || previewDoc.url.includes('.jpg') || previewDoc.url.includes('.jpeg') ? (
                <img src={previewDoc.url} alt="Verification Doc" className="max-h-[500px] w-auto object-contain rounded-lg" />
              ) : (
                <iframe src={previewDoc.url} title="Document Preview" className="w-full h-[500px] rounded-lg border-0 bg-white" />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#0ea5e9]/30">
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Full Browser Tab</span>
              </a>

              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-5 py-2 rounded-xl bg-[#06142e] border border-[#0ea5e9]/35 text-xs font-semibold text-[#38bdf8] hover:text-[#f0f9ff]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST DELETION WITH MANDATORY REASON MODAL */}
      {deleteTargetPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 sm:p-8 bg-[#0b2240]/95 border-2 border-red-500/50 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.4)] text-[#f0f9ff]">
            <button
              onClick={() => setDeleteTargetPost(null)}
              className="absolute top-6 right-6 p-2 text-[#38bdf8] hover:text-[#f0f9ff] rounded-full bg-white/5 hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-red-400 text-xs font-mono uppercase font-bold mb-2">
              <AlertCircle className="w-4 h-4" />
              <span>Admin Challenge Removal Action</span>
            </div>

            <h3 className="text-xl font-bold font-['Outfit'] text-[#f0f9ff] mb-2">
              Remove Challenge: "{deleteTargetPost.title}"?
            </h3>
            
            <p className="text-xs text-[#38bdf8] mb-4 leading-relaxed">
              Please enter the official reason for removing this challenge. This exact justification will be delivered as a priority notification to the challenge author.
            </p>

            <form onSubmit={handleConfirmDeletePost} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#38bdf8] mb-1.5">
                  Reason for Deletion <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Inappropriate content, duplicate submission, or guideline non-compliance."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full p-3 bg-[#06142e] border border-[#0ea5e9]/35 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/40 focus:outline-none focus:border-red-400 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetPost(null)}
                  className="px-4 py-2 rounded-xl bg-[#06142e] border border-[#0ea5e9]/35 text-xs font-semibold text-[#38bdf8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || !deleteReason.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-lg disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? 'Removing...' : 'Confirm Removal & Notify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortalPage;