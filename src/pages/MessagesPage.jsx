import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, ChevronRight, Send, Paperclip, FileText, X, ArrowLeft, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getAccessibleChatRooms, getChatMessages, sendChatMessage, hideChatRoomForUser } from '../lib/storage';

const ChatPanel = ({ room, currentUser, onBack, onDeleteChat }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async () => {
    if (!room) return;
    setLoading(true);
    setChatError('');
    const { data: msgs, error } = await getChatMessages(room.room_id);
    if (error) setChatError('Failed to load messages: ' + error.message);
    setMessages(msgs || []);
    setLoading(false);
    setTimeout(scrollToBottom, 100);
  }, [room]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!room || !isSupabaseConfigured) return;
    const cleanId = room.room_id ? room.room_id.replace('room_', '') : '';
    const postId = room.post_id ? room.post_id.replace('room_', '') : '';
    const activeChannels = [];

    const handleIncomingMessage = (newMsg) => {
      if (!newMsg) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(scrollToBottom, 100);
    };

    // 1. Listen for Supabase Realtime WebSocket broadcasts on canonical room channel
    const ch1 = supabase
      .channel(`room_broadcast_${room.room_id}`, { config: { broadcast: { self: true } } })
      .on('broadcast', { event: 'chat_message' }, (payload) => handleIncomingMessage(payload?.payload))
      .subscribe();
    activeChannels.push(ch1);

    const ch2 = supabase
      .channel(`room_${room.room_id}`, { config: { broadcast: { self: true } } })
      .on('broadcast', { event: 'chat_message' }, (payload) => handleIncomingMessage(payload?.payload))
      .subscribe();
    activeChannels.push(ch2);

    if (postId && postId !== room.room_id) {
      const ch3 = supabase
        .channel(`room_broadcast_${postId}`, { config: { broadcast: { self: true } } })
        .on('broadcast', { event: 'chat_message' }, (payload) => handleIncomingMessage(payload?.payload))
        .subscribe();
      activeChannels.push(ch3);
    }

    // 2. Also listen for Postgres changes on chat_messages table
    const dbChannel = supabase
      .channel('messages_page_db_' + room.room_id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: 'chat_room_id=eq.' + room.room_id,
        },
        async (payload) => {
          const newMsg = payload.new;
          const { data: prof } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', newMsg.sender_id)
            .single();

          const formattedMsg = {
            ...newMsg,
            profiles: prof || { name: 'User', avatar_url: '' },
          };

          handleIncomingMessage(formattedMsg);
        }
      )
      .subscribe();
    activeChannels.push(dbChannel);

    if (postId && postId !== room.room_id) {
      const dbChannelPost = supabase
        .channel('messages_page_db_' + postId)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: 'chat_room_id=eq.' + postId,
          },
          async (payload) => {
            const newMsg = payload.new;
            const { data: prof } = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', newMsg.sender_id)
              .single();

            const formattedMsg = {
              ...newMsg,
              profiles: prof || { name: 'User', avatar_url: '' },
            };

            handleIncomingMessage(formattedMsg);
          }
        )
        .subscribe();
      activeChannels.push(dbChannelPost);
    }

    return () => {
      activeChannels.forEach((ch) => {
        try {
          supabase.removeChannel(ch);
        } catch (e) {}
      });
    };
  }, [room]);

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachment) || !room) return;

    setChatError('');
    const content = inputText.trim();
    const attach = attachment;
    setInputText('');
    setAttachment(null);
    setAttachmentName('');

    const { data: newMsg, error: sendErr } = await sendChatMessage(room.room_id, content, attach);

    if (sendErr) {
      setChatError('Failed to send: ' + (sendErr.message || 'Permission denied'));
      setInputText(content);
      return;
    }

    if (newMsg) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(scrollToBottom, 100);
    }
  };

  if (!room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-[#0ea5e9]/20 border border-[#0ea5e9]/40 flex items-center justify-center text-[#38bdf8] mb-4">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="font-['Outfit'] font-bold text-xl text-[#f0f9ff] mb-2">Select a Chat Room</h3>
        <p className="text-sm text-[#38bdf8]/70 max-w-xs">
          Pick a challenge from the left panel to open its collaboration chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-5 py-3.5 border-b border-[#0ea5e9]/30 bg-[#06142e]/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="md:hidden p-1.5 rounded-lg bg-[#0b2240] border border-[#0ea5e9]/40 text-[#38bdf8] hover:text-[#f0f9ff] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-[#0ea5e9]/20 border border-[#0ea5e9]/40 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[#f0f9ff] font-['Outfit'] text-base truncate">{room.post_title}</h3>
            <span className="text-[10px] font-mono text-[#38bdf8]/70">Collaboration Room · REALTIME</span>
          </div>
        </div>

        {/* Delete / Hide Chat Button */}
        {onDeleteChat && (
          <button
            type="button"
            onClick={() => onDeleteChat(room.room_id)}
            className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-400 hover:text-red-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm shrink-0"
            title="Delete this chatroom from your account"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete Chat</span>
          </button>
        )}
      </div>

      {chatError && (
        <div className="px-4 py-2 bg-red-950/90 border-b border-red-500/40 text-red-300 text-xs font-mono flex items-center justify-between shrink-0">
          <span>⚠️ {chatError}</span>
          <button onClick={() => setChatError('')} className="text-red-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 min-h-0">
        {loading ? (
          <div className="py-12 text-center text-[#38bdf8] font-mono text-xs flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
            <span>Loading chat history...</span>
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUser?.id;
            const senderName = msg.profiles?.name || msg.sender_name || 'Participant';
            const senderAvatar = msg.profiles?.avatar_url || msg.sender_avatar;

            return (
              <div
                key={msg.id}
                className={'flex items-start gap-2.5 ' + (isMine ? 'flex-row-reverse' : 'flex-row')}
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-[#0ea5e9]/40 bg-[#06142e] shrink-0 mt-1">
                  <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
                </div>
                <div className={'max-w-[75%] space-y-1 ' + (isMine ? 'text-right' : 'text-left')}>
                  <span className="text-[10px] font-mono text-[#38bdf8]/80 block px-1">
                    {senderName} · {new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div
                    className={
                      'p-3 rounded-2xl text-xs leading-relaxed ' +
                      (isMine
                        ? 'bg-gradient-to-r from-[#0ea5e9] to-[#0b2240] border border-[#38bdf8]/30 text-[#f0f9ff] rounded-tr-none shadow-md'
                        : 'bg-[#06142e] border border-[#0ea5e9]/30 text-[#f0f9ff] rounded-tl-none')
                    }
                  >
                    {msg.content && <p>{msg.content}</p>}
                    {msg.attachment_url && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        {msg.attachment_type === 'image' ? (
                          <img src={msg.attachment_url} alt="Attachment" className="max-h-48 rounded-lg object-cover" />
                        ) : (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 underline text-[#38bdf8] hover:text-[#f0f9ff] font-mono text-[11px]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Attachment</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center text-[#38bdf8]/70 font-mono text-xs">
            No messages yet. Start the collaboration!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {attachmentName && (
        <div className="px-4 py-2 bg-[#06142e] border-t border-[#0ea5e9]/30 flex items-center justify-between text-xs text-[#38bdf8] font-mono">
          <span className="flex items-center gap-1.5 truncate">
            <Paperclip className="w-3.5 h-3.5" /> {attachmentName}
          </span>
          <button
            type="button"
            onClick={() => { setAttachment(null); setAttachmentName(''); }}
            className="text-[#38bdf8]/70 hover:text-red-400 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 bg-[#06142e] border-t border-[#0ea5e9]/30 flex items-center gap-2 shrink-0"
      >
        <label className="p-2.5 rounded-xl bg-[#0b2240] hover:bg-[#143d6e] text-[#38bdf8] hover:text-[#f0f9ff] cursor-pointer transition-colors shrink-0 border border-[#0ea5e9]/30">
          <Paperclip className="w-4 h-4" />
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setAttachment(f); setAttachmentName(f.name); }
            }}
          />
        </label>
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-[#0b2240]/80 border border-[#0ea5e9]/40 rounded-xl text-xs text-[#f0f9ff] placeholder:text-[#38bdf8]/50 focus:outline-none focus:border-[#38bdf8] transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim() && !attachment}
          className="red-pill-button px-5 py-2.5 text-xs font-bold shadow-md disabled:opacity-40 shrink-0"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5 ml-1 inline" />
        </button>
      </form>
    </div>
  );
};

const MessagesPage = () => {
  const { currentUser, notifications, markChatRoomRead, refreshNotifications } = useApp();
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [deleteToast, setDeleteToast] = useState('');

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    const { data } = await getAccessibleChatRooms();
    const loaded = data || [];
    setRooms(loaded);
    setLoadingRooms(false);
    if (loaded.length > 0 && !selectedRoom) {
      setSelectedRoom(loaded[0]);
      markChatRoomRead(loaded[0].room_id);
    } else if (loaded.length === 0) {
      setSelectedRoom(null);
    }
  }, [selectedRoom, markChatRoomRead]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    const handleRoomsUpdate = () => {
      loadRooms();
    };
    window.addEventListener('collabx_rooms_update', handleRoomsUpdate);
    window.addEventListener('storage', handleRoomsUpdate);
    return () => {
      window.removeEventListener('collabx_rooms_update', handleRoomsUpdate);
      window.removeEventListener('storage', handleRoomsUpdate);
    };
  }, [loadRooms]);

  useEffect(() => {
    if (selectedRoom?.room_id) {
      markChatRoomRead(selectedRoom.room_id);
    }
  }, [selectedRoom, markChatRoomRead]);

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setShowChat(true);
    markChatRoomRead(room.room_id);
  };

  const handleDeleteRoom = (e, roomId) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentUser?.id || !roomId) return;

    hideChatRoomForUser(roomId, currentUser.id);

    setDeleteToast('Chatroom deleted from your account. It will reappear if someone sends a new message.');
    setTimeout(() => setDeleteToast(''), 5000);

    if (selectedRoom?.room_id === roomId || selectedRoom?.post_id === roomId) {
      const remaining = rooms.filter(r => r.room_id !== roomId && r.post_id !== roomId);
      if (remaining.length > 0) {
        setSelectedRoom(remaining[0]);
      } else {
        setSelectedRoom(null);
        setShowChat(false);
      }
    }
    loadRooms();
  };

  return (
    <div className="min-h-screen bg-[#06142e] text-[#f0f9ff] cyber-grid relative">
      <div className="absolute top-20 left-1/3 w-[600px] h-[400px] bg-[#0ea5e9]/10 rounded-full blur-[160px] pointer-events-none" />
      <Navbar />
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-8" style={{ height: 'calc(100vh - 0px)' }}>
        <div className="h-full flex flex-col">
          <div className="mb-4 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0b2240]/80 border border-[#0ea5e9]/40 text-[#38bdf8] text-xs font-mono uppercase tracking-wider mb-2">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Messages</span>
              </div>
              <h1 className="font-['Outfit'] font-extrabold text-2xl sm:text-3xl text-[#f0f9ff] tracking-tight">
                Your Collaboration Rooms
              </h1>
              <p className="text-sm text-[#38bdf8] mt-1">
                All challenge chat rooms you have access to as a poster or accepted solver.
              </p>
            </div>

            {deleteToast && (
              <div className="px-4 py-2 bg-[#0ea5e9]/20 border border-[#0ea5e9]/50 rounded-xl text-xs font-mono text-[#f0f9ff] flex items-center justify-between gap-2 shadow-lg animate-fade-in">
                <span>🗑️ {deleteToast}</span>
                <button onClick={() => setDeleteToast('')} className="text-[#38bdf8] hover:text-white font-bold">✕</button>
              </div>
            )}
          </div>

          <div
            className="flex-1 min-h-0 flex rounded-2xl border border-[#0ea5e9]/30 overflow-hidden bg-[#0b2240]/60 backdrop-blur-xl shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 11rem)' }}
          >
            <div
              className={
                'w-full md:w-72 lg:w-80 shrink-0 flex flex-col border-r border-[#0ea5e9]/30 bg-[#06142e]/60 ' +
                (showChat ? 'hidden md:flex' : 'flex')
              }
            >
              <div className="px-4 py-3 border-b border-[#0ea5e9]/30 shrink-0 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#38bdf8] uppercase tracking-wider">
                  Active Rooms ({rooms.length})
                </span>
                {notifications.filter(n => !n.read && n.type === 'chat_message').length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-mono font-black border border-red-300 shadow-[0_0_12px_rgba(239,68,68,0.85)] animate-pulse">
                    {notifications.filter(n => !n.read && n.type === 'chat_message').length} UNREAD
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingRooms ? (
                  <div className="py-12 text-center text-[#38bdf8]/70 font-mono text-xs flex flex-col items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
                    Loading rooms...
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="py-12 px-4 text-center text-[#38bdf8]/70 font-mono text-xs">
                    <MessageSquare className="w-8 h-8 mx-auto mb-3 text-[#0ea5e9]/50" />
                    <p className="font-semibold text-[#38bdf8] mb-1">No rooms</p>
                    <p className="text-[#38bdf8]/60 leading-relaxed text-[11px]">
                      Rooms appear here when you collaborate on challenges. Deleted rooms will reappear if a new message is sent.
                    </p>
                  </div>
                ) : (
                  rooms.map((room) => {
                    const isActive = selectedRoom?.room_id === room.room_id;
                    const cleanRoomId = room.room_id ? room.room_id.replace('room_', '') : '';
                    const cleanPostId = room.post_id ? room.post_id.replace('room_', '') : '';
                    const unreadRoomCount = notifications.filter((n) => {
                      if (n.read || n.type !== 'chat_message') return false;
                      const p = n.payload || {};
                      const rId = p.room_id || p.roomId;
                      const cleanRId = rId ? rId.replace('room_', '') : '';
                      const pId = p.post_id || p.postId;
                      const cleanPId = pId ? pId.replace('room_', '') : '';
                      return (
                        rId === room.room_id ||
                        rId === cleanRoomId ||
                        cleanRId === cleanRoomId ||
                        pId === room.post_id ||
                        pId === cleanPostId ||
                        cleanPId === cleanPostId ||
                        (rId && room.room_id.includes(rId)) ||
                        (pId && room.post_id.includes(pId))
                      );
                    }).length;

                    return (
                      <div
                        key={room.room_id}
                        className={
                          'w-full text-left px-4 py-3.5 flex items-center gap-2.5 transition-all border-b border-[#0ea5e9]/20 last:border-0 group ' +
                          (isActive
                            ? 'bg-[#0ea5e9]/25 border-l-2 border-l-[#38bdf8]'
                            : unreadRoomCount > 0
                            ? 'bg-red-950/20 border-l-2 border-l-red-500/80 hover:bg-red-950/35'
                            : 'hover:bg-[#0b2240]/60 border-l-2 border-l-transparent')
                        }
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectRoom(room)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            unreadRoomCount > 0 
                              ? 'bg-red-950/60 border border-red-500/60' 
                              : 'bg-[#0ea5e9]/20 border border-[#0ea5e9]/40'
                          }`}>
                            <MessageSquare className={`w-4 h-4 ${unreadRoomCount > 0 ? 'text-red-400' : 'text-[#38bdf8]'}`} />
                            {unreadRoomCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-90" />
                                <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-gradient-to-r from-red-600 to-rose-600 text-[9px] font-black text-white shadow-[0_0_10px_#ef4444] border border-white/80">
                                  {unreadRoomCount > 9 ? '9+' : unreadRoomCount}
                                </span>
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className={`text-sm truncate ${unreadRoomCount > 0 ? 'font-bold text-[#f0f9ff]' : 'font-semibold text-[#f0f9ff]'}`}>
                                {room.post_title}
                              </p>
                              {unreadRoomCount > 0 && (
                                <span className="px-2 py-0.5 text-[9px] font-mono font-black rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white border border-red-300 shadow-[0_0_10px_rgba(239,68,68,0.85)] shrink-0 animate-pulse flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                  <span>{unreadRoomCount} NEW</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-[#38bdf8]/60 mt-0.5">
                              {new Date(room.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </button>

                        {/* Individual Delete Chatroom Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRoom(e, room.room_id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#38bdf8]/50 hover:text-red-400 hover:bg-red-500/20 transition-all shrink-0"
                          title="Delete chat from your account (reappears on new message)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <ChevronRight
                          onClick={() => handleSelectRoom(room)}
                          className={
                            'w-4 h-4 shrink-0 cursor-pointer transition-colors ' +
                            (isActive ? 'text-[#38bdf8]' : 'text-[#0ea5e9]/50')
                          }
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className={'flex-1 flex flex-col min-h-0 min-w-0 ' + (showChat ? 'flex' : 'hidden md:flex')}>
              <ChatPanel
                room={selectedRoom}
                currentUser={currentUser}
                onBack={() => setShowChat(false)}
                onDeleteChat={(rId) => handleDeleteRoom(null, rId)}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MessagesPage;