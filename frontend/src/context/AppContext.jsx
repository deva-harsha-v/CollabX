import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  getCurrentUser, 
  signOut as apiSignOut, 
  getAllPosts, 
  getNotifications, 
  markAllNotificationsRead,
  markChatRoomNotificationsRead,
  createPost as apiCreatePost,
  getPostsByUser,
  getMyIdeas,
  syncDeletedPostsForUser,
  getLocal
} from '../lib/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  const [posts, setPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Active filter state: 'all' | 'my_posts' | 'my_ideas'
  const [feedFilter, setFeedFilter] = useState('all');

  const refreshUser = useCallback(async () => {
    setLoadingUser(true);
    const { data } = await getCurrentUser();
    setCurrentUser(data);
    if (data) {
      await syncDeletedPostsForUser(data);
    }
    setLoadingUser(false);
  }, []);

  const refreshPosts = useCallback(async () => {
    if (currentUser) {
      await syncDeletedPostsForUser(currentUser);
    }
    if (feedFilter === 'my_posts' && currentUser?.id) {
      const { data } = await getPostsByUser(currentUser.id);
      setPosts(data || []);
    } else if (feedFilter === 'my_ideas' && currentUser?.id) {
      const { data } = await getMyIdeas();
      setPosts(data || []);
    } else {
      const { data } = await getAllPosts();
      setPosts(data || []);
    }
  }, [feedFilter, currentUser]);

  const refreshNotifications = useCallback(async (userId) => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    const { data } = await getNotifications(userId);
    setNotifications(data || []);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  useEffect(() => {
    if (currentUser?.id) {
      refreshNotifications(currentUser.id);

      // Ultra-responsive polling every 2 seconds
      const interval = setInterval(() => {
        refreshNotifications(currentUser.id);
      }, 2000);

      const handleStorageUpdate = () => {
        refreshNotifications(currentUser.id);
      };
      window.addEventListener('storage', handleStorageUpdate);
      window.addEventListener('collabx_notif_update', handleStorageUpdate);

      // Supabase Realtime WebSocket Broadcast subscription for instant cross-browser / cross-account notifications
      let broadcastChannel;
      let notifChannel;
      let msgChannel;

      if (isSupabaseConfigured) {
        broadcastChannel = supabase
          .channel('collabx_global_notifications', {
            config: { broadcast: { self: true } }
          })
          .on('broadcast', { event: 'new_notification' }, (event) => {
            const data = event.payload;
            if (data && (!data.recipientIds || data.recipientIds.includes(currentUser.id) || data.recipient_id === currentUser.id)) {
              if (data.notification) {
                setNotifications((prev) => [data.notification, ...prev.filter((n) => n.id !== data.notification.id)]);
              }
              refreshNotifications(currentUser.id);
            }
          })
          .on('broadcast', { event: 'chat_activity' }, () => {
            refreshNotifications(currentUser.id);
          })
          .subscribe();

        notifChannel = supabase
          .channel(`user_notifs_${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUser.id}`,
            },
            (payload) => {
              const newNotif = payload.new;
              setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUser.id}`,
            },
            (payload) => {
              const updatedNotif = payload.new;
              setNotifications((prev) =>
                prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
              );
            }
          )
          .subscribe();

        msgChannel = supabase
          .channel(`user_chat_events_${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
            },
            () => {
              refreshNotifications(currentUser.id);
            }
          )
          .subscribe();
      }

      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageUpdate);
        window.removeEventListener('collabx_notif_update', handleStorageUpdate);
        if (broadcastChannel) supabase.removeChannel(broadcastChannel);
        if (notifChannel) supabase.removeChannel(notifChannel);
        if (msgChannel) supabase.removeChannel(msgChannel);
      };
    } else {
      setNotifications([]);
    }
  }, [currentUser, refreshNotifications]);

  const loginUser = (user) => {
    setCurrentUser(user);
    setFeedFilter('all');
  };

  const logoutUser = async () => {
    await apiSignOut();
    setCurrentUser(null);
    setNotifications([]);
    setFeedFilter('all');
  };

  const addNewPost = async (postData) => {
    let user = currentUser;
    if (!user) {
      const local = getLocal('collabx_session', null);
      if (local?.id) {
        user = local;
        setCurrentUser(local);
      }
    }
    if (!user) return { data: null, error: { message: 'Must be logged in to post' } };

    const isEmg = Boolean(postData.is_emergency || user.is_emergency || user.emergency_first_post_pending);
    const { data: newPost, error: postErr } = await apiCreatePost({
      ...postData,
      is_emergency: isEmg,
    });
    if (postErr) return { data: null, error: postErr };

    // Refresh feed
    await refreshPosts();
    return { data: newPost, error: null };
  };

  const markNotificationsAsRead = async () => {
    if (!currentUser?.id) return;
    await markAllNotificationsRead(currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markChatRoomRead = useCallback(async (roomId) => {
    if (!roomId) return;
    const cleanId = roomId.replace('room_', '');
    setNotifications(prev =>
      prev.map(n => {
        if (n.type === 'chat_message') {
          const p = n.payload || {};
          const rId = p.room_id || p.roomId;
          const cleanRId = rId ? rId.replace('room_', '') : '';
          const pId = p.post_id || p.postId;
          const cleanPId = pId ? pId.replace('room_', '') : '';
          if (
            rId === roomId || rId === cleanId || cleanRId === cleanId ||
            pId === roomId || pId === cleanId || cleanPId === cleanId ||
            (rId && roomId.includes(rId)) || (pId && roomId.includes(pId))
          ) {
            return { ...n, read: true };
          }
        }
        return n;
      })
    );
    if (currentUser?.id) {
      await markChatRoomNotificationsRead(roomId, currentUser.id);
      refreshNotifications(currentUser.id);
    }
  }, [currentUser, refreshNotifications]);

  const unreadChatCount = notifications.filter(n => !n.read && n.type === 'chat_message').length;
  const unreadGeneralCount = notifications.filter(n => !n.read && n.type !== 'chat_message').length;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        loadingUser,
        posts,
        notifications,
        unreadCount,
        unreadChatCount,
        unreadGeneralCount,
        feedFilter,
        setFeedFilter,
        loginUser,
        logoutUser,
        refreshPosts,
        refreshNotifications,
        addNewPost,
        markNotificationsAsRead,
        markChatRoomRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
