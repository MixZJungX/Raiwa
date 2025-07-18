import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Processing redemption request`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Handling OPTIONS preflight request`);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
      console.log(`[${requestId}] Request data received`, { id: requestData.id, code: requestData.code });
    } catch (error) {
      console.error(`[${requestId}] Error parsing request body:`, error);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if required fields are present
    const { id, code, roblox_username, contact_info } = requestData;
    if (!id || !code || !roblox_username || !contact_info) {
      console.error(`[${requestId}] Missing required fields`);
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if code exists and is not used
    const { data: codeData, error: codeError } = await supabase
      .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redeem_codes")
      .select("*")
      .eq("code", code)
      .single();
    
    if (codeError || !codeData) {
      console.error(`[${requestId}] Code not found or invalid:`, codeError);
      return new Response(
        JSON.stringify({ error: 'Code not found or invalid' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (codeData.is_used) {
      console.error(`[${requestId}] Code already used:`, code);
      return new Response(
        JSON.stringify({ error: 'Code already used' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create redemption request
    const { error: insertError } = await supabase
      .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_requests")
      .insert(requestData);
    
    if (insertError) {
      console.error(`[${requestId}] Error inserting redemption request:`, insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create redemption request' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Mark code as used
    const { error: updateError } = await supabase
      .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redeem_codes")
      .update({ is_used: true })
      .eq("code", code);
    
    if (updateError) {
      console.error(`[${requestId}] Error marking code as used:`, updateError);
      // Continue anyway since the request was created
    }

    console.log(`[${requestId}] Redemption request processed successfully`);
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Redemption request created successfully',
        request_id: id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});