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

import { supabase, isSupabaseConfigured } from './supabaseClient.js';

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

export const getLocal = (key, fallback = []) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

export const setLocal = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`localStorage set error for ${key}:`, e);
  }
};

export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Global synchronization of all deleted post IDs across Supabase & all browsers
 */
export async function getGlobalDeletedPostIds() {
  const localDeleted = getLocal('collabx_deleted_post_ids', []);
  const deletedSet = new Set(localDeleted);

  if (isSupabaseConfigured) {
    try {
      const { data: notifs } = await supabase
        .from('notifications')
        .select('payload')
        .eq('type', 'admin_post_removed');

      if (Array.isArray(notifs)) {
        notifs.forEach(n => {
          const pId = n.payload?.post_id || n.payload?.postId;
          if (pId) deletedSet.add(pId);
        });
      }
    } catch (e) {
      console.warn('[storage] getGlobalDeletedPostIds query error:', e);
    }
  }

  const combined = Array.from(deletedSet);
  setLocal('collabx_deleted_post_ids', combined);
  return combined;
}

/**
 * Synchronize deleted posts & purge their associated chatrooms on author/user devices
 */
export async function syncDeletedPostsForUser(currentUser) {
  if (!currentUser) return;
  const deletedIds = await getGlobalDeletedPostIds();
  if (!deletedIds || deletedIds.length === 0) return;

  // 1. Clean local storage posts for author & others
  const localPosts = getLocal(LOCAL_POSTS, []);
  let changedPosts = false;
  const updatedLocal = localPosts.map(p => {
    if (deletedIds.includes(p.id) && p.status !== 'deleted') {
      changedPosts = true;
      return { ...p, status: 'deleted' };
    }
    return p;
  });
  if (changedPosts) {
    setLocal(LOCAL_POSTS, updatedLocal);
  }

  // 2. Hide / purge chat rooms assigned to deleted posts
  const localRooms = getLocal(LOCAL_CHAT_ROOMS, []);
  const updatedRooms = localRooms.filter(r => !deletedIds.includes(r.id) && !deletedIds.includes(r.post_id));
  if (updatedRooms.length !== localRooms.length) {
    setLocal(LOCAL_CHAT_ROOMS, updatedRooms);
  }

  // Hide rooms in per-user deleted rooms map
  const deletedMap = getLocal(`collabx_deleted_rooms_${currentUser.id}`, {});
  let changedMap = false;
  deletedIds.forEach(id => {
    if (!deletedMap[id]) {
      deletedMap[id] = Date.now();
      deletedMap[`room_${id}`] = Date.now();
      changedMap = true;
    }
  });
  if (changedMap) {
    setLocal(`collabx_deleted_rooms_${currentUser.id}`, deletedMap);
  }

  // 3. If logged into Supabase on author's machine, execute author update
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        for (const pId of deletedIds) {
          try {
            await supabase
              .from('posts')
              .update({ status: 'deleted' })
              .eq('id', pId)
              .eq('author_id', authData.user.id);
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('collabx_rooms_update'));
  }
}

/**
 * Auth: Get current session user
 */
export async function getCurrentUser() {
  let sessionUser = null;

  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        sessionUser = session.user;
      }
    } catch (err) {}
  }

  const localSession = getLocal(LOCAL_SESSION, null);

  // If Supabase session is not found, check if we have a local session (e.g. emergency user)
  if (!sessionUser && localSession && localSession.id) {
    // If localSession has temp_emergency_secret, attempt background sign in
    if (isSupabaseConfigured && localSession.email && localSession.temp_emergency_secret) {
      try {
        const { data: sData } = await supabase.auth.signInWithPassword({
          email: localSession.email,
          password: localSession.temp_emergency_secret,
        });
        if (sData?.user) {
          sessionUser = sData.user;
        }
      } catch (e) {}
    }

    if (!sessionUser) {
      const localSkills = getLocal(`collabx_user_skills_${localSession.id}`, localSession.skills || []);
      return { 
        data: { 
          ...localSession, 
          skills: localSkills, 
          account_type: getUserAccountType(localSession) 
        }, 
        error: null 
      };
    }
  }

  if (sessionUser) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      const localSkills = getLocal(`collabx_user_skills_${sessionUser.id}`, []);
      const userSkills = (profile && Array.isArray(profile.skills) && profile.skills.length > 0)
        ? profile.skills
        : (localSkills.length > 0 ? localSkills : (localSession?.skills || []));

      const mergedUser = {
        id: sessionUser.id,
        name: profile?.name || sessionUser.user_metadata?.name || localSession?.name || 'User',
        email: profile?.email || sessionUser.email || localSession?.email,
        phone: profile?.phone || localSession?.phone || null,
        avatar: profile?.avatar_url || sessionUser.user_metadata?.avatar_url || localSession?.avatar,
        skills: userSkills,
        account_type: getUserAccountType(profile || localSession),
        is_emergency: Boolean(localSession?.is_emergency || sessionUser.user_metadata?.is_emergency),
        emergency_first_post_pending: Boolean(localSession?.emergency_first_post_pending),
        has_made_emergency_post: Boolean(localSession?.has_made_emergency_post || sessionUser.user_metadata?.has_made_emergency_post),
        has_password: localSession?.has_password ?? Boolean(sessionUser.user_metadata?.has_password),
        verification_uploaded: profile?.verification_uploaded ?? localSession?.verification_uploaded,
        verification_document_url: profile?.verification_document_url ?? localSession?.verification_document_url,
      };

      setLocal(LOCAL_SESSION, mergedUser);
      return { data: mergedUser, error: null };
    } catch (err) {
      if (localSession) return { data: localSession, error: null };
    }
  }

  return { data: null, error: null };
}

