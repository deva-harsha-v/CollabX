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

export const ORG_DOMAINS = [
  { domain: '@sves.org.in', name: 'Sri Vasavi Engineering College' },
  { domain: '@gfg.in', name: 'GeeksForGeeks' },
  { domain: '@google.com', name: 'Google' },
  { domain: '@mlsc.in', name: 'Microsoft' },
  { domain: '@collabx.org', name: 'CollabX Organization' },
];

export const isValidOrgEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const lower = email.trim().toLowerCase();
  return ORG_DOMAINS.some(d => lower.endsWith(d.domain));
};

export const getOrgInfo = (email) => {
  if (!email || typeof email !== 'string') return null;
  const lower = email.trim().toLowerCase();
  return ORG_DOMAINS.find(d => lower.endsWith(d.domain)) || null;
};

export const getUserAccountType = (user) => {
  if (!user) return 'public';
  if (user.account_type) return user.account_type;
  if (user.accountType) return user.accountType;
  if (user.email && isValidOrgEmail(user.email)) return 'organisation';
  const localMap = getLocal('collabx_user_account_types_map', {});
  if (user.id && localMap[user.id]) return localMap[user.id];
  return 'public';
};

export function extractPostRequirement(post) {
  if (!post) return 'organisation_only';
  const localMap = getLocal('collabx_post_req_map', {});
  if (post.id && typeof localMap[post.id] === 'string') {
    return localMap[post.id];
  }
  if (Array.isArray(post.skills)) {
    const reqItem = post.skills.find(s => typeof s === 'string' && s.startsWith('__req:'));
    if (reqItem) {
      return reqItem.replace('__req:', '');
    }
  }
  if (post.solver_requirement) return post.solver_requirement;
  if (post.solverRequirement) return post.solverRequirement;
  return 'organisation_only';
}

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
          account_type: getUserAccountType(profile),
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
    return { data: { ...session, skills: localSkills, account_type: getUserAccountType(session) }, error: null };
  }
  return { data: null, error: null };
}

/**
 * Auth: Sign Up
 */
