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
        <div className="w-16 h-16 rounded-2xl bg-[#4A7FA7]/20 border border-[#4A7FA7]/40 flex items-center justify-center text-[#B3CFE5] mb-4">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="font-['Outfit'] font-bold text-xl text-[#F6FAFD] mb-2">Select a Chat Room</h3>
        <p className="text-sm text-[#B3CFE5]/70 max-w-xs">
          Pick a challenge from the left panel to open its collaboration chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-5 py-4 border-b border-[#4A7FA7]/30 bg-[#0A1931]/80 flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg bg-[#1A3D63] border border-[#4A7FA7]/40 text-[#B3CFE5] hover:text-[#F6FAFD] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-xl bg-[#4A7FA7]/20 border border-[#4A7FA7]/40 flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4 text-[#B3CFE5]" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-[#F6FAFD] font-['Outfit'] text-base truncate">{room.post_title}</h3>
          <span className="text-[10px] font-mono text-[#B3CFE5]/70">Collaboration Room · REALTIME</span>
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
          <div className="py-12 text-center text-[#B3CFE5] font-mono text-xs flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B3CFE5] animate-ping" />
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
                <div className="w-7 h-7 rounded-full overflow-hidden border border-[#4A7FA7]/40 bg-[#0A1931] shrink-0 mt-1">
                  <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
                </div>
                <div className={'max-w-[75%] space-y-1 ' + (isMine ? 'text-right' : 'text-left')}>
                  <span className="text-[10px] font-mono text-[#B3CFE5]/80 block px-1">
                    {senderName} · {new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div
                    className={
                      'p-3 rounded-2xl text-xs leading-relaxed ' +
                      (isMine
                        ? 'bg-gradient-to-r from-[#4A7FA7] to-[#1A3D63] border border-[#B3CFE5]/30 text-[#F6FAFD] rounded-tr-none shadow-md'
                        : 'bg-[#0A1931] border border-[#4A7FA7]/30 text-[#F6FAFD] rounded-tl-none')
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
                            className="inline-flex items-center gap-1.5 underline text-[#B3CFE5] hover:text-[#F6FAFD] font-mono text-[11px]"
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
          <div className="py-16 text-center text-[#B3CFE5]/70 font-mono text-xs">
            No messages yet. Start the collaboration!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {attachmentName && (
        <div className="px-4 py-2 bg-[#0A1931] border-t border-[#4A7FA7]/30 flex items-center justify-between text-xs text-[#B3CFE5] font-mono">
          <span className="flex items-center gap-1.5 truncate">
            <Paperclip className="w-3.5 h-3.5" /> {attachmentName}
          </span>
          <button
            type="button"
            onClick={() => { setAttachment(null); setAttachmentName(''); }}
            className="text-[#B3CFE5]/70 hover:text-red-400 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 bg-[#0A1931] border-t border-[#4A7FA7]/30 flex items-center gap-2 shrink-0"
      >
        <label className="p-2.5 rounded-xl bg-[#1A3D63] hover:bg-[#244b78] text-[#B3CFE5] hover:text-[#F6FAFD] cursor-pointer transition-colors shrink-0 border border-[#4A7FA7]/30">
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
          className="flex-1 px-4 py-2.5 bg-[#1A3D63]/80 border border-[#4A7FA7]/40 rounded-xl text-xs text-[#F6FAFD] placeholder:text-[#B3CFE5]/50 focus:outline-none focus:border-[#B3CFE5] transition-colors"
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
  const { currentUser } = useApp();
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
    if (loaded.length > 0 && !selectedRoom) setSelectedRoom(loaded[0]);
  }, [selectedRoom]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setShowChat(true);
  };

  return (
    <div className="min-h-screen bg-[#0A1931] text-[#F6FAFD] cyber-grid relative">
      <div className="absolute top-20 left-1/3 w-[600px] h-[400px] bg-[#4A7FA7]/10 rounded-full blur-[160px] pointer-events-none" />
      <Navbar />
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-8" style={{ height: 'calc(100vh - 0px)' }}>
        <div className="h-full flex flex-col">
          <div className="mb-4 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A3D63]/80 border border-[#4A7FA7]/40 text-[#B3CFE5] text-xs font-mono uppercase tracking-wider mb-2">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Messages</span>
            </div>
            <h1 className="font-['Outfit'] font-extrabold text-2xl sm:text-3xl text-[#F6FAFD] tracking-tight">
              Your Collaboration Rooms
            </h1>
            <p className="text-sm text-[#B3CFE5] mt-1">
              All challenge chat rooms you have access to as a poster or accepted solver.
            </p>
          </div>

          <div
            className="flex-1 min-h-0 flex rounded-2xl border border-[#4A7FA7]/30 overflow-hidden bg-[#1A3D63]/60 backdrop-blur-xl shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 11rem)' }}
          >
            <div
              className={
                'w-full md:w-72 lg:w-80 shrink-0 flex flex-col border-r border-[#4A7FA7]/30 bg-[#0A1931]/60 ' +
                (showChat ? 'hidden md:flex' : 'flex')
              }
            >
              <div className="px-4 py-3 border-b border-[#4A7FA7]/30 shrink-0">
                <span className="text-xs font-mono font-bold text-[#B3CFE5] uppercase tracking-wider">
                  Active Rooms ({rooms.length})
                </span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingRooms ? (
                  <div className="py-12 text-center text-[#B3CFE5]/70 font-mono text-xs flex flex-col items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#B3CFE5] animate-ping" />
                    Loading rooms...
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="py-12 px-4 text-center text-[#B3CFE5]/70 font-mono text-xs">
                    <MessageSquare className="w-8 h-8 mx-auto mb-3 text-[#4A7FA7]/50" />
                    <p className="font-semibold text-[#B3CFE5] mb-1">No rooms yet</p>
                    <p className="text-[#B3CFE5]/60 leading-relaxed text-[11px]">
                      Rooms appear here once a poster accepts your contact request, or when you accept a solver's request.
                    </p>
                  </div>
                ) : (
                  rooms.map((room) => {
                    const isActive = selectedRoom?.room_id === room.room_id;
                    return (
                      <button
                        key={room.room_id}
                        type="button"
                        onClick={() => handleSelectRoom(room)}
                        className={
                          'w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all border-b border-[#4A7FA7]/20 last:border-0 ' +
                          (isActive
                            ? 'bg-[#4A7FA7]/25 border-l-2 border-l-[#B3CFE5]'
                            : 'hover:bg-[#1A3D63]/60 border-l-2 border-l-transparent')
                        }
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#4A7FA7]/20 border border-[#4A7FA7]/40 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-4 h-4 text-[#B3CFE5]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#F6FAFD] truncate">{room.post_title}</p>
                          <p className="text-[10px] font-mono text-[#B3CFE5]/60 mt-0.5">
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
                            (isActive ? 'text-[#B3CFE5]' : 'text-[#4A7FA7]/50')
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