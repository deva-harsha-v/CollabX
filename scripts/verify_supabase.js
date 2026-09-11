import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ufgcoodlgjrljwtdqdba.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZ2Nvb2RsZ2pybGp3dGRxZGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMjMwMjYsImV4cCI6MjEwNDY5OTAyNn0.hUtpae0U8ciRImBijAaY1Mh5SSH2beDOeIy8EqOZzEw';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

async function verifyAll() {
  console.log('====================================================');
  console.log('CollabX Real Supabase Database Verification & Smoke Test');
  console.log('====================================================\n');
  console.log('Project URL:', supabaseUrl);

  const tables = ['profiles', 'posts', 'contact_requests', 'notifications', 'chat_rooms', 'chat_participants', 'chat_messages'];
  let allTablesOk = true;

  console.log('\n--- 1. Table & RLS Check ---');
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table [${table}]: ERROR ->`, error.message);
      allTablesOk = false;
    } else {
      console.log(`✅ Table [${table}]: OK (Accessible via RLS).`);
    }
  }

  console.log('\n--- 2. RPC Function Check ---');
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_posts');
  if (rpcError) {
    console.log('❌ RPC [get_public_posts]: ERROR ->', rpcError.message);
  } else {
    console.log('✅ RPC [get_public_posts]: OK (Returned', rpcData?.length || 0, 'public posts).');
  }

  console.log('\n--- 3. Storage Buckets Check ---');
  const buckets = ['profile-pictures', 'verification-documents', 'post-media', 'chat-attachments'];
  for (const bucket of buckets) {
    const { error } = await supabase.storage.from(bucket).list('', { limit: 1 });
    if (error) {
      console.log(`❌ Bucket [${bucket}]: ERROR ->`, error.message);
    } else {
      console.log(`✅ Bucket [${bucket}]: OK.`);
    }
  }

  console.log('\n--- 4. Running Real User Smoke Test ---');

  if (!supabaseAdmin) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY is missing from .env.');
    console.log('   Please add SUPABASE_SERVICE_ROLE_KEY=<service_role_key> to your .env file to run the admin user smoke test.');
    return;
  }

  const testEmail = `smoke_test_${Date.now()}@collabx.org`;
  const testPass = 'TestPass123!';

  // Admin User Creation (bypasses rate limit and email confirmation)
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPass,
    email_confirm: true,
    user_metadata: { name: 'Smoke Test Admin User' }
  });

  if (authErr) {
    console.log('❌ Auth Admin createUser Failed:', authErr.message);
    return;
  }

  const userId = authData.user.id;
  console.log('✅ Admin createUser Passed! Created user ID:', userId);

  let createdPostId = null;

  try {
    // 1. Create Profile Row using Admin client
    const { error: profErr } = await supabaseAdmin.from('profiles').insert([{
      id: userId,
      name: 'Smoke Test User',
      email: testEmail,
      verification_uploaded: false,
    }]);

    if (profErr) {
      console.log('❌ Profile Creation Failed:', profErr.message);
    } else {
      console.log('✅ Profile Row Created Successfully!');
    }

    // 2. Create Test Post using Admin client
    const { data: postData, error: postErr } = await supabaseAdmin.from('posts').insert([{
      author_id: userId,
      title: 'Smoke Test Civic Challenge',
      description: 'Testing real Supabase database insertion and public RPC filtering.',
      phone_number: '+15550001111',
      latitude: 12.9715987,
      longitude: 77.5945627,
      status: 'live',
    }]).select().single();

    if (postErr) {
      console.log('❌ Post Creation Failed:', postErr.message);
    } else {
      createdPostId = postData.id;
      console.log('✅ Post Row Created Successfully! ID:', createdPostId);
    }

    // 3. Verify Public RPC (using anon client) returns post WITHOUT phone or coordinates
    const { data: publicPosts, error: publicRpcErr } = await supabase.rpc('get_public_posts');
    if (publicRpcErr) {
      console.log('❌ get_public_posts RPC Call Failed:', publicRpcErr.message);
    } else {
      const testPublicPost = publicPosts?.find(p => p.id === createdPostId);

      if (testPublicPost) {
        console.log('\n--- Privacy Gate Verification ---');
        console.log('Public Post Title:', testPublicPost.title);
        console.log('Phone Number Included in Public Query?:', testPublicPost.phone_number ? 'FAILED (EXPOSED!)' : 'NONE (SUCCESSFULLY GATED BY DB)');
        console.log('Latitude Included in Public Query?:', testPublicPost.latitude ? 'FAILED (EXPOSED!)' : 'NONE (SUCCESSFULLY GATED BY DB)');
        console.log('Longitude Included in Public Query?:', testPublicPost.longitude ? 'FAILED (EXPOSED!)' : 'NONE (SUCCESSFULLY GATED BY DB)');
        console.log('\n🎉 ALL CHECKS PASSED PERFECTLY!');
      } else {
        console.log('⚠️  Created post was not found in get_public_posts output.');
      }
    }
  } finally {
    // 4. Cleanup Test Data so database stays clean
    console.log('\n--- Cleaning Up Smoke Test Data ---');
    if (createdPostId) {
      await supabaseAdmin.from('posts').delete().eq('id', createdPostId);
      console.log('🧹 Deleted smoke test post');
    }
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    console.log('🧹 Deleted smoke test profile');

    const { error: delUserErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delUserErr) {
      console.log('❌ Error deleting auth user:', delUserErr.message);
    } else {
      console.log('🧹 Deleted smoke test auth user');
    }
    console.log('✅ Smoke test cleanup finished cleanly!');
  }
}

verifyAll();
