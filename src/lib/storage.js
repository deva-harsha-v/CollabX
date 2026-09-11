/**
 * ============================================================================
 * CollabX Supabase & Data Storage Layer
 * ============================================================================
 * THIS MODULE IMPLEMENTS SUPABASE AUTH, DATABASE RPCs, RLS PRIVACY CONTROLS,
 * STORAGE BUCKETS, REAL-TIME CHAT, AND FALLBACK STORAGE SHIM.
 * 
 * Every function returns standard `{ data, error }`.
 * ============================================================================
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

const LOCAL_USERS = 'collabx_users';
const LOCAL_SESSION = 'collabx_session';
const LOCAL_POSTS = 'collabx_posts';
const LOCAL_NOTIFS = 'collabx_notifications';
const LOCAL_CONTACTS = 'collabx_contacts';
const LOCAL_CHAT_ROOMS = 'collabx_chat_rooms';
const LOCAL_CHAT_MSGS = 'collabx_chat_msgs';

// Local storage helper
const getLocal = (key, fallback = []) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const setLocal = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`localStorage set error for ${key}:`, e);
  }
};

/**
 * Auth: Get current session user
 */
export async function getCurrentUser() {
  if (isSupabaseConfigured) {
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session) return { data: null, error: sessionErr };

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profErr || !profile) return { data: null, error: profErr };

      return {
        data: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          avatar: profile.avatar_url,
          verification_uploaded: profile.verification_uploaded,
          verification_document_url: profile.verification_document_url,
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback Local Storage
  const session = getLocal(LOCAL_SESSION, null);
  return { data: session, error: null };
}

/**
 * Auth: Sign Up
 */
