import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*"
};

const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  return null;
};

const validateAdmin = async (supabase, token) => {
  try {
    // Verify the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User validation error:', userError);
      return { isAdmin: false, error: 'Invalid user token' };
    }

    // Check if this user has admin role in our user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError) {
      console.error('Role check error:', roleError);
      
      // Try checking the app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_admins table instead
      const { data: adminData, error: adminError } = await supabase
        .from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_admins')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (adminError) {
        console.error('Admin table check error:', adminError);
        return { isAdmin: false, error: 'Failed to check user role' };
      }
      
      if (adminData) {
        console.log('Admin found in app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_admins table:', adminData);
        return { isAdmin: true, user };
      }
    }

    if (!roleData || roleData.role !== 'admin') {
      // Try checking the specific user email as last resort
      if (user.email === "lemonshop.co.th@gmail.com") {
        console.log('Admin access granted via hardcoded email');
        return { isAdmin: true, user };
      }
      
      console.error('User is not an admin:', user.id);
      return { isAdmin: false, error: 'User is not an admin' };
    }

    return { isAdmin: true, user };
  } catch (error) {
    console.error('Admin validation error:', error);
    return { isAdmin: false, error: error.message };
  }
};

serve(async (req) => {
  // Generate request ID for tracing
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] New request: ${req.method} ${req.url}`);
  
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Initialize the admin client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get auth token from request header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error(`[${requestId}] Missing or invalid Authorization header`);
    return new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.split(' ')[1];
  
  // Validate if user is admin
  const { isAdmin, error: adminError } = await validateAdmin(supabase, token);
  if (!isAdmin) {
    console.error(`[${requestId}] Admin validation failed:`, adminError);
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Admin access required', details: adminError }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Process the request
  if (req.method !== 'POST') {
    console.error(`[${requestId}] Method not allowed: ${req.method}`);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    console.log(`[${requestId}] Received request body:`, JSON.stringify(body));
    
    // Validate request body
    const { code, value } = body;
    if (!code || value === undefined || value === null) {
      console.error(`[${requestId}] Missing required fields`);
      return new Response(
        JSON.stringify({ error: 'Missing required fields: code and value are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a UUID if not provided
    const id = body.id || crypto.randomUUID();
    
    // Insert new redemption code
    console.log(`[${requestId}] Inserting new code into redemption_codes table: ${code}`);
    const { data, error } = await supabase
      .from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_codes')
      .insert({
        id,
        code,
        value: parseInt(value),
        is_used: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error(`[${requestId}] Database error:`, error);
      
      // Check if it's a unique violation error (code already exists)
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Code already exists', code: error.code }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Database error: ${error.message}`, code: error.code }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Code added successfully: ${code}`);
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${requestId}] Server error:`, error);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});