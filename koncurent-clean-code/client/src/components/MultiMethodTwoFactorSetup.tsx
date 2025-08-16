import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Download, Smartphone, QrCode, AlertTriangle, Copy, Check, Mail, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TwoFactorMethodSelector from "./TwoFactorMethodSelector";
import { TwoFactorMethod } from "@shared/types";

interface MultiMethodTwoFactorSetupProps {
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

export default function MultiMethodTwoFactorSetup({ userId, twoFactorSetup, onComplete }: MultiMethodTwoFactorSetupProps) {
  const [currentStep, setCurrentStep] = useState(twoFactorSetup ? 2 : 1);
  const [setupData, setSetupData] = useState(twoFactorSetup);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [backupCodesDownloaded, setBackupCodesDownloaded] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const [copiedManualKey, setCopiedManualKey] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { toast } = useToast();

  // Handle method selection and setup
  const handleMethodSetup = async (method: TwoFactorMethod, phoneNumber?: string) => {
    setIsSettingUp(true);
    try {
      const response = await apiRequest("POST", "/api/auth/setup-2fa", {
        userId,
        method,
        phoneNumber
      });

      const data = await response.json();
      setSetupData(data.twoFactorSetup);
      setCurrentStep(2);
      
      toast({
        title: "Setup Complete",
        description: data.message,
      });
    } catch (error) {
      console.error("2FA setup error:", error);
      toast({
        title: "Setup Failed",
        description: "Failed to set up 2FA. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  // Send verification code for SMS/Email
  const sendVerificationCode = async () => {
    if (!setupData?.method || !['sms', 'email'].includes(setupData.method)) return;
    
    setIsSendingCode(true);
    try {
      const response = await apiRequest("POST", "/api/auth/send-verification-code", {
        userId,
        method: setupData.method
      });

      const data = await response.json();
      setCodeSent(true);
      
      toast({
        title: "Code Sent",
        description: data.message,
      });
    } catch (error) {
      console.error("Send code error:", error);
      toast({
        title: "Failed to Send Code",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await apiRequest("POST", "/api/auth/verify-2fa-setup", {
        userId,
        token: verificationCode,
        method: setupData?.method
      });

      const data = await response.json();
      
      toast({
        title: "Success! 🎉",
        description: "Two-factor authentication is now enabled for your account.",
      });
      
      onComplete();
    } catch (error) {
      console.error("2FA verification error:", error);
      toast({
        title: "Verification Failed",
        description: "Invalid code. Please try again.",
        variant: "destructive",
      });
      setVerificationCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;
    
    const content = `Hi-LYTE Two-Factor Authentication Backup Codes

These codes can be used if you lose access to your ${setupData.method} verification method.
Each code can only be used once.

${setupData.backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Keep these codes in a safe place!
Generated: ${new Date().toLocaleDateString()}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hilyte-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setBackupCodesDownloaded(true);
  };

  const copyToClipboard = async (text: string, type: 'backup' | 'manual') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'backup') {
        setCopiedBackupCodes(true);
        setTimeout(() => setCopiedBackupCodes(false), 2000);
      } else {
        setCopiedManualKey(true);
        setTimeout(() => setCopiedManualKey(false), 2000);
      }
      
      toast({
        title: "Copied!",
        description: `${type === 'backup' ? 'Backup codes' : 'Manual entry key'} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please manually select and copy the text.",
        variant: "destructive",
      });
    }
  };

  const progress = Math.round((currentStep / 3) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Secure Your Account</h2>
          <p className="text-muted-foreground">
            Add two-factor authentication for enhanced security
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Setup Progress</span>
            <span>{currentStep}/3 Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Step 1: Method Selection */}
      {currentStep === 1 && (
        <TwoFactorMethodSelector
          onMethodSelect={handleMethodSetup}
          isLoading={isSettingUp}
        />
      )}

      {/* Step 2: Configure Selected Method */}
      {currentStep === 2 && setupData && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">
              Configure {setupData.method?.toUpperCase() || 'Two-Factor'} Authentication
            </h3>
            <p className="text-muted-foreground">
              {setupData.method === 'totp' && "Scan the QR code with your authenticator app"}
              {setupData.method === 'sms' && `We'll send codes to ${setupData.phoneNumber}`}
              {setupData.method === 'email' && `We'll send codes to ${setupData.email}`}
            </p>
          </div>

          {/* TOTP Configuration */}
          {setupData.method === 'totp' && setupData.qrCode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode className="w-5 h-5" />
                  <span>Scan QR Code</span>
                </CardTitle>
                <CardDescription>
                  Use Google Authenticator, Authy, or any compatible app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <img 
                    src={setupData.qrCode} 
                    alt="2FA QR Code" 
                    className="border-2 border-gray-200 rounded-lg"
                  />
                </div>
                
                {setupData.manualEntryKey && (
                  <div className="space-y-2">
                    <Label>Manual Entry Key (if QR doesn't work)</Label>
                    <div className="flex items-center space-x-2">
                      <Input 
                        value={setupData.manualEntryKey} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(setupData.manualEntryKey!, 'manual')}
                      >
                        {copiedManualKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SMS/Email Configuration */}
          {(setupData.method === 'sms' || setupData.method === 'email') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {setupData.method === 'sms' ? <Smartphone className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                  <span>Verification Code</span>
                </CardTitle>
                <CardDescription>
                  We'll send a 6-digit code to {setupData.method === 'sms' ? 'your phone' : 'your email'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={sendVerificationCode}
                  disabled={isSendingCode}
                  className="w-full"
                >
                  {isSendingCode ? (
                    <>Sending Code...</>
                  ) : codeSent ? (
                    <>Code Sent - Check Your {setupData.method === 'sms' ? 'Phone' : 'Email'}</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Verification Code
                    </>
                  )}
                </Button>
                
                {codeSent && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      Code sent! It may take a few minutes to arrive. Check your spam folder if using email.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Backup Codes */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>Save Your Backup Codes</span>
              </CardTitle>
              <CardDescription>
                These codes will let you access your account if you lose your {setupData.method} method
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-white p-4 rounded border">
                {setupData.backupCodes?.map((code, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span>{index + 1}.</span>
                    <span className="font-bold">{code}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={downloadBackupCodes}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Codes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(setupData.backupCodes.join('\n'), 'backup')}
                  className="flex-1"
                >
                  {copiedBackupCodes ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  Copy Codes
                </Button>
              </div>
              
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Important:</strong> Save these codes in a secure location. Each code can only be used once.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button 
              onClick={() => setCurrentStep(3)}
              disabled={!backupCodesDownloaded && !copiedBackupCodes}
              size="lg"
              className="min-w-[200px]"
            >
              Continue to Verification
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Verification */}
      {currentStep === 3 && setupData && (
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Verify Your Setup</CardTitle>
            <CardDescription>
              Enter a verification code to complete setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">
                {setupData.method === 'totp' && "Code from your authenticator app"}
                {setupData.method === 'sms' && "Code from SMS"}
                {setupData.method === 'email' && "Code from email"}
              </Label>
              <Input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="text-center text-lg font-mono"
                maxLength={6}
              />
            </div>
            
            {setupData.method !== 'totp' && (
              <Button
                variant="outline"
                onClick={sendVerificationCode}
                disabled={isSendingCode}
                className="w-full"
                size="sm"
              >
                {isSendingCode ? 'Sending...' : 'Resend Code'}
              </Button>
            )}
            
            <Button
              onClick={verifyCode}
              disabled={isVerifying || verificationCode.length !== 6}
              className="w-full"
              size="lg"
            >
              {isVerifying ? 'Verifying...' : 'Complete Setup'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}