/**
 * Auth: Resend Verification / Confirmation Email
 */
export async function resendVerificationEmail(email) {
  if (!email || typeof email !== 'string') {
    return { data: null, error: { message: 'A valid email address is required.' } };
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });
      if (error) return { data: null, error };
      return { data: true, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  return { data: true, error: null };
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
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        options: {
          data: {
            name: userData.name.trim(),
            phone: userData.phone ? userData.phone.trim() : null,
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
          console.warn('Doc upload notice:', e);
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
          console.warn('Avatar upload notice:', e);
        }
      }

      // Upsert profile record
      try {
        await supabase.from('profiles').upsert([{
          id: userId,
          name: userData.name.trim(),
          email: userData.email.toLowerCase().trim(),
          phone: userData.phone ? userData.phone.trim() : null,
          avatar_url: avatarUrl,
          skills: skills.length > 0 ? skills : null,
          verification_uploaded: isVerified,
          verification_document_url: docUrl,
        }], { onConflict: 'id' });
      } catch (profErr) {
        console.warn('Profile upsert notice:', profErr);
      }

      // Check if email confirmation is required by Supabase
      const needsEmailConfirmation = !authData.session || !authData.user.confirmed_at;

      const newUser = {
        id: userId,
        name: userData.name.trim(),
        email: userData.email.toLowerCase().trim(),
        phone: userData.phone ? userData.phone.trim() : null,
        avatar: avatarUrl,
        skills: skills,
        account_type: accountType,
        verification_uploaded: isVerified,
        verification_document_url: docUrl,
        needsEmailConfirmation: needsEmailConfirmation,
      };

      if (!needsEmailConfirmation) {
        setLocal(LOCAL_SESSION, newUser);
      }

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
    phone: userData.phone ? userData.phone.trim() : null,
    avatar: userData.avatar || defaultAvatar,
    skills: skills,
    account_type: accountType,
    verification_uploaded: isVerified,
    verification_document_url: userData.verificationDocument?.base64 || null,
    createdAt: new Date().toISOString(),
    needsEmailConfirmation: false,
  };

  users.push(newUser);
  setLocal(LOCAL_USERS, users);
  setLocal(LOCAL_SESSION, newUser);

  return { data: newUser, error: null };
}

/**
 * Auth: Emergency Fast-Track Registration
 * Bypasses email domain validation and password requirements.
 * Directly logs user in so they can post crisis problems immediately.
 */
