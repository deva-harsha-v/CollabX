import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, ChevronRight, Send, Paperclip, FileText, X, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getAccessibleChatRooms, getChatMessages, sendChatMessage } from '../lib/storage';

const ChatPanel = ({ room, currentUser, onBack }) => {
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
    const channel = supabase
      .channel('messages_page_' + room.room_id)
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

          setMessages((prev) => {
            if (prev.some((m) => m.id === formattedMsg.id)) return prev;
            return [...prev, formattedMsg];
          });
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      <div className="px-5 py-4 border-b border-[#0ea5e9]/30 bg-[#06142e]/80 flex items-center gap-3 shrink-0">
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

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    const { data } = await getAccessibleChatRooms();
    const loaded = data || [];
    setRooms(loaded);
    setLoadingRooms(false);
    if (loaded.length > 0 && !selectedRoom) {
      setSelectedRoom(loaded[0]);
      markChatRoomRead(loaded[0].room_id);
    }
  }, [selectedRoom, markChatRoomRead]);

  useEffect(() => {
    loadRooms();
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

  return (
    <div className="min-h-screen bg-[#06142e] text-[#f0f9ff] cyber-grid relative">
      <div className="absolute top-20 left-1/3 w-[600px] h-[400px] bg-[#0ea5e9]/10 rounded-full blur-[160px] pointer-events-none" />
      <Navbar />
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-8" style={{ height: 'calc(100vh - 0px)' }}>
        <div className="h-full flex flex-col">
          <div className="mb-4 shrink-0">
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
                  <span className="px-2 py-0.5 rounded-full bg-[#0ea5e9] text-[#f0f9ff] text-[10px] font-mono font-bold animate-pulse">
                    {notifications.filter(n => !n.read && n.type === 'chat_message').length} unread
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
                    <p className="font-semibold text-[#38bdf8] mb-1">No rooms yet</p>
                    <p className="text-[#38bdf8]/60 leading-relaxed text-[11px]">
                      Rooms appear here once a poster accepts your contact request, or when you accept a solver's request.
                    </p>
                  </div>
                ) : (
                  rooms.map((room) => {
                    const isActive = selectedRoom?.room_id === room.room_id;
                    const unreadRoomCount = notifications.filter(
                      (n) =>
                        !n.read &&
                        n.type === 'chat_message' &&
                        (n.payload?.room_id === room.room_id || n.payload?.roomId === room.room_id)
                    ).length;

                    return (
                      <button
                        key={room.room_id}
                        type="button"
                        onClick={() => handleSelectRoom(room)}
                        className={
                          'w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all border-b border-[#0ea5e9]/20 last:border-0 ' +
                          (isActive
                            ? 'bg-[#0ea5e9]/25 border-l-2 border-l-[#38bdf8]'
                            : 'hover:bg-[#0b2240]/60 border-l-2 border-l-transparent')
                        }
                      >
                        <div className="relative w-9 h-9 rounded-xl bg-[#0ea5e9]/20 border border-[#0ea5e9]/40 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-4 h-4 text-[#38bdf8]" />
                          {unreadRoomCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-90" />
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 shadow-[0_0_10px_#ef4444] border border-white/60" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-sm font-semibold text-[#f0f9ff] truncate">{room.post_title}</p>
                            {unreadRoomCount > 0 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-full bg-red-600 text-white border border-red-400/80 shadow-[0_0_8px_rgba(239,68,68,0.7)] shrink-0 animate-pulse">
                                {unreadRoomCount} NEW
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
                        <ChevronRight
                          className={
                            'w-4 h-4 shrink-0 transition-colors ' +
                            (isActive ? 'text-[#38bdf8]' : 'text-[#0ea5e9]/50')
                          }
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className={'flex-1 flex flex-col min-h-0 min-w-0 ' + (showChat ? 'flex' : 'hidden md:flex')}>
              <ChatPanel room={selectedRoom} currentUser={currentUser} onBack={() => setShowChat(false)} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MessagesPage;