export async function signUp(userData) {
  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name)}`;

  if (isSupabaseConfigured) {
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name.trim(),
            phone: userData.phone || null,
            avatar_url: defaultAvatar,
          }
        }
      });

      if (authErr) return { data: null, error: authErr };
      if (!authData.user) return { data: null, error: { message: 'User registration failed.' } };

      const userId = authData.user.id;
      let avatarUrl = defaultAvatar;

      // Handle custom avatar upload if provided and session is authenticated
      if (userData.avatar && userData.avatar.startsWith('data:image')) {
        const fileName = `${userId}_${Date.now()}.png`;
        const blob = await (await fetch(userData.avatar)).blob();
        const { data: uploadData } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, blob, { contentType: 'image/png' });

        if (uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(fileName);
          avatarUrl = publicUrlData.publicUrl;

          // Update profile row with custom avatar URL
          await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
        }
      }

      // Upsert profile record as fallback (trigger already creates bare profile row server-side)
      const { error: profErr } = await supabase.from('profiles').upsert([{
        id: userId,
        name: userData.name.trim(),
        email: userData.email.toLowerCase().trim(),
        phone: userData.phone || null,
        avatar_url: avatarUrl,
        verification_uploaded: false,
      }], { onConflict: 'id' });

      if (profErr) {
        console.warn('Profile upsert notice (handled by DB trigger):', profErr.message);
      }

      const newUser = {
        id: userId,
        name: userData.name.trim(),
        email: userData.email.toLowerCase().trim(),
        phone: userData.phone || null,
        avatar: avatarUrl,
        verification_uploaded: false,
      };

      return { data: newUser, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback Local Storage
  const users = getLocal(LOCAL_USERS, []);
  if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
    return { data: null, error: { message: 'An account with this email already exists.' } };
  }

  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: userData.name.trim(),
    email: userData.email.toLowerCase().trim(),
    password: userData.password,
    phone: userData.phone || null,
    avatar: userData.avatar || defaultAvatar,
    verification_uploaded: false,
    verification_document_url: null,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  setLocal(LOCAL_USERS, users);
  setLocal(LOCAL_SESSION, newUser);

  return { data: newUser, error: null };
}

/**
 * Auth: Sign In
 */
export async function signIn(email, password) {
  if (isSupabaseConfigured) {
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authErr) return { data: null, error: authErr };

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      const user = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatar: profile.avatar_url,
        verification_uploaded: profile.verification_uploaded,
      };

      return { data: user, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback
  const users = getLocal(LOCAL_USERS, []);
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);
  if (!user) return { data: null, error: { message: 'Invalid email or password.' } };

  setLocal(LOCAL_SESSION, user);
  return { data: user, error: null };
}

/**
 * Auth: Sign Out
 */
export async function signOut() {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem(LOCAL_SESSION);
  return { data: true, error: null };
}

/**
 * Create Post: Stores required phone_number, optional skills, float coordinates
 */
export async function createPost(postData) {
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return { data: null, error: { message: 'Not authenticated.' } };

      let mediaUrl = null;
      if (postData.media && postData.media.startsWith('data:')) {
        const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const blob = await (await fetch(postData.media)).blob();
        const { data: uploadData } = await supabase.storage
          .from('post-media')
          .upload(fileName, blob);

        if (uploadData) {
          const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(fileName);
          mediaUrl = urlData.publicUrl;
        }
      }

      const { data: newPost, error: insertErr } = await supabase.from('posts').insert([{
        author_id: authData.user.id,
        title: postData.title.trim(),
        description: postData.description.trim(),
        organization: postData.organization ? postData.organization.trim() : null,
        skills: postData.skills && postData.skills.length > 0 ? postData.skills : null, // Nullable
        phone_number: postData.phone_number.trim(), // Required
        address: postData.address ? postData.address.trim() : null,
        latitude: postData.coordinates?.latitude || null, // Full unrounded float
        longitude: postData.coordinates?.longitude || null, // Full unrounded float
        media_url: mediaUrl,
        status: 'live',
      }]).select().single();

      if (insertErr) return { data: null, error: insertErr };

      return { data: newPost, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback Local Storage
  const posts = getLocal(LOCAL_POSTS, []);
  const session = getLocal(LOCAL_SESSION, {});

  const newPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    authorId: session.id,
    authorName: session.name,
    authorAvatar: session.avatar,
    title: postData.title.trim(),
    description: postData.description.trim(),
    skills: postData.skills || null,
    phone_number: postData.phone_number.trim(),
    organization: postData.organization ? postData.organization.trim() : null,
    address: postData.address ? postData.address.trim() : null,
    coordinates: postData.coordinates || null,
    media: postData.media || null,
    status: 'live',
    createdAt: new Date().toISOString(),
  };

  posts.unshift(newPost);
  setLocal(LOCAL_POSTS, posts);
  return { data: newPost, error: null };
}

/**
 * Fetch Public Feed (Calls RPC get_public_posts - NEVER returns phone or lat/lng)
 */
export async function getAllPosts() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_public_posts');
      if (error) return { data: [], error };
      return { data: data || [], error: null };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  }

  // Fallback: exclude deleted & completed posts, strip sensitive phone/coordinates
  const posts = getLocal(LOCAL_POSTS, []);
  const publicPosts = posts
    .filter(p => p.status === 'live')
    .map(p => ({
      id: p.id,
      author_id: p.authorId,
      author_name: p.authorName,
      author_avatar: p.authorAvatar,
      title: p.title,
      description: p.description,
      organization: p.organization,
      skills: p.skills,
      media_url: p.media,
      status: p.status,
      created_at: p.createdAt,
      // Stripped sensitive fields for public feed
      phone_number: null,
      latitude: null,
      longitude: null,
    }));

  return { data: publicPosts, error: null };
}

/**
 * Fetch Post Details (Calls RPC get_post_details - derives caller identity via auth.uid())
 */
export async function getPostDetails(postId) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_post_details', { p_post_id: postId });
      if (error) return { data: null, error };
      return { data: data?.[0] || null, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback Local Storage logic
  const posts = getLocal(LOCAL_POSTS, []);
  const session = getLocal(LOCAL_SESSION, {});
  const post = posts.find(p => p.id === postId);

  if (!post || post.status === 'deleted') return { data: null, error: null };

  const contacts = getLocal(LOCAL_CONTACTS, []);
  const userContact = contacts.find(c => c.post_id === postId && c.solver_id === session.id);
  const isAuthor = post.authorId === session.id;
  const isAccepted = isAuthor || userContact?.status === 'accepted';

  return {
    data: {
      id: post.id,
      author_id: post.authorId,
      author_name: post.authorName,
      author_avatar: post.authorAvatar,
      title: post.title,
      description: post.description,
      organization: post.organization,
      skills: post.skills,
      address: post.address,
      phone_number: isAccepted ? post.phone_number : null,
      latitude: isAccepted ? post.coordinates?.latitude : null,
      longitude: isAccepted ? post.coordinates?.longitude : null,
      media_url: post.media,
      status: post.status,
      created_at: post.createdAt,
      is_authorized: isAccepted,
      user_contact_status: isAuthor ? 'author' : (userContact?.status || 'none'),
    },
    error: null,
  };
}

/**
 * Fetch "My Posts" (Author view - includes live & completed posts, excludes soft-deleted)
 */
export async function getPostsByUser(userId) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', userId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  }

  const posts = getLocal(LOCAL_POSTS, []);
  const userPosts = posts.filter(p => p.authorId === userId && p.status !== 'deleted');
  return { data: userPosts, error: null };
}

/**
 * Fetch "My Ideas" (Posts where user is an accepted solver and status != 'deleted')
 */
export async function getMyIdeas() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_my_ideas');
      return { data: data || [], error };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  }

  const session = getLocal(LOCAL_SESSION, {});
  const contacts = getLocal(LOCAL_CONTACTS, []);
  const acceptedPostsIds = contacts
    .filter(c => c.solver_id === session.id && c.status === 'accepted')
    .map(c => c.post_id);

  const posts = getLocal(LOCAL_POSTS, []);
  const ideas = posts
    .filter(p => acceptedPostsIds.includes(p.id) && p.status !== 'deleted')
    .map(p => ({
      id: p.id,
      author_id: p.authorId,
      author_name: p.authorName,
      author_avatar: p.authorAvatar,
      title: p.title,
      description: p.description,
      organization: p.organization,
      skills: p.skills,
      address: p.address,
      phone_number: p.phone_number, // Unlocked for accepted solvers
      latitude: p.coordinates?.latitude,
      longitude: p.coordinates?.longitude,
      media_url: p.media,
      status: p.status,
      created_at: p.createdAt,
    }));

  return { data: ideas, error: null };
}

/**
 * Soft Delete Post (Sets status = 'deleted')
 */
export async function softDeletePost(postId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('posts')
      .update({ status: 'deleted' })
      .eq('id', postId);
    return { data, error };
  }

  const posts = getLocal(LOCAL_POSTS, []);
  const updated = posts.map(p => p.id === postId ? { ...p, status: 'deleted' } : p);
  setLocal(LOCAL_POSTS, updated);
  return { data: true, error: null };
}

/**
 * Mark Post Completed
 */
export async function completePost(postId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('posts')
      .update({ status: 'completed' })
      .eq('id', postId);
    return { data, error };
  }

  const posts = getLocal(LOCAL_POSTS, []);
  const updated = posts.map(p => p.id === postId ? { ...p, status: 'completed' } : p);
  setLocal(LOCAL_POSTS, updated);
  return { data: true, error: null };
}

/**
 * Verification Document Upload (Uploads to private verification-documents bucket)
 */
export async function updateVerificationDoc(userId, fileOrBase64) {
  if (isSupabaseConfigured) {
    try {
      let docPath = `doc_${userId}_${Date.now()}.pdf`;
      let blob;

      if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
        blob = await (await fetch(fileOrBase64)).blob();
      } else {
        blob = fileOrBase64;
      }

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('verification-documents')
        .upload(docPath, blob);

      if (uploadErr) return { data: null, error: uploadErr };

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          verification_uploaded: true,
          verification_document_url: docPath,
        })
        .eq('id', userId);

      if (updateErr) return { data: null, error: updateErr };

      return { data: { verification_uploaded: true, docPath }, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback
  const session = getLocal(LOCAL_SESSION, {});
  const updatedSession = {
    ...session,
    verification_uploaded: true,
    verification_document_url: typeof fileOrBase64 === 'string' ? fileOrBase64 : 'uploaded_doc.pdf',
  };
  setLocal(LOCAL_SESSION, updatedSession);

  const users = getLocal(LOCAL_USERS, []);
  const updatedUsers = users.map(u => u.id === userId ? { ...u, verification_uploaded: true } : u);
  setLocal(LOCAL_USERS, updatedUsers);

  return { data: updatedSession, error: null };
}

/**
 * Time-Limited Signed URL for Verification Document (Expires in 60 seconds)
 */
export async function createSignedVerificationUrl(targetUserId) {
  if (isSupabaseConfigured) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('verification_document_url')
        .eq('id', targetUserId)
        .single();

      if (!profile?.verification_document_url) return { data: null, error: null };

      // Request time-limited signed URL (60 seconds expiry)
      const { data, error } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(profile.verification_document_url, 60);

      return { data: data?.signedUrl || null, error };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  const users = getLocal(LOCAL_USERS, []);
  const u = users.find(user => user.id === targetUserId);
  return { data: u?.verification_document_url || null, error: null };
}

/**
 * Submit Contact Request & Notify Author
 */
export async function createContactRequest(postId) {
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return { data: null, error: { message: 'Not authenticated' } };

      const { data: post } = await supabase
        .from('posts')
        .select('author_id, title')
        .eq('id', postId)
        .single();

      const { data: reqData, error: reqErr } = await supabase
        .from('contact_requests')
        .insert([{
          post_id: postId,
          solver_id: authData.user.id,
          status: 'pending',
        }])
        .select()
        .single();

      if (reqErr) return { data: null, error: reqErr };

      // Insert notification for author
      await supabase.from('notifications').insert([{
        user_id: post.author_id,
        type: 'contact_request',
        payload: {
          request_id: reqData.id,
          post_id: postId,
          post_title: post.title,
          solver_id: authData.user.id,
        },
      }]);

      return { data: reqData, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback
  const session = getLocal(LOCAL_SESSION, {});
  const posts = getLocal(LOCAL_POSTS, []);
  const post = posts.find(p => p.id === postId);

  const contacts = getLocal(LOCAL_CONTACTS, []);
  const newReq = {
    id: `req_${Date.now()}`,
    post_id: postId,
    solver_id: session.id,
    solver_name: session.name,
    solver_avatar: session.avatar,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  contacts.push(newReq);
  setLocal(LOCAL_CONTACTS, contacts);

  // Add notification for author
  await addNotification(post.authorId, {
    message: `${session.name} requested to contact you regarding "${post.title}"`,
    type: 'contact_request',
    payload: {
      request_id: newReq.id,
      post_id: postId,
      post_title: post.title,
      solver_id: session.id,
      solver_name: session.name,
      solver_avatar: session.avatar,
    },
  });

  return { data: newReq, error: null };
}

/**
 * Poster Review: Accept or Reject Contact Request
 */
export async function updateContactRequestStatus(requestId, status, postId, solverId) {
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();

      const { data: updatedReq, error: reqErr } = await supabase
        .from('contact_requests')
        .update({ status })
        .eq('id', requestId)
        .select()
        .single();

      if (reqErr) return { data: null, error: reqErr };

      if (status === 'accepted') {
        // Ensure chat room exists for post
        let { data: room } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('post_id', postId)
          .single();

        if (!room) {
          const { data: newRoom } = await supabase
            .from('chat_rooms')
            .insert([{ post_id: postId }])
            .select()
            .single();
          room = newRoom;
        }

        // Add poster and solver to chat_participants
        if (room) {
          await supabase.from('chat_participants').upsert([
            { chat_room_id: room.id, user_id: authData.user.id },
            { chat_room_id: room.id, user_id: solverId },
          ]);
        }

        // Send accepted notification to solver
        await supabase.from('notifications').insert([{
          user_id: solverId,
          type: 'contact_accepted',
          payload: { post_id: postId, request_id: requestId },
        }]);
      } else if (status === 'rejected') {
        // Send rejected notification to solver
        await supabase.from('notifications').insert([{
          user_id: solverId,
          type: 'contact_rejected',
          payload: { post_id: postId, request_id: requestId },
        }]);
      }

      return { data: updatedReq, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback
  const contacts = getLocal(LOCAL_CONTACTS, []);
  const updatedContacts = contacts.map(c => c.id === requestId ? { ...c, status } : c);
  setLocal(LOCAL_CONTACTS, updatedContacts);

  if (status === 'accepted') {
    // Create local chat room
    const rooms = getLocal(LOCAL_CHAT_ROOMS, []);
    let room = rooms.find(r => r.post_id === postId);
    if (!room) {
      room = { id: `room_${Date.now()}`, post_id: postId, participants: [solverId] };
      rooms.push(room);
      setLocal(LOCAL_CHAT_ROOMS, rooms);
    }

    await addNotification(solverId, {
      message: `Your contact request for post has been accepted! Access unlocked.`,
      type: 'contact_accepted',
      payload: { post_id: postId },
    });
  } else {
    await addNotification(solverId, {
      message: `Your contact request was not selected at this time.`,
      type: 'contact_rejected',
      payload: { post_id: postId },
    });
  }

  return { data: true, error: null };
}

/**
 * Notifications: Fetch, Add, Mark Read
 */
export async function getNotifications(userId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  }

  const notifs = getLocal(LOCAL_NOTIFS, []);
  const userNotifs = notifs.filter(n => n.userId === userId);
  return { data: userNotifs, error: null };
}

export async function addNotification(userId, notification) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type: notification.type || 'info',
        payload: notification.payload || { message: notification.message },
        read: false,
      }])
      .select()
      .single();
    return { data, error };
  }

  const notifs = getLocal(LOCAL_NOTIFS, []);
  const newNotif = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    userId,
    message: notification.message || notification.payload?.message,
    type: notification.type || 'info',
    payload: notification.payload || {},
    read: false,
    createdAt: new Date().toISOString(),
  };

  notifs.unshift(newNotif);
  setLocal(LOCAL_NOTIFS, notifs);
  return { data: newNotif, error: null };
}

export async function markAllNotificationsRead(userId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);
    return { data, error };
  }

  const notifs = getLocal(LOCAL_NOTIFS, []);
  const updated = notifs.map(n => n.userId === userId ? { ...n, read: true } : n);
  setLocal(LOCAL_NOTIFS, updated);
  return { data: true, error: null };
}

/**
 * Real-Time Chat Rooms
 */
export async function getChatRoomForPost(postId) {
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      let { data: room, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('post_id', postId)
        .maybeSingle();

      if (!room && authData?.user) {
        const { data: postDetails } = await getPostDetails(postId);
        if (postDetails?.is_authorized) {
          const { data: newRoom, error: createRoomErr } = await supabase
            .from('chat_rooms')
            .insert([{ post_id: postId }])
            .select()
            .single();
          if (!createRoomErr) {
            room = newRoom;
          }
        }
      }

      if (room && authData?.user) {
        // Ensure current authorized user is in chat_participants
        await supabase.from('chat_participants').upsert([
          { chat_room_id: room.id, user_id: authData.user.id }
        ], { onConflict: 'chat_room_id, user_id' });
      }

      return { data: room || null, error: null };
    } catch (err) {
      console.error('[storage] getChatRoomForPost error:', err);
      return { data: null, error: { message: err.message } };
    }
  }

  const rooms = getLocal(LOCAL_CHAT_ROOMS, []);
  const room = rooms.find(r => r.post_id === postId);
  return { data: room || null, error: null };
}

export async function getChatMessages(roomId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, profiles:sender_id(name, avatar_url)')
      .eq('chat_room_id', roomId)
      .order('created_at', { ascending: true }); // Newest last for chat history
    return { data: data || [], error };
  }

  const msgs = getLocal(LOCAL_CHAT_MSGS, []);
  const roomMsgs = msgs.filter(m => m.chat_room_id === roomId);
  return { data: roomMsgs, error: null };
}

export async function sendChatMessage(roomId, content, attachmentFile) {
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();

      let attachmentUrl = null;
      let attachmentType = null;

      if (attachmentFile) {
        const fileExt = attachmentFile.name.split('.').pop();
        const fileName = `chat_${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, attachmentFile);

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(fileName);
          attachmentUrl = urlData.publicUrl;
          attachmentType = attachmentFile.type.startsWith('image/') ? 'image' : 'document';
        }
      }

      const { data: newMsg, error: msgErr } = await supabase
        .from('chat_messages')
        .insert([{
          chat_room_id: roomId,
          sender_id: authData.user.id,
          content: content ? content.trim() : null,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
        }])
        .select('*, profiles:sender_id(name, avatar_url)')
        .single();

      return { data: newMsg, error: msgErr };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback
  const session = getLocal(LOCAL_SESSION, {});
  const msgs = getLocal(LOCAL_CHAT_MSGS, []);

  const newMsg = {
    id: `msg_${Date.now()}`,
    chat_room_id: roomId,
    sender_id: session.id,
    sender_name: session.name,
    sender_avatar: session.avatar,
    content,
    createdAt: new Date().toISOString(),
  };

  msgs.push(newMsg);
  setLocal(LOCAL_CHAT_MSGS, msgs);
  return { data: newMsg, error: null };
}
