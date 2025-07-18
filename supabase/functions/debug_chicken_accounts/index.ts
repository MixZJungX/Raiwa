// debug_chicken_accounts.ts

import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Get Supabase client
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const tableName = "app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts";
  
  try {
    // Test connection by selecting from the chicken accounts table
    const { data, error } = await supabaseClient
      .from(tableName)
      .select('*')
      .limit(1);
    
    // Get table schema
    const { data: schema, error: schemaError } = await supabaseClient.rpc(
      'app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_debug_table_info',
      { table_name: tableName }
    );
    
    const testAccount = {
      id: crypto.randomUUID(),
      username: `test_${Date.now()}`,
      password: "test_password",
      is_used: false,
      used_by: null,
      used_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Test insert
    const { data: insertData, error: insertError } = await supabaseClient
      .from(tableName)
      .insert(testAccount)
      .select();
    
    // Clean up the test account
    if (!insertError) {
      await supabaseClient
        .from(tableName)
        .delete()
        .eq('id', testAccount.id);
    }
    
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Database connection successful",
        connectionTest: {
          success: !error,
          error: error ? error.message : null,
          data: data ? "Data retrieved successfully" : null
        },
        schemaInfo: {
          success: !schemaError,
          error: schemaError ? schemaError.message : null,
          data: schema || null
        },
        insertTest: {
          success: !insertError,
          error: insertError ? insertError.message : null,
          data: insertData ? "Insert successful" : null
        },
        testAccount: testAccount
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "An error occurred",
        error: err.message,
        stack: err.stack
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});