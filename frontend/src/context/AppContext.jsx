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
  getMyIdeas
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
    setLoadingUser(false);
  }, []);

  const refreshPosts = useCallback(async () => {
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

      // Polling interval every 4 seconds for notifications & chat alerts
      const interval = setInterval(() => {
        refreshNotifications(currentUser.id);
      }, 4000);

      // Supabase Realtime subscription on notifications table (both INSERT and UPDATE)
      let channel;
      if (isSupabaseConfigured) {
        channel = supabase
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
      }

      return () => {
        clearInterval(interval);
        if (channel) supabase.removeChannel(channel);
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
    if (!currentUser) return { data: null, error: { message: 'Must be logged in to post' } };

    const { data: newPost, error: postErr } = await apiCreatePost(postData);
    if (postErr) return { data: null, error: postErr };

    // Refresh feed
    refreshPosts();
    return { data: newPost, error: null };
  };

  const markNotificationsAsRead = async () => {
    if (!currentUser?.id) return;
    await markAllNotificationsRead(currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markChatRoomRead = useCallback(async (roomId) => {
    if (!roomId) return;
    setNotifications(prev =>
      prev.map(n => {
        if (n.type === 'chat_message' && (n.payload?.room_id === roomId || n.payload?.roomId === roomId)) {
          return { ...n, read: true };
        }
        return n;
      })
    );
    if (currentUser?.id) {
      await markChatRoomNotificationsRead(roomId, currentUser.id);
    }
  }, [currentUser]);

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
