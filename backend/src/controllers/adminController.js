import { supabaseAdmin } from "../config/supabase.js";

const ADMIN_CREDENTIALS = {
  email: "admin@collabx.org",
  password: "AdminCollabX2026!Secure",
};

/**
 * Admin Authentication
 */
export async function adminLogin(req, res) {
  const { email, password } = req.body;
  if (
    email &&
    password &&
    email.toLowerCase().trim() === ADMIN_CREDENTIALS.email.toLowerCase() &&
    password === ADMIN_CREDENTIALS.password
  ) {
    return res.json({
      success: true,
      data: {
        email: ADMIN_CREDENTIALS.email,
        role: "admin",
        name: "CollabX Administrator",
        token: "admin_collabx_verified_session",
      },
    });
  }
  return res.status(401).json({ success: false, error: "Invalid Admin Credentials." });
}

/**
 * Admin: Get all telemetry and posts
 */
export async function getAllAdminPosts(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from("posts")
      .select("*, author:author_id(name, email, avatar_url, phone)")
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Admin: Delete challenge with reason notification
 */
export async function adminDeletePost(req, res) {
  try {
    const { postId, authorId, postTitle, reason } = req.body;
    if (!postId || !reason) {
      return res.status(400).json({ success: false, error: "Post ID and deletion reason are required." });
    }

    await supabaseAdmin.from("posts").update({ status: "deleted" }).eq("id", postId);

    if (authorId) {
      await supabaseAdmin.from("notifications").insert([{
        user_id: authorId,
        type: "admin_post_removed",
        payload: {
          post_id: postId,
          post_title: postTitle || "Challenge",
          reason: reason.trim(),
          message: `Your post was removed by the administrator: ${reason.trim()}`,
        },
        read: false,
      }]);
    }

    return res.json({ success: true, message: "Post deleted and author notified." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
