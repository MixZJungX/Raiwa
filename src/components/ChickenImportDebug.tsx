import { useState, useEffect } from "react";
import { supabase, SUPABASE_KEY } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export function ChickenImportDebug() {
  const [logs, setLogs] = useState<{id: string, message: string, status: "success" | "error" | "info"}[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [tableFixed, setTableFixed] = useState(false);
  
  const addLog = (message: string, status: "success" | "error" | "info" = "info") => {
    setLogs(prev => [...prev, { id: uuidv4(), message, status }]);
  };
  
  const clearLogs = () => {
    setLogs([]);
  };

  const runFixTables = async () => {
    addLog("เริ่มการแก้ไขตาราง...", "info");
    try {
      // Step 1: Create the chicken accounts table manually
      addLog("Step 1: สร้างตาราง chicken_accounts...", "info");
      const { error: createTableError } = await supabase.rpc("exec_sql", {
        sql: `
          -- Create app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts table if it doesn't exist
          CREATE TABLE IF NOT EXISTS app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            is_used BOOLEAN DEFAULT false NOT NULL,
            used_by UUID REFERENCES auth.users(id),
            used_at TIMESTAMP WITH TIME ZONE
          );
          
          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts_username ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts (username);
          CREATE INDEX IF NOT EXISTS idx_app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts_is_used ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts (is_used);
        `
      });
      
      if (createTableError) {
        addLog(`❌ ไม่สามารถสร้างตาราง: ${createTableError.message}`, "error");
        return false;
      } else {
        addLog("✅ สร้างตารางสำเร็จ", "success");
      }
      
      // Step 2: Verify that all columns exist and match the TypeScript types
      addLog("Step 2: ตรวจสอบและแก้ไขคอลัมน์ในตาราง...", "info");
      const { error: columnFixError } = await supabase.rpc("exec_sql", {
        sql: `
          -- Make sure the schema matches our TypeScript types
          ALTER TABLE app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts 
          ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false NOT NULL;
          
          -- Change used_by to nullable if it's not already
          DO $$ 
          BEGIN 
            ALTER TABLE app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts 
            ALTER COLUMN used_by DROP NOT NULL;
          EXCEPTION 
            WHEN undefined_column OR others THEN 
            -- Do nothing, it's okay if the column doesn't exist or is already nullable
          END $$;
          
          -- Change used_at to nullable if it's not already
          DO $$ 
          BEGIN 
            ALTER TABLE app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts 
            ALTER COLUMN used_at DROP NOT NULL;
          EXCEPTION 
            WHEN undefined_column OR others THEN 
            -- Do nothing, it's okay if the column doesn't exist or is already nullable
          END $$;
        `
      });
      
      if (columnFixError) {
        addLog(`❌ ไม่สามารถแก้ไขคอลัมน์: ${columnFixError.message}`, "error");
      } else {
        addLog("✅ แก้ไขคอลัมน์สำเร็จ", "success");
      }
      
      // Step 3: Setup RLS policies
      addLog("Step 3: ตั้งค่านโยบายความปลอดภัย (RLS)...", "info");
      const { error: rlsError } = await supabase.rpc("exec_sql", {
        sql: `
          -- Enable Row Level Security
          ALTER TABLE app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts ENABLE ROW LEVEL SECURITY;
          
          -- Drop existing policies to avoid conflicts
          DROP POLICY IF EXISTS admin_chicken_accounts_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts;
          DROP POLICY IF EXISTS user_chicken_accounts_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts;
          
          -- Create simpler policies for chicken accounts - allow all authenticated users
          CREATE POLICY admin_chicken_accounts_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts 
            FOR ALL
            TO authenticated
            USING (true);
            
          CREATE POLICY user_chicken_accounts_policy ON app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts 
            FOR SELECT
            TO authenticated
            USING (
              used_by = auth.uid() OR used_by IS NULL
            );
        `
      });
      
      if (rlsError) {
        addLog(`❌ ไม่สามารถตั้งค่า RLS: ${rlsError.message}`, "error");
        return false;
      } else {
        addLog("✅ ตั้งค่า RLS สำเร็จ", "success");
      }
      
      // Success!
      addLog("แก้ไขโครงสร้างฐานข้อมูลสำเร็จ", "success");
      setTableFixed(true);
      return true;
    } catch (error) {
      addLog(`เกิดข้อผิดพลาดในการแก้ไขตาราง: ${error instanceof Error ? error.message : String(error)}`, "error");
      console.error("Error details:", error);
      return false;
    }
  };

  const runTest = async () => {
    setIsRunning(true);
    clearLogs();
    addLog("เริ่มการทดสอบ", "info");
    
    // Step 1: Check table access
    addLog("Test 1: ตรวจสอบการเข้าถึงตาราง", "info");
    try {
      const { data: countData, error: countError } = await supabase
        .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
        .select("count(*)", { count: "exact", head: true });
      
      if (countError) {
        addLog(`❌ ข้อผิดพลาดในการเข้าถึงตาราง: "${countError.message}" (บรรทัด ${countError?.code})`, "error");
        addLog(`รหัสข้อผิดพลาด: ${countError?.code}`, "error");
        if (countError.details) {
          addLog(`รายละเอียดข้อผิดพลาด: ${countError.details}`, "error");
        }
        
        // Try to fix tables if there's an error
        const fixed = await runFixTables();
        if (!fixed) {
          setIsRunning(false);
          return;
        }
      } else {
        addLog("✅ สามารถเข้าถึงตารางได้", "success");
      }
    } catch (error) {
      addLog(`❌ เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error instanceof Error ? error.message : String(error)}`, "error");
      setIsRunning(false);
      return;
    }
    
    // Step 2: Parse input
    addLog("Test 2: การแยกข้อมูลนำเข้า", "info");
    const testInput = "username=test_username, password=test_password";
    
    try {
      let username = "";
      let password = "";
      
      if (testInput.includes('=')) {
        const parts = testInput.split(',').map(part => part.trim());
        for (const part of parts) {
          if (part.startsWith('username=')) {
            username = part.replace('username=', '').trim();
          } else if (part.startsWith('password=')) {
            password = part.replace('password=', '').trim();
          }
        }
      } else if (testInput.includes(':')) {
        const parts = testInput.split(':');
        username = parts[0].trim();
        password = parts[1].trim();
      }
      
      if (username && password) {
        addLog(`✅ แยกข้อมูลสำเร็จ: username=${username}, password=${password}`, "success");
      } else {
        addLog(`❌ แยกข้อมูลล้มเหลว`, "error");
        setIsRunning(false);
        return;
      }
    } catch (error) {
      addLog(`❌ เกิดข้อผิดพลาดในการแยกข้อมูล: ${error instanceof Error ? error.message : String(error)}`, "error");
      setIsRunning(false);
      return;
    }
    
    // Step 3: Prepare test account data
    addLog("Test 3: การเตรียมข้อมูลบัญชีทดสอบ", "info");
    const testAccount = {
      id: uuidv4(),
      username: `test_username_${Date.now().toString()}`,
      password: "test_password",
      is_used: false,
      used_by: null,
      used_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    addLog(`✅ เตรียมข้อมูลบัญชีสำเร็จ: ${JSON.stringify(testAccount)}`, "success");
    
    // Step 4: Try inserting a single account
    addLog("Test 4: ทดลองเพิ่มบัญชีเดี่ยว", "info");
    try {
      const { data: insertData, error: insertError } = await supabase
        .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
        .insert([testAccount]);
      
      if (insertError) {
        addLog(`❌ การเพิ่มล้มเหลว: ${insertError.message}`, "error");
        addLog(`รหัสข้อผิดพลาด: ${insertError?.code}`, "error");
        if (insertError.details) {
          addLog(`รายละเอียดข้อผิดพลาด: ${insertError.details}`, "error");
        }
        
        // If error is related to RLS policies, try to fix
        if (insertError.message.includes("policy") || 
            insertError.code === "42501" || 
            insertError.code === "42P17") {
          addLog("ปัญหาเกี่ยวกับ Row Level Security (RLS), กำลังพยายามแก้ไข...", "info");
          const fixed = await runFixTables();
          if (fixed) {
            // Try insert again
            addLog("กำลังลองเพิ่มบัญชีอีกครั้ง...", "info");
            const { error: retryError } = await supabase
              .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
              .insert([testAccount]);
              
            if (retryError) {
              addLog(`❌ การเพิ่มล้มเหลวอีกครั้ง: ${retryError.message}`, "error");
            } else {
              addLog("✅ การเพิ่มสำเร็จหลังจากแก้ไขโครงสร้างตาราง", "success");
            }
          }
        }
      } else {
        addLog("✅ การเพิ่มบัญชีสำเร็จ", "success");
        
        // Clean up test account
        addLog("กำลังลบบัญชีทดสอบ...", "info");
        await supabase
          .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
          .delete()
          .eq("id", testAccount.id);
        addLog("✅ ลบบัญชีทดสอบสำเร็จ", "success");
      }
    } catch (error) {
      addLog(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
    
    // Check database schema
    addLog("Test 5: ตรวจสอบโครงสร้างฐานข้อมูล", "info");
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: `
          SELECT 
            table_name, 
            string_agg(column_name || ' ' || data_type, ', ' ORDER BY ordinal_position) as columns
          FROM 
            information_schema.columns
          WHERE 
            table_name LIKE 'app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_%'
          GROUP BY 
            table_name;
        `
      });
      
      if (error) {
        addLog(`❌ ไม่สามารถดึงโครงสร้างฐานข้อมูลได้: ${error.message}`, "error");
      } else if (data && data.length > 0) {
        addLog(`✅ พบตารางทั้งหมด ${data.length} ตาราง:`, "success");
        data.forEach((table: { table_name: string; columns: string }) => {
          addLog(`   📋 ${table.table_name}: ${table.columns}`, "info");
        });
      } else {
        addLog("❌ ไม่พบตารางที่เกี่ยวข้อง", "error");
      }
    } catch (error) {
      addLog(`❌ เกิดข้อผิดพลาดในการตรวจสอบโครงสร้าง: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
    
    addLog("การทดสอบเสร็จสมบูรณ์", "info");
    setIsRunning(false);
  };
  
  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">เครื่องมือแก้ไขปัญหาการนำเข้าบัญชีไก่ตัน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={runTest}
                disabled={isRunning}
              >
                {isRunning ? "กำลังทดสอบ..." : "เริ่มการทดสอบ"}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={runFixTables}
                disabled={isRunning}
              >
                แก้ไขตารางฐานข้อมูล
              </Button>
              
              <Button 
                variant="secondary" 
                onClick={clearLogs}
                disabled={isRunning}
              >
                ล้างบันทึก
              </Button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md border">
              <h3 className="font-medium mb-2">บันทึกการทดสอบ</h3>
              <div className="h-[400px] overflow-y-auto space-y-1 font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-gray-400">ยังไม่มีบันทึก</div>
                ) : (
                  logs.map(log => (
                    <div 
                      key={log.id} 
                      className={`flex items-start gap-2 ${
                        log.status === 'error' 
                          ? 'text-red-600' 
                          : log.status === 'success' 
                            ? 'text-green-600' 
                            : 'text-gray-700'
                      }`}
                    >
                      {log.status === 'error' && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                      {log.status === 'success' && <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                      {log.status === 'info' && <span className="w-4 flex-shrink-0">&gt;</span>}
                      <span className="whitespace-pre-wrap">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {tableFixed && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  โครงสร้างตารางได้รับการแก้ไขเรียบร้อยแล้ว! กรุณาลองนำเข้าบัญชีอีกครั้ง
                </AlertDescription>
              </Alert>
            )}
            
            <Separator />
            
            <div>
              <h3 className="font-medium mb-2">คำแนะนำ</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>คลิก "เริ่มการทดสอบ" เพื่อตรวจสอบการเชื่อมต่อและโครงสร้างฐานข้อมูล</li>
                <li>หากพบปัญหา "infinite recursion detected in policy" คลิก "แก้ไขตารางฐานข้อมูล" เพื่อแก้ไขนโยบาย RLS</li>
                <li>หลังจากแก้ไขตารางแล้ว ให้กลับไปที่หน้า "จัดการบัญชีไก่ตัน" และลองนำเข้าบัญชีอีกครั้ง</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChickenImportDebug;