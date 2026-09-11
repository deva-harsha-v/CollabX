import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  getCurrentUser, 
  signOut as apiSignOut, 
  getAllPosts, 
  getNotifications, 
  markAllNotificationsRead,
  createPost as apiCreatePost,
  getPostsByUser,
  getMyIdeas
} from '../lib/storage';

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
        feedFilter,
        setFeedFilter,
        loginUser,
        logoutUser,
        refreshPosts,
        addNewPost,
        markNotificationsAsRead,
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
