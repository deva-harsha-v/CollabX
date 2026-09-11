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

      const localSkills = getLocal(`collabx_user_skills_${profile.id}`, []);
      const userSkills = Array.isArray(profile.skills) && profile.skills.length > 0 
        ? profile.skills 
        : localSkills;

      return {
        data: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          avatar: profile.avatar_url,
          skills: userSkills,
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
  if (session) {
    const localSkills = getLocal(`collabx_user_skills_${session.id}`, session.skills || []);
    return { data: { ...session, skills: localSkills }, error: null };
  }
  return { data: null, error: null };
}

/**
 * Auth: Sign Up
 */
export async function signUp(userData) {
  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name)}`;
  const skills = Array.isArray(userData.skills) ? userData.skills : [];

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

      // Save user skills in local cache map
      setLocal(`collabx_user_skills_${userId}`, skills);

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
        skills: skills.length > 0 ? skills : null,
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
        skills: skills,
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

  const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  setLocal(`collabx_user_skills_${newUserId}`, skills);

  const newUser = {
    id: newUserId,
    name: userData.name.trim(),
    email: userData.email.toLowerCase().trim(),
    password: userData.password,
    phone: userData.phone || null,
    avatar: userData.avatar || defaultAvatar,
    skills: skills,
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

      const localSkills = getLocal(`collabx_user_skills_${profile.id}`, []);
      const userSkills = Array.isArray(profile.skills) && profile.skills.length > 0 
        ? profile.skills 
        : localSkills;

      const user = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatar: profile.avatar_url,
        skills: userSkills,
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

  const localSkills = getLocal(`collabx_user_skills_${user.id}`, user.skills || []);
  const userWithSkills = { ...user, skills: localSkills };

  setLocal(LOCAL_SESSION, userWithSkills);
  return { data: userWithSkills, error: null };
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

export function extractPostProgress(post) {
  if (!post) return 0;
  // 1. Check local progress map cache first for author's instant updates
  const localMap = getLocal('collabx_post_progress_map', {});
  if (post.id && typeof localMap[post.id] === 'number') {
    return localMap[post.id];
  }
  // 2. Check skills array where __progress:XX is encoded and persisted to Supabase
  if (Array.isArray(post.skills)) {
    const progItem = post.skills.find(s => typeof s === 'string' && s.startsWith('__progress:'));
    if (progItem) {
      const parsed = parseInt(progItem.replace('__progress:', ''), 10);
      if (!isNaN(parsed)) return parsed;
    }
  }
  // 3. Check direct column if present in table
  if (typeof post.progress === 'number') {
    return post.progress;
  }
  return 0;
}

export function cleanPostSkills(skills) {
  if (!Array.isArray(skills)) return [];
  return skills.filter(s => typeof s === 'string' && !s.startsWith('__progress:'));
}

/**
 * Fetch Public Feed (ONLY 'live' challenges — NEVER shows completed or deleted posts)
 */
export async function getAllPosts() {
  if (isSupabaseConfigured) {
    try {
      // Direct table query for LIVE posts only
      const { data: directPosts, error: directErr } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false });

      if (!directErr && directPosts) {
        return { 
          data: directPosts.map(p => ({ 
            ...p, 
            skills: cleanPostSkills(p.skills),
            progress: extractPostProgress(p),
            phone_number: null,
            latitude: null,
            longitude: null,
          })), 
          error: null 
        };
      }

      // Fallback RPC if direct query fails (filter strictly to status == 'live')
      const { data, error } = await supabase.rpc('get_public_posts');
      if (error) return { data: [], error };
      return { 
        data: (data || [])
          .filter(p => p.status === 'live')
          .map(p => ({ 
            ...p, 
            skills: cleanPostSkills(p.skills),
            progress: extractPostProgress(p),
            phone_number: null,
            latitude: null,
            longitude: null,
          })), 
        error: null 
      };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  }

  // Fallback Local Storage: strictly 'live' posts
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
      skills: cleanPostSkills(p.skills),
      media_url: p.media,
      status: p.status,
      created_at: p.createdAt,
      progress: extractPostProgress(p),
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
      const { data: postRow, error: postErr } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (postRow) {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        const isAuthor = userId && postRow.author_id === userId;

        let contactStatus = 'none';
        if (userId && !isAuthor) {
          const { data: contact } = await supabase
            .from('contact_requests')
            .select('status')
            .eq('post_id', postId)
            .eq('solver_id', userId)
            .maybeSingle();
          contactStatus = contact?.status || 'none';
        }

        const isAccepted = isAuthor || contactStatus === 'accepted';

        return {
          data: {
            id: postRow.id,
            author_id: postRow.author_id,
            author_name: postRow.author_name,
            author_avatar: postRow.author_avatar,
            author_email: isAccepted ? postRow.author_email : null,
            title: postRow.title,
            description: postRow.description,
            organization: postRow.organization,
            skills: cleanPostSkills(postRow.skills),
            address: postRow.address,
            phone_number: isAccepted ? postRow.phone_number : null,
            latitude: isAccepted ? postRow.latitude : null,
            longitude: isAccepted ? postRow.longitude : null,
            media_url: postRow.media_url,
            status: postRow.status,
            progress: extractPostProgress(postRow),
            created_at: postRow.created_at,
            is_authorized: isAccepted,
            user_contact_status: isAuthor ? 'author' : contactStatus,
          },
          error: null,
        };
      }

      const { data, error } = await supabase.rpc('get_post_details', { p_post_id: postId });
      if (error) return { data: null, error };
      const detail = data?.[0] || null;
      if (detail) {
        return { 
          data: { 
            ...detail, 
            skills: cleanPostSkills(detail.skills),
            progress: extractPostProgress(detail) 
          }, 
          error: null 
        };
      }
      return { data: null, error: null };
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
      skills: cleanPostSkills(post.skills),
      address: post.address,
      phone_number: isAccepted ? post.phone_number : null,
      latitude: isAccepted ? post.coordinates?.latitude : null,
      longitude: isAccepted ? post.coordinates?.longitude : null,
      media_url: post.media,
      status: post.status,
      progress: extractPostProgress(post),
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

      return { 
        data: (data || []).map(p => ({ 
          ...p, 
          skills: cleanPostSkills(p.skills),
          progress: extractPostProgress(p) 
        })), 
        error 
      };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  }

  const posts = getLocal(LOCAL_POSTS, []);
  const userPosts = posts
    .filter(p => p.authorId === userId && p.status !== 'deleted')
    .map(p => ({ 
      ...p, 
      skills: cleanPostSkills(p.skills),
      progress: extractPostProgress(p) 
    }));
  return { data: userPosts, error: null };
}

/**
 * Fetch "My Ideas" (Posts where user is an accepted solver and status != 'deleted')
 */
export async function getMyIdeas() {
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return { data: [], error: null };

      // Get accepted contact requests
      const { data: contacts, error: contactErr } = await supabase
        .from('contact_requests')
        .select('post_id')
        .eq('solver_id', authData.user.id)
        .eq('status', 'accepted');

      if (!contactErr && contacts && contacts.length > 0) {
        const postIds = contacts.map(c => c.post_id);
        const { data: posts, error: postErr } = await supabase
          .from('posts')
          .select('*')
          .in('id', postIds)
          .neq('status', 'deleted')
          .order('created_at', { ascending: false });

        if (!postErr && posts) {
          return { 
            data: posts.map(p => ({ 
              ...p, 
              skills: cleanPostSkills(p.skills),
              progress: extractPostProgress(p) 
            })), 
            error: null 
          };
        }
      }

      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_my_ideas');
      return { 
        data: (rpcData || []).map(p => ({ 
          ...p, 
          skills: cleanPostSkills(p.skills),
          progress: extractPostProgress(p) 
        })), 
        error: rpcErr 
      };
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
      skills: cleanPostSkills(p.skills),
      address: p.address,
      phone_number: p.phone_number,
      latitude: p.coordinates?.latitude,
      longitude: p.coordinates?.longitude,
      media_url: p.media,
      status: p.status,
      progress: extractPostProgress(p),
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
        const { data: postDetails } = await getPostDetails(postId);
        if (postDetails) {
          const participantsToUpsert = [
            { chat_room_id: room.id, user_id: postDetails.author_id },
            { chat_room_id: room.id, user_id: authData.user.id }
          ];

          // Also fetch all accepted solvers for this post
          const { data: acceptedReqs } = await supabase
            .from('contact_requests')
            .select('solver_id')
            .eq('post_id', postId)
            .eq('status', 'accepted');

          if (acceptedReqs && acceptedReqs.length > 0) {
            acceptedReqs.forEach(req => {
              participantsToUpsert.push({ chat_room_id: room.id, user_id: req.solver_id });
            });
          }

          await supabase.from('chat_participants').upsert(
            participantsToUpsert,
            { onConflict: 'chat_room_id, user_id' }
          );
        }
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

      if (msgErr) return { data: null, error: msgErr };

      // Dispatch in-app notifications to all other participants in this chat room
      try {
        const { data: senderProf } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', authData.user.id)
          .maybeSingle();
        const senderName = senderProf?.name || 'A collaborator';

        const { data: roomData } = await supabase
          .from('chat_rooms')
          .select('post_id, posts:post_id(title, author_id)')
          .eq('id', roomId)
          .maybeSingle();
        const postTitle = roomData?.posts?.title || 'Challenge';
        const postAuthorId = roomData?.posts?.author_id;

        const recipientUserIds = new Set();

        // 1. From chat_participants
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_room_id', roomId);
        if (participants) {
          participants.forEach(p => recipientUserIds.add(p.user_id));
        }

        // 2. Add post author if different
        if (postAuthorId) {
          recipientUserIds.add(postAuthorId);
        }

        // 3. Add all accepted solvers for this post
        if (roomData?.post_id) {
          const { data: acceptedSolvers } = await supabase
            .from('contact_requests')
            .select('solver_id')
            .eq('post_id', roomData.post_id)
            .eq('status', 'accepted');
          if (acceptedSolvers) {
            acceptedSolvers.forEach(s => recipientUserIds.add(s.solver_id));
          }
        }

        // Exclude sender
        recipientUserIds.delete(authData.user.id);

        if (recipientUserIds.size > 0) {
          const notifsToInsert = Array.from(recipientUserIds).map(userId => ({
            user_id: userId,
            type: 'chat_message',
            message: `New message from ${senderName} in "${postTitle}"`,
            payload: {
              room_id: roomId,
              roomId: roomId,
              post_id: roomData?.post_id,
              post_title: postTitle,
              sender_id: authData.user.id,
              sender_name: senderName,
              preview: content ? (content.length > 50 ? content.substring(0, 47) + '...' : content) : 'Sent an attachment'
            },
            read: false,
          }));

          await supabase.from('notifications').insert(notifsToInsert);
        }
      } catch (notifErr) {
        console.warn('[storage] Failed to dispatch chat notification:', notifErr);
      }

      return { data: newMsg, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback Local Storage
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

  // Local notifications dispatch
  try {
    const rooms = getLocal(LOCAL_CHAT_ROOMS, []);
    const room = rooms.find(r => r.id === roomId);
    const posts = getLocal(LOCAL_POSTS, []);
    const post = room ? posts.find(p => p.id === room.post_id) : null;
    
    const recipientIds = new Set();
    if (room && room.participants) {
      room.participants.forEach(pid => recipientIds.add(pid));
    }
    if (post && post.author_id) recipientIds.add(post.author_id);
    if (post && post.authorId) recipientIds.add(post.authorId);
    
    const reqs = getLocal('collabx_requests', []);
    if (room && room.post_id) {
      reqs.filter(r => r.post_id === room.post_id && r.status === 'accepted').forEach(r => recipientIds.add(r.solver_id));
    }
    recipientIds.delete(session.id);

    const notifs = getLocal(LOCAL_NOTIFS, []);
    recipientIds.forEach(pid => {
      notifs.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        user_id: pid,
        type: 'chat_message',
        message: `New message from ${session.name || 'Collaborator'} in "${post?.title || 'Challenge'}"`,
        payload: {
          room_id: roomId,
          roomId: roomId,
          post_id: room?.post_id,
          post_title: post?.title,
          sender_id: session.id,
          sender_name: session.name,
          preview: content ? (content.length > 50 ? content.substring(0, 47) + '...' : content) : 'Sent an attachment'
        },
        read: false,
        created_at: new Date().toISOString()
      });
    });
    setLocal(LOCAL_NOTIFS, notifs);
  } catch (e) {
    console.warn('[storage] local notif dispatch error:', e);
  }

  return { data: newMsg, error: null };
}

/**
 * Mark chat notifications as read for a specific chat room
 */
export async function markChatRoomNotificationsRead(roomId, userId) {
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = userId || authData?.user?.id;
      if (!uid) return { data: null, error: null };

      const { data: userNotifs } = await supabase
        .from('notifications')
        .select('id, payload')
        .eq('user_id', uid)
        .eq('type', 'chat_message')
        .eq('read', false);

      if (userNotifs && userNotifs.length > 0) {
        const matchingIds = userNotifs
          .filter(n => n.payload?.room_id === roomId || n.payload?.roomId === roomId)
          .map(n => n.id);

        if (matchingIds.length > 0) {
          await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', matchingIds);
        }
      }
      return { data: true, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  const notifs = getLocal(LOCAL_NOTIFS, []);
  const updated = notifs.map(n => {
    if (n.type === 'chat_message' && (n.payload?.room_id === roomId || n.payload?.roomId === roomId)) {
      return { ...n, read: true };
    }
    return n;
  });
  setLocal(LOCAL_NOTIFS, updated);
  return { data: true, error: null };
}

/**
 * Get all chat rooms the current user is a participant in
 * Returns [{ room_id, post_id, post_title, last_message_at }]
 */
export async function getAccessibleChatRooms() {
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return { data: [], error: null };

      // Get participant rows for this user
      const { data: participantRows, error: partErr } = await supabase
        .from('chat_participants')
        .select('chat_room_id')
        .eq('user_id', authData.user.id);

      if (partErr || !participantRows || participantRows.length === 0) {
        return { data: [], error: partErr || null };
      }

      const roomIds = participantRows.map(r => r.chat_room_id);

      // Fetch room details + post title
      const { data: rooms, error: roomErr } = await supabase
        .from('chat_rooms')
        .select('id, post_id, created_at, posts:post_id(title)')
        .in('id', roomIds)
        .order('created_at', { ascending: false });

      if (roomErr) return { data: [], error: roomErr };

      const result = (rooms || []).map(r => ({
        room_id: r.id,
        post_id: r.post_id,
        post_title: r.posts?.title || 'Untitled Challenge',
        created_at: r.created_at,
      }));

      return { data: result, error: null };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  }

  // Fallback local
  const session = getLocal(LOCAL_SESSION, {});
  const rooms = getLocal(LOCAL_CHAT_ROOMS, []);
  const posts = getLocal(LOCAL_POSTS, []);
  const accessible = rooms
    .filter(r => r.participants?.includes(session.id))
    .map(r => {
      const p = posts.find(p => p.id === r.post_id);
      return {
        room_id: r.id,
        post_id: r.post_id,
        post_title: p?.title || 'Untitled Challenge',
        created_at: r.created_at || new Date().toISOString(),
      };
    });
  return { data: accessible, error: null };
}

/**
 * Update post progress percentage (0-100) — author only
 */
export async function updatePostProgress(postId, percentage) {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));

  // 1. Immediately cache in local map for instantaneous UI reactivity
  try {
    const localMap = getLocal('collabx_post_progress_map', {});
    localMap[postId] = clamped;
    setLocal('collabx_post_progress_map', localMap);
  } catch (e) {
    console.error('Error saving local progress map:', e);
  }

  // 2. Also update LOCAL_POSTS array if post exists there
  try {
    const posts = getLocal(LOCAL_POSTS, []);
    const updated = posts.map(p => p.id === postId ? { ...p, progress: clamped } : p);
    setLocal(LOCAL_POSTS, updated);
  } catch (e) {
    console.error('Error updating local posts:', e);
  }

  // 3. Persist to Supabase
  if (isSupabaseConfigured) {
    try {
      // Encode progress in skills column (__progress:<val>) so all users on any device see it
      const { data: currentPost } = await supabase
        .from('posts')
        .select('skills')
        .eq('id', postId)
        .single();

      if (currentPost) {
        const existingSkills = Array.isArray(currentPost.skills) ? currentPost.skills : [];
        const clean = existingSkills.filter(s => typeof s === 'string' && !s.startsWith('__progress:'));
        const updatedSkills = [...clean, `__progress:${clamped}`];

        await supabase
          .from('posts')
          .update({ skills: updatedSkills })
          .eq('id', postId);
      }

      // Also attempt direct progress column update (gracefully fails if column does not exist)
      await supabase
        .from('posts')
        .update({ progress: clamped })
        .eq('id', postId);

      return { data: { id: postId, progress: clamped }, error: null };
    } catch (err) {
      console.warn('Supabase progress update notice:', err.message);
      return { data: { id: postId, progress: clamped }, error: null };
    }
  }

  return { data: { id: postId, progress: clamped }, error: null };
}

/**
 * User Profile: Update Name, Phone, Avatar, and Skills
 */
export async function updateUserProfile(userId, { name, phone, avatar, skills }) {
  if (skills !== undefined) {
    setLocal(`collabx_user_skills_${userId}`, skills);
  }

  if (isSupabaseConfigured) {
    try {
      let avatarUrl = avatar;
      if (avatar && avatar.startsWith('data:image')) {
        const fileName = `${userId}_${Date.now()}.png`;
        const blob = await (await fetch(avatar)).blob();
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, blob, { contentType: 'image/png', upsert: true });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(fileName);
          avatarUrl = urlData.publicUrl;
        }
      }

      const updatePayload = {};
      if (name) updatePayload.name = name.trim();
      if (phone !== undefined) updatePayload.phone = phone ? phone.trim() : null;
      if (avatarUrl) updatePayload.avatar_url = avatarUrl;
      if (skills !== undefined) updatePayload.skills = skills;

      const { data: updatedProfile, error: updateErr } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select()
        .single();

      if (updateErr) {
        // If updating skills column errored because column doesn't exist in Supabase table, update without skills
        delete updatePayload.skills;
        const { data: retryProfile, error: retryErr } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', userId)
          .select()
          .single();

        if (retryErr) return { data: null, error: retryErr };
        
        const localSkills = getLocal(`collabx_user_skills_${userId}`, skills || []);
        return {
          data: {
            id: retryProfile.id,
            name: retryProfile.name,
            email: retryProfile.email,
            phone: retryProfile.phone,
            avatar: retryProfile.avatar_url,
            skills: localSkills,
            verification_uploaded: retryProfile.verification_uploaded,
            verification_document_url: retryProfile.verification_document_url,
          },
          error: null,
        };
      }

      const finalSkills = skills !== undefined 
        ? skills 
        : (updatedProfile.skills || getLocal(`collabx_user_skills_${userId}`, []));

      return {
        data: {
          id: updatedProfile.id,
          name: updatedProfile.name,
          email: updatedProfile.email,
          phone: updatedProfile.phone,
          avatar: updatedProfile.avatar_url,
          skills: finalSkills,
          verification_uploaded: updatedProfile.verification_uploaded,
          verification_document_url: updatedProfile.verification_document_url,
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback Local Storage
  const users = getLocal(LOCAL_USERS, []);
  const session = getLocal(LOCAL_SESSION, {});
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    if (name) users[idx].name = name.trim();
    if (phone !== undefined) users[idx].phone = phone;
    if (avatar) users[idx].avatar = avatar;
    if (skills !== undefined) users[idx].skills = skills;
    setLocal(LOCAL_USERS, users);
  }

  const updatedSession = {
    ...session,
    name: name ? name.trim() : session.name,
    phone: phone !== undefined ? phone : session.phone,
    avatar: avatar || session.avatar,
    skills: skills !== undefined ? skills : (session.skills || []),
  };
  setLocal(LOCAL_SESSION, updatedSession);

  return { data: updatedSession, error: null };
}

/**
 * User Profile: Change Password (Verifies current password first)
 */
export async function changeUserPassword({ email, currentPassword, newPassword }) {
  if (isSupabaseConfigured) {
    try {
      // 1. Verify current password by signing in
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (verifyErr) {
        return { data: null, error: { message: 'Current password is incorrect.' } };
      }

      // 2. Update to new password
      const { data, error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        return { data: null, error: updateErr };
      }

      return { data: true, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback Local Storage
  const users = getLocal(LOCAL_USERS, []);
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user || user.password !== currentPassword) {
    return { data: null, error: { message: 'Current password is incorrect.' } };
  }

  user.password = newPassword;
  setLocal(LOCAL_USERS, users);

  const session = getLocal(LOCAL_SESSION, {});
  if (session && session.email === email) {
    session.password = newPassword;
    setLocal(LOCAL_SESSION, session);
  }

  return { data: true, error: null };
}

/**
 * ============================================================================
 * ADMIN PORTAL SYSTEM
 * ============================================================================
 */
export const ADMIN_CREDENTIALS = {
  email: 'admin@collabx.org',
  password: 'AdminCollabX2026!Secure',
};

const LOCAL_ADMIN_SESSION = 'collabx_admin_session';

export async function adminSignIn(email, password) {
  if (
    email.toLowerCase().trim() === ADMIN_CREDENTIALS.email.toLowerCase() &&
    password === ADMIN_CREDENTIALS.password
  ) {
    const adminSession = {
      email: ADMIN_CREDENTIALS.email,
      role: 'admin',
      name: 'CollabX Administrator',
      signedInAt: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_ADMIN_SESSION, JSON.stringify(adminSession));
    return { data: adminSession, error: null };
  }
  return { data: null, error: { message: 'Invalid Admin Credentials.' } };
}

export function getAdminSession() {
  try {
    const val = localStorage.getItem(LOCAL_ADMIN_SESSION);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export function adminSignOut() {
  localStorage.removeItem(LOCAL_ADMIN_SESSION);
  return { data: true, error: null };
}

/**
 * Admin: Fetch all posts ever created (live, completed, deleted)
 */
export async function getAllAdminPosts() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, author:author_id(name, email, avatar_url, phone)')
        .order('created_at', { ascending: false });

      if (data) {
        return {
          data: data.map(p => ({
            ...p,
            skills: cleanPostSkills(p.skills),
            progress: extractPostProgress(p),
          })),
          error: null,
        };
      }
      return { data: [], error };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  }

  const posts = getLocal(LOCAL_POSTS, []);
  return { 
    data: posts.map(p => ({
      ...p,
      skills: cleanPostSkills(p.skills),
      progress: extractPostProgress(p),
    })), 
    error: null 
  };
}

/**
 * Admin: Fetch all registered users / profiles
 */
export async function getAllAdminUsers() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  }

  const users = getLocal(LOCAL_USERS, []);
  return { data: users, error: null };
}

/**
 * Admin: Fetch all chat rooms with message counts
 */
export async function getAllAdminChatRooms() {
  if (isSupabaseConfigured) {
    try {
      const { data: rooms, error: roomErr } = await supabase
        .from('chat_rooms')
        .select('*, posts:post_id(id, title, author_id, status)')
        .order('created_at', { ascending: false });

      if (roomErr) return { data: [], error: roomErr };

      // Fetch participants and message counts for each room
      const results = await Promise.all((rooms || []).map(async (r) => {
        const { count: msgCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_room_id', r.id);

        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id, profiles:user_id(name, email, avatar_url)')
          .eq('chat_room_id', r.id);

        return {
          ...r,
          message_count: msgCount || 0,
          participants: participants || [],
        };
      }));

      return { data: results, error: null };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  }

  const rooms = getLocal(LOCAL_CHAT_ROOMS, []);
  const msgs = getLocal(LOCAL_CHAT_MSGS, []);
  const posts = getLocal(LOCAL_POSTS, []);

  const results = rooms.map(r => ({
    ...r,
    posts: posts.find(p => p.id === r.post_id),
    message_count: msgs.filter(m => m.chat_room_id === r.id).length,
  }));

  return { data: results, error: null };
}

/**
 * Admin: Fetch all contact requests / solver proposals / ideas
 */
export async function getAllAdminContactRequests() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('contact_requests')
        .select('*, posts:post_id(id, title, author_id, status)')
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  }

  const contacts = getLocal(LOCAL_CONTACTS, []);
  const posts = getLocal(LOCAL_POSTS, []);
  const populated = contacts.map(c => ({
    ...c,
    posts: posts.find(p => p.id === c.post_id),
  }));
  return { data: populated, error: null };
}

/**
 * Admin: Delete a post with a mandatory reason, and notify the author
 */
export async function adminDeletePost(postId, authorId, postTitle, reason) {
  const notificationMsg = `Your post has been removed by the admin for: ${reason}`;

  if (isSupabaseConfigured) {
    try {
      // 1. Update post status to deleted
      const { error: deleteErr } = await supabase
        .from('posts')
        .update({ status: 'deleted' })
        .eq('id', postId);

      if (deleteErr) return { data: null, error: deleteErr };

      // 2. Dispatch notification to author
      if (authorId) {
        await supabase.from('notifications').insert([{
          user_id: authorId,
          type: 'admin_post_removed',
          payload: {
            post_id: postId,
            post_title: postTitle,
            message: notificationMsg,
            reason: reason,
          },
          read: false,
        }]);
      }

      return { data: true, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback
  const posts = getLocal(LOCAL_POSTS, []);
  const updated = posts.map(p => p.id === postId ? { ...p, status: 'deleted' } : p);
  setLocal(LOCAL_POSTS, updated);

  if (authorId) {
    await addNotification(authorId, {
      message: notificationMsg,
      type: 'admin_post_removed',
      payload: {
        post_id: postId,
        post_title: postTitle,
        reason: reason,
      },
    });
  }

  return { data: true, error: null };
}

