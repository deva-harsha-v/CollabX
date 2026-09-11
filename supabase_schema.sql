-- ============================================================================
-- CollabX Production Database Schema, Security Definer RPCs, and RLS Policies
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    verification_document_url TEXT,
    verification_uploaded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. POSTS TABLE
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    organization TEXT,
    skills TEXT[], -- Can be NULL or empty array
    phone_number TEXT NOT NULL, -- Sensitive: Gated by RLS/RPC
    address TEXT,
    latitude DOUBLE PRECISION, -- Sensitive: Gated by RLS/RPC
    longitude DOUBLE PRECISION, -- Sensitive: Gated by RLS/RPC
    media_url TEXT,
    status TEXT DEFAULT 'live', -- 'live', 'completed', 'deleted'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONTACT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    solver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_contact_request UNIQUE (post_id, solver_id)
);

-- 5. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'contact_request', 'contact_accepted', 'contact_rejected', 'chat_message', 'post_live'
    payload JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CHAT ROOMS & PARTICIPANTS & MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL UNIQUE REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_chat_participant UNIQUE (chat_room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    attachment_url TEXT,
    attachment_type TEXT, -- 'image', 'document', 'video'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & HELPER FUNCTIONS
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check room participation without RLS recursion
CREATE OR REPLACE FUNCTION public.is_chat_participant(p_chat_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE chat_room_id = p_chat_room_id AND user_id = p_user_id
    );
$$;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP (Bypasses RLS safely server-side)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, avatar_url, verification_uploaded)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/initials/svg?seed=' || NEW.id),
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- POSTS POLICIES
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Authors can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can delete their own posts" ON public.posts;

CREATE POLICY "Public posts are viewable by everyone" 
    ON public.posts FOR SELECT USING (status != 'deleted');

CREATE POLICY "Authors can insert their own posts" 
    ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own posts" 
    ON public.posts FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own posts" 
    ON public.posts FOR DELETE USING (auth.uid() = author_id);

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Users can read only their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

CREATE POLICY "Users can read only their own notifications" 
    ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
    ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications" 
    ON public.notifications FOR INSERT WITH CHECK (true);

-- CONTACT REQUESTS POLICIES
DROP POLICY IF EXISTS "Posters and solvers can view relevant contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Solvers can insert contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Posters can update contact requests" ON public.contact_requests;

CREATE POLICY "Posters and solvers can view relevant contact requests" 
    ON public.contact_requests FOR SELECT USING (
        auth.uid() = solver_id OR 
        auth.uid() IN (SELECT author_id FROM public.posts WHERE id = post_id)
    );

CREATE POLICY "Solvers can insert contact requests" 
    ON public.contact_requests FOR INSERT WITH CHECK (auth.uid() = solver_id);

CREATE POLICY "Posters can update contact requests" 
    ON public.contact_requests FOR UPDATE USING (
        auth.uid() IN (SELECT author_id FROM public.posts WHERE id = post_id)
    );

-- CHAT POLICIES (Using security definer function to avoid infinite recursion)
DROP POLICY IF EXISTS "Chat participants can view their rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Posters can insert chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Chat participants can view participant lists" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can insert chat participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Chat participants can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat participants can insert messages" ON public.chat_messages;

CREATE POLICY "Chat participants can view their rooms" 
    ON public.chat_rooms FOR SELECT USING (
        public.is_chat_participant(id, auth.uid()) OR
        auth.uid() IN (SELECT author_id FROM public.posts WHERE id = post_id) OR
        auth.uid() IN (SELECT solver_id FROM public.contact_requests WHERE post_id = public.chat_rooms.post_id AND status = 'accepted')
    );

CREATE POLICY "Posters can insert chat rooms" 
    ON public.chat_rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Chat participants can view participant lists" 
    ON public.chat_participants FOR SELECT USING (
        user_id = auth.uid() OR 
        public.is_chat_participant(chat_room_id, auth.uid()) OR
        auth.uid() IN (
            SELECT author_id FROM public.posts p JOIN public.chat_rooms cr ON cr.post_id = p.id WHERE cr.id = chat_room_id
        ) OR
        auth.uid() IN (
            SELECT crq.solver_id FROM public.contact_requests crq JOIN public.chat_rooms cr ON cr.post_id = crq.post_id WHERE cr.id = chat_room_id AND crq.status = 'accepted'
        )
    );