export async function signUpEmergency(userData) {
  const cleanEmail = (userData.email || '').trim().toLowerCase();
  const userName = (userData.name || '').trim();
  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}&backgroundColor=dc2626,991b1b,7f1d1d`;
  let docUrl = null;

  let userId = generateUUID();
  const emergencySecret = `EmgCrisis!_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}_2026!`;

  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.signUp({
        email: cleanEmail,
        password: emergencySecret,
        options: {
          data: {
            name: userName,
            is_emergency: true,
            has_password: false,
            emergency_first_post_pending: true,
            account_type: 'emergency',
            avatar_url: defaultAvatar,
          }
        }
      });

      if (authData?.user) {
        userId = authData.user.id;
      }

      // Try signing in immediately in case email confirmation was bypassed or trigger auto-confirmed
      try {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: emergencySecret,
        });
        if (signInData?.user) {
          userId = signInData.user.id;
        }
      } catch (e) {}

      // Upload verification document if provided
      if (userData.verificationDocument?.base64) {
        try {
          const docPath = `emg_doc_${userId}_${Date.now()}.pdf`;
          let blob;
          if (userData.verificationDocument.base64.startsWith('data:')) {
            blob = await (await fetch(userData.verificationDocument.base64)).blob();
          } else {
            blob = userData.verificationDocument.base64;
          }
          await supabase.storage.from('verification-documents').upload(docPath, blob);
          docUrl = docPath;
        } catch (e) {}
      }

      // Upsert profile
      try {
        await supabase.from('profiles').upsert([{
          id: userId,
          name: userName,
          email: cleanEmail,
          avatar_url: defaultAvatar,
          verification_uploaded: true,
          verification_document_url: docUrl,
        }], { onConflict: 'id' });
      } catch (profErr) {}

    } catch (err) {
      console.warn('[storage] Supabase emergency signup notice:', err);
    }
  }

  const emergencyUser = {
    id: userId,
    name: userName,
    email: cleanEmail,
    temp_emergency_secret: emergencySecret,
    avatar: defaultAvatar,
    skills: ['emergency'],
    account_type: 'emergency',
    is_emergency: true,
    has_password: false,
    emergency_first_post_pending: true,
    has_made_emergency_post: false,
    verification_uploaded: true,
    verification_document_url: docUrl || userData.verificationDocument?.base64 || null,
    createdAt: new Date().toISOString(),
    needsEmailConfirmation: false,
  };

  // Add to local users and establish active session immediately
  const users = getLocal(LOCAL_USERS, []);
  const existingIdx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...emergencyUser };
  } else {
    users.push(emergencyUser);
  }
  setLocal(LOCAL_USERS, users);
  setLocal(LOCAL_SESSION, emergencyUser);

  // Set account type mapping
  const accMap = getLocal('collabx_user_account_types_map', {});
  accMap[userId] = 'emergency';
  setLocal('collabx_user_account_types_map', accMap);

  return { data: emergencyUser, error: null };
}

/**
 * Set Account Password directly for Emergency Users
 */
export async function setUserInitialPassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { data: null, error: { message: 'Password must be at least 6 characters long.' } };
  }

  const session = getLocal(LOCAL_SESSION, {});

  if (isSupabaseConfigured) {
    try {
      const { error: authErr } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          has_password: true,
        }
      });
      if (authErr) {
        console.warn('[storage] updateUser password error:', authErr.message);
      }
    } catch (e) {}
  }

  if (session && session.id) {
    session.has_password = true;
    session.password = newPassword;
    setLocal(LOCAL_SESSION, session);

    const users = getLocal(LOCAL_USERS, []);
    const updatedUsers = users.map(u => u.id === session.id ? { ...u, has_password: true, password: newPassword } : u);
    setLocal(LOCAL_USERS, updatedUsers);
  }

  return { data: true, error: null };
}

/**
 * Auth: Sign In
 */
export async function signIn(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authErr) {
        const msg = (authErr.message || '').toLowerCase();
        if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
          return {
            data: null,
            error: {
              message: 'Your email address has not been confirmed yet. Please check your inbox (and spam folder) and click the verification link before signing in.',
              isEmailUnconfirmed: true,
              email: cleanEmail,
            }
          };
        }
        return { data: null, error: authErr };
      }

      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!profile) {
        const meta = authData.user.user_metadata || {};
        const newProf = {
          id: authData.user.id,
          name: meta.name || cleanEmail.split('@')[0] || 'User',
          email: cleanEmail,
          phone: meta.phone || null,
          avatar_url: meta.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(meta.name || cleanEmail)}`,
          account_type: meta.account_type || (isValidOrgEmail(cleanEmail) ? 'organisation' : 'public'),
          verification_uploaded: meta.account_type === 'organisation' || isValidOrgEmail(cleanEmail),
        };
        try {
          await supabase.from('profiles').upsert([newProf], { onConflict: 'id' });
          profile = newProf;
        } catch (e) {}
      }

      const localSkills = getLocal(`collabx_user_skills_${authData.user.id}`, []);
      const userSkills = Array.isArray(profile?.skills) && profile.skills.length > 0 
        ? profile.skills 
        : localSkills;

      const user = {
        id: authData.user.id,
        name: profile?.name || cleanEmail.split('@')[0] || 'User',
        email: profile?.email || cleanEmail,
        phone: profile?.phone || null,
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
        skills: userSkills,
        account_type: getUserAccountType(profile || { email: cleanEmail }),
        verification_uploaded: profile?.verification_uploaded || false,
      };

      setLocal(LOCAL_SESSION, user);
      return { data: user, error: null };
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
        return {
          data: null,
          error: {
            message: 'Your email address has not been confirmed yet. Please check your inbox (and spam folder) and click the verification link before signing in.',
            isEmailUnconfirmed: true,
            email: cleanEmail,
          }
        };
      }
      return { data: null, error: { message: err.message } };
    }
  }

  // Fallback
  const users = getLocal(LOCAL_USERS, []);
  const user = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
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
 * Check if a user is eligible to publish an Emergency Post.
 * RULE: A user can only use ONE emergency post per week (7 days).
 */
