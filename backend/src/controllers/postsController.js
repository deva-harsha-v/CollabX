import { supabase, supabaseAdmin } from "../config/supabase.js";

/**
 * Get all live challenges for the public feed
 */
export async function getLivePosts(req, res) {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "live")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    // Sanitize gated fields for public list
    const sanitized = (data || []).map((p) => ({
      ...p,
      phone_number: null,
      latitude: null,
      longitude: null,
    }));

    return res.json({ success: true, data: sanitized });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Get single post details with gating verification
 */
export async function getPostDetails(req, res) {
  try {
    const { id } = req.params;
    const userId = req.headers["x-user-id"];

    const { data: post, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !post) {
      return res.status(404).json({ success: false, error: "Challenge not found" });
    }

    const isAuthor = userId && post.author_id === userId;
    let isAccepted = isAuthor;

    if (userId && !isAuthor) {
      const { data: contact } = await supabase
        .from("contact_requests")
        .select("status")
        .eq("post_id", id)
        .eq("solver_id", userId)
        .maybeSingle();
      if (contact?.status === "accepted") {
        isAccepted = true;
      }
    }

    const sanitized = {
      ...post,
      phone_number: isAccepted ? post.phone_number : null,
      latitude: isAccepted ? post.latitude : null,
      longitude: isAccepted ? post.longitude : null,
      is_authorized: isAccepted,
    };

    return res.json({ success: true, data: sanitized });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Create a new challenge brief
 */
export async function createPost(req, res) {
  try {
    const { author_id, title, description, phone_number, skills, organization, address, latitude, longitude, media_url } = req.body;

    if (!title || !description || !phone_number) {
      return res.status(400).json({ success: false, error: "Title, description, and phone number are required." });
    }

    const { data, error } = await supabaseAdmin.from("posts").insert([{
      author_id,
      title: title.trim(),
      description: description.trim(),
      phone_number: phone_number.trim(),
      skills: skills || null,
      organization: organization || null,
      address: address || null,
      latitude: latitude || null,
      longitude: longitude || null,
      media_url: media_url || null,
      status: "live",
    }]).select().single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Update challenge resolution progress (0-100%)
 */
export async function updateProgress(req, res) {
  try {
    const { id } = req.params;
    const { progress } = req.body;
    const clamped = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));

    const { data: currentPost } = await supabaseAdmin.from("posts").select("skills").eq("id", id).single();
    if (currentPost) {
      const existingSkills = Array.isArray(currentPost.skills) ? currentPost.skills : [];
      const clean = existingSkills.filter(s => typeof s === 'string' && !s.startsWith('__progress:'));
      const updatedSkills = [...clean, `__progress:${clamped}`];
      await supabaseAdmin.from("posts").update({ skills: updatedSkills }).eq("id", id);
    }

    await supabaseAdmin.from("posts").update({ progress: clamped }).eq("id", id);

    return res.json({ success: true, progress: clamped });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
