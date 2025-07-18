import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Trash, Plus, FileUp, Edit, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ChickenAccount } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export function ChickenAccountsManager() {
  const [accounts, setAccounts] = useState<ChickenAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Single account form
  const [newCode, setNewCode] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  
  // Bulk import
  const [bulkInput, setBulkInput] = useState("");
  const [bulkSheetOpen, setBulkSheetOpen] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  
  // Statistics
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [usedAccounts, setUsedAccounts] = useState(0);
  const [availableAccounts, setAvailableAccounts] = useState(0);
  
  // Editing states
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchChickenAccounts();
  }, []);

  const fetchChickenAccounts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching chicken accounts...");
      
      // Test connection first
      const { data: testData, error: testError } = await supabase
        .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
        .select("count", { count: 'exact' });
      
      console.log("Connection test:", { testData, testError });
      
      if (testError) {
        console.error("Connection test failed:", testError);
        // Try a simpler query without auth requirement
        const { data: publicData, error: publicError } = await supabase
          .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
          .select("*")
          .eq("status", "available")
          .limit(5);
          
        console.log("Public query result:", { publicData, publicError });
        
        if (publicError) {
          throw new Error(`Database connection failed: ${publicError.message}`);
        }
        
        // If public query works, try admin query
        const { data: adminData, error: adminError } = await supabase
          .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
          .select("*")
          .order("created_at", { ascending: false });
          
        if (adminError) {
          console.error("Admin query failed:", adminError);
          // Use public data as fallback
          setAccounts(publicData || []);
          setError("แสดงข้อมูลบางส่วน: ไม่สามารถเข้าถึงข้อมูลทั้งหมดได้");
          
          // Calculate statistics from public data
          const currentAccounts = publicData || [];
          const total = currentAccounts.length;
          const used = currentAccounts.filter(account => account.status === 'used').length;
          const available = total - used;
          
          setTotalAccounts(total);
          setUsedAccounts(used);
          setAvailableAccounts(available);
        } else {
          setAccounts(adminData || []);
          
          // Calculate statistics from admin data
          const currentAccounts = adminData || [];
          const total = currentAccounts.length;
          const used = currentAccounts.filter(account => account.status === 'used').length;
          const available = total - used;
          
          setTotalAccounts(total);
          setUsedAccounts(used);
          setAvailableAccounts(available);
        }
      } else {
        // Connection test passed, get full data
        const { data, error } = await supabase
          .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
          .select("*")
          .order("created_at", { ascending: false });

        console.log("Full query result:", { data, error });

        if (error) {
          throw error;
        }

        setAccounts(data || []);
        
        // Calculate statistics from the newly fetched data
        const currentAccounts = data || [];
        const total = currentAccounts.length;
        const used = currentAccounts.filter(account => account.status === 'used').length;
        const available = total - used;
        
        setTotalAccounts(total);
        setUsedAccounts(used);
        setAvailableAccounts(available);
      }
      
      console.log("Successfully loaded chicken accounts");
    } catch (error) {
      console.error("Error fetching chicken accounts:", error);
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          setError("เกิดปัญหาการเชื่อมต่อ กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่");
        } else {
          setError(`ไม่สามารถดึงข้อมูลบัญชีไก่ตันได้: ${error.message}`);
        }
      } else {
        setError("เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newCode || !newUsername || !newPassword) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setIsAddingAccount(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if code already exists
      const { data: existingCode, error: checkError } = await supabase
        .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
        .select("id")
        .eq("code", newCode)
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      if (existingCode && existingCode.length > 0) {
        setError(`โค้ด "${newCode}" มีอยู่ในระบบแล้ว`);
        setIsAddingAccount(false);
        return;
      }

      // Add new account
      const { error: insertError } = await supabase
        .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
        .insert([{
          code: newCode,
          username: newUsername,
          password: newPassword,
          product_name: newProductName || null,
          status: 'available'
        }]);

      if (insertError) {
        throw insertError;
      }

      setSuccess("เพิ่มบัญชีไก่ตันสำเร็จ");
      setNewCode("");
      setNewUsername("");
      setNewPassword("");
      setNewProductName("");
      setAddDialogOpen(false);
      fetchChickenAccounts();
    } catch (error) {
      console.error("Error adding chicken account:", error);
      setError("ไม่สามารถเพิ่มบัญชีไก่ตันได้");
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkInput.trim()) {
      setError("กรุณากรอกข้อมูลบัญชี");
      return;
    }

    setIsBulkAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const lines = bulkInput.trim().split('\n');
      const accountsToAdd = [];
      const errors = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Support multiple formats: code:username:password or code,username,password
        let parts: string[] = [];
        if (line.includes(':')) {
          parts = line.split(':');
        } else if (line.includes(',')) {
          parts = line.split(',');
        } else if (line.includes('|')) {
          parts = line.split('|');
        }

        if (parts.length < 3) {
          errors.push(`บรรทัดที่ ${i + 1}: รูปแบบไม่ถูกต้อง`);
          continue;
        }

        const code = parts[0].trim();
        const username = parts[1].trim();
        const password = parts[2].trim();
        const productName = parts[3] ? parts[3].trim() : "";

        if (!code || !username || !password) {
          errors.push(`บรรทัดที่ ${i + 1}: ข้อมูลไม่ครบถ้วน`);
          continue;
        }

        accountsToAdd.push({ code, username, password, product_name: productName || null });
      }

      if (accountsToAdd.length === 0) {
        setError("ไม่พบข้อมูลบัญชีที่ถูกต้อง");
        setIsBulkAdding(false);
        return;
      }

      // Check for duplicate codes in the database
      const codes = accountsToAdd.map(a => a.code);
      const { data: existingCodes, error: checkError } = await supabase
        .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
        .select("code")
        .in("code", codes);

      if (checkError) {
        throw checkError;
      }

      const existingCodeSet = new Set((existingCodes || []).map(c => c.code));
      const uniqueAccounts = accountsToAdd.filter(account => !existingCodeSet.has(account.code));
      const duplicateCount = accountsToAdd.length - uniqueAccounts.length;

      // Insert unique accounts
      if (uniqueAccounts.length > 0) {
        const { error: insertError } = await supabase
          .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
          .insert(uniqueAccounts.map(account => ({
            code: account.code,
            username: account.username,
            password: account.password,
            product_name: account.product_name,
            status: 'available'
          })));

        if (insertError) {
          throw insertError;
        }
      }

      let successMessage = `นำเข้าบัญชีสำเร็จ ${uniqueAccounts.length} รายการ`;
      if (duplicateCount > 0) {
        successMessage += `, ข้ามโค้ดซ้ำ ${duplicateCount} รายการ`;
      }
      if (errors.length > 0) {
        successMessage += `, พบข้อผิดพลาด ${errors.length} รายการ`;
      }

      setSuccess(successMessage);
      setBulkInput("");
      setBulkSheetOpen(false);
      fetchChickenAccounts();
    } catch (error) {
      console.error("Error bulk importing accounts:", error);
      setError("ไม่สามารถนำเข้าบัญชีได้");
    } finally {
      setIsBulkAdding(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("คุณต้องการลบบัญชีนี้หรือไม่?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setSuccess("ลบบัญชีสำเร็จ");
      fetchChickenAccounts();
    } catch (error) {
      console.error("Error deleting chicken account:", error);
      setError("ไม่สามารถลบบัญชีได้");
    }
  };

  const handleResetAccount = async (id: string) => {
    if (!confirm("คุณต้องการรีเซ็ตบัญชีนี้เพื่อนำกลับมาใช้งานอีกครั้งหรือไม่?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
        .update({
          status: 'available',
          used_by: null,
          used_at: null
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      setSuccess("รีเซ็ตบัญชีสำเร็จ");
      fetchChickenAccounts();
    } catch (error) {
      console.error("Error resetting chicken account:", error);
      setError("ไม่สามารถรีเซ็ตบัญชีได้");
    }
  };

  const startEditing = (account: ChickenAccount) => {
    setEditingAccount(account.id);
    setEditUsername(account.username);
    setEditPassword(account.password);
    setEditProductName(account.product_name || "");
  };

  const cancelEditing = () => {
    setEditingAccount(null);
    setEditUsername("");
    setEditPassword("");
    setEditProductName("");
  };

  const saveAccountEdit = async (id: string) => {
    if (!editUsername.trim() || !editPassword.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน");
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts")
        .update({
          username: editUsername.trim(),
          password: editPassword.trim(),
          product_name: editProductName.trim() || null
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      setSuccess("อัปเดตบัญชีสำเร็จ");
      setEditingAccount(null);
      setEditUsername("");
      setEditPassword("");
      setEditProductName("");
      fetchChickenAccounts();
    } catch (error) {
      console.error("Error updating chicken account:", error);
      setError("ไม่สามารถอัปเดตบัญชีได้");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>จัดการบัญชีไก่ตัน</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Statistics */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg flex-1 min-w-[200px]">
              <div className="text-2xl font-bold">{totalAccounts}</div>
              <div className="text-sm text-gray-500">บัญชีทั้งหมด</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg flex-1 min-w-[200px]">
              <div className="text-2xl font-bold text-green-600">{availableAccounts}</div>
              <div className="text-sm text-gray-500">บัญชีที่ใช้ได้</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg flex-1 min-w-[200px]">
              <div className="text-2xl font-bold text-gray-600">{usedAccounts}</div>
              <div className="text-sm text-gray-500">บัญชีที่ใช้ไปแล้ว</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">รายการบัญชี</h3>
            <div className="flex gap-2">
              {/* Bulk Import Sheet */}
              <Sheet open={bulkSheetOpen} onOpenChange={setBulkSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <FileUp className="mr-2 h-4 w-4" />
                    นำเข้าหลายบัญชี
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>นำเข้าบัญชีไก่ตันหลายรายการ</SheetTitle>
                    <SheetDescription>
                      วางข้อมูลในรูปแบบ: โค้ด:ชื่อผู้ใช้:รหัสผ่าน:ชื่อสินค้า (แต่ละบัญชีบรรทัดใหม่)
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="bulk-accounts">ข้อมูลบัญชี</Label>
                      <Textarea
                        id="bulk-accounts"
                        className="min-h-[200px]"
                        placeholder="ABC123:ChickenUser1:password123:Free Fire&#10;DEF456:ChickenUser2:password456:RoV&#10;GHI789:ChickenUser3:password789"
                        value={bulkInput}
                        onChange={(e) => setBulkInput(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">
                        รองรับรูปแบบ: โค้ด:ชื่อผู้ใช้:รหัสผ่าน:ชื่อสินค้า (ชื่อสินค้าไม่บังคับ)
                      </p>
                    </div>
                    <Button 
                      onClick={handleBulkImport}
                      disabled={isBulkAdding}
                    >
                      {isBulkAdding ? "กำลังนำเข้า..." : "นำเข้าบัญชี"}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              
              {/* Add Single Account Dialog */}
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มบัญชี
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>เพิ่มบัญชีไก่ตัน</DialogTitle>
                    <DialogDescription>
                      กรอกข้อมูลบัญชีที่ต้องการเพิ่มในระบบ
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="code">โค้ด</Label>
                      <Input
                        id="code"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        placeholder="ABC123"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="username">ชื่อผู้ใช้</Label>
                      <Input
                        id="username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="ChickenUser1"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">รหัสผ่าน</Label>
                      <Input
                        id="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="password123"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-name">ชื่อสินค้า (ไม่บังคับ)</Label>
                      <Input
                        id="product-name"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="Free Fire, RoV, etc."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddAccount}
                      disabled={isAddingAccount}
                    >
                      {isAddingAccount ? "กำลังเพิ่ม..." : "เพิ่มบัญชี"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Accounts Table */}
          {loading ? (
            <div className="text-center py-4">กำลังโหลดข้อมูล...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>โค้ด</TableHead>
                    <TableHead>ชื่อผู้ใช้</TableHead>
                    <TableHead>รหัสผ่าน</TableHead>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ผู้ใช้งาน</TableHead>
                    <TableHead>วันที่ใช้</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        ไม่พบข้อมูลบัญชี
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono font-medium">{account.code}</TableCell>
                        <TableCell>
                          {editingAccount === account.id ? (
                            <Input
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value)}
                              className="min-w-[120px]"
                              disabled={isUpdating}
                            />
                          ) : (
                            account.username
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          {editingAccount === account.id ? (
                            <Input
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              className="min-w-[120px]"
                              disabled={isUpdating}
                            />
                          ) : (
                            account.password
                          )}
                        </TableCell>
                        <TableCell>
                          {editingAccount === account.id ? (
                            <Input
                              value={editProductName}
                              onChange={(e) => setEditProductName(e.target.value)}
                              className="min-w-[120px]"
                              disabled={isUpdating}
                              placeholder="ชื่อสินค้า (ไม่บังคับ)"
                            />
                          ) : (
                            account.product_name || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              account.status === 'used'
                                ? "bg-gray-100 text-gray-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {account.status === 'used' ? "ใช้งานแล้ว" : "ว่าง"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {account.used_by || "-"}
                        </TableCell>
                        <TableCell>
                          {account.used_at 
                            ? new Date(account.used_at).toLocaleDateString('th-TH')
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {editingAccount === account.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => saveAccountEdit(account.id)}
                                  disabled={isUpdating}
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditing}
                                  disabled={isUpdating}
                                  className="text-gray-600 hover:bg-gray-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditing(account)}
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {account.status === 'used' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleResetAccount(account.id)}
                                  >
                                    รีเซ็ต
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteAccount(account.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}