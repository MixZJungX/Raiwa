import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Security settings
const ADMIN_SECRET_KEY = "thaiRobuxSystem2025";
const REQUIRED_EMAIL_DOMAINS = ['lemonshopby.me', 'admin.robux-redemption.com'];
const ALLOWED_EMAILS = ['lemonshop.co.th@gmail.com'];

// Log for debugging
console.log('Edge Function Initialized: Create Admin with security checks');

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  // Generate a request ID for tracking
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Received request to create admin: ${req.method}`);

  try {
    // Parse request body
    let email, password, secretKey;
    try {
      const body = await req.json();
      email = body.email;
      password = body.password;
      secretKey = body.secretKey;

      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email and password are required' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
      
      // Check for secret key authorization
      if (secretKey !== ADMIN_SECRET_KEY) {
        console.error(`[${requestId}] Invalid or missing secret key`);
        return new Response(
          JSON.stringify({ error: 'คุณไม่มีสิทธิ์สร้างบัญชีแอดมิน (รหัสพิเศษไม่ถูกต้อง)' }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Validate email domain - only allow specific domains or emails
      const isAllowedEmail = ALLOWED_EMAILS.includes(email);
      const isAllowedDomain = REQUIRED_EMAIL_DOMAINS.some(domain => email.endsWith('@' + domain));
      
      if (!isAllowedEmail && !isAllowedDomain) {
        console.error(`[${requestId}] Unauthorized email domain: ${email}`);
        return new Response(
          JSON.stringify({ error: 'คุณไม่สามารถใช้อีเมล์นี้สำหรับบัญชีแอดมิน' }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    } catch (e) {
      console.error(`[${requestId}] Error parsing request body:`, e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log(`[${requestId}] Creating admin user for email: ${email}`);

    // Check if email already exists in auth
    const { data: existingUsers, error: lookupError } = await supabase.auth.admin.listUsers({
      filter: `email.ilike.${email}`,
    });
    
    if (lookupError) {
      console.error(`[${requestId}] Error checking existing users:`, lookupError);
    } else if (existingUsers && existingUsers.users && existingUsers.users.length > 0) {
      console.error(`[${requestId}] User with this email already exists`);
      return new Response(
        JSON.stringify({ error: 'อีเมล์นี้ถูกใช้งานแล้ว' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Create the user account in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      console.error(`[${requestId}] Error creating user:`, authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const userId = authData.user.id;
    console.log(`[${requestId}] User created successfully, ID: ${userId}`);

    // Add the user to the admins table
    const { data: adminData, error: adminError } = await supabase
      .from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_admins')
      .insert([
        {
          user_id: userId,
          email: email,
        },
      ])
      .select();

    if (adminError) {
      console.error(`[${requestId}] Error adding user to admins table:`, adminError);
      
      // If adding to the admin table fails, we should delete the created user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
      
      if (deleteError) {
        console.error(`[${requestId}] Error cleaning up created user:`, deleteError);
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create admin account' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log(`[${requestId}] Admin record created successfully`);

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin account created successfully',
        userId: userId,
        email: email,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});