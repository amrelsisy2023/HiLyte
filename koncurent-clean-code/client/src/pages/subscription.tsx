import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Crown, Zap, Users, CheckCircle, AlertTriangle, Building, Sparkles, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import PricingWizard from '@/components/PricingWizard';

interface SubscriptionPlan {
  id: number;
  name: string;
  planId: string;
  monthlyPrice: number;
  features: string[];
  maxDrawings: number | null;
  maxExtractions: number | null;
  stripePriceId: string | null;
}

interface SubscriptionStatus {
  subscriptionStatus: string;
  subscriptionPlan: string;
  trialExtractionsUsed: number;
  limits: {
    canUpload: boolean;
    canExtract: boolean;
    drawingCount: number;
    extractionCount: number;
    maxDrawings: number | null;
    maxExtractions: number | null;
    subscriptionStatus: string;
    plan: string;
  };
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showWizard, setShowWizard] = useState(false);
  
  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription/plans'],
  });

  const { data: status, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
  });

  // Handle success/cancel callbacks from Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    
    if (success === 'true') {
      toast({
        title: "Subscription Successful!",
        description: "Your Koncurent Pro subscription is now active. Welcome to unlimited document processing!",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/pricing');
    } else if (canceled === 'true') {
      toast({
        title: "Payment Canceled",
        description: "Your subscription upgrade was canceled. You can try again anytime.",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/pricing');
    }
  }, [toast]);

  const handleUpgrade = async (planId: string) => {
    try {
      const response = await apiRequest('/api/subscription/create-checkout', 'POST', { planId });
      const data = await response.json();
      
      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Checkout Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Zap className="h-6 w-6" />;
      case 'pro':
        return <Crown className="h-6 w-6" />;
      case 'enterprise':
        return <Building className="h-6 w-6" />;
      default:
        return <Zap className="h-6 w-6" />;
    }
  };

  const handleWizardRecommendation = (recommendation: any) => {
    console.log('Wizard recommendation:', recommendation);
    setShowWizard(false);
    toast({
      title: "Perfect Match Found!",
      description: `We recommend ${recommendation.planName} for your needs.`,
    });
  };

  const getCurrentPlanId = () => {
    return status?.subscriptionPlan || 'free';
  };

  if (plansLoading || statusLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and billing preferences
          </p>
        </div>
        
        <div className="text-center mb-12">
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
            Start with our free trial, then upgrade to unlock unlimited AI-powered document analysis
          </p>
          <Button 
            onClick={() => setShowWizard(true)}
            variant="outline"
            className="border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/20"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Not sure which plan? Get personalized recommendation
          </Button>
        </div>

        {status && (
          <div className="mb-12">
            <Card className="max-w-md mx-auto bg-white/80 dark:bg-gray-800/80 border-2 border-blue-200 dark:border-blue-700">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg">Current Plan</CardTitle>
                </div>
                <Badge 
                  variant={status.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                  className="mx-auto"
                >
                  {status.subscriptionStatus === 'active' ? 'Active Subscription' : 'Free Trial'}
                </Badge>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {status.subscriptionPlan === 'free' ? 'Free Trial' : 'Koncurent Pro'}
                </div>
                {status.subscriptionStatus === 'free_trial' && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {status.trialExtractionsUsed}/100 free extractions used
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
        {plans?.map((plan) => {
          const isCurrentPlan = getCurrentPlanId() === plan.planId;
          const isFree = plan.planId === 'free';
          const isPro = plan.planId === 'pro';
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${isPro ? 'border-2 border-purple-500 shadow-lg bg-white/90 dark:bg-gray-800/90' : 'border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80'}`}
            >
              {isPro && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {getPlanIcon(plan.planId)}
                  <CardTitle className="text-xl text-gray-900 dark:text-white">{plan.name}</CardTitle>
                </div>
                <CardDescription className="text-gray-600 dark:text-gray-300 mb-4">
                  {plan.planId === 'free' ? 'Perfect for testing our Hi-LYTE tool' : 
                   plan.planId === 'pro' ? 'For professional grade drawing extraction' : 
                   'Procurement Management & Tracking Platform'}
                </CardDescription>
                <div className="mt-4">
                  <div className={`text-3xl font-bold ${isPro ? 'text-purple-600' : 'text-gray-900 dark:text-white'}`}>
                    {plan.planId === 'free' ? 'Free' : 
                     plan.planId === 'enterprise' ? 'Contact Us' : 
                     `$${plan.monthlyPrice}`}
                  </div>
                  {plan.monthlyPrice > 0 && plan.planId !== 'enterprise' && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">/month</div>
                  )}
                  {plan.planId === 'enterprise' && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">/project /year</div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-200">{feature}</span>
                    </div>
                  ))}
                </div>

                {plan.planId === 'pro' && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> AI features require your own Anthropic API key. 
                      We handle the platform, you control the AI costs.
                    </p>
                  </div>
                )}

                <Button
                  className={`w-full h-12 px-10 py-3 font-semibold text-xs transition-all duration-200 ${
                    isCurrentPlan
                      ? 'bg-green-100 text-green-700 border-green-200 cursor-not-allowed'
                      : isFree
                      ? 'bg-gray-100 text-gray-600 border-gray-200 cursor-default'
                      : isPro
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border-0'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border-0'
                  }`}
                  variant="default"
                  disabled={isCurrentPlan || isFree}
                  onClick={() => !isCurrentPlan && !isFree && handleUpgrade(plan.planId)}
                >
                  {isCurrentPlan ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Current Plan
                    </div>
                  ) : isFree ? (
                    'Free Forever'
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        </div>

        {/* Pricing Philosophy Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Our Pricing Philosophy</h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <Card className="bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg text-gray-900 dark:text-white">Platform Subscription</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-left">
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    Hi-LYTE Pro: $49.99/month for unlimited platform access including:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Unlimited PDF uploads</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Advanced OCR processing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Data export & collaboration</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-lg text-gray-900 dark:text-white">AI Processing</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-left">
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    Bring your own Anthropic API key for AI features:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>You control AI costs directly</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>No markup on AI usage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Latest Claude models</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                <strong>Free Trial:</strong> Test with 1 free upload and extraction<br/>
                <strong>Hi-LYTE Pro:</strong> $49.99/month + your Anthropic API key<br/>
                <strong>Koncurent Pro:</strong> Enterprise features, contact us for pricing
              </p>
              <Button 
                variant="outline" 
                className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
                onClick={() => window.open('mailto:support@koncurent.com', '_blank')}
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>

        {showWizard && (
          <PricingWizard
            onClose={() => setShowWizard(false)}
            onRecommendation={handleWizardRecommendation}
          />
        )}
      </div>
    </div>
  );
}