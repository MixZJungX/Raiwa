import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RedemptionRequest, RedemptionCode, ChickenAccount } from '@/types';
import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';

export default function Admin() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'codes' | 'accounts'>('requests');
  const [requests, setRequests] = useState<RedemptionRequest[]>([]);
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [accounts, setAccounts] = useState<ChickenAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newCode, setNewCode] = useState({ code: '', robux_value: '' });
  const [newAccount, setNewAccount] = useState({
    code: '',
    username: '',
    password: '',
    product_name: '',
    notes: ''
  });
  const [customProductName, setCustomProductName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [bulkImportType, setBulkImportType] = useState<'codes' | 'accounts'>('codes');
  const [bulkImportText, setBulkImportText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestsRes, codesRes, accountsRes] = await Promise.all([
        supabase.from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_codes').select('*').order('created_at', { ascending: false }),
        supabase.from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts').select('*').order('created_at', { ascending: false })
      ]);

      setRequests(requestsRes.data || []);
      setCodes(codesRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (id: string, status: string, adminNotes?: string) => {
    try {
      const { error } = await supabase
        .from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_requests')
        .update({ status, admin_notes: adminNotes, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('อัพเดทสถานะสำเร็จ');
      loadData();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัพเดท');
    }
  };

  const addCode = async () => {
    if (!newCode.code || !newCode.robux_value) {
      toast.error('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    try {
      const { error } = await supabase
        .from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_codes')
        .insert({
          code: newCode.code,
          robux_value: parseInt(newCode.robux_value)
        });

      if (error) throw error;
      toast.success('เพิ่มโค้ดสำเร็จ');
      setNewCode({ code: '', robux_value: '' });
      loadData();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มโค้ด');
    }
  };

  const addAccount = async () => {
    if (!newAccount.code || !newAccount.username || !newAccount.password || !newAccount.product_name) {
      toast.error('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    try {
      const { error } = await supabase
        .from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts')
        .insert(newAccount);

      if (error) throw error;
      toast.success(`เพิ่มบัญชี ${newAccount.product_name} สำเร็จ`);
      setNewAccount({ code: '', username: '', password: '', product_name: '', notes: '' });
      setShowCustomInput(false);
      setCustomProductName('');
      loadData();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มบัญชี');
    }
  };

  const deleteItem = async (table: string, id: string) => {
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบสำเร็จ');
      loadData();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบ');
    }
  };

  const handleBulkImport = async () => {
    if (!bulkImportText.trim()) {
      toast.error('กรุณาใส่ข้อมูลที่ต้องการนำเข้า');
      return;
    }

    const lines = bulkImportText.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      toast.error('ไม่พบข้อมูลที่ถูกต้อง');
      return;
    }

    setIsLoading(true);
    try {
      if (bulkImportType === 'codes') {
        // Format: CODE,ROBUX_VALUE
        const codeData = lines.map(line => {
          const [code, robuxValue] = line.split(',').map(s => s.trim());
          if (!code || !robuxValue || isNaN(Number(robuxValue))) {
            throw new Error(`รูปแบบไม่ถูกต้อง: ${line}`);
          }
          return {
            code: code.toUpperCase(),
            robux_value: parseInt(robuxValue),
            status: 'active'
          };
        });

        const { error } = await supabase
          .from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_codes')
          .insert(codeData);

        if (error) throw error;
        toast.success(`เพิ่มโค้ด Robux จำนวน ${codeData.length} รายการสำเร็จ!`);
      } else {
        // Format: CODE,PRODUCT_NAME,USERNAME,PASSWORD,NOTES
        const accountData = lines.map(line => {
          const parts = line.split(',').map(s => s.trim());
          if (parts.length < 4) {
            throw new Error(`รูปแบบไม่ถูกต้อง: ${line}`);
          }
          const [code, productName, username, password, notes = ''] = parts;
          return {
            code: code.toUpperCase(),
            product_name: productName,
            username,
            password,
            notes,
            status: 'available'
          };
        });

        const { error } = await supabase
          .from('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts')
          .insert(accountData);

        if (error) throw error;
        toast.success(`เพิ่มบัญชีไก่ตัน จำนวน ${accountData.length} รายการสำเร็จ!`);
      }

      setBulkImportText('');
      setShowBulkImportDialog(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">🔐 เข้าสู่ระบบแอดมิน</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/login">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                เข้าสู่ระบบ
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">👑</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">แผงควบคุมแอดมิน</h1>
                <p className="text-sm text-purple-200">จัดการระบบแลกโค้ด</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-white">👋 {user.email}</span>
              <Link to="/">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  กลับหน้าหลัก
                </Button>
              </Link>
              <Button onClick={signOut} variant="outline" className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30">
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">📋</div>
              <div className="text-xl font-bold text-blue-300">{requests.length}</div>
              <div className="text-xs text-blue-200">คำขอทั้งหมด</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">⏳</div>
              <div className="text-xl font-bold text-yellow-300">{requests.filter(r => r.status === 'pending').length}</div>
              <div className="text-xs text-yellow-200">รอดำเนินการ</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">💎</div>
              <div className="text-xl font-bold text-purple-300">{codes.filter(c => c.status === 'active').length}</div>
              <div className="text-xs text-purple-200">โค้ดพร้อมใช้</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">🐔</div>
              <div className="text-xl font-bold text-green-300">{accounts.filter(a => a.status === 'available').length}</div>
              <div className="text-xs text-green-200">บัญชีพร้อมใช้</div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-1 border border-white/20">
            {[
              { key: 'requests', label: '📋 คำขอ', count: requests.filter(r => r.status === 'pending').length },
              { key: 'codes', label: '💎 โค้ด', count: codes.length },
              { key: 'accounts', label: '🐔 บัญชี', count: accounts.length }
            ].map(tab => (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-transparent text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label} ({tab.count})
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'requests' && (
          <Card className="bg-white/10 backdrop-blur-xl border-white/20">
            <CardHeader>
              <CardTitle className="text-white">📋 จัดการคำขอ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white">โค้ด</TableHead>
                      <TableHead className="text-white">ชื่อ</TableHead>
                      <TableHead className="text-white">รหัส</TableHead>
                      <TableHead className="text-white">ประเภท</TableHead>
                      <TableHead className="text-white">Contact</TableHead>
                      <TableHead className="text-white">สถานะ</TableHead>
                      <TableHead className="text-white">วันที่</TableHead>
                      <TableHead className="text-white">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map(request => {
                      // Extract code from contact_info if it contains "Code:"
                      const codeMatch = request.contact_info.match(/Code: ([A-Z0-9]+)/);
                      const code = codeMatch ? codeMatch[1] : '-';
                      
                      // Extract password from contact_info if it contains "Password:"
                      const passwordMatch = request.contact_info.match(/Password: ([^\|]+)/);
                      const password = passwordMatch ? passwordMatch[1].trim() : '-';
                      
                      // Extract contact (phone number) from contact_info
                      const contactMatch = request.contact_info.match(/Contact: ([^\|]+)/);
                      const contact = contactMatch ? contactMatch[1].trim() : '-';
                      
                      return (
                        <TableRow key={request.id} className="border-white/10">
                          <TableCell className="text-white font-mono text-sm font-bold">{code}</TableCell>
                          <TableCell className="text-white">{request.roblox_username}</TableCell>
                          <TableCell className="text-white font-mono text-xs">{password}</TableCell>
                          <TableCell className="text-white">
                            {request.robux_amount > 0 ? `${request.robux_amount} Robux` : 'ไก่ตัน'}
                          </TableCell>
                          <TableCell className="text-white text-sm">{contact}</TableCell>
                          <TableCell>
                            <Badge className={
                              request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                              request.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                              request.status === 'processing' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-red-500/20 text-red-300'
                            }>
                              {request.status === 'pending' ? 'รอดำเนินการ' :
                               request.status === 'completed' ? 'เสร็จสิ้น' :
                               request.status === 'processing' ? 'กำลังดำเนินการ' : 'ยกเลิก'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white text-xs">
                            {new Date(request.created_at).toLocaleDateString('th-TH')}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                onClick={() => updateRequestStatus(request.id, 'processing')}
                                className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-xs"
                              >
                                ดำเนินการ
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateRequestStatus(request.id, 'completed')}
                                className="bg-green-500/20 text-green-300 hover:bg-green-500/30 text-xs"
                              >
                                เสร็จสิ้น
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateRequestStatus(request.id, 'rejected')}
                                className="bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs"
                              >
                                ยกเลิก
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'codes' && (
          <div className="space-y-6">
            {/* Add New Code */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">➕ เพิ่มโค้ด Robux ใหม่</CardTitle>
                  <Button
                    onClick={() => {
                      setBulkImportType('codes');
                      setShowBulkImportDialog(true);
                    }}
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    นำเข้าหลายรายการ
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="รหัสโค้ด"
                    value={newCode.code}
                    onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  <Input
                    type="number"
                    placeholder="จำนวน Robux"
                    value={newCode.robux_value}
                    onChange={(e) => setNewCode(prev => ({ ...prev, robux_value: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  <Button onClick={addCode} className="bg-gradient-to-r from-purple-600 to-pink-600">
                    เพิ่มโค้ด
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Codes List */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white">💎 รายการโค้ด Robux</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white">โค้ด</TableHead>
                        <TableHead className="text-white">Robux</TableHead>
                        <TableHead className="text-white">สถานะ</TableHead>
                        <TableHead className="text-white">วันที่สร้าง</TableHead>
                        <TableHead className="text-white">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {codes.map(code => (
                        <TableRow key={code.id} className="border-white/10">
                          <TableCell className="text-white font-mono">{code.code}</TableCell>
                          <TableCell className="text-white">{code.robux_value}</TableCell>
                          <TableCell>
                            <Badge className={code.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                              {code.status === 'active' ? 'ใช้ได้' : 'ใช้แล้ว'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white text-xs">
                            {new Date(code.created_at).toLocaleDateString('th-TH')}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => deleteItem('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_codes', code.id)}
                              className="bg-red-500/20 text-red-300 hover:bg-red-500/30"
                            >
                              ลบ
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="space-y-6">
            {/* Add New Account */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">➕ เพิ่มบัญชีไก่ตันใหม่</CardTitle>
                  <Button
                    onClick={() => {
                      setBulkImportType('accounts');
                      setShowBulkImportDialog(true);
                    }}
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    นำเข้าหลายรายการ
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="รหัสบัญชี"
                    value={newAccount.code}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, code: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  <Input
                    placeholder="ชื่อผู้ใช้"
                    value={newAccount.username}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, username: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  <Input
                    placeholder="รหัสผ่าน"
                    value={newAccount.password}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  <div className="space-y-2">
                    <Select onValueChange={(value) => {
                      if (value === 'custom') {
                        setShowCustomInput(true);
                        setNewAccount(prev => ({ ...prev, product_name: '' }));
                      } else {
                        setShowCustomInput(false);
                        setNewAccount(prev => ({ ...prev, product_name: value }));
                      }
                    }}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="ประเภทบัญชี" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {/* Existing types from database */}
                        {Array.from(new Set(accounts.map(acc => acc.product_name))).map(product => (
                          <SelectItem key={product} value={product}>{product}</SelectItem>
                        ))}
                        {/* Default types */}
                        <SelectItem value="Bone Blossom">Bone Blossom</SelectItem>
                        <SelectItem value="Butterfly">Butterfly</SelectItem>
                        <SelectItem value="Disco bee">Disco bee</SelectItem>
                        <SelectItem value="Dragonfly">Dragonfly</SelectItem>
                        <SelectItem value="Chicken zombie">Chicken zombie</SelectItem>
                        <SelectItem value="อื่นๆ">อื่นๆ</SelectItem>
                        <SelectItem value="custom">➕ เพิ่มประเภทใหม่</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {showCustomInput && (
                      <div className="space-y-2">
                        <Input
                          placeholder="ชื่อประเภทบัญชีใหม่"
                          value={customProductName}
                          onChange={(e) => setCustomProductName(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        />
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (customProductName.trim()) {
                                setNewAccount(prev => ({ ...prev, product_name: customProductName.trim() }));
                                setShowCustomInput(false);
                                setCustomProductName('');
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            ✓ ใช้ประเภทนี้
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowCustomInput(false);
                              setCustomProductName('');
                            }}
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            ยกเลิก
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <Textarea
                    placeholder="หมายเหตุ"
                    value={newAccount.notes}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, notes: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 md:col-span-2"
                  />
                  <Button onClick={addAccount} className="bg-gradient-to-r from-orange-600 to-yellow-600 md:col-span-2">
                    เพิ่มบัญชี
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Accounts List */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white">🐔 รายการบัญชีไก่ตัน</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white">รหัส</TableHead>
                        <TableHead className="text-white">ชื่อผู้ใช้</TableHead>
                        <TableHead className="text-white">รหัสผ่าน</TableHead>
                        <TableHead className="text-white">ประเภท</TableHead>
                        <TableHead className="text-white">สถานะ</TableHead>
                        <TableHead className="text-white">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map(account => (
                        <TableRow key={account.id} className="border-white/10">
                          <TableCell className="text-white font-mono text-xs">{account.code}</TableCell>
                          <TableCell className="text-white">{account.username}</TableCell>
                          <TableCell className="text-white font-mono text-xs">{account.password}</TableCell>
                          <TableCell className="text-white">{account.product_name}</TableCell>
                          <TableCell>
                            <Badge className={account.status === 'available' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                              {account.status === 'available' ? 'พร้อมใช้' : 'ใช้แล้ว'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => deleteItem('app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_chicken_accounts', account.id)}
                              className="bg-red-500/20 text-red-300 hover:bg-red-500/30"
                            >
                              ลบ
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bulk Import Dialog */}
        <Dialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}>
          <DialogContent className="bg-gray-900 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-blue-400" />
                <span>นำเข้าข้อมูลหลายรายการ</span>
                <Badge className="bg-blue-500/20 text-blue-300">
                  {bulkImportType === 'codes' ? 'โค้ด Robux' : 'บัญชีไก่ตัน'}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {bulkImportType === 'codes' ? (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-300 mb-2">รูปแบบข้อมูลโค้ด Robux:</h4>
                  <div className="bg-gray-800 rounded p-3 font-mono text-sm">
                    <div className="text-gray-400 mb-2">รูปแบบ: โค้ด,จำนวน Robux</div>
                    <div className="text-green-400">ROBUX100,100</div>
                    <div className="text-green-400">ROBUX200,200</div>
                    <div className="text-green-400">ROBUX500,500</div>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-300 mb-2">รูปแบบข้อมูลบัญชีไก่ตัน:</h4>
                  <div className="bg-gray-800 rounded p-3 font-mono text-sm">
                    <div className="text-gray-400 mb-2">รูปแบบ: โค้ด,ประเภทบัญชี,ชื่อผู้ใช้,รหัสผ่าน,หมายเหตุ</div>
                    <div className="text-green-400">CHICKEN01,Bone Blossom,user123,pass123,Premium Account</div>
                    <div className="text-green-400">CHICKEN02,Butterfly,user456,pass456,</div>
                    <div className="text-green-400">CHICKEN03,Royal Wings,user789,pass789,VIP Account</div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  ข้อมูลที่ต้องการนำเข้า (แต่ละบรรทัดคือรายการเดียว)
                </label>
                <Textarea
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  placeholder={bulkImportType === 'codes' 
                    ? "ROBUX100,100\nROBUX200,200\nROBUX500,500" 
                    : "CHICKEN01,Bone Blossom,user123,pass123,Premium Account\nCHICKEN02,Butterfly,user456,pass456,\nCHICKEN03,Royal Wings,user789,pass789,VIP Account"
                  }
                  className="bg-gray-800 border-gray-600 text-white min-h-[200px] font-mono text-sm"
                  rows={10}
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-yellow-200 text-sm">
                  <strong>คำแนะนำ:</strong>
                  <br />• ใส่ข้อมูลทีละบรรทัด
                  <br />• ใช้เครื่องหมายคอมมา (,) คั่นระหว่างข้อมูล
                  <br />• สำหรับบัญชีไก่ตัน หากไม่มีหมายเหตุให้เว้นว่างหลังคอมมาสุดท้าย
                  <br />• ตรวจสอบรูปแบบให้ถูกต้องก่อนกดนำเข้า
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowBulkImportDialog(false)}
                  variant="outline"
                  className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleBulkImport}
                  disabled={isLoading || !bulkImportText.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isLoading ? 'กำลังนำเข้า...' : `📥 นำเข้าข้อมูล`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}