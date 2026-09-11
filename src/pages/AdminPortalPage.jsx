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
  ShieldCheck
} from 'lucide-react';
import { 
  getAdminSession, 
  adminSignOut, 
  getAllAdminPosts, 
  getAllAdminUsers, 
  getAllAdminChatRooms, 
  adminDeletePost,
  createSignedVerificationUrl 
} from '../lib/storage';

const AdminPortalPage = () => {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteTargetPost, setDeleteTargetPost] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [loadingDocUser, setLoadingDocUser] = useState(null);

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
    const [postsRes, usersRes, roomsRes] = await Promise.all([
      getAllAdminPosts(),
      getAllAdminUsers(),
      getAllAdminChatRooms(),
    ]);
    setPosts(postsRes.data || []);
    setUsers(usersRes.data || []);
    setRooms(roomsRes.data || []);
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
      setActionSuccessMsg('Post removed. Reason dispatched to poster.');
      setDeleteTargetPost(null);
      setDeleteReason('');
      loadData();
      setTimeout(() => setActionSuccessMsg(''), 5000);
    }
  };

  const handleViewVerificationDoc = async (userId) => {
    setLoadingDocUser(userId);
    const { data: url } = await createSignedVerificationUrl(userId);
    setLoadingDocUser(null);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
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
    <div className="min-h-screen bg-[#0A1931] text-[#F6FAFD] cyber-grid">
      <header className="sticky top-0 z-40 bg-[#0A1931]/95 backdrop-blur-2xl border-b border-[#4A7FA7]/40 shadow-xl px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-[#1A3D63] to-[#4A7FA7] p-[1.5px] shadow-lg shadow-red-500/20">
              <div className="w-full h-full bg-[#0A1931] rounded-[10px] flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Outfit'] font-black text-lg text-[#F6FAFD]">
                  Collab<span className="text-[#B3CFE5]">X</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-[10px] font-mono font-bold text-red-300">
                  ADMIN SUPERVISOR
                </span>
              </div>
              <p className="text-[11px] text-[#B3CFE5]/70 font-mono">
                Logged in: <span className="text-[#F6FAFD] font-semibold">{adminUser?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/feed')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1A3D63] hover:bg-[#244b78] border border-[#4A7FA7]/40 text-[#B3CFE5] hover:text-[#F6FAFD] text-xs font-semibold transition-colors"
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

        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 border-b border-[#4A7FA7]/30">
          {[
            { id: 'overview', label: 'Overview & Metrics', icon: Layers, count: null },
            { id: 'problems', label: 'Challenges / Posts', icon: FileText, count: posts.length },
            { id: 'users', label: 'Users Directory', icon: Users, count: users.length },
            { id: 'documents', label: 'Verification Docs', icon: FileCheck2, count: verifiedUsersCount },
            { id: 'chatrooms', label: 'Chat Rooms', icon: MessageSquare, count: rooms.length },
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
                    ? 'bg-gradient-to-r from-[#4A7FA7] to-[#1A3D63] text-[#F6FAFD] border border-[#B3CFE5]/40 shadow-lg'
                    : 'bg-[#1A3D63]/60 hover:bg-[#1A3D63] text-[#B3CFE5] border border-[#4A7FA7]/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${isActive ? 'bg-[#0A1931] text-[#B3CFE5]' : 'bg-[#0A1931]/80 text-[#B3CFE5]/80'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab !== 'overview' && (
          <div className="mb-6 relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3CFE5]/60" />
            <input
              type="text"
              placeholder={`Filter ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1A3D63]/80 border border-[#4A7FA7]/40 rounded-xl text-xs text-[#F6FAFD] placeholder:text-[#B3CFE5]/50 focus:outline-none focus:border-[#B3CFE5] transition-colors"
            />
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-[#B3CFE5] font-mono text-sm flex items-center justify-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#B3CFE5] animate-ping" />
            <span>Fetching Comprehensive Platform Records...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="p-5 rounded-2xl bg-[#1A3D63]/80 border border-[#4A7FA7]/30 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center justify-between text-[#B3CFE5] mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider">Total Challenges</span>
                      <FileText className="w-5 h-5 text-[#B3CFE5]" />
                    </div>
                    <div className="text-3xl font-black font-['Outfit'] text-[#F6FAFD]">{posts.length}</div>
                    <div className="text-[11px] text-[#B3CFE5]/70 font-mono mt-2">
                      {livePostsCount} Live · {completedPostsCount} Completed · {deletedPostsCount} Deleted
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#1A3D63]/80 border border-[#4A7FA7]/30 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center justify-between text-[#B3CFE5] mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider">Registered Users</span>
                      <Users className="w-5 h-5 text-[#B3CFE5]" />
                    </div>
                    <div className="text-3xl font-black font-['Outfit'] text-[#F6FAFD]">{users.length}</div>
                    <div className="text-[11px] text-[#B3CFE5]/70 font-mono mt-2">
                      {verifiedUsersCount} Verified Solvers
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#1A3D63]/80 border border-[#4A7FA7]/30 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center justify-between text-[#B3CFE5] mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider">Active Chat Rooms</span>
                      <MessageSquare className="w-5 h-5 text-[#B3CFE5]" />
                    </div>
                    <div className="text-3xl font-black font-['Outfit'] text-[#F6FAFD]">{rooms.length}</div>
                    <div className="text-[11px] text-[#B3CFE5]/70 font-mono mt-2">
                      Collaborative Project Threads
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#1A3D63]/80 border border-[#4A7FA7]/30 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center justify-between text-[#B3CFE5] mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider">Verified Documents</span>
                      <FileCheck2 className="w-5 h-5 text-[#B3CFE5]" />
                    </div>
                    <div className="text-3xl font-black font-['Outfit'] text-[#F6FAFD]">{verifiedUsersCount}</div>
                    <div className="text-[11px] text-[#B3CFE5]/70 font-mono mt-2">
                      Credentials on File
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-[#1A3D63]/70 border border-[#4A7FA7]/30 backdrop-blur-xl shadow-xl">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#4A7FA7]/30">
                    <h3 className="font-['Outfit'] font-bold text-lg text-[#F6FAFD]">Recent Platform Challenges</h3>
                    <button
                      onClick={() => setActiveTab('problems')}
                      className="text-xs text-[#B3CFE5] hover:text-[#F6FAFD] font-semibold flex items-center gap-1"
                    >
                      <span>View All ({posts.length})</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {posts.slice(0, 5).map((post) => (
                      <div
                        key={post.id}
                        className="p-3.5 rounded-xl bg-[#0A1931]/80 border border-[#4A7FA7]/30 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-[#F6FAFD] truncate">{post.title}</span>
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
                          <p className="text-xs text-[#B3CFE5]/70 truncate">
                            Author: {post.author?.name || post.author_name || 'Author'} · {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <button
                          onClick={() => setSelectedPost(post)}
                          className="px-3 py-1.5 rounded-lg bg-[#1A3D63] hover:bg-[#244b78] border border-[#4A7FA7]/40 text-xs font-semibold text-[#F6FAFD] shrink-0"
                        >
                          Inspect
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'problems' && (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-5 rounded-2xl bg-[#1A3D63]/80 border border-[#4A7FA7]/30 hover:border-[#4A7FA7]/60 transition-all backdrop-blur-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-[#F6FAFD]">
                          {post.author?.name || post.author_name || 'Verified Poster'}
                        </span>
                        <span className="text-[#4A7FA7]/60">•</span>
                        <span className="text-[11px] font-mono text-[#B3CFE5]/80">
                          {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
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

                      <h3 className="font-['Outfit'] font-bold text-lg text-[#F6FAFD] mb-1">
                        {post.title}
                      </h3>

                      <p className="text-xs text-[#B3CFE5]/90 line-clamp-2 leading-relaxed">
                        {post.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedPost(post)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A1931] hover:bg-[#1A3D63] border border-[#4A7FA7]/40 text-[#F6FAFD] font-semibold text-xs transition-colors shadow-md"
                      >
                        <Eye className="w-4 h-4 text-[#B3CFE5]" />
                        <span>Inspect</span>
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

            {activeTab === 'users' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-5 rounded-2xl bg-[#1A3D63]/80 border border-[#4A7FA7]/30 backdrop-blur-xl shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-[#4A7FA7]/60 bg-[#0A1931] shrink-0">
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
                          <h4 className="font-bold text-sm text-[#F6FAFD] truncate">{user.name}</h4>
                          <p className="text-[11px] text-[#B3CFE5]/80 font-mono truncate">{user.email}</p>
                          {user.phone && (
                            <p className="text-[10px] text-[#B3CFE5]/60 font-mono mt-0.5">{user.phone}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-[#4A7FA7]/20">
                        <span className="text-[#B3CFE5]/70">Verification:</span>
                        {user.verification_uploaded ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED
                          </span>
                        ) : (
                          <span className="text-[#B3CFE5]/50">Unverified</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#4A7FA7]/20 flex gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="flex-1 py-2 rounded-xl bg-[#0A1931] hover:bg-[#1A3D63] border border-[#4A7FA7]/40 text-xs font-semibold text-[#F6FAFD] transition-colors"
                      >
                        Inspect User
                      </button>
                      {user.verification_uploaded && (
                        <button
                          onClick={() => handleViewVerificationDoc(user.id)}
                          disabled={loadingDocUser === user.id}
                          className="px-3 py-2 rounded-xl bg-[#4A7FA7]/30 hover:bg-[#4A7FA7]/50 border border-[#4A7FA7]/60 text-xs font-semibold text-[#B3CFE5] hover:text-[#F6FAFD] transition-colors"
                        >
                          {loadingDocUser === user.id ? 'Loading...' : 'View Doc'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.filter(u => u.verification_uploaded).map((user) => (
                  <div
                    key={user.id}
                    className="p-5 rounded-2xl bg-[#1A3D63]/80 border border-[#4A7FA7]/30 backdrop-blur-xl shadow-lg flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#4A7FA7]/20 border border-[#4A7FA7]/40 flex items-center justify-center text-[#B3CFE5] shrink-0">
                        <FileCheck2 className="w-5 h-5 text-[#B3CFE5]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#F6FAFD] truncate">{user.name}</p>
                        <p className="text-[11px] text-[#B3CFE5]/80 font-mono truncate">{user.email}</p>
                        <span className="text-[10px] text-emerald-300 font-mono">Document On File</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewVerificationDoc(user.id)}
                      disabled={loadingDocUser === user.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A7FA7]/30 hover:bg-[#4A7FA7]/50 border border-[#4A7FA7]/60 text-xs font-semibold text-[#F6FAFD] shrink-0 transition-colors shadow-md"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{loadingDocUser === user.id ? 'Generating URL...' : 'Inspect Doc'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'chatrooms' && (
              <div className="space-y-4">
                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-5 rounded-2xl bg-[#1A3D63]/80 border border-[#4A7FA7]/30 backdrop-blur-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-[#B3CFE5] shrink-0" />
                        <h4 className="font-bold text-sm text-[#F6FAFD] truncate">
                          {room.posts?.title || room.post_title || 'Untitled Project Room'}
                        </h4>
                      </div>
                      <p className="text-xs text-[#B3CFE5]/80 font-mono">
                        Room ID: {room.id} · Messages Count: {room.message_count || 0}
                      </p>
                    </div>

                    <div className="text-xs font-mono text-[#B3CFE5]/70 shrink-0">
                      Created: {new Date(room.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 sm:p-8 bg-[#1A3D63]/95 border border-[#4A7FA7]/40 rounded-3xl shadow-2xl text-[#F6FAFD]">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-6 right-6 p-2 text-[#B3CFE5] hover:text-[#F6FAFD] rounded-full bg-white/5 hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold font-['Outfit'] text-[#F6FAFD] mb-4">{selectedPost.title}</h2>
            <div className="p-4 rounded-xl bg-[#0A1931]/80 border border-[#4A7FA7]/30 text-xs font-mono space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-[#B3CFE5]/70">Author:</span>
                <span className="font-bold text-[#F6FAFD]">{selectedPost.author?.name || selectedPost.author_name || 'N/A'} ({selectedPost.author?.email || 'N/A'})</span>
              </div>
              {selectedPost.phone_number && (
                <div className="flex justify-between">
                  <span className="text-[#B3CFE5]/70">Phone:</span>
                  <span className="text-[#B3CFE5]">{selectedPost.phone_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#B3CFE5]/70">Status:</span>
                <span className="font-bold uppercase text-[#F6FAFD]">{selectedPost.status}</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#0A1931]/60 border border-[#4A7FA7]/20 text-xs text-[#F6FAFD] whitespace-pre-line mb-4">
              {selectedPost.description}
            </div>
            <div className="flex justify-end pt-4 border-t border-[#4A7FA7]/30">
              <button onClick={() => setSelectedPost(null)} className="px-5 py-2 rounded-xl bg-[#0A1931] border border-[#4A7FA7]/40 text-xs font-semibold text-[#B3CFE5]">Close</button>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg p-6 sm:p-8 bg-[#1A3D63]/95 border border-[#4A7FA7]/40 rounded-3xl shadow-2xl text-[#F6FAFD]">
            <button onClick={() => setSelectedUser(null)} className="absolute top-6 right-6 p-2 text-[#B3CFE5] hover:text-[#F6FAFD] rounded-full bg-white/5 hover:bg-white/10"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#4A7FA7] bg-[#0A1931] shrink-0">
                <img src={selectedUser.avatar_url} alt={selectedUser.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-['Outfit'] text-[#F6FAFD]">{selectedUser.name}</h3>
                <p className="text-xs text-[#B3CFE5] font-mono">{selectedUser.email}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#0A1931]/80 border border-[#4A7FA7]/30 text-xs font-mono space-y-2.5 mb-6">
              <div className="flex justify-between"><span className="text-[#B3CFE5]/70">User ID:</span><span className="text-[#F6FAFD] truncate max-w-[200px]">{selectedUser.id}</span></div>
              <div className="flex justify-between"><span className="text-[#B3CFE5]/70">Phone:</span><span className="text-[#F6FAFD]">{selectedUser.phone || 'Not provided'}</span></div>
              <div className="flex justify-between"><span className="text-[#B3CFE5]/70">Verification:</span><span className={selectedUser.verification_uploaded ? 'text-emerald-300 font-bold' : 'text-[#B3CFE5]/60'}>{selectedUser.verification_uploaded ? 'Document Verified' : 'No Document'}</span></div>
            </div>
            <div className="flex justify-end gap-3">
              {selectedUser.verification_uploaded && (
                <button onClick={() => handleViewVerificationDoc(selectedUser.id)} className="px-4 py-2 rounded-xl bg-[#4A7FA7]/30 hover:bg-[#4A7FA7]/50 border border-[#4A7FA7]/60 text-xs font-semibold text-[#F6FAFD] flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /><span>Inspect Verification Doc</span>
                </button>
              )}
              <button onClick={() => setSelectedUser(null)} className="px-5 py-2 rounded-xl bg-[#0A1931] border border-[#4A7FA7]/40 text-xs font-semibold text-[#B3CFE5]">Close</button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 sm:p-8 bg-[#1A3D63]/95 border border-red-500/50 rounded-3xl shadow-2xl text-[#F6FAFD]">
            <button onClick={() => setDeleteTargetPost(null)} className="absolute top-6 right-6 p-2 text-[#B3CFE5] hover:text-[#F6FAFD] rounded-full bg-white/5 hover:bg-white/10"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 text-red-400 text-xs font-mono uppercase font-bold mb-2">
              <AlertCircle className="w-4 h-4" /><span>Admin Post Removal Action</span>
            </div>
            <h3 className="text-xl font-bold font-['Outfit'] text-[#F6FAFD] mb-2">Remove Post: "{deleteTargetPost.title}"?</h3>
            <p className="text-xs text-[#B3CFE5] mb-4">Please state the reason for deleting this challenge. This explanation will be directly delivered as a formal notification to the problem poster.</p>
            <form onSubmit={handleConfirmDeletePost} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#B3CFE5] mb-1.5">Reason for Deletion <span className="text-red-400">*</span></label>
                <textarea rows="3" required placeholder="e.g. Violation of guidelines or duplicate submission." value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="w-full p-3 bg-[#0A1931] border border-[#4A7FA7]/40 rounded-xl text-xs text-[#F6FAFD] placeholder:text-[#B3CFE5]/40 focus:outline-none focus:border-red-400 transition-colors" />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setDeleteTargetPost(null)} className="px-4 py-2 rounded-xl bg-[#0A1931] border border-[#4A7FA7]/40 text-xs font-semibold text-[#B3CFE5]">Cancel</button>
                <button type="submit" disabled={isDeleting || !deleteReason.trim()} className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg disabled:opacity-50 transition-colors">{isDeleting ? 'Removing...' : 'Confirm Removal & Notify'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortalPage;