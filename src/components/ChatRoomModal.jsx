import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Paperclip, FileText, MessageSquare } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getChatRoomForPost, getChatMessages, sendChatMessage } from '../lib/storage';
import { useApp } from '../context/AppContext';

const ChatRoomModal = ({ postId, postTitle, isOpen, onClose }) => {
  const { currentUser } = useApp();

  const [roomId, setRoomId] = useState(null);
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

  const initChatRoom = useCallback(async () => {
    setLoading(true);
    setChatError('');
    const { data: room, error: roomErr } = await getChatRoomForPost(postId);
    
    if (roomErr) {
      setChatError(`Chat room load error: ${roomErr.message || roomErr}`);
    }

    if (room) {
      setRoomId(room.id);
      const { data: msgs, error: msgErr } = await getChatMessages(room.id);
      if (msgErr) {
        setChatError(`Error loading chat history: ${msgErr.message || msgErr}`);
      }
      setMessages(msgs || []);
      setLoading(false);
      setTimeout(scrollToBottom, 100);

      // Subscribe to Supabase Realtime for instant message updates
      if (isSupabaseConfigured) {
        const channel = supabase
          .channel(`chat_${room.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `chat_room_id=eq.${room.id}`,
            },
            async (payload) => {
              const newMsg = payload.new;
              // Fetch sender profile details
              const { data: prof } = await supabase
                .from('profiles')
                .select('name, avatar_url')
                .eq('id', newMsg.sender_id)
                .single();

              const formattedMsg = {
                ...newMsg,
                profiles: prof || { name: 'User', avatar_url: '' },
              };

              setMessages(prev => {
                if (prev.some(m => m.id === formattedMsg.id)) return prev;
                return [...prev, formattedMsg];
              });
              setTimeout(scrollToBottom, 100);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    } else {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (isOpen && postId) {
      initChatRoom();
    }
  }, [isOpen, postId, initChatRoom]);

  if (!isOpen) return null;

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachment(file);
    setAttachmentName(file.name);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachment) || !roomId) return;

    setChatError('');
    const content = inputText.trim();
    setInputText('');
    const attach = attachment;
    setAttachment(null);
    setAttachmentName('');

    const { data: newMsg, error: sendErr } = await sendChatMessage(roomId, content, attach);

    if (sendErr) {
      console.error('[ChatRoomModal] Send message failed:', sendErr.message || sendErr);
      setChatError(`Failed to send message: ${sendErr.message || 'Permission denied'}`);
      setInputText(content); // Restore input text so user does not lose message
      return;
    }

    if (newMsg) {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl h-[80vh] flex flex-col bg-[#0c1322] border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.25)] text-slate-100 overflow-hidden">
        
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-['Outfit'] text-white flex items-center gap-2">
                <span>Collaborative Chat Room</span>
                <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30 font-bold">
                  REALTIME
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-sm">
                Project: <span className="text-cyan-300 font-semibold">{postTitle || 'Civic Challenge'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visible Error Banner if send/load fails */}
        {chatError && (
          <div className="px-4 py-2 bg-red-950/90 border-b border-red-500/40 text-red-300 text-xs font-mono flex items-center justify-between shrink-0">
            <span>⚠️ {chatError}</span>
            <button onClick={() => setChatError('')} className="text-red-400 hover:text-white font-bold ml-2">✕</button>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 text-center text-cyan-400 font-mono text-xs flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Connecting to Realtime Chat Thread...</span>
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUser?.id;
              const senderName = msg.profiles?.name || msg.sender_name || 'Participant';
              const senderAvatar = msg.profiles?.avatar_url || msg.sender_avatar;

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-cyan-500/30 bg-slate-900 shrink-0 mt-1">
                    <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
                  </div>

                  <div className={`max-w-[75%] space-y-1 ${isMine ? 'text-right' : 'text-left'}`}>
                    <span className="text-[10px] font-mono text-slate-400 block px-1">
                      {senderName} • {new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isMine
                          ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-tr-none shadow-md'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.content && <p>{msg.content}</p>}

                      {/* Attachment Rendering */}
                      {msg.attachment_url && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          {msg.attachment_type === 'image' ? (
                            <img src={msg.attachment_url} alt="Attachment" className="max-h-48 rounded-lg object-cover" />
                          ) : (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 underline text-cyan-200 hover:text-white font-mono text-[11px]"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Attachment File</span>
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
            <div className="py-16 text-center text-slate-400 font-mono text-xs">
              No messages yet in this room. Start the collaboration!
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachment Selection Preview */}
        {attachmentName && (
          <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-cyan-300 font-mono">
            <span className="flex items-center gap-1.5 truncate">
              <Paperclip className="w-3.5 h-3.5" /> Attached: {attachmentName}
            </span>
            <button
              type="button"
              onClick={() => { setAttachment(null); setAttachmentName(''); }}
              className="text-slate-400 hover:text-red-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2 shrink-0">
          <label className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 cursor-pointer transition-colors shrink-0">
            <Paperclip className="w-4 h-4" />
            <input
              type="file"
              className="hidden"
              onChange={handleAttachmentChange}
            />
          </label>

          <input
            type="text"
            placeholder="Type a message or share technical updates..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
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
    </div>
  );
};

export default ChatRoomModal;