export async function signUp(userData) {
  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name)}`;
  const skills = Array.isArray(userData.skills) ? userData.skills : [];
  const accountType = userData.account_type || (isValidOrgEmail(userData.email) ? 'organisation' : 'public');
  const isOrg = accountType === 'organisation';
  const isVerified = isOrg || Boolean(userData.verificationDocument);

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
            account_type: accountType,
          }
        }
      });

      if (authErr) return { data: null, error: authErr };
      if (!authData.user) return { data: null, error: { message: 'User registration failed.' } };

      const userId = authData.user.id;
      let avatarUrl = defaultAvatar;
      let docUrl = null;

      // Save user skills & account type in local cache map
      setLocal(`collabx_user_skills_${userId}`, skills);
      const accMap = getLocal('collabx_user_account_types_map', {});
      accMap[userId] = accountType;
      setLocal('collabx_user_account_types_map', accMap);

      // Handle document upload for public accounts
      if (userData.verificationDocument && userData.verificationDocument.base64) {
        try {
          const docFileName = `doc_${userId}_${Date.now()}.pdf`;
          const blob = await (await fetch(userData.verificationDocument.base64)).blob();
          const { data: upDoc } = await supabase.storage
            .from('verification-documents')
            .upload(docFileName, blob);
          if (upDoc) docUrl = docFileName;
        } catch (e) {
          console.warn('Doc upload fallback notice:', e);
        }
      }

      // Handle custom avatar upload if provided
      if (userData.avatar && userData.avatar.startsWith('data:image')) {
        try {
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
            await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
          }
        } catch (e) {
          console.warn('Avatar upload fallback notice:', e);
        }
      }

      // Upsert profile record
      const { error: profErr } = await supabase.from('profiles').upsert([{
        id: userId,
        name: userData.name.trim(),
        email: userData.email.toLowerCase().trim(),
        phone: userData.phone || null,
        avatar_url: avatarUrl,
        skills: skills.length > 0 ? skills : null,
        verification_uploaded: isVerified,
        verification_document_url: docUrl,
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
        account_type: accountType,
        verification_uploaded: isVerified,
        verification_document_url: docUrl,
      };

      setLocal(LOCAL_SESSION, newUser);
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
  const accMap = getLocal('collabx_user_account_types_map', {});
  accMap[newUserId] = accountType;
  setLocal('collabx_user_account_types_map', accMap);

  const newUser = {
    id: newUserId,
    name: userData.name.trim(),
    email: userData.email.toLowerCase().trim(),
    password: userData.password,
    phone: userData.phone || null,
    avatar: userData.avatar || defaultAvatar,
    skills: skills,
    account_type: accountType,
    verification_uploaded: isVerified,
    verification_document_url: userData.verificationDocument?.base64 || null,
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
        account_type: getUserAccountType(profile),
        verification_uploaded: profile.verification_uploaded,
      };

      setLocal(LOCAL_SESSION, user);
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
  const userWithSkills = { ...user, skills: localSkills, account_type: getUserAccountType(user) };

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
 * Create Post: Stores required phone_number, optional skills, float coordinates, solver_requirement
 */
export async function createPost(postData) {
  const solverReq = postData.solver_requirement || postData.solverRequirement || 'organisation_only';
  const rawSkills = Array.isArray(postData.skills) ? [...postData.skills] : [];
  const encodedSkills = [...rawSkills, `__req:${solverReq}`];

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
        skills: encodedSkills,
        phone_number: postData.phone_number.trim(), // Required
        address: postData.address ? postData.address.trim() : null,
        latitude: postData.coordinates?.latitude || null, // Full unrounded float
        longitude: postData.coordinates?.longitude || null, // Full unrounded float
        media_url: mediaUrl,
        status: 'live',
      }]).select().single();

      if (insertErr) return { data: null, error: insertErr };

      if (newPost?.id) {
        const reqMap = getLocal('collabx_post_req_map', {});
        reqMap[newPost.id] = solverReq;
        setLocal('collabx_post_req_map', reqMap);
      }

      return { 
        data: { 
          ...newPost, 
          skills: cleanPostSkills(newPost.skills), 
          solver_requirement: solverReq,
          progress: extractPostProgress(newPost) 
        }, 
        error: null 
      };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback Local Storage
  const posts = getLocal(LOCAL_POSTS, []);
  const session = getLocal(LOCAL_SESSION, {});
  const newPostId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const reqMap = getLocal('collabx_post_req_map', {});
  reqMap[newPostId] = solverReq;
  setLocal('collabx_post_req_map', reqMap);

  const newPost = {
    id: newPostId,
    authorId: session.id,
    authorName: session.name,
    authorAvatar: session.avatar,
    author_account_type: session.account_type || getUserAccountType(session),
    title: postData.title.trim(),
    description: postData.description.trim(),
    skills: postData.skills || null,
    solver_requirement: solverReq,
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
  return skills.filter(s => typeof s === 'string' && !s.startsWith('__progress:') && !s.startsWith('__req:'));
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
            solver_requirement: extractPostRequirement(p),
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
            solver_requirement: extractPostRequirement(p),
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
      author_account_type: p.author_account_type || 'public',
      title: p.title,
      description: p.description,
      organization: p.organization,
      skills: cleanPostSkills(p.skills),
      solver_requirement: extractPostRequirement(p),
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
            solver_requirement: extractPostRequirement(postRow),
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
            solver_requirement: extractPostRequirement(detail),
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
      author_account_type: post.author_account_type || 'public',
      title: post.title,
      description: post.description,
      organization: post.organization,
      skills: cleanPostSkills(post.skills),
      solver_requirement: extractPostRequirement(post),
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
          solver_requirement: extractPostRequirement(p),
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
      solver_requirement: extractPostRequirement(p),
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
              solver_requirement: extractPostRequirement(p),
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
          solver_requirement: extractPostRequirement(p),
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
      author_account_type: p.author_account_type || 'public',
      title: p.title,
      description: p.description,
      organization: p.organization,
      skills: cleanPostSkills(p.skills),
      solver_requirement: extractPostRequirement(p),
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
/**
 * Notifications: Fetch, Add, Mark Read
 */
export async function getNotifications(userId) {
  let supabaseNotifs = [];
  if (isSupabaseConfigured && userId) {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data) supabaseNotifs = data;
    } catch (e) {}
  }

  const notifs = getLocal(LOCAL_NOTIFS, []);
  const userNotifs = notifs.filter(n => n.userId === userId || n.user_id === userId);

  const map = new Map();
  supabaseNotifs.forEach(n => {
    map.set(n.id, {
      ...n,
      user_id: n.user_id || userId,
      userId: n.user_id || userId,
      message: n.message || n.payload?.message || n.payload?.preview || 'New Notification',
      title: n.payload?.title || n.payload?.post_title || 'CollabX Alert'
    });
  });

  userNotifs.forEach(n => {
    if (!map.has(n.id)) {
      map.set(n.id, {
        ...n,
        user_id: n.user_id || n.userId || userId,
        userId: n.user_id || n.userId || userId,
        message: n.message || n.payload?.message || n.payload?.preview || 'New Notification',
        title: n.payload?.title || n.payload?.post_title || 'CollabX Alert'
      });
    }
  });

  const result = Array.from(map.values()).sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
  return { data: result, error: null };
}

export async function addNotification(userId, notification) {
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
  const timestamp = new Date().toISOString();
  const notifMsg = notification.message || notification.payload?.message || 'New Notification';

  if (isSupabaseConfigured && userId) {
    try {
      await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          type: notification.type || 'info',
          payload: {
            message: notifMsg,
            ...(notification.payload || {})
          },
          read: false,
        }]);
    } catch (e) {}
  }

  const notifs = getLocal(LOCAL_NOTIFS, []);
  const newNotif = {
    id: notifId,
    userId,
    user_id: userId,
    message: notifMsg,
    type: notification.type || 'info',
    payload: {
      message: notifMsg,
      ...(notification.payload || {})
    },
    read: false,
    created_at: timestamp,
    createdAt: timestamp,
  };

  notifs.unshift(newNotif);
  setLocal(LOCAL_NOTIFS, notifs);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('collabx_notif_update'));
    window.dispatchEvent(new Event('storage'));
  }

  return { data: newNotif, error: null };
}

export async function markAllNotificationsRead(userId) {
  if (isSupabaseConfigured && userId) {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);
    } catch (e) {}
  }

  const notifs = getLocal(LOCAL_NOTIFS, []);
  const updated = notifs.map(n => (n.userId === userId || n.user_id === userId) ? { ...n, read: true } : n);
  setLocal(LOCAL_NOTIFS, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('collabx_notif_update'));
    window.dispatchEvent(new Event('storage'));
  }

  return { data: true, error: null };
}

/**
 * Real-Time Chat Rooms
 */
export async function getChatRoomForPost(postId) {
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      let { data: room } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('post_id', postId)
        .maybeSingle();

      if (!room && authData?.user) {
        const { data: postDetails } = await getPostDetails(postId);
        if (postDetails?.is_authorized) {
          const { data: newRoom } = await supabase
            .from('chat_rooms')
            .insert([{ post_id: postId }])
            .select()
            .single();
          if (newRoom) room = newRoom;
        }
      }

      if (room && authData?.user) {
        const { data: postDetails } = await getPostDetails(postId);
        if (postDetails) {
          const participantsToUpsert = [
            { chat_room_id: room.id, user_id: postDetails.author_id },
            { chat_room_id: room.id, user_id: authData.user.id }
          ];

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

          try {
            await supabase.from('chat_participants').upsert(
              participantsToUpsert,
              { onConflict: 'chat_room_id, user_id' }
            );
          } catch (e) {}
        }
      }

      return { data: room || null, error: null };
    } catch (err) {
      console.error('[storage] getChatRoomForPost error:', err);
    }
  }

  const rooms = getLocal(LOCAL_CHAT_ROOMS, []);
  const room = rooms.find(r => r.post_id === postId);
  return { data: room || null, error: null };
}

export async function getChatMessages(roomId) {
  if (!roomId) return { data: [], error: null };
  const cleanId = roomId.replace('room_', '');

  let supabaseMessages = [];
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, profiles:sender_id(name, avatar_url, email)')
        .or(`chat_room_id.eq.${roomId},chat_room_id.eq.${cleanId}`)
        .order('created_at', { ascending: true });
      if (data && Array.isArray(data)) {
        supabaseMessages = data;
      }
    } catch (e) {
      console.warn('[storage] getChatMessages supabase query note:', e);
    }
  }

  const msgs = getLocal(LOCAL_CHAT_MSGS, []);
  const roomMsgs = msgs.filter(m => m.chat_room_id === roomId || m.chat_room_id === cleanId || m.chat_room_id === `room_${roomId}` || m.chat_room_id === `room_${cleanId}`);

  // Merge and deduplicate
  const map = new Map();
  supabaseMessages.forEach(m => map.set(m.id, {
    ...m,
    sender_name: m.profiles?.name || m.sender_name || 'Participant',
    sender_avatar: m.profiles?.avatar_url || m.sender_avatar,
  }));

  roomMsgs.forEach(m => {
    if (!map.has(m.id)) {
      map.set(m.id, m);
    }
  });

  const merged = Array.from(map.values()).sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));
  return { data: merged, error: null };
}

export async function sendChatMessage(roomId, content, attachmentFile) {
  if (!roomId) return { data: null, error: { message: 'Invalid room' } };
  const cleanId = roomId.replace('room_', '');

  const session = getLocal(LOCAL_SESSION, {});
  let senderUserId = session?.id;
  let senderName = session?.name || 'Collaborator';
  let senderAvatar = session?.avatar;

  let attachmentUrl = null;
  let attachmentType = null;

  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        senderUserId = authData.user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', senderUserId)
          .maybeSingle();
        if (profile) {
          senderName = profile.name || senderName;
          senderAvatar = profile.avatar_url || senderAvatar;
        }
      }
    } catch (e) {}
  }

  if (attachmentFile && isSupabaseConfigured) {
    try {
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
    } catch (e) {}
  }

  let finalContent = content ? content.trim() : '';
  if (attachmentUrl) {
    finalContent = finalContent ? `${finalContent}\n${attachmentUrl}` : attachmentUrl;
  }

  const newMsgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const timestamp = new Date().toISOString();

  let targetRoomId = roomId;
  let postTitle = 'Challenge Discussion';
  let activePostId = cleanId;
  const recipientUserIds = new Set();

  if (isSupabaseConfigured) {
    try {
      // Find room in Supabase
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('id, post_id, posts:post_id(title, author_id)')
        .or(`id.eq.${roomId},post_id.eq.${cleanId}`)
        .maybeSingle();

      if (existingRoom) {
        targetRoomId = existingRoom.id;
        activePostId = existingRoom.post_id;
        postTitle = existingRoom.posts?.title || postTitle;
        if (existingRoom.posts?.author_id) recipientUserIds.add(existingRoom.posts.author_id);
      } else {
        // Find post directly
        const { data: postData } = await supabase
          .from('posts')
          .select('id, title, author_id')
          .eq('id', cleanId)
          .maybeSingle();

        if (postData) {
          postTitle = postData.title || postTitle;
          activePostId = postData.id;
          if (postData.author_id) recipientUserIds.add(postData.author_id);

          try {
            const { data: createdRoom } = await supabase
              .from('chat_rooms')
              .insert([{ post_id: cleanId }])
              .select()
              .maybeSingle();
            if (createdRoom) targetRoomId = createdRoom.id;
          } catch (e) {}
        }
      }

      // Add participants
      try {
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_room_id', targetRoomId);
        if (participants) participants.forEach(p => recipientUserIds.add(p.user_id));
      } catch (e) {}

      // Add accepted solvers
      try {
        const { data: acceptedSolvers } = await supabase
          .from('contact_requests')
          .select('solver_id')
          .eq('post_id', activePostId)
          .eq('status', 'accepted');
        if (acceptedSolvers) acceptedSolvers.forEach(s => recipientUserIds.add(s.solver_id));
      } catch (e) {}

      // Insert message into Supabase chat_messages (columns: chat_room_id, sender_id, content)
      if (senderUserId) {
        try {
          await supabase
            .from('chat_messages')
            .insert([{
              chat_room_id: targetRoomId,
              sender_id: senderUserId,
              content: finalContent,
            }]);
        } catch (e) {}
      }

      // Exclude sender from notifications
      recipientUserIds.delete(senderUserId);

      // Insert Supabase notifications (columns: user_id, type, payload, read)
      if (recipientUserIds.size > 0) {
        const notifsToInsert = Array.from(recipientUserIds).map(userId => ({
          user_id: userId,
          type: 'chat_message',
          payload: {
            room_id: targetRoomId,
            roomId: targetRoomId,
            post_id: activePostId,
            post_title: postTitle,
            sender_id: senderUserId,
            sender_name: senderName,
            message: `New message from ${senderName} in "${postTitle}"`,
            preview: content ? (content.length > 50 ? content.substring(0, 47) + '...' : content) : 'Sent an attachment'
          },
          read: false,
        }));

        try {
          await supabase.from('notifications').insert(notifsToInsert);
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[storage] Supabase sendChatMessage error handled:', e);
    }
  }

  // Also dual-write to Local Storage
  const msgs = getLocal(LOCAL_CHAT_MSGS, []);
  const newMsg = {
    id: newMsgId,
    chat_room_id: targetRoomId,
    sender_id: senderUserId,
    sender_name: senderName,
    sender_avatar: senderAvatar,
    content: finalContent,
    attachment_url: attachmentUrl,
    attachment_type: attachmentType,
    created_at: timestamp,
    createdAt: timestamp,
    profiles: {
      name: senderName,
      avatar_url: senderAvatar
    }
  };
  msgs.push(newMsg);
  setLocal(LOCAL_CHAT_MSGS, msgs);

  // Local notifications dispatch for other users
  try {
    const localRooms = getLocal(LOCAL_CHAT_ROOMS, []);
    const localPosts = getLocal(LOCAL_POSTS, []);
    const localContacts = getLocal(LOCAL_CONTACTS, []);
    const localRequests = getLocal('collabx_requests', []);
    const localUsers = getLocal(LOCAL_USERS, []);

    const localRecipients = new Set(recipientUserIds);
    const post = localPosts.find(p => p.id === activePostId || p.id === cleanId);
    if (post) {
      if (post.author_id) localRecipients.add(post.author_id);
      if (post.authorId) localRecipients.add(post.authorId);
    }

    [...localContacts, ...localRequests]
      .filter(r => (r.post_id === activePostId || r.postId === activePostId) && r.status === 'accepted')
      .forEach(r => localRecipients.add(r.solver_id || r.solverId));

    localRecipients.delete(senderUserId);

    // If no recipients found, notify other registered users so multi-account testing receives notifications
    if (localRecipients.size === 0) {
      localUsers.filter(u => u.id !== senderUserId).forEach(u => localRecipients.add(u.id));
    }

    const notifs = getLocal(LOCAL_NOTIFS, []);
    localRecipients.forEach(pid => {
      notifs.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        user_id: pid,
        userId: pid,
        type: 'chat_message',
        message: `New message from ${senderName} in "${postTitle}"`,
        payload: {
          room_id: targetRoomId,
          roomId: targetRoomId,
          post_id: activePostId,
          post_title: postTitle,
          sender_id: senderUserId,
          sender_name: senderName,
          message: `New message from ${senderName} in "${postTitle}"`,
          preview: content ? (content.length > 50 ? content.substring(0, 47) + '...' : content) : 'Sent an attachment'
        },
        read: false,
        created_at: timestamp,
        createdAt: timestamp,
      });
    });
    setLocal(LOCAL_NOTIFS, notifs);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('collabx_notif_update'));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.warn('[storage] local notif dispatch error:', e);
  }

  // Supabase Realtime WebSocket broadcast for instant cross-account delivery
  if (isSupabaseConfigured) {
    try {
      const roomChannel = supabase.channel(`room_${targetRoomId}`);
      roomChannel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: newMsg
      });

      if (cleanId !== targetRoomId) {
        const postChannel = supabase.channel(`room_${cleanId}`);
        postChannel.send({
          type: 'broadcast',
          event: 'chat_message',
          payload: newMsg
        });
      }

      const notifGlobalChannel = supabase.channel('collabx_global_notifications');
      notifGlobalChannel.send({
        type: 'broadcast',
        event: 'new_notification',
        payload: {
          recipientIds: Array.from(recipientUserIds),
          notification: {
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            user_id: Array.from(recipientUserIds)[0] || '',
            type: 'chat_message',
            message: `New message from ${senderName} in "${postTitle}"`,
            payload: {
              room_id: targetRoomId,
              roomId: targetRoomId,
              post_id: activePostId,
              post_title: postTitle,
              sender_id: senderUserId,
              sender_name: senderName,
              message: `New message from ${senderName} in "${postTitle}"`,
              preview: content ? (content.length > 50 ? content.substring(0, 47) + '...' : content) : 'Sent an attachment'
            },
            read: false,
            created_at: timestamp
          }
        }
      });
    } catch (bcErr) {
      console.warn('[storage] broadcast dispatch error:', bcErr);
    }
  }

  return { data: newMsg, error: null };
}

/**
 * Mark chat notifications as read for a specific chat room
 */
export async function markChatRoomNotificationsRead(roomId, userId) {
  const cleanId = roomId ? roomId.replace('room_', '') : '';
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = userId || authData?.user?.id;
      if (uid) {
        const { data: userNotifs } = await supabase
          .from('notifications')
          .select('id, payload')
          .eq('user_id', uid)
          .eq('type', 'chat_message')
          .eq('read', false);

        if (userNotifs && userNotifs.length > 0) {
          const matchingIds = userNotifs
            .filter(n => n.payload?.room_id === roomId || n.payload?.roomId === roomId || n.payload?.room_id === cleanId || n.payload?.post_id === cleanId || n.payload?.post_id === roomId)
            .map(n => n.id);

          if (matchingIds.length > 0) {
            await supabase
              .from('notifications')
              .update({ read: true })
              .in('id', matchingIds);
          }
        }
      }
    } catch (err) {}
  }

  const notifs = getLocal(LOCAL_NOTIFS, []);
  const updated = notifs.map(n => {
    if (n.type === 'chat_message' && (n.payload?.room_id === roomId || n.payload?.roomId === roomId || n.payload?.room_id === cleanId || n.payload?.post_id === cleanId || n.payload?.post_id === roomId)) {
      return { ...n, read: true };
    }
    return n;
  });
  setLocal(LOCAL_NOTIFS, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('collabx_notif_update'));
    window.dispatchEvent(new Event('storage'));
  }

  return { data: true, error: null };
}

/**
 * Per-User Chatroom Deletion Lifecycle Management
 * When deleted, the room disappears ONLY for that user account.
 * If any participant sends a new message later, the room automatically resurfaces!
 */
export function getDeletedChatRooms(userId) {
  if (!userId) return {};
  return getLocal(`collabx_deleted_rooms_${userId}`, {});
}

export function hideChatRoomForUser(roomId, userId) {
  if (!userId || !roomId) return;
  const deletedMap = getLocal(`collabx_deleted_rooms_${userId}`, {});
  const now = Date.now();
  deletedMap[roomId] = now;
  const cleanId = roomId.replace('room_', '');
  deletedMap[cleanId] = now;
  setLocal(`collabx_deleted_rooms_${userId}`, deletedMap);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('collabx_rooms_update'));
    window.dispatchEvent(new Event('storage'));
  }
}

export function unhideChatRoomForUser(roomId, userId) {
  if (!userId || !roomId) return;
  const deletedMap = getLocal(`collabx_deleted_rooms_${userId}`, {});
  delete deletedMap[roomId];
  delete deletedMap[roomId.replace('room_', '')];
  setLocal(`collabx_deleted_rooms_${userId}`, deletedMap);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('collabx_rooms_update'));
    window.dispatchEvent(new Event('storage'));
  }
}

/**
 * Get all chat rooms the current user is a participant in
 * Filters out rooms deleted by the user unless a newer message arrived
 * Returns [{ room_id, post_id, post_title, created_at }]
 */
export async function getAccessibleChatRooms() {
  const accessibleRoomsMap = new Map();
  const session = getLocal(LOCAL_SESSION, {});
  let currentUserId = session?.id;

  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        currentUserId = authData.user.id;
      }

      if (currentUserId) {
        // 1. Direct participant rows
        try {
          const { data: participantRows } = await supabase
            .from('chat_participants')
            .select('chat_room_id, chat_rooms(id, post_id, created_at, posts:post_id(title))')
            .eq('user_id', currentUserId);

          if (participantRows) {
            participantRows.forEach(pr => {
              if (pr.chat_rooms) {
                accessibleRoomsMap.set(pr.chat_rooms.id, {
                  room_id: pr.chat_rooms.id,
                  post_id: pr.chat_rooms.post_id,
                  post_title: pr.chat_rooms.posts?.title || 'Challenge Discussion',
                  created_at: pr.chat_rooms.created_at,
                });
              }
            });
          }
        } catch (e) {}

        // 2. Posts authored by user
        try {
          const { data: myPosts } = await supabase
            .from('posts')
            .select('id, title, created_at')
            .eq('author_id', currentUserId);

          if (myPosts) {
            myPosts.forEach(p => {
              accessibleRoomsMap.set(p.id, {
                room_id: p.id,
                post_id: p.id,
                post_title: p.title,
                created_at: p.created_at,
              });
            });
          }
        } catch (e) {}

        // 3. Solvers with accepted requests
        try {
          const { data: myAcceptedReqs } = await supabase
            .from('contact_requests')
            .select('post_id, posts:post_id(id, title, created_at)')
            .eq('solver_id', currentUserId)
            .eq('status', 'accepted');

          if (myAcceptedReqs) {
            myAcceptedReqs.forEach(req => {
              if (req.posts) {
                accessibleRoomsMap.set(req.posts.id, {
                  room_id: req.posts.id,
                  post_id: req.posts.id,
                  post_title: req.posts.title,
                  created_at: req.posts.created_at,
                });
              }
            });
          }
        } catch (e) {}
      }
    } catch (err) {
      console.warn('[storage] getAccessibleChatRooms error:', err);
    }
  }

  // Fallback / merge local storage rooms
  const localRooms = getLocal(LOCAL_CHAT_ROOMS, []);
  const localPosts = getLocal(LOCAL_POSTS, []);
  const localContacts = getLocal(LOCAL_CONTACTS, []);
  const localRequests = getLocal('collabx_requests', []);

  const allContacts = [...localContacts, ...localRequests];
  allContacts.filter(c => (c.solver_id === currentUserId || c.solverId === currentUserId) && c.status === 'accepted').forEach(c => {
    const post = localPosts.find(p => p.id === (c.post_id || c.postId));
    const pId = c.post_id || c.postId;
    if (pId && !accessibleRoomsMap.has(pId)) {
      accessibleRoomsMap.set(pId, {
        room_id: pId,
        post_id: pId,
        post_title: post?.title || 'Challenge Discussion',
        created_at: c.createdAt || c.created_at || new Date().toISOString()
      });
    }
  });

  localPosts.filter(p => p.author_id === currentUserId || p.authorId === currentUserId).forEach(p => {
    if (!accessibleRoomsMap.has(p.id)) {
      accessibleRoomsMap.set(p.id, {
        room_id: p.id,
        post_id: p.id,
        post_title: p.title,
        created_at: p.created_at || p.createdAt || new Date().toISOString()
      });
    }
  });

  localRooms.forEach(r => {
    const p = localPosts.find(post => post.id === r.post_id);
    if (!accessibleRoomsMap.has(r.id) && !accessibleRoomsMap.has(r.post_id)) {
      accessibleRoomsMap.set(r.id, {
        room_id: r.id,
        post_id: r.post_id || r.id,
        post_title: p?.title || 'Challenge Discussion',
        created_at: r.created_at || new Date().toISOString()
      });
    }
  });

  // Apply per-user deletion filtering
  const deletedMap = currentUserId ? getLocal(`collabx_deleted_rooms_${currentUserId}`, {}) : {};
  const allLocalMsgs = getLocal(LOCAL_CHAT_MSGS, []);

  const visibleRooms = Array.from(accessibleRoomsMap.values()).filter(r => {
    const cleanId = r.room_id ? r.room_id.replace('room_', '') : '';
    const cleanPostId = r.post_id ? r.post_id.replace('room_', '') : '';
    const deletedTimestamp = deletedMap[r.room_id] || deletedMap[cleanId] || deletedMap[r.post_id] || deletedMap[cleanPostId];

    if (!deletedTimestamp) return true;

    // Check if there are any messages sent in this room AFTER deletedTimestamp
    const roomMsgs = allLocalMsgs.filter(m =>
      m.chat_room_id === r.room_id ||
      m.chat_room_id === cleanId ||
      m.chat_room_id === r.post_id ||
      m.chat_room_id === cleanPostId
    );

    const hasNewerMessage = roomMsgs.some(m => new Date(m.created_at || m.createdAt).getTime() > deletedTimestamp);
    return hasNewerMessage;
  });

  return { data: visibleRooms, error: null };
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
            solver_requirement: extractPostRequirement(p),
            progress: extractPostProgress(p),
            author: p.author ? {
              ...p.author,
              account_type: getUserAccountType(p.author),
            } : null,
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
      solver_requirement: extractPostRequirement(p),
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

      return { 
        data: (data || []).map(u => ({
          ...u,
          account_type: getUserAccountType(u),
        })), 
        error 
      };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  }

  const users = getLocal(LOCAL_USERS, []);
  return { 
    data: users.map(u => ({
      ...u,
      account_type: getUserAccountType(u),
    })), 
    error: null 
  };
}

/**
 * Admin: Fetch all chat rooms with message counts
 */
export async function getAllAdminChatRooms() {
  const localRooms = getLocal(LOCAL_CHAT_ROOMS, []);
  const localMsgs = getLocal(LOCAL_CHAT_MSGS, []);
  const localPosts = getLocal(LOCAL_POSTS, []);
  const localContacts = getLocal(LOCAL_CONTACTS, []);
  const localRequests = getLocal('collabx_requests', []);

  let allPosts = [];
  let dbMessages = [];
  let dbRooms = [];

  if (isSupabaseConfigured) {
    try {
      const [postsRes, msgsRes, roomsRes] = await Promise.all([
        supabase.from('posts').select('id, title, author_id, status, created_at, profiles:author_id(name, email, avatar_url)'),
        supabase.from('chat_messages').select('id, chat_room_id, sender_id, content, created_at'),
        supabase.from('chat_rooms').select('id, post_id, created_at')
      ]);
      allPosts = postsRes.data || [];
      dbMessages = msgsRes.data || [];
      dbRooms = roomsRes.data || [];
    } catch (e) {
      console.warn('[storage] getAllAdminChatRooms query error:', e);
    }
  }

  // Merge posts from both DB and local
  const postMap = new Map();
  allPosts.forEach(p => postMap.set(p.id, p));
  localPosts.forEach(p => {
    if (!postMap.has(p.id)) postMap.set(p.id, p);
  });

  // Merge messages from both DB and local
  const msgMap = new Map();
  dbMessages.forEach(m => msgMap.set(m.id, m));
  localMsgs.forEach(m => {
    if (!msgMap.has(m.id)) msgMap.set(m.id, m);
  });
  const allMergedMsgs = Array.from(msgMap.values());

  // Merge rooms
  const roomsMap = new Map();
  dbRooms.forEach(r => {
    const post = postMap.get(r.post_id) || {};
    roomsMap.set(r.id, {
      id: r.id,
      post_id: r.post_id,
      post_title: post.title || 'Challenge Discussion',
      posts: post,
      created_at: r.created_at,
    });
  });

  // Also include all posts as active rooms
  postMap.forEach((p, pId) => {
    if (!roomsMap.has(pId)) {
      roomsMap.set(pId, {
        id: pId,
        post_id: pId,
        post_title: p.title || 'Challenge Discussion',
        posts: p,
        created_at: p.created_at || new Date().toISOString(),
      });
    }
  });

  localRooms.forEach(r => {
    const pId = r.post_id || r.id;
    if (!roomsMap.has(r.id) && !roomsMap.has(pId)) {
      const p = postMap.get(pId) || {};
      roomsMap.set(r.id, {
        id: r.id,
        post_id: pId,
        post_title: p.title || 'Challenge Discussion',
        posts: p,
        created_at: r.created_at || new Date().toISOString(),
      });
    }
  });

  // Compute message count for each room
  const finalRooms = Array.from(roomsMap.values()).map(r => {
    const cleanId = (r.post_id || r.id).replace('room_', '');
    const count = allMergedMsgs.filter(m => 
      m.chat_room_id === r.id || 
      m.chat_room_id === r.post_id || 
      m.chat_room_id === cleanId || 
      m.chat_room_id === `room_${r.id}` || 
      m.chat_room_id === `room_${cleanId}`
    ).length;

    return {
      ...r,
      message_count: count,
    };
  });

  return { data: finalRooms, error: null };
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

