import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Mail, Send, CheckCircle, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SimpleTwoFactorSetupProps {
  userId: number;
  preFilledEmail?: string;
  preFilledPhone?: string;
  onComplete: () => void;
}

export default function SimpleTwoFactorSetup({ userId, preFilledEmail, preFilledPhone, onComplete }: SimpleTwoFactorSetupProps) {
  const [step, setStep] = useState<'method' | 'verify'>('method');
  const [method, setMethod] = useState<'sms' | 'email'>('email');
  const [phoneNumber, setPhoneNumber] = useState(preFilledPhone || '');
  const [email, setEmail] = useState(preFilledEmail || '');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { toast } = useToast();

  const handleSendCode = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("/api/auth/setup-simple-2fa", "POST", {
        userId,
        method,
        phoneNumber: method === 'sms' ? phoneNumber : undefined,
        email: method === 'email' ? email : undefined
      });

      const data = await response.json();
      setCodeSent(true);
      setStep('verify');
      
      toast({
        title: "Code Sent",
        description: data.message,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Send Code",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) return;

    setIsLoading(true);
    try {
      const response = await apiRequest("/api/auth/verify-simple-2fa", "POST", {
        userId,
        code,
        method
      });

      toast({
        title: "Authentication Complete",
        description: "Your account is now secured with two-factor authentication.",
      });
      
      onComplete();
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
      // Clear the code inputs
      setVerificationCode(['', '', '', '', '', '']);
      const firstInput = document.getElementById('code-0');
      firstInput?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("/api/auth/resend-2fa-code", "POST", {
        userId,
        method
      });

      const data = await response.json();
      toast({
        title: "Code Resent",
        description: data.message,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Resend Code",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    setStep('method');
    setCodeSent(false);
    setVerificationCode(['', '', '', '', '', '']);
  };

  const isCodeComplete = verificationCode.every(digit => digit !== '');

  if (step === 'method') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Secure Your Account</CardTitle>
            <CardDescription>
              Choose how you'd like to receive verification codes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={method} onValueChange={(value) => setMethod(value as 'sms' | 'email')}>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="email" id="email" />
                <Mail className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <Label htmlFor="email" className="font-medium cursor-pointer">
                    Email Verification
                  </Label>
                  <p className="text-sm text-gray-600">Get codes via email</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="sms" id="sms" />
                <Smartphone className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <Label htmlFor="sms" className="font-medium cursor-pointer">
                    SMS Verification
                  </Label>
                  <p className="text-sm text-gray-600">Get codes via text message</p>
                </div>
              </div>
            </RadioGroup>

            {method === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="email-input">Email Address</Label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            {method === 'sms' && (
              <div className="space-y-2">
                <Label htmlFor="phone-input">Phone Number</Label>
                <Input
                  id="phone-input"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-xs text-gray-600">
                  Enter your full phone number with country code (e.g. +1 for US/Canada)
                </p>
              </div>
            )}

            <Button 
              onClick={handleSendCode}
              disabled={isLoading || (method === 'email' && !email) || (method === 'sms' && !phoneNumber)}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Send className="w-4 h-4 mr-2 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Verification Code
                </>
              )}
            </Button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => onComplete()}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Skip for testing
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
          <CardDescription>
            We sent a 6-digit code to your {method === 'email' ? 'email' : 'phone'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center space-x-2">
            {verificationCode.map((digit, index) => (
              <Input
                key={index}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-xl font-mono"
                autoFocus={index === 0}
              />
            ))}
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleVerifyCode}
              disabled={isLoading || !isCodeComplete}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Setup
                </>
              )}
            </Button>

            <div className="flex space-x-2">
              <Button 
                variant="outline"
                onClick={handleGoBack}
                disabled={isLoading}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleResendCode}
                disabled={isLoading}
                className="flex-1"
              >
                Resend Code
              </Button>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Didn't receive the code? Check your spam folder or try resending.
            </AlertDescription>
          </Alert>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => onComplete()}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip for testing
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}