export async function getUserEmergencyPostStatus(userId) {
  if (!userId) {
    return {
      canPostEmergency: true,
      remainingDays: 0,
      remainingHours: 0,
      nextAvailableDate: null,
      lastEmergencyPost: null,
    };
  }

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let latestEmergencyPost = null;

  // 1. Check Supabase posts table for author's previous emergency challenges
  if (isSupabaseConfigured) {
    try {
      const { data: dbPosts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(dbPosts)) {
        for (const post of dbPosts) {
          if (isPostEmergency(post)) {
            const postTime = new Date(post.created_at || post.createdAt).getTime();
            if (!latestEmergencyPost || postTime > new Date(latestEmergencyPost.created_at || latestEmergencyPost.createdAt).getTime()) {
              latestEmergencyPost = post;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[storage] Error querying Supabase for user emergency posts:', err);
    }

    // Also check emergency sync notifications if author_id matches
    try {
      const { data: syncRows } = await supabase
        .from('notifications')
        .select('payload, created_at')
        .eq('type', 'emergency_post_sync')
        .order('created_at', { ascending: false });

      if (Array.isArray(syncRows)) {
        for (const row of syncRows) {
          const payload = row.payload || {};
          const p = payload.post || {};
          const pAuthor = payload.author_id || p.author_id || p.authorId;
          if (pAuthor === userId) {
            const rowTime = new Date(payload.timestamp || row.created_at || p.created_at).getTime();
            if (!latestEmergencyPost || rowTime > new Date(latestEmergencyPost.created_at || latestEmergencyPost.createdAt).getTime()) {
              latestEmergencyPost = p.title ? p : { created_at: new Date(rowTime).toISOString() };
            }
          }
        }
      }
    } catch (e) {}
  }

  // 2. Check local posts cache
  const localPosts = getLocal(LOCAL_POSTS, []);
  for (const post of localPosts) {
    const pAuthor = post.author_id || post.authorId;
    if (pAuthor === userId && isPostEmergency(post)) {
      const postTime = new Date(post.created_at || post.createdAt).getTime();
      if (!latestEmergencyPost || postTime > new Date(latestEmergencyPost.created_at || latestEmergencyPost.createdAt).getTime()) {
        latestEmergencyPost = post;
      }
    }
  }

  // 3. Check persistent localStorage timestamp
  const localTimestamp = getLocal(`collabx_last_emergency_${userId}`, null);
  if (localTimestamp) {
    const cTime = new Date(localTimestamp).getTime();
    if (!latestEmergencyPost || cTime > new Date(latestEmergencyPost.created_at || latestEmergencyPost.createdAt).getTime()) {
      latestEmergencyPost = { created_at: localTimestamp };
    }
  }

  if (latestEmergencyPost) {
    const postTime = new Date(latestEmergencyPost.created_at || latestEmergencyPost.createdAt).getTime();
    const elapsed = now - postTime;
    if (elapsed < SEVEN_DAYS_MS) {
      const remainingMs = SEVEN_DAYS_MS - elapsed;
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      const nextAvailableDate = new Date(postTime + SEVEN_DAYS_MS);
      return {
        canPostEmergency: false,
        remainingDays,
        remainingHours,
        nextAvailableDate,
        lastEmergencyPost: latestEmergencyPost,
      };
    }
  }

  return {
    canPostEmergency: true,
    remainingDays: 0,
    remainingHours: 0,
    nextAvailableDate: null,
    lastEmergencyPost: latestEmergencyPost,
  };
}

/**
 * Create Post: Stores required phone_number, optional skills, float coordinates, solver_requirement.
 * If is_emergency is requested, strictly checks and enforces 1 emergency post per 7-day rule.
 */
export async function createPost(postData) {
  const session = getLocal(LOCAL_SESSION, {});

  let authUser = null;
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        authUser = authData.user;
      }
    } catch (e) {}
  }

  // Determine effective author identity
  const effectiveUserId = authUser?.id || session?.id || generateUUID();
  const authorName = session?.name || authUser?.user_metadata?.name || 'Community Member';
  const authorAvatar = session?.avatar || authUser?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authorName)}`;
  const authorAccountType = session?.account_type || authUser?.user_metadata?.account_type || 'public';

  // Check emergency eligibility (strictly 1 emergency post per 7 days per user)
  const wantsEmergency = Boolean(postData.is_emergency);
  let isEmergency = false;

  if (wantsEmergency) {
    const emergencyStatus = await getUserEmergencyPostStatus(effectiveUserId);
    if (!emergencyStatus.canPostEmergency) {
      const waitMsg = emergencyStatus.remainingDays > 1
        ? `${emergencyStatus.remainingDays} days`
        : `${emergencyStatus.remainingHours || 24} hours`;
      return {
        data: null,
        error: {
          message: `Weekly Emergency Quota Reached: A user can only publish 1 emergency challenge per week (7 days). Your next emergency post quota unlocks in approximately ${waitMsg}. Please submit this challenge as a normal post.`
        }
      };
    }
    isEmergency = true;
  }

  const solverReq = postData.solver_requirement || postData.solverRequirement || 'organisation_only';
  const rawSkills = Array.isArray(postData.skills) ? [...postData.skills] : [];
  const encodedSkills = [...rawSkills, `__req:${solverReq}`];
  if (isEmergency) {
    encodedSkills.unshift('emergency');
  }

  const cleanPhone = (postData.phone_number || '').trim();

  let mediaUrl = null;
  if (isSupabaseConfigured && postData.media && postData.media.startsWith('data:')) {
    try {
      const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const blob = await (await fetch(postData.media)).blob();
      const { data: uploadData } = await supabase.storage
        .from('post-media')
        .upload(fileName, blob);

      if (uploadData) {
        const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(fileName);
        mediaUrl = urlData.publicUrl;
      }
    } catch (e) {
      mediaUrl = postData.media;
    }
  } else if (postData.media) {
    mediaUrl = postData.media;
  }

  let finalPost = null;

  // 1. Try Supabase Insert if configured
  if (isSupabaseConfigured) {
    try {
      const postPayload = {
        author_id: effectiveUserId,
        title: postData.title.trim(),
        description: postData.description.trim(),
        organization: postData.organization ? postData.organization.trim() : null,
        skills: encodedSkills,
        phone_number: cleanPhone,
        address: postData.address ? postData.address.trim() : null,
        latitude: postData.coordinates?.latitude || null,
        longitude: postData.coordinates?.longitude || null,
        media_url: mediaUrl,
        status: 'live',
      };

      const { data: newDbPost, error: insertErr } = await supabase
        .from('posts')
        .insert([postPayload])
        .select()
        .single();

      if (!insertErr && newDbPost) {
        finalPost = {
          ...newDbPost,
          author_name: authorName,
          author_avatar: authorAvatar,
          author_account_type: authorAccountType,
          is_emergency: isEmergency,
          skills: cleanPostSkills(newDbPost.skills),
          solver_requirement: solverReq,
          progress: extractPostProgress(newDbPost),
        };
      } else {
        console.warn('[storage] Supabase posts insert notice:', insertErr?.message);
      }
    } catch (err) {
      console.warn('[storage] Supabase posts insert error:', err.message);
    }
  }

  // 2. If Supabase direct insert didn't produce a post (e.g. RLS pending or local mode), build post
  if (!finalPost) {
    const fallbackPostId = generateUUID();
    finalPost = {
      id: fallbackPostId,
      author_id: effectiveUserId,
      authorId: effectiveUserId,
      author_name: authorName,
      authorName: authorName,
      author_avatar: authorAvatar,
      authorAvatar: authorAvatar,
      author_account_type: authorAccountType,
      title: postData.title.trim(),
      description: postData.description.trim(),
      organization: postData.organization ? postData.organization.trim() : null,
      skills: cleanPostSkills(encodedSkills),
      rawSkills: encodedSkills,
      phone_number: cleanPhone,
      phoneNumber: cleanPhone,
      address: postData.address ? postData.address.trim() : null,
      latitude: postData.coordinates?.latitude || null,
      longitude: postData.coordinates?.longitude || null,
      coordinates: postData.coordinates || null,
      media_url: mediaUrl,
      media: mediaUrl,
      status: 'live',
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      is_emergency: isEmergency,
      solver_requirement: solverReq,
      progress: 0,
    };
  }

  // 3. Save to local posts
  const posts = getLocal(LOCAL_POSTS, []);
  posts.unshift(finalPost);
  setLocal(LOCAL_POSTS, posts);

  // 4. Update requirement and emergency maps
  const reqMap = getLocal('collabx_post_req_map', {});
  reqMap[finalPost.id] = solverReq;
  setLocal('collabx_post_req_map', reqMap);

  if (isEmergency) {
    const emergMap = getLocal('collabx_emergency_posts_map', {});
    emergMap[finalPost.id] = true;
    setLocal('collabx_emergency_posts_map', emergMap);

    // Record timestamp for 7-day cooldown
    const nowIso = new Date().toISOString();
    setLocal(`collabx_last_emergency_${effectiveUserId}`, nowIso);
  }

  // 6. Cross-device broadcast and sync
  if (isSupabaseConfigured) {
    // Broadcast via realtime channel
    try {
      const channel = supabase.channel('collabx_live_feed');
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'new_post',
            payload: { post: finalPost, is_emergency: isEmergency },
          });
          supabase.removeChannel(channel);
        }
      });
    } catch (e) {}

    // If emergency post, sync to notifications table to guarantee cross-PC feed visibility
    if (isEmergency) {
      try {
        await supabase.from('notifications').insert([{
          user_id: 'e808ba13-4773-4c1e-8512-24c3b11b45df',
          type: 'emergency_post_sync',
          payload: { post: finalPost },
          read: false,
        }]);
      } catch (e) {}
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('collabx_posts_update'));
  }

  return { data: finalPost, error: null };
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

export function isPostEmergency(post) {
  if (!post) return false;
  if (post.is_emergency === true || post.isEmergency === true) return true;
  const emergMap = getLocal('collabx_emergency_posts_map', {});
  if (post.id && emergMap[post.id]) return true;
  if (Array.isArray(post.skills)) {
    return post.skills.some(s => typeof s === 'string' && (s.toLowerCase() === 'emergency' || s.toLowerCase() === '__emergency'));
  }
  return false;
}

export function sortPostsWithEmergencyFirst(postsList) {
  if (!Array.isArray(postsList)) return [];
  return [...postsList].sort((a, b) => {
    const aEmerg = isPostEmergency(a) ? 1 : 0;
    const bEmerg = isPostEmergency(b) ? 1 : 0;
    if (bEmerg !== aEmerg) return bEmerg - aEmerg; // Emergency posts strictly pinned at the top!
    const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
    const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}

export function cleanPostSkills(skills) {
  if (!Array.isArray(skills)) return [];
  return skills.filter(s => typeof s === 'string' && !s.startsWith('__progress:') && !s.startsWith('__req:') && s.toLowerCase() !== 'emergency' && s.toLowerCase() !== '__emergency');
}

/**
 * Fetch Public Feed (ONLY 'live' challenges — NEVER shows completed or deleted posts)
 * Guarantees Emergency posts are pinned to the top across all users
 */
export async function getAllPosts() {
  const deletedIds = await getGlobalDeletedPostIds();
  const localPosts = getLocal(LOCAL_POSTS, []);
  let allCombined = [];

  if (isSupabaseConfigured) {
    try {
      // 1. Direct table query for LIVE posts only
      const { data: directPosts, error: directErr } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false });

      if (!directErr && directPosts && directPosts.length > 0) {
        allCombined.push(...directPosts);
      }

      // 2. Fetch any synced emergency posts from notifications table
      try {
        const { data: emergSyncRows } = await supabase
          .from('notifications')
          .select('payload')
          .eq('type', 'emergency_post_sync');

        if (emergSyncRows && emergSyncRows.length > 0) {
          emergSyncRows.forEach(row => {
            const ep = row.payload?.post;
            if (ep && !allCombined.some(p => p.id === ep.id)) {
              allCombined.push(ep);
            }
          });
        }
      } catch (e) {}

    } catch (err) {
      console.warn('[storage] getAllPosts Supabase fetch notice:', err.message);
    }
  }

  // 3. Merge local posts (especially local emergency posts)
  localPosts.forEach(lp => {
    if (lp.status === 'live' && !allCombined.some(p => p.id === lp.id)) {
      allCombined.push(lp);
    }
  });

  // 4. Filter deleted posts and map fields cleanly
  const liveFiltered = allCombined
    .filter(p => p.status === 'live' && !deletedIds.includes(p.id))
    .map(p => ({ 
      id: p.id,
      author_id: p.author_id || p.authorId,
      author_name: p.author_name || p.authorName || 'Community Member',
      author_avatar: p.author_avatar || p.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.title || 'Post')}`,
      author_account_type: p.author_account_type || 'public',
      title: p.title,
      description: p.description,
      organization: p.organization,
      skills: cleanPostSkills(p.skills || p.rawSkills),
      is_emergency: isPostEmergency(p),
      solver_requirement: extractPostRequirement(p),
      media_url: p.media_url || p.media,
      status: p.status,
      created_at: p.created_at || p.createdAt,
      progress: extractPostProgress(p),
      phone_number: null,
      latitude: null,
      longitude: null,
    }));

  return { 
    data: sortPostsWithEmergencyFirst(liveFiltered), 
    error: null 
  };
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
            is_emergency: isPostEmergency(postRow),
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
            is_emergency: isPostEmergency(detail),
            skills: cleanPostSkills(detail.skills),
            solver_requirement: extractPostRequirement(detail),
            progress: extractPostProgress(detail) 
          }, 
          error: null 
        };
      }
      // Check synced emergency posts in notifications table
      try {
        const { data: nRows } = await supabase
          .from('notifications')
          .select('payload')
          .eq('type', 'emergency_post_sync');
        if (nRows && nRows.length > 0) {
          const match = nRows.find(r => r.payload?.post?.id === postId);
          if (match?.payload?.post) {
            const ep = match.payload.post;
            return {
              data: {
                ...ep,
                skills: cleanPostSkills(ep.skills || ep.rawSkills),
                is_emergency: true,
                solver_requirement: extractPostRequirement(ep),
                progress: extractPostProgress(ep),
                is_authorized: true,
                user_contact_status: 'accepted',
              },
              error: null
            };
          }
        }
      } catch (e) {}
    } catch (err) {
      console.warn('[storage] getPostDetails notice:', err.message);
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
      is_emergency: isPostEmergency(post),
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
  const deletedIds = await getGlobalDeletedPostIds();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', userId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      const filtered = (data || [])
        .filter(p => !deletedIds.includes(p.id) && p.status !== 'deleted')
        .map(p => ({ 
          ...p, 
          is_emergency: isPostEmergency(p),
          skills: cleanPostSkills(p.skills),
          solver_requirement: extractPostRequirement(p),
          progress: extractPostProgress(p) 
        }));

      return { 
        data: sortPostsWithEmergencyFirst(filtered), 
        error 
      };
    } catch (err) {
      return { data: [], error: { message: err.message } };
    }
  }

  const posts = getLocal(LOCAL_POSTS, []);
  const userPosts = posts
    .filter(p => p.authorId === userId && p.status !== 'deleted' && !deletedIds.includes(p.id))
    .map(p => ({ 
      ...p, 
      is_emergency: isPostEmergency(p),
      skills: cleanPostSkills(p.skills),
      solver_requirement: extractPostRequirement(p),
      progress: extractPostProgress(p) 
    }));
  return { data: sortPostsWithEmergencyFirst(userPosts), error: null };
}

