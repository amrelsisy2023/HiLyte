import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Key, CheckCircle, XCircle, ExternalLink, Info, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

interface APIKey {
  name: string;
  description: string;
  required: boolean;
  hasKey: boolean;
  provider: string;
  setupUrl: string;
  estimatedCost: string;
}

interface APIKeyManagerProps {
  onApiKeyUpdate?: () => void;
}

export default function APIKeyManager({ onApiKeyUpdate }: APIKeyManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});

  // Check if user is admin (has @koncurent.com email)
  const isAdmin = user?.email?.endsWith('@koncurent.com') || false;

  // Show access denied message for non-admin users
  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold">API Key Management</h3>
        </div>

        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <div className="space-y-2">
              <div className="font-medium">Admin Access Required</div>
              <div className="text-sm">
                API key management is now restricted to administrators with @koncurent.com email addresses. 
              </div>
              <div className="text-sm mt-2">
                <strong>Good news:</strong> You can now use AI features without needing your own API keys! 
                The system uses a centralized AI credit system where you purchase credits as needed.
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-4">
            <div className="text-center space-y-2">
              <h4 className="font-medium text-blue-800 dark:text-blue-200">Centralized AI Credits</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Instead of managing API keys, you can now purchase AI credits that work automatically with all AI features.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get API key status
  const { data: apiKeys = [] } = useQuery<APIKey[]>({
    queryKey: ['/api/api-keys'],
    queryFn: async () => {
      const response = await fetch('/api/api-keys');
      if (!response.ok) throw new Error('Failed to fetch API keys');
      return response.json();
    },
  });

  // Update API key mutation
  const updateKeyMutation = useMutation({
    mutationFn: async ({ keyName, keyValue }: { keyName: string; keyValue: string }) => {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyName, keyValue }),
      });
      if (!response.ok) throw new Error('Failed to update API key');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-status'] });
      toast({ title: 'API key updated successfully' });
      onApiKeyUpdate?.();
    },
    onError: () => {
      toast({ title: 'Failed to update API key', variant: 'destructive' });
    },
  });

  const handleUpdateKey = (keyName: string) => {
    const keyValue = keyValues[keyName]?.trim();
    if (!keyValue) {
      toast({ title: 'Please enter a valid API key', variant: 'destructive' });
      return;
    }
    updateKeyMutation.mutate({ keyName, keyValue });
    setKeyValues(prev => ({ ...prev, [keyName]: '' }));
  };

  const toggleShowKey = (keyName: string) => {
    setShowKeys(prev => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Key className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">API Key Management</h3>
      </div>

      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <div className="space-y-1">
            <div className="font-medium">Secure API Key Storage</div>
            <div className="text-sm">
              API keys are stored securely in your Replit environment variables. 
              They are never logged or shared, and only used for the specific services you configure.
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {apiKeys.map((apiKey) => (
        <Card key={apiKey.name} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Key className="h-4 w-4 text-gray-600" />
                <div>
                  <CardTitle className="text-base">{apiKey.provider} API Key</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{apiKey.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {apiKey.hasKey ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Set
                  </Badge>
                )}
                {apiKey.required && (
                  <Badge variant="outline" className="text-xs">
                    Required
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Estimated cost: {apiKey.estimatedCost}</span>
              <span>•</span>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-blue-600 hover:text-blue-800"
                onClick={() => window.open(apiKey.setupUrl, '_blank')}
              >
                Get API Key
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>

            {!apiKey.hasKey && (
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Input
                      type={showKeys[apiKey.name] ? 'text' : 'password'}
                      placeholder={`Enter your ${apiKey.provider} API key`}
                      value={keyValues[apiKey.name] || ''}
                      onChange={(e) => setKeyValues(prev => ({ 
                        ...prev, 
                        [apiKey.name]: e.target.value 
                      }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => toggleShowKey(apiKey.name)}
                    >
                      {showKeys[apiKey.name] ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleUpdateKey(apiKey.name)}
                    disabled={updateKeyMutation.isPending || !keyValues[apiKey.name]?.trim()}
                    size="sm"
                  >
                    Save Key
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Your API key will be stored securely and only used for {apiKey.provider} API calls.
                </p>
              </div>
            )}

            {apiKey.hasKey && (
              <div className="space-y-2">
                <p className="text-sm text-green-600 font-medium">
                  ✓ API key configured and ready to use
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKeys(prev => ({ ...prev, [apiKey.name]: true }))}
                >
                  Update Key
                </Button>
                {showKeys[apiKey.name] && (
                  <div className="flex space-x-2 pt-2">
                    <Input
                      type="password"
                      placeholder="Enter new API key"
                      value={keyValues[apiKey.name] || ''}
                      onChange={(e) => setKeyValues(prev => ({ 
                        ...prev, 
                        [apiKey.name]: e.target.value 
                      }))}
                    />
                    <Button
                      onClick={() => handleUpdateKey(apiKey.name)}
                      disabled={updateKeyMutation.isPending || !keyValues[apiKey.name]?.trim()}
                      size="sm"
                    >
                      Update
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}