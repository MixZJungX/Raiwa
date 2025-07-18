import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Generate a unique request ID for tracking
const generateRequestId = () => crypto.randomUUID();

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

  const requestId = generateRequestId();
  console.log(`[${requestId}] Received bulk import codes request`);
  
  try {
    // Parse request body
    let codes = [];
    let userId = null;

    try {
      const body = await req.json();
      codes = body.codes || [];
      userId = body.userId;

      if (!userId || !codes.length) {
        console.error(`[${requestId}] Missing required fields: userId or codes`);
        return new Response(
          JSON.stringify({
            error: 'UserId และรายการโค้ดจำเป็นต้องระบุ',
            status: 'error',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      if (codes.length > 500) {
        console.error(`[${requestId}] Too many codes: ${codes.length}`);
        return new Response(
          JSON.stringify({
            error: 'สามารถนำเข้าได้สูงสุด 500 โค้ดต่อครั้ง',
            status: 'error',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Remove duplicates
      codes = [...new Set(codes)].filter(code => code && code.trim());
      
    } catch (e) {
      console.error(`[${requestId}] Error parsing request body:`, e);
      return new Response(
        JSON.stringify({
          error: 'คำขอไม่ถูกต้อง',
          status: 'error',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Verify this is an admin user
    console.log(`[${requestId}] Verifying admin status for user ${userId}`);
    const { data: adminData, error: adminError } = await supabase
      .from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_admins')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (adminError || !adminData) {
      console.error(`[${requestId}] Admin verification failed:`, adminError || 'No admin record found');
      return new Response(
        JSON.stringify({
          error: 'ไม่มีสิทธิ์ในการนำเข้าโค้ด',
          status: 'error',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Process the codes in batches of 50
    const batchSize = 50;
    const results = {
      successful: 0,
      failed: 0,
      duplicates: 0,
      details: [],
    };

    console.log(`[${requestId}] Starting to import ${codes.length} codes in batches of ${batchSize}`);

    // Check for existing codes
    const { data: existingCodes, error: existingError } = await supabase
      .from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_codes')
      .select('code')
      .in('code', codes);

    if (existingError) {
      console.error(`[${requestId}] Error checking existing codes:`, existingError);
    }

    const existingCodeSet = new Set(existingCodes?.map(row => row.code) || []);

    // Process batches
    for (let i = 0; i < codes.length; i += batchSize) {
      const batchCodes = codes.slice(i, i + batchSize);
      const batchData = [];
      const batchDetails = [];

      for (const code of batchCodes) {
        if (existingCodeSet.has(code)) {
          results.duplicates++;
          batchDetails.push({
            code,
            status: 'duplicate',
            message: 'โค้ดนี้มีอยู่ในระบบแล้ว',
          });
        } else {
          batchData.push({
            code,
            status: 'available',
            created_by: userId,
            created_at: new Date().toISOString(),
          });
        }
      }

      if (batchData.length > 0) {
        console.log(`[${requestId}] Inserting batch of ${batchData.length} codes`);
        const { data: insertData, error: insertError } = await supabase
          .from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_codes')
          .insert(batchData)
          .select();

        if (insertError) {
          console.error(`[${requestId}] Error inserting codes:`, insertError);
          results.failed += batchData.length;
          
          batchData.forEach(item => {
            batchDetails.push({
              code: item.code,
              status: 'error',
              message: 'เกิดข้อผิดพลาดในการนำเข้า',
            });
          });
        } else {
          results.successful += insertData.length;
          
          insertData.forEach(item => {
            batchDetails.push({
              code: item.code,
              status: 'success',
              message: 'นำเข้าสำเร็จ',
            });
          });
        }
      }
      
      results.details.push(...batchDetails);
    }

    console.log(`[${requestId}] Bulk import completed: ${results.successful} successful, ${results.duplicates} duplicates, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: `นำเข้าสำเร็จ ${results.successful} โค้ด, มีอยู่แล้ว ${results.duplicates} โค้ด, ล้มเหลว ${results.failed} โค้ด`,
        results,
        status: 'success',
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
      JSON.stringify({
        error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่ภายหลัง',
        status: 'error',
      }),
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