/**
 * Fetch "My Ideas" (Posts where user is an accepted solver and status != 'deleted')
 */
export async function getMyIdeas() {
  const deletedIds = await getGlobalDeletedPostIds();

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
        const postIds = contacts.map(c => c.post_id).filter(id => !deletedIds.includes(id));
        const { data: posts, error: postErr } = await supabase
          .from('posts')
          .select('*')
          .in('id', postIds)
          .neq('status', 'deleted')
          .order('created_at', { ascending: false });

        if (!postErr && posts) {
          const mapped = posts
            .filter(p => !deletedIds.includes(p.id) && p.status !== 'deleted')
            .map(p => ({ 
              ...p, 
              is_emergency: isPostEmergency(p),
              skills: cleanPostSkills(p.skills),
              solver_requirement: extractPostRequirement(p),
              progress: extractPostProgress(p) 
            }));

          return { 
            data: sortPostsWithEmergencyFirst(mapped), 
            error: null 
          };
        }
      }

      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_my_ideas');
      const rpcMapped = (rpcData || [])
        .filter(p => !deletedIds.includes(p.id) && p.status !== 'deleted')
        .map(p => ({ 
          ...p, 
          is_emergency: isPostEmergency(p),
          skills: cleanPostSkills(p.skills),
          solver_requirement: extractPostRequirement(p),
          progress: extractPostProgress(p) 
        }));

      return { 
        data: sortPostsWithEmergencyFirst(rpcMapped), 
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
    .filter(p => acceptedPostsIds.includes(p.id) && p.status !== 'deleted' && !deletedIds.includes(p.id))
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
      is_emergency: isPostEmergency(p),
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

  return { data: sortPostsWithEmergencyFirst(ideas), error: null };
}

