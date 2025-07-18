import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Check admin request received: ${req.method}`);

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get the JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error(`[${requestId}] Missing or invalid authorization header`);
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
    
    // Extract the token and get user
    const token = authHeader.replace("Bearer ", "");
    console.log(`[${requestId}] Token received, verifying user`);
    
    // Verify the token and get user data
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      console.error(`[${requestId}] Invalid token or user not found: ${userError?.message}`);
      return new Response(
        JSON.stringify({ error: "Invalid token or user not found" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
    
    const userId = userData.user.id;
    const userEmail = userData.user.email;
    console.log(`[${requestId}] User verified: ${userId} (${userEmail})`);
    
    // Check if user ID is provided in the request body
    let requestUserId = userId;
    try {
      const reqData = await req.json();
      if (reqData && reqData.user_id) {
        requestUserId = reqData.user_id;
        console.log(`[${requestId}] Request contains user_id: ${requestUserId}`);
      }
    } catch (e) {
      // If parsing fails, just use the token's user ID
      console.log(`[${requestId}] No valid JSON body, using token user ID`);
    }

    // MULTIPLE ADMIN CHECKS:
    
    // 1. Check direct hardcoded emails first (fastest)
    if (userEmail === "lemonshop.co.th@gmail.com") {
      console.log(`[${requestId}] Admin access granted via hardcoded email`);
      return new Response(
        JSON.stringify({ is_admin: true }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
    
    // 2. Check email domain as a quick check
    if (userEmail && (
      userEmail.endsWith("@lemonshopby.me") ||
      userEmail.endsWith("@admin.robux-redemption.com")
    )) {
      console.log(`[${requestId}] Admin access granted via email domain`);
      return new Response(
        JSON.stringify({ is_admin: true }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
    
    // 3. Check in database (most reliable but slower)
    console.log(`[${requestId}] Checking admin status in database for user: ${requestUserId}`);
    const { data: adminData, error: adminError } = await supabase
      .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_admins")
      .select("*")
      .eq("user_id", requestUserId)
      .single();
      
    if (adminError) {
      console.error(`[${requestId}] Error checking admin status: ${adminError.message}`);
      // Don't return error, continue to next check
    } else if (adminData) {
      console.log(`[${requestId}] Admin found in database: ${JSON.stringify(adminData)}`);
      return new Response(
        JSON.stringify({ is_admin: true }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
    
    // 4. Final check - look at user's metadata
    const role = userData.user.app_metadata?.role;
    if (role === "admin") {
      console.log(`[${requestId}] Admin access granted via user metadata`);
      return new Response(
        JSON.stringify({ is_admin: true }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
    
    // No admin access found through any method
    console.log(`[${requestId}] User is not an admin`);
    return new Response(
      JSON.stringify({ is_admin: false }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Server error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: "Server error processing request" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});