CREATE POLICY "Users can insert chat participants" 
    ON public.chat_participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Chat participants can view messages" 
    ON public.chat_messages FOR SELECT USING (
        public.is_chat_participant(chat_room_id, auth.uid())
    );

CREATE POLICY "Chat participants can insert messages" 
    ON public.chat_messages FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND public.is_chat_participant(chat_room_id, auth.uid())
    );

-- Enable Supabase Realtime for Chat Messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;


-- ============================================================================
-- SECURITY DEFINER RPC FUNCTIONS (SERVER-SIDE IDENTITY DERIVATION VIA auth.uid())
-- ============================================================================

-- 1. Fetch Public Feed Posts (Never includes phone_number, latitude, longitude)
CREATE OR REPLACE FUNCTION public.get_public_posts()
RETURNS TABLE (
    id UUID,
    author_id UUID,
    author_name TEXT,
    author_avatar TEXT,
    author_organization TEXT,
    title TEXT,
    description TEXT,
    organization TEXT,
    skills TEXT[],
    media_url TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.author_id,
        prof.name AS author_name,
        prof.avatar_url AS author_avatar,
        prof.phone AS author_organization,
        p.title,
        p.description,
        p.organization,
        p.skills,
        p.media_url,
        p.status,
        p.created_at
    FROM public.posts p
    JOIN public.profiles prof ON p.author_id = prof.id
    WHERE p.status = 'live'
    ORDER BY p.created_at DESC;
END;
$$;

-- 2. Fetch Detailed Post Info with Gated Privacy Controls
-- Derived server-side using auth.uid(). Unlocks phone, lat, long ONLY if caller is Author OR Accepted Solver.
CREATE OR REPLACE FUNCTION public.get_post_details(p_post_id UUID)
RETURNS TABLE (
    id UUID,
    author_id UUID,
    author_name TEXT,
    author_avatar TEXT,
    author_email TEXT,
    title TEXT,
    description TEXT,
    organization TEXT,
    skills TEXT[],
    address TEXT,
    phone_number TEXT,     -- NULL if unauthorized
    latitude DOUBLE PRECISION, -- NULL if unauthorized
    longitude DOUBLE PRECISION, -- NULL if unauthorized
    media_url TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    is_authorized BOOLEAN,
    user_contact_status TEXT -- 'none', 'pending', 'accepted', 'rejected'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_author_id UUID;
    v_post_status TEXT;
    v_is_author BOOLEAN := FALSE;
    v_is_accepted BOOLEAN := FALSE;
    v_contact_status TEXT := 'none';
BEGIN
    -- Get post author and status
    SELECT p.author_id, p.status INTO v_author_id, v_post_status
    FROM public.posts p
    WHERE p.id = p_post_id;

    IF v_post_status IS NULL THEN
        RETURN;
    END IF;

    -- Block soft-deleted posts unless caller is author
    IF v_post_status = 'deleted' AND (v_caller_id IS NULL OR v_caller_id != v_author_id) THEN
        RETURN;
    END IF;

    IF v_caller_id IS NOT NULL THEN
        IF v_caller_id = v_author_id THEN
            v_is_author := TRUE;
            v_is_accepted := TRUE;
            v_contact_status := 'author';
        ELSE
            SELECT cr.status INTO v_contact_status
            FROM public.contact_requests cr
            WHERE cr.post_id = p_post_id AND cr.solver_id = v_caller_id;

            IF v_contact_status = 'accepted' THEN
                v_is_accepted := TRUE;
            ELSIF v_contact_status IS NULL THEN
                v_contact_status := 'none';
            END IF;
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.author_id,
        prof.name AS author_name,
        prof.avatar_url AS author_avatar,
        prof.email AS author_email,
        p.title,
        p.description,
        p.organization,
        p.skills,
        p.address,
        CASE WHEN v_is_accepted THEN p.phone_number ELSE NULL END AS phone_number,
        CASE WHEN v_is_accepted THEN p.latitude ELSE NULL END AS latitude,
        CASE WHEN v_is_accepted THEN p.longitude ELSE NULL END AS longitude,
        p.media_url,
        p.status,
        p.created_at,
        v_is_accepted AS is_authorized,
        v_contact_status AS user_contact_status
    FROM public.posts p
    JOIN public.profiles prof ON p.author_id = prof.id
    WHERE p.id = p_post_id;
END;
$$;

-- 3. Fetch "My Ideas" (Posts where caller is an Accepted Solver and status != 'deleted')
CREATE OR REPLACE FUNCTION public.get_my_ideas()
RETURNS TABLE (
    id UUID,
    author_id UUID,
    author_name TEXT,
    author_avatar TEXT,
    author_email TEXT,
    title TEXT,
    description TEXT,
    organization TEXT,
    skills TEXT[],
    address TEXT,
    phone_number TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    media_url TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.author_id,
        prof.name AS author_name,
        prof.avatar_url AS author_avatar,
        prof.email AS author_email,
        p.title,
        p.description,
        p.organization,
        p.skills,
        p.address,
        p.phone_number,
        p.latitude,
        p.longitude,
        p.media_url,
        p.status,
        p.created_at
    FROM public.posts p
    JOIN public.profiles prof ON p.author_id = prof.id
    JOIN public.contact_requests cr ON cr.post_id = p.id
    WHERE cr.solver_id = v_caller_id 
      AND cr.status = 'accepted'
      AND p.status != 'deleted'
    ORDER BY cr.created_at DESC;
END;
$$;

-- 4. Gated Verification Document Access Check
CREATE OR REPLACE FUNCTION public.can_access_verification_doc(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_has_access BOOLEAN := FALSE;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Owner can always access
    IF v_caller_id = p_target_user_id THEN
        RETURN TRUE;
    END IF;

    -- Poster can access if target user has a pending or accepted contact request for poster's post
    SELECT EXISTS (
        SELECT 1 
        FROM public.contact_requests cr
        JOIN public.posts p ON p.id = cr.post_id
        WHERE p.author_id = v_caller_id 
          AND cr.solver_id = p_target_user_id
          AND cr.status IN ('pending', 'accepted')
    ) INTO v_has_access;

    RETURN v_has_access;
END;
$$;

-- ============================================================================
-- STORAGE BUCKETS CREATION & SECURITY POLICIES
-- ============================================================================

-- Create the 4 required buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('profile-pictures', 'profile-pictures', true),
  ('post-media', 'post-media', true),
  ('verification-documents', 'verification-documents', false), -- PRIVATE GATED BUCKET
  ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage Policies: profile-pictures
DROP POLICY IF EXISTS "Public profile-pictures Select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated profile-pictures Insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated profile-pictures Update" ON storage.objects;

CREATE POLICY "Public profile-pictures Select" ON storage.objects FOR SELECT USING (bucket_id = 'profile-pictures');
CREATE POLICY "Authenticated profile-pictures Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated profile-pictures Update" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated');

-- Storage Policies: post-media
DROP POLICY IF EXISTS "Public post-media Select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated post-media Insert" ON storage.objects;

CREATE POLICY "Public post-media Select" ON storage.objects FOR SELECT USING (bucket_id = 'post-media');
CREATE POLICY "Authenticated post-media Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-media' AND auth.role() = 'authenticated');

-- Storage Policies: verification-documents (Private)
DROP POLICY IF EXISTS "Authenticated verification-documents Insert" ON storage.objects;
DROP POLICY IF EXISTS "Authorized verification-documents Select" ON storage.objects;

CREATE POLICY "Authenticated verification-documents Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'verification-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Authorized verification-documents Select" ON storage.objects FOR SELECT USING (
  bucket_id = 'verification-documents' AND (
    auth.uid() = owner OR 
    public.can_access_verification_doc(owner)
  )
);

-- Storage Policies: chat-attachments
DROP POLICY IF EXISTS "Public chat-attachments Select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated chat-attachments Insert" ON storage.objects;

CREATE POLICY "Public chat-attachments Select" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
CREATE POLICY "Authenticated chat-attachments Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

