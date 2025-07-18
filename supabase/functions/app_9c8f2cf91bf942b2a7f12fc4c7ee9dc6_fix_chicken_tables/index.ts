import { createClient } from "npm:@supabase/supabase-js@2";

// Initialize the Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Log function for structured logging
const requestId = crypto.randomUUID();
const log = (message, data = {}) => {
  console.log(JSON.stringify({
    request_id: requestId,
    timestamp: new Date().toISOString(),
    message,
    ...data,
  }));
};

Deno.serve(async (req) => {
  // Handle preflight requests
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
  
  // Log request details
  log("Request received", {
    method: req.method,
    url: req.url,
  });

  try {
    // 1. Verify chicken account tables exist and create if missing
    log("Step 1: Checking and creating required tables");
    
    const { error: createError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Create chicken accounts table if it doesn't exist
        CREATE TABLE IF NOT EXISTS app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT NOT NULL,
          password TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          status TEXT DEFAULT 'available' NOT NULL,
          redeemed_by UUID REFERENCES auth.users(id),
          redeemed_at TIMESTAMP WITH TIME ZONE
        );

        -- Create index on username for faster lookups
        CREATE INDEX IF NOT EXISTS idx_app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts_username ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts (username);
        CREATE INDEX IF NOT EXISTS idx_app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts_status ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts (status);
        
        -- Create chicken redemption requests table if it doesn't exist
        CREATE TABLE IF NOT EXISTS app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_redemption_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) NOT NULL,
          chicken_account_id UUID REFERENCES app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts(id),
          status TEXT DEFAULT 'pending' NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          admin_notes TEXT,
          admin_id UUID REFERENCES auth.users(id)
        );
        
        -- Create index on user_id for faster lookups
        CREATE INDEX IF NOT EXISTS idx_app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_redemption_requests_user_id ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_redemption_requests (user_id);
      `
    });
    
    if (createError) {
      log("Error creating tables", { error: createError });
      throw new Error(`Failed to create tables: ${createError.message}`);
    }
    
    // 2. Fix Row Level Security policies
    log("Step 2: Setting up Row Level Security policies");
    
    const { error: rlsError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Enable RLS on chicken accounts table
        ALTER TABLE app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist to avoid conflicts
        DROP POLICY IF EXISTS admin_chicken_accounts_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts;
        DROP POLICY IF EXISTS user_chicken_accounts_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts;
        
        -- Create policies for chicken accounts
        CREATE POLICY admin_chicken_accounts_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts 
          USING (
            EXISTS (
              SELECT 1 FROM app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_users 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
          
        CREATE POLICY user_chicken_accounts_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts 
          FOR SELECT
          USING (
            redeemed_by = auth.uid()
          );
        
        -- Enable RLS on chicken redemption requests table
        ALTER TABLE app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_redemption_requests ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS admin_chicken_redemption_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_redemption_requests;
        DROP POLICY IF EXISTS user_chicken_redemption_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_redemption_requests;
        
        -- Create policies for chicken redemption requests
        CREATE POLICY admin_chicken_redemption_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_redemption_requests 
          USING (
            EXISTS (
              SELECT 1 FROM app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_users 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
          
        CREATE POLICY user_chicken_redemption_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_redemption_requests 
          USING (
            user_id = auth.uid()
          );
      `
    });
    
    if (rlsError) {
      log("Error setting up RLS policies", { error: rlsError });
      throw new Error(`Failed to set up RLS policies: ${rlsError.message}`);
    }
    
    // 3. Verify users table has admin role field
    log("Step 3: Verifying user table structure");
    
    const { error: userTableError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Make sure the users table exists
        CREATE TABLE IF NOT EXISTS app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
          role TEXT DEFAULT 'user' NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
        
        -- Enable RLS
        ALTER TABLE app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_users ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS users_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_users;
        DROP POLICY IF EXISTS admin_users_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_users;
        
        -- Create policies
        CREATE POLICY users_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_users 
          FOR SELECT
          USING (true);
          
        CREATE POLICY admin_users_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_users 
          USING (
            EXISTS (
              SELECT 1 FROM app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_users 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
      `
    });
    
    if (userTableError) {
      log("Error setting up users table", { error: userTableError });
      throw new Error(`Failed to set up users table: ${userTableError.message}`);
    }
    
    log("Database structure fixed successfully");
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Database structure fixed successfully",
        tables_created: [
          "app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts",
          "app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_redemption_requests"
        ],
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      }
    );
  } catch (error) {
    log("Error in edge function", { error: error.message, stack: error.stack });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
        error: error.toString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      }
    );
  }
});