/**
 * Soft Delete Post (Sets status = 'deleted')
 */
export async function softDeletePost(postId) {
  const deletedIds = getLocal('collabx_deleted_post_ids', []);
  if (!deletedIds.includes(postId)) {
    deletedIds.push(postId);
    setLocal('collabx_deleted_post_ids', deletedIds);
  }

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('posts')
        .update({ status: 'deleted' })
        .eq('id', postId);
    } catch (e) {}
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

      const effectivePostId = postId || updatedReq?.post_id;
      const effectiveSolverId = solverId || updatedReq?.solver_id;

      if (status === 'accepted' && effectivePostId) {
        // Ensure chat room exists for post
        let { data: room } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('post_id', effectivePostId)
          .maybeSingle();

        if (!room) {
          const { data: newRoom } = await supabase
            .from('chat_rooms')
            .insert([{ post_id: effectivePostId }])
            .select()
            .maybeSingle();
          room = newRoom;
        }

        // Add poster and solver to chat_participants
        if (room) {
          const participants = [];
          if (authData?.user?.id) participants.push({ chat_room_id: room.id, user_id: authData.user.id });
          if (effectiveSolverId) participants.push({ chat_room_id: room.id, user_id: effectiveSolverId });
          if (participants.length > 0) {
            try {
              await supabase.from('chat_participants').upsert(participants, { onConflict: 'chat_room_id, user_id' });
            } catch (pe) {}
          }
        }

        // Send accepted notification to solver
        if (effectiveSolverId) {
          await supabase.from('notifications').insert([{
            user_id: effectiveSolverId,
            type: 'contact_accepted',
            payload: { post_id: effectivePostId, request_id: requestId },
          }]);
        }
      } else if (status === 'rejected') {
        const targetSolver = effectiveSolverId;
        if (targetSolver) {
          await supabase.from('notifications').insert([{
            user_id: targetSolver,
            type: 'contact_rejected',
            payload: { post_id: effectivePostId, request_id: requestId },
          }]);
        }
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
      let targetRoomId = roomId;
      let targetPostId = cleanId;

      // 1. Resolve canonical chat room from Supabase
      try {
        const { data: roomRecord } = await supabase
          .from('chat_rooms')
          .select('id, post_id')
          .or(`id.eq.${roomId},post_id.eq.${cleanId},post_id.eq.${roomId}`)
          .maybeSingle();

        if (roomRecord) {
          targetRoomId = roomRecord.id;
          targetPostId = roomRecord.post_id;
        }
      } catch (re) {}

      // 2. Ensure current user is in chat_participants so RLS is_chat_participant allows access
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id;
        if (uid && targetRoomId) {
          await supabase.from('chat_participants').upsert(
            [{ chat_room_id: targetRoomId, user_id: uid }],
            { onConflict: 'chat_room_id, user_id' }
          );
        }
      } catch (pe) {}

      // 3. Query all messages matching any of candidate room IDs
      const candidateIds = Array.from(new Set([targetRoomId, targetPostId, roomId, cleanId].filter(Boolean)));
      const orFilter = candidateIds.map(id => `chat_room_id.eq.${id}`).join(',');

      const { data } = await supabase
        .from('chat_messages')
        .select('*, profiles:sender_id(name, avatar_url, email)')
        .or(orFilter)
        .order('created_at', { ascending: true });

      if (data && Array.isArray(data)) {
        supabaseMessages = data;
      }
    } catch (e) {
      console.warn('[storage] getChatMessages query note:', e);
    }
  }

  const msgs = getLocal(LOCAL_CHAT_MSGS, []);
  const roomMsgs = msgs.filter(m =>
    m.chat_room_id === roomId ||
    m.chat_room_id === cleanId ||
    m.chat_room_id === `room_${roomId}` ||
    m.chat_room_id === `room_${cleanId}`
  );

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

      // Ensure sender is in chat_participants so RLS is satisfied
      if (senderUserId && targetRoomId) {
        try {
          await supabase.from('chat_participants').upsert(
            [{ chat_room_id: targetRoomId, user_id: senderUserId }],
            { onConflict: 'chat_room_id, user_id' }
          );
        } catch (pe) {}
      }

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

  // Supabase Realtime WebSocket broadcast for instant cross-account delivery across all channels
  if (isSupabaseConfigured) {
    try {
      const channelNames = [
        `room_broadcast_${targetRoomId}`,
        `room_broadcast_${activePostId}`,
        `room_broadcast_${cleanId}`,
        `room_broadcast_${roomId}`,
        `room_${targetRoomId}`,
        `room_${activePostId}`,
        `room_${cleanId}`,
        `room_${roomId}`,
        `chat_${targetRoomId}`,
        `chat_${activePostId}`,
      ];
      const uniqueChannels = Array.from(new Set(channelNames.filter(Boolean)));
      uniqueChannels.forEach(chName => {
        try {
          const ch = supabase.channel(chName);
          ch.send({
            type: 'broadcast',
            event: 'chat_message',
            payload: newMsg
          });
        } catch (be) {}
      });

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
            .filter(n => {
              const p = n.payload || {};
              const rId = p.room_id || p.roomId;
              const cleanRId = rId ? rId.replace('room_', '') : '';
              const pId = p.post_id || p.postId;
              const cleanPId = pId ? pId.replace('room_', '') : '';
              return rId === roomId || rId === cleanId || cleanRId === cleanId ||
                     pId === roomId || pId === cleanId || cleanPId === cleanId ||
                     (rId && roomId.includes(rId)) || (pId && roomId.includes(pId));
            })
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
            .select('id, title, created_at, chat_rooms(id)')
            .eq('author_id', currentUserId);

          if (myPosts) {
            for (const p of myPosts) {
              let canonicalRoomId = p.chat_rooms?.[0]?.id || p.chat_rooms?.id;
              if (!canonicalRoomId) {
                try {
                  const { data: newRoom } = await supabase
                    .from('chat_rooms')
                    .insert([{ post_id: p.id }])
                    .select('id')
                    .maybeSingle();
                  if (newRoom) canonicalRoomId = newRoom.id;
                } catch (e) {}
              }
              const finalRoomId = canonicalRoomId || p.id;
              if (canonicalRoomId) {
                try {
                  await supabase.from('chat_participants').upsert(
                    [{ chat_room_id: canonicalRoomId, user_id: currentUserId }],
                    { onConflict: 'chat_room_id, user_id' }
                  );
                } catch (e) {}
              }
              accessibleRoomsMap.set(finalRoomId, {
                room_id: finalRoomId,
                post_id: p.id,
                post_title: p.title,
                created_at: p.created_at,
              });
            }
          }
        } catch (e) {}

        // 3. Solvers with accepted requests
        try {
          const { data: myAcceptedReqs } = await supabase
            .from('contact_requests')
            .select('post_id, posts:post_id(id, title, created_at, chat_rooms(id))')
            .eq('solver_id', currentUserId)
            .eq('status', 'accepted');

          if (myAcceptedReqs) {
            for (const req of myAcceptedReqs) {
              if (req.posts) {
                let canonicalRoomId = req.posts.chat_rooms?.[0]?.id || req.posts.chat_rooms?.id;
                if (!canonicalRoomId) {
                  try {
                    const { data: existingRoom } = await supabase
                      .from('chat_rooms')
                      .select('id')
                      .eq('post_id', req.posts.id)
                      .maybeSingle();
                    if (existingRoom) canonicalRoomId = existingRoom.id;
                  } catch (e) {}
                }
                const finalRoomId = canonicalRoomId || req.posts.id;
                if (canonicalRoomId) {
                  try {
                    await supabase.from('chat_participants').upsert(
                      [{ chat_room_id: canonicalRoomId, user_id: currentUserId }],
                      { onConflict: 'chat_room_id, user_id' }
                    );
                  } catch (e) {}
                }
                accessibleRoomsMap.set(finalRoomId, {
                  room_id: finalRoomId,
                  post_id: req.posts.id,
                  post_title: req.posts.title,
                  created_at: req.posts.created_at,
                });
              }
            }
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

  // Apply per-user deletion filtering & globally deleted post filtering
  const globalDeletedIds = await getGlobalDeletedPostIds();
  const deletedMap = currentUserId ? getLocal(`collabx_deleted_rooms_${currentUserId}`, {}) : {};
  const allLocalMsgs = getLocal(LOCAL_CHAT_MSGS, []);

  const visibleRooms = Array.from(accessibleRoomsMap.values()).filter(r => {
    const cleanId = r.room_id ? r.room_id.replace('room_', '') : '';
    const cleanPostId = r.post_id ? r.post_id.replace('room_', '') : '';

    // If post was deleted globally by admin or author, remove room for EVERYONE
    if (
      globalDeletedIds.includes(r.post_id) || 
      globalDeletedIds.includes(cleanPostId) || 
      globalDeletedIds.includes(r.room_id) || 
      globalDeletedIds.includes(cleanId)
    ) {
      return false;
    }

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
    email?.toLowerCase().trim() === ADMIN_CREDENTIALS.email.toLowerCase() &&
    password?.trim() === ADMIN_CREDENTIALS.password
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
  const deletedIds = getLocal('collabx_deleted_post_ids', []);
  const deletedMeta = getLocal('collabx_deleted_posts_meta', {});

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, author:author_id(name, email, avatar_url, phone)')
        .order('created_at', { ascending: false });

      if (data) {
        return {
          data: data.map(p => {
            const isDeleted = deletedIds.includes(p.id) || p.status === 'deleted';
            const meta = deletedMeta[p.id];
            return {
              ...p,
              status: isDeleted ? 'deleted' : p.status,
              delete_reason: meta?.reason || p.delete_reason || null,
              skills: cleanPostSkills(p.skills),
              solver_requirement: extractPostRequirement(p),
              progress: extractPostProgress(p),
              author: p.author ? {
                ...p.author,
                account_type: getUserAccountType(p.author),
              } : null,
            };
          }),
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
    data: posts.map(p => {
      const isDeleted = deletedIds.includes(p.id) || p.status === 'deleted';
      const meta = deletedMeta[p.id];
      return {
        ...p,
        status: isDeleted ? 'deleted' : p.status,
        delete_reason: meta?.reason || p.delete_reason || null,
        skills: cleanPostSkills(p.skills),
        solver_requirement: extractPostRequirement(p),
        progress: extractPostProgress(p),
      };
    }), 
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

  const globalDeletedIds = await getGlobalDeletedPostIds();

  // Compute message count for each room and filter out deleted posts
  const finalRooms = Array.from(roomsMap.values())
    .filter(r => {
      const cleanId = (r.post_id || r.id).replace('room_', '');
      const isDeleted = globalDeletedIds.includes(r.id) || globalDeletedIds.includes(r.post_id) || globalDeletedIds.includes(cleanId) || r.posts?.status === 'deleted';
      return !isDeleted;
    })
    .map(r => {
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
  const notificationMsg = `Your post "${postTitle}" has been removed by the admin for: ${reason}`;

  // 1. Record deletion in persistent deleted posts map
  const deletedIds = getLocal('collabx_deleted_post_ids', []);
  if (!deletedIds.includes(postId)) {
    deletedIds.push(postId);
    setLocal('collabx_deleted_post_ids', deletedIds);
  }

  const deletedMeta = getLocal('collabx_deleted_posts_meta', {});
  deletedMeta[postId] = {
    deleted_at: new Date().toISOString(),
    reason: reason,
    title: postTitle,
    author_id: authorId,
  };
  setLocal('collabx_deleted_posts_meta', deletedMeta);

  // 2. Update local storage posts
  const localPosts = getLocal(LOCAL_POSTS, []);
  const updatedLocal = localPosts.map(p => p.id === postId ? { ...p, status: 'deleted', delete_reason: reason } : p);
  setLocal(LOCAL_POSTS, updatedLocal);

  // 3. Attempt Supabase update and notification insertion
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('posts')
        .update({ status: 'deleted' })
        .eq('id', postId);

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
    } catch (err) {
      console.warn('[storage] adminDeletePost Supabase update warning:', err);
    }
  }

  // 4. Also record local notification for author
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

