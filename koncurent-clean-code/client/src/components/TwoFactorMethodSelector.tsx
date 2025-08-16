import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Mail, Shield } from "lucide-react";
import { TwoFactorMethod } from "@shared/types";

interface TwoFactorMethodSelectorProps {
  onMethodSelect: (method: TwoFactorMethod, phoneNumber?: string) => void;
  isLoading?: boolean;
}

export default function TwoFactorMethodSelector({ onMethodSelect, isLoading }: TwoFactorMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod>('totp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const validatePhoneNumber = (phone: string): boolean => {
    // Basic phone number validation (can be enhanced)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s|-|\(|\)/g, ''));
  };

  const handleProceed = () => {
    setPhoneError('');

    if (selectedMethod === 'sms') {
      if (!phoneNumber.trim()) {
        setPhoneError('Phone number is required for SMS verification');
        return;
      }
      if (!validatePhoneNumber(phoneNumber)) {
        setPhoneError('Please enter a valid phone number');
        return;
      }
    }

    onMethodSelect(selectedMethod, selectedMethod === 'sms' ? phoneNumber : undefined);
  };

  const methods = [
    {
      id: 'totp' as const,
      name: 'Authenticator App',
      description: 'Use Google Authenticator, Authy, or similar apps',
      icon: Shield,
      badge: 'Most Secure',
      badgeColor: 'bg-green-100 text-green-800',
      pros: ['Works offline', 'Most secure', 'Industry standard'],
      cons: ['Requires smartphone app']
    },
    {
      id: 'sms' as const,
      name: 'SMS Text Message',
      description: 'Receive codes via text message',
      icon: Smartphone,
      badge: 'Convenient',
      badgeColor: 'bg-blue-100 text-blue-800',
      pros: ['No app required', 'Easy to use', 'Works on any phone'],
      cons: ['Requires cell service', 'Less secure than app']
    },
    {
      id: 'email' as const,
      name: 'Email',
      description: 'Receive codes in your email inbox',
      icon: Mail,
      badge: 'Simple',
      badgeColor: 'bg-purple-100 text-purple-800',
      pros: ['No phone required', 'Always accessible', 'Familiar process'],
      cons: ['Relies on email security', 'May be slower']
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Your Security Method</h2>
        <p className="text-muted-foreground">
          Select how you'd like to receive your verification codes for two-factor authentication
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {methods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          
          return (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected 
                  ? 'ring-2 ring-blue-500 border-blue-200 bg-blue-50' 
                  : 'hover:border-gray-300'
              }`}
              onClick={() => setSelectedMethod(method.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                    <CardTitle className="text-lg">{method.name}</CardTitle>
                  </div>
                  <Badge className={method.badgeColor}>
                    {method.badge}
                  </Badge>
                </div>
                <CardDescription>{method.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-1">✓ Benefits:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {method.pros.map((pro, index) => (
                      <li key={index}>• {pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-amber-600 mb-1">⚠ Consider:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {method.cons.map((con, index) => (
                      <li key={index}>• {con}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Phone number input for SMS */}
      {selectedMethod === 'sms' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Smartphone className="w-5 h-5" />
              <span>Phone Number Setup</span>
            </CardTitle>
            <CardDescription>
              Enter your phone number to receive SMS verification codes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneError('');
                }}
                placeholder="+1 (555) 123-4567"
                className={phoneError ? 'border-red-300' : ''}
              />
              {phoneError && (
                <p className="text-sm text-red-600 mt-1">{phoneError}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Include country code (e.g., +1 for US, +44 for UK)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center pt-4">
        <Button 
          onClick={handleProceed}
          disabled={isLoading}
          size="lg"
          className="w-full md:w-auto min-w-[200px]"
        >
          {isLoading ? 'Setting up...' : `Continue with ${methods.find(m => m.id === selectedMethod)?.name}`}
        </Button>
      </div>
    </div>
  );
}