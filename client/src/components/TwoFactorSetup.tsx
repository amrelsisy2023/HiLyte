import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, QrCode, Shield, Download } from "lucide-react";

interface TwoFactorSetupProps {
  userId: number;
  twoFactorSetup?: {
    method: TwoFactorMethod;
    secret?: string;
    qrCode?: string;
    backupCodes: string[];
    manualEntryKey?: string;
    phoneNumber?: string;
    email?: string;
  };
  onComplete: () => void;
}

export function TwoFactorSetup({ userId, twoFactorSetup, onComplete }: TwoFactorSetupProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodesSaved, setBackupCodesSaved] = useState(false);
  const { toast } = useToast();

  const verifyMutation = useMutation({
    mutationFn: async (token: string) => {
      return await apiRequest("/api/auth/verify-2fa-setup", "POST", {
        userId,
        token
      });
    },
    onSuccess: () => {
      toast({
        title: "Success! Your Account is Now Secure",
        description: "Two-factor authentication is active. You're all set to use Hi-LYTE safely!",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Code Didn't Work",
        description: error.message || "The code might have expired. Try entering the current code from your authenticator app.",
        variant: "destructive",
      });
      setVerificationCode(""); // Clear the input for retry
    },
  });

  const handleVerify = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Code Incomplete",
        description: "Please enter all 6 digits from your authenticator app.",
        variant: "destructive",
      });
      return;
    }

    if (!backupCodesSaved) {
      toast({
        title: "Backup Codes Required",
        description: "Please download and save your backup codes first - they're your lifeline if you lose your phone!",
        variant: "destructive",
      });
      return;
    }

    verifyMutation.mutate(verificationCode);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "The text has been copied to your clipboard.",
    });
  };

  const downloadBackupCodes = () => {
    const content = `Hi-LYTE Two-Factor Authentication Backup Codes

IMPORTANT: Save these backup codes in a secure location. Each code can only be used once.

${twoFactorSetup.backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Generated on: ${new Date().toLocaleString()}
Account: Your Hi-LYTE Account

Keep these codes secure and accessible. You can use them to access your account if you lose your authenticator device.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hilyte-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setBackupCodesSaved(true);
    toast({
      title: "Backup Codes Downloaded",
      description: "Your backup codes have been saved securely.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Almost Done! Let's Secure Your Account</CardTitle>
          <CardDescription className="text-base">
            We'll help you set up two-factor authentication in just 3 easy steps to keep your Hi-LYTE account safe
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-600 font-medium">Step 1: Set up authenticator</span>
              <span className="text-gray-500">Step 2: Save backup codes</span>
              <span className="text-gray-500">Step 3: Test & complete</span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: backupCodesSaved ? (verificationCode.length === 6 ? '100%' : '66%') : '33%' }}
              ></div>
            </div>
          </div>

          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Scan QR Code
              </TabsTrigger>
              <TabsTrigger value="manual">Enter Manually</TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="space-y-6">
              <div className="text-center space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📱 Step 1: Get an Authenticator App</h4>
                  <p className="text-sm text-blue-700">
                    First, download an authenticator app on your phone:
                  </p>
                  <div className="mt-2 text-sm">
                    <span className="inline-block bg-white px-2 py-1 rounded mr-2 mb-1">Google Authenticator</span>
                    <span className="inline-block bg-white px-2 py-1 rounded mr-2 mb-1">Authy</span>
                    <span className="inline-block bg-white px-2 py-1 rounded mr-2 mb-1">Microsoft Authenticator</span>
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">📷 Step 2: Scan This QR Code</h4>
                  <p className="text-sm text-green-700 mb-4">
                    Open your authenticator app and scan this code:
                  </p>
                  <div className="flex justify-center">
                    <img 
                      src={twoFactorSetup.qrCode} 
                      alt="2FA QR Code" 
                      className="border-2 border-green-300 rounded-lg shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">⚙️ Manual Setup Instructions</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    If you can't scan the QR code, follow these steps:
                  </p>
                  <ol className="text-sm text-blue-700 space-y-2">
                    <li><strong>1.</strong> Open your authenticator app</li>
                    <li><strong>2.</strong> Choose "Add account manually" or "Enter setup key"</li>
                    <li><strong>3.</strong> Copy and paste the key below</li>
                    <li><strong>4.</strong> Enter the account details shown below</li>
                  </ol>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">Setup Key:</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input 
                        value={twoFactorSetup.manualEntryKey} 
                        readOnly 
                        className="font-mono text-sm bg-gray-50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(twoFactorSetup.manualEntryKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md text-sm space-y-1">
                    <p><strong>Account name:</strong> Hi-LYTE Account ({userId})</p>
                    <p><strong>Issuer:</strong> Koncurent Hi-LYTE</p>
                    <p><strong>Type:</strong> Time-based (TOTP)</p>
                  </div>
                </div>
              </div>
            </TabsContent>


          </Tabs>

          {/* Step 2: Backup Codes */}
          <div className="mt-8 space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                🔑 Step 2: Save Your Backup Codes
              </h4>
              <p className="text-sm text-orange-700 mb-4">
                These emergency codes let you access your account if you lose your phone. Each code works only once, so keep them safe!
              </p>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                {twoFactorSetup.backupCodes.map((code, index) => (
                  <div key={index} className="bg-white p-2 rounded font-mono text-sm text-center border">
                    {code}
                  </div>
                ))}
              </div>

              <Button
                onClick={downloadBackupCodes}
                className="w-full"
                variant={backupCodesSaved ? "outline" : "default"}
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                {backupCodesSaved ? "✓ Backup Codes Saved Safely" : "Download Backup Codes"}
              </Button>
            </div>
          </div>

          {/* Step 3: Verification */}
          <div className="mt-8 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                ✅ Step 3: Test Your Setup
              </h4>
              <p className="text-sm text-green-700 mb-4">
                Look at your authenticator app and enter the 6-digit code to complete setup:
              </p>
              
              <div className="space-y-3">
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl tracking-widest font-mono h-14"
                  maxLength={6}
                />
                
                {verificationCode.length > 0 && verificationCode.length < 6 && (
                  <p className="text-sm text-amber-600 text-center">
                    Enter all 6 digits ({verificationCode.length}/6)
                  </p>
                )}
              </div>
            </div>

            <Button 
              onClick={handleVerify}
              className="w-full h-12 text-lg"
              disabled={verifyMutation.isPending || !backupCodesSaved || verificationCode.length !== 6}
            >
              {verifyMutation.isPending 
                ? "Verifying..." 
                : backupCodesSaved && verificationCode.length === 6
                  ? "🎉 Complete Account Setup"
                  : !backupCodesSaved
                    ? "Save Backup Codes First"
                    : "Enter 6-Digit Code"
              }
            </Button>

            {!backupCodesSaved && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  💡 You need to save your backup codes before completing setup
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}