import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  message: string;
  results: {
    successful: number;
    failed: number;
    duplicates: number;
    details: Array<{
      code: string;
      status: string;
      message: string;
    }>;
  };
  status: string;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [codesInput, setCodesInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!codesInput.trim()) {
      setError('กรุณากรอกโค้ดที่ต้องการนำเข้า');
      return;
    }

    setIsLoading(true);
    setError(null);
    setImportResult(null);

    try {
      // Split the input by line breaks and filter empty lines
      const codes = codesInput
        .split('\n')
        .map(code => code.trim())
        .filter(code => code !== '');

      if (codes.length === 0) {
        setError('กรุณากรอกโค้ดที่ถูกต้องอย่างน้อย 1 โค้ด');
        setIsLoading(false);
        return;
      }

      if (codes.length > 500) {
        setError('สามารถนำเข้าได้สูงสุด 500 โค้ดต่อครั้ง');
        setIsLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ');
      }

      // Call the edge function for bulk import
      const response = await fetch(
        'https://yvactofmmdiauewmkqnk.supabase.co/functions/v1/app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_bulk_import_codes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            codes,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        
        // Show success toast
        toast({
          title: 'นำเข้าโค้ดสำเร็จ',
          description: result.message,
        });
        
        if (result.results.successful > 0) {
          onSuccess();
        }
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการนำเข้าโค้ด');
      }
    } catch (err) {
      console.error('Error importing codes:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการนำเข้าโค้ด');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setCodesInput('');
      setError(null);
      setImportResult(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">นำเข้าโค้ดแลกรับแบบหลายรายการ</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">ปิด</span>
          </Button>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!importResult ? (
            <>
              <div className="space-y-2">
                <label htmlFor="codes" className="text-sm font-medium">
                  รายการโค้ด (แต่ละโค้ดแยกบรรทัด)
                </label>
                <Textarea
                  id="codes"
                  rows={10}
                  placeholder="กรอกโค้ดแต่ละรายการในแต่ละบรรทัด เช่น
ABCDEF-123456
XYZABC-789012
ROBUX-987654"
                  value={codesInput}
                  onChange={(e) => setCodesInput(e.target.value)}
                  disabled={isLoading}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  สามารถนำเข้าได้สูงสุด 500 โค้ดต่อครั้ง โค้ดที่ซ้ำกันในระบบจะไม่ถูกเพิ่มซ้ำ
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleImport} disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังนำเข้า...
                    </>
                  ) : (
                    'นำเข้าโค้ด'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-green-800">สรุปผลการนำเข้า</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <ul className="list-disc space-y-1 pl-5">
                        <li>นำเข้าสำเร็จ: {importResult.results.successful} โค้ด</li>
                        <li>มีอยู่ในระบบแล้ว: {importResult.results.duplicates} โค้ด</li>
                        <li>นำเข้าไม่สำเร็จ: {importResult.results.failed} โค้ด</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button onClick={handleClose} variant="outline">
                  ปิด
                </Button>
                <Button onClick={() => {
                  setCodesInput('');
                  setImportResult(null);
                }}>
                  นำเข้าเพิ่ม
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}