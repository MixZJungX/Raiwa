import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Lock, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const validateForm = () => {
    setError(null);
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return false;
    }
    
    if (newPassword.length < 6) {
      setError("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
      return false;
    }
    
    return true;
  };
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // First, sign in with current password to verify it's correct
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });
      
      if (signInError) {
        setError("รหัสผ่านปัจจุบันไม่ถูกต้อง");
        setIsLoading(false);
        return;
      }
      
      // Then update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        setError(updateError.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
        setIsLoading(false);
        return;
      }
      
      // Success
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Change password error:", error);
      setError("เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-2 md:p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      
      <div className="max-w-md mx-auto space-y-6 md:space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4 pt-6 md:pt-12 px-2">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
              <Lock className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 bg-clip-text text-transparent leading-tight">
            เปลี่ยนรหัสผ่าน
          </h1>
          <p className="text-white/70 text-base md:text-xl max-w-2xl mx-auto leading-relaxed px-4">
            กรอกข้อมูลเพื่อเปลี่ยนรหัสผ่านของคุณ
          </p>
        </div>

        <Card className="shadow-2xl border-0 bg-white/10 backdrop-blur-xl border border-white/20">
          {success ? (
            <div className="p-6 md:p-8">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">เปลี่ยนรหัสผ่านสำเร็จ!</h3>
                  <p className="text-white/70">
                    รหัสผ่านของคุณได้รับการอัปเดตแล้ว
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={() => navigate("/admin")} 
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 text-lg shadow-xl"
                  >
                    กลับไปหน้าแอดมิน
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-white/10" 
                    onClick={() => navigate("/")}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    กลับไปหน้าแรก
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangePassword}>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-xl md:text-2xl text-white text-center">เปลี่ยนรหัสผ่าน</CardTitle>
                <CardDescription className="text-white/70 text-center text-sm md:text-base">
                  กรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 p-4 md:p-6">
                {error && (
                  <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 backdrop-blur-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-300">{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-3">
                  <Label htmlFor="current-password" className="text-white font-medium text-sm md:text-base flex items-center gap-2">
                    <Lock className="w-4 h-4 text-orange-400" />
                    รหัสผ่านปัจจุบัน
                  </Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านปัจจุบันของคุณ"
                    disabled={isLoading}
                    className="border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-orange-500 focus:ring-orange-500/50 h-11 md:h-12 text-sm md:text-base backdrop-blur-md"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="new-password" className="text-white font-medium text-sm md:text-base flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-400" />
                    รหัสผ่านใหม่
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่"
                    disabled={isLoading}
                    className="border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-green-500 focus:ring-green-500/50 h-11 md:h-12 text-sm md:text-base backdrop-blur-md"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="confirm-password" className="text-white font-medium text-sm md:text-base flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-400" />
                    ยืนยันรหัสผ่านใหม่
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    disabled={isLoading}
                    className="border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-blue-500 focus:ring-blue-500/50 h-11 md:h-12 text-sm md:text-base backdrop-blur-md"
                  />
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4 p-4 md:p-6">
                <Button 
                  className="w-full bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 hover:from-green-700 hover:via-blue-700 hover:to-purple-700 text-white font-bold py-3 md:py-4 text-lg md:text-xl shadow-2xl hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 rounded-xl" 
                  type="submit" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="text-sm md:text-base">กำลังเปลี่ยนรหัสผ่าน...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="text-sm md:text-base">เปลี่ยนรหัสผ่าน</span>
                    </div>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-white hover:bg-white/10" 
                  type="button"
                  onClick={() => navigate("/admin")}
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  ยกเลิก
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}