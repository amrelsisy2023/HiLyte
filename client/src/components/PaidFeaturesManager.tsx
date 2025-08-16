import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Zap, Bot, Eye, Settings, Info, X, Key, Database, HardDrive, FileText, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import APIKeyManager from './APIKeyManager';

interface PaidFeature {
  id: string;
  name: string;
  description: string;
  costType: 'external_api' | 'free' | 'replit_included';
  costPerUnit: number;
  unit: string;
  icon: React.ReactNode;
  enabled: boolean;
  category: 'paid_apis' | 'free_features' | 'replit_included';
  estimatedUsage?: string;
  apiKeyRequired?: string;
  hasApiKey?: boolean;
  provider?: string;
}

interface PaidFeaturesManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaidFeaturesManager({ isOpen, onClose }: PaidFeaturesManagerProps) {
  const { toast } = useToast();

  // Fetch paid features configuration
  const { data: features = [], isLoading } = useQuery<PaidFeature[]>({
    queryKey: ['/api/paid-features'],
    enabled: isOpen,
  });

  // Fetch subscription status
  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/subscription/status'],
    enabled: isOpen,
  });

  // Toggle feature mutation
  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ featureId, enabled }: { featureId: string; enabled: boolean }) => {
      const response = await fetch(`/api/paid-features/${featureId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error('Failed to toggle feature');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/paid-features'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-status'] });
      toast({ title: 'Feature setting updated successfully' });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Failed to update feature setting';
      toast({ 
        title: 'Feature Update Failed', 
        description: errorMessage.includes('Only paid features') ? 'Only paid features can be toggled. Free features are always enabled.' : errorMessage,
        variant: 'destructive' 
      });
    },
  });

  const handleToggleFeature = (featureId: string, enabled: boolean) => {
    toggleFeatureMutation.mutate({ featureId, enabled });
  };

  const getFeatureIcon = (feature: PaidFeature) => {
    if (feature.icon === 'Bot') return <Bot className="h-5 w-5 text-blue-500" />;
    if (feature.icon === 'Zap') return <Zap className="h-5 w-5 text-yellow-500" />;
    if (feature.icon === 'FileText') return <FileText className="h-5 w-5 text-purple-500" />;
    if (feature.icon === 'Database') return <Database className="h-5 w-5 text-green-500" />;
    if (feature.icon === 'HardDrive') return <HardDrive className="h-5 w-5 text-gray-500" />;
    return <Settings className="h-5 w-5 text-gray-500" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'paid_apis': return 'bg-red-100 text-red-800';
      case 'free_features': return 'bg-green-100 text-green-800';
      case 'replit_included': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'paid_apis': return 'External APIs (Your Cost)';
      case 'free_features': return 'Free Open Source';
      case 'replit_included': return 'Included with Replit';
      default: return category;
    }
  };

  const getCostDisplay = (feature: PaidFeature) => {
    if (feature.costType === 'free') return 'Free';
    if (feature.costType === 'replit_included') return 'Included';
    if (feature.costType === 'external_api') return `~$${feature.costPerUnit.toFixed(3)} per ${feature.unit}`;
    return `$${feature.costPerUnit.toFixed(3)} per ${feature.unit}`;
  };

  const totalMonthlyCost = features
    .filter(f => f.enabled)
    .reduce((sum, f) => {
      const usage = parseFloat(f.estimatedUsage || '0');
      return sum + (f.costPerUnit * usage);
    }, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Features & API Management
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            Configure features and manage API keys with transparent cost information
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <Tabs defaultValue="subscription" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="features">Features & Costs</TabsTrigger>
              <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            </TabsList>
            
            <TabsContent value="subscription" className="space-y-6">
              {statusLoading ? (
                <div className="text-center py-8 text-gray-500">Loading subscription status...</div>
              ) : subscriptionStatus ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Current Subscription
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Plan:</span>
                          <Badge variant={subscriptionStatus.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                            {subscriptionStatus.subscriptionPlan === 'free' ? 'Free Trial' : subscriptionStatus.subscriptionPlan}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Status:</span>
                          <Badge variant={subscriptionStatus.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                            {subscriptionStatus.subscriptionStatus === 'active' ? 'Active' : 'Trial'}
                          </Badge>
                        </div>
                        
                        {subscriptionStatus.subscriptionStatus === 'free_trial' && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Free Extractions Used:</span>
                              <span className="text-sm">{subscriptionStatus.trialExtractionsUsed}/100</span>
                            </div>
                            {subscriptionStatus.trialExtractionsUsed >= 100 && (
                              <Alert className="border-orange-200 bg-orange-50">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <AlertDescription className="text-orange-800">
                                  You've used all 100 free extractions. Upgrade to continue using AI features.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}
                        
                        <div className="pt-3 border-t">
                          <h4 className="font-medium mb-2">Usage Limits</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Drawings:</span>
                              <div className="font-medium">
                                {subscriptionStatus.limits.drawingCount} / {subscriptionStatus.limits.maxDrawings || '∞'}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Extractions:</span>
                              <div className="font-medium">
                                {subscriptionStatus.limits.extractionCount} / {subscriptionStatus.limits.maxExtractions || '∞'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {subscriptionStatus.subscriptionStatus !== 'active' && (
                          <div className="pt-3">
                            <Button 
                              className="w-full" 
                              onClick={() => window.location.href = '/pricing'}
                            >
                              Upgrade to Koncurent Pro
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <div className="space-y-2">
                        <div className="font-semibold">Koncurent Hi-LYTE Pricing Model</div>
                        <div className="text-sm">
                          • <strong>Platform Subscription:</strong> $29.99/month for unlimited uploads and features<br/>
                          • <strong>AI Processing:</strong> Requires your own Anthropic API key (pay-as-you-use)<br/>
                          • <strong>Free Trial:</strong> 1 free drawing upload and extraction to test the system
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">Unable to load subscription status</div>
              )}
            </TabsContent>
            
            <TabsContent value="features" className="space-y-6">
              {/* Real Cost Explanation */}
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <div className="space-y-2">
                    <div className="font-semibold">✓ Accurate Cost Information</div>
                    <div className="text-sm">
                      This shows the real costs for each feature. Only external APIs require your payment - 
                      everything else is free or included with your Replit plan.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading features...</div>
              ) : features.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No features configured</div>
              ) : (
                <div className="space-y-4">
                  {['paid_apis', 'free_features', 'replit_included'].map(category => {
                    const categoryFeatures = features.filter(f => f.category === category);
                    if (categoryFeatures.length === 0) return null;

                    return (
                      <Card key={category} className={`border-l-4 ${
                        category === 'paid_apis' ? 'border-l-red-500' : 
                        category === 'free_features' ? 'border-l-green-500' : 
                        'border-l-blue-500'
                      }`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {category === 'paid_apis' && <DollarSign className="h-5 w-5 text-red-500" />}
                              {category === 'free_features' && <Zap className="h-5 w-5 text-green-500" />}
                              {category === 'replit_included' && <Settings className="h-5 w-5 text-blue-500" />}
                              <CardTitle className="text-lg">
                                {getCategoryName(category)}
                              </CardTitle>
                            </div>
                            <Badge className={getCategoryColor(category)}>
                              {categoryFeatures.filter(f => f.enabled).length} active
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {categoryFeatures.map((feature) => (
                              <div
                                key={feature.id}
                                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    {getFeatureIcon(feature)}
                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                      {feature.name}
                                    </h3>
                                    <Badge 
                                      variant={feature.enabled ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {feature.enabled ? 'Active' : 'Disabled'}
                                    </Badge>
                                    {feature.apiKeyRequired && !feature.hasApiKey && (
                                      <Badge variant="destructive" className="text-xs">
                                        API Key Required
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                    {feature.description}
                                  </p>
                                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                                    <span className="flex items-center space-x-1">
                                      <DollarSign className="h-3 w-3" />
                                      <span className="font-medium">{getCostDisplay(feature)}</span>
                                    </span>
                                    {feature.estimatedUsage && feature.estimatedUsage !== 'unlimited' && feature.estimatedUsage !== 'included' && (
                                      <span className="flex items-center space-x-1">
                                        <Info className="h-3 w-3" />
                                        <span>~{feature.estimatedUsage} {feature.unit}/month</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  {feature.costType === 'external_api' ? (
                                    <Switch
                                      checked={feature.enabled}
                                      onCheckedChange={(checked) => handleToggleFeature(feature.id, checked)}
                                      disabled={toggleFeatureMutation.isPending || (feature.apiKeyRequired && !feature.hasApiKey)}
                                    />
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-green-600 bg-green-50 border-green-200">
                                      Always On
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="api-keys" className="space-y-6">
              <APIKeyManager onApiKeyUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/paid-features'] });
                queryClient.invalidateQueries({ queryKey: ['/api/ai-status'] });
              }} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}