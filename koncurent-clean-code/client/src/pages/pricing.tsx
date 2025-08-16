import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Users, Building, Sparkles, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import PricingWizard from '@/components/PricingWizard';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import ContactSalesModal from '@/components/contact-sales-modal';

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

export default function PricingPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [showContactSales, setShowContactSales] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription/plans'],
  });

  const { data: status } = useQuery<SubscriptionStatus>({
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
        description: "Your Hi-LYTE Pro subscription is now active. Welcome to unlimited document processing!",
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

  const handleGetStarted = async (planId: string) => {
    console.log('handleGetStarted called with planId:', planId);
    
    if (planId === 'free') {
      // For free plan, just show a message
      toast({
        title: "Free Trial",
        description: "You're already on the free trial! Upload a drawing to get started.",
      });
      return;
    }

    if (planId === 'enterprise') {
      // For enterprise, show contact sales modal
      setShowContactSales(true);
      return;
    }

    // For pro plan, handle Stripe checkout
    console.log('Starting Pro checkout process...');
    setIsCheckingOut(true);
    
    try {
      console.log('Making API request to create checkout...');
      const response = await apiRequest('/api/subscription/create-checkout', 'POST', { planId });
      console.log('API response received:', response.status);
      
      const data = await response.json();
      console.log('Checkout data:', data);
      
      if (data.checkoutUrl) {
        console.log('Redirecting to checkout page:', data.checkoutUrl);
        
        // Use window.location.replace for a cleaner redirect without browser back issues
        window.location.replace(data.checkoutUrl);
      } else {
        console.error('No checkout URL in response:', data);
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Checkout Error",
        description: `Failed to create checkout session: ${error?.message || 'Unknown error'}. Please try again or contact support.`,
        variant: "destructive",
      });
      
      // Show specific error information
      if (error?.message?.includes('popup') || error?.message?.includes('blocked')) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site and try again, or contact support for assistance.",
          variant: "destructive",
        });
      }
    } finally {
      setIsCheckingOut(false);
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

  const isCurrentPlan = (planId: string) => {
    return getCurrentPlanId() === planId;
  };

  const hiLyteFeatures = [
    'Unlimited PDF extractions per month',
    'Basic table recognition',
    'Standard OCR processing',
    'CSV export functionality',
    'Email support',
    'Mobile-friendly interface'
  ];

  const proFeatures = [
    'Unlimited PDF extractions',
    'Advanced table recognition',
    'Bulk processing capabilities',
    'Export to Excel & CAD formats',
    'Priority OCR processing',
    'Team collaboration tools',
    'API access for integrations',
    'Premium support',
    'Custom integrations',
    'Advanced analytics',
    'White-label options',
    'Dedicated account manager'
  ];

  const proTiers = [
    {
      name: 'Pro Starter',
      price: '$200',
      period: 'per month per project',
      billing: 'billed annually',
      description: 'Perfect for small teams and single projects',
      maxProjects: '1 project',
      maxUsers: 'Up to 5 users',
      storage: '50GB storage',
      popular: false
    },
    {
      name: 'Pro Growth',
      price: '$400',
      period: 'per month per project',
      billing: 'billed annually',
      description: 'Ideal for growing teams with multiple projects',
      maxProjects: 'Up to 3 projects',
      maxUsers: 'Up to 15 users',
      storage: '200GB storage',
      popular: true
    },
    {
      name: 'Pro Scale',
      price: '$600',
      period: 'per month per project',
      billing: 'billed annually',
      description: 'For large teams managing multiple projects',
      maxProjects: 'Up to 10 projects',
      maxUsers: 'Up to 50 users',
      storage: '500GB storage',
      popular: false
    }
  ];

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
          <h1 className="text-3xl font-bold">Pricing</h1>
          <p className="text-muted-foreground mt-2">
            Choose the perfect plan for your construction document extraction needs
          </p>
        </div>
        
        <div className="text-center mb-12">
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
            Unlock the full power of intelligent document extraction for construction professionals
          </p>
          <Button 
            onClick={() => setShowWizard(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Find My Perfect Plan
          </Button>
        </div>

        {/* Three Plan Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          
          {/* Free Trial */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-6 w-6 text-gray-600" />
                <CardTitle className="text-xl">Free Trial</CardTitle>
              </div>
              <CardDescription>Perfect for testing our Hi-LYTE tool</CardDescription>
              <div className="mt-4">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">Free</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">1 free drawing upload</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">100 free AI extractions</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Basic OCR processing</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">PDF viewing</span>
                </div>
              </div>
              <Button 
                className={`w-full ${
                  isCurrentPlan('free')
                    ? 'bg-green-100 text-green-700 border-green-200 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}
                disabled={isCurrentPlan('free')}
                onClick={() => handleGetStarted('free')}
              >
                {isCurrentPlan('free') ? (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Current Plan
                  </div>
                ) : (
                  'Get Started Free'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Hi-LYTE Pro */}
          <Card className="relative border-2 border-purple-500 shadow-lg">
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white">
              Most Popular
            </Badge>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="h-6 w-6 text-purple-600" />
                <CardTitle className="text-xl">Hi-LYTE Pro</CardTitle>
              </div>
              <CardDescription>For professional grade drawing extraction</CardDescription>
              <div className="mt-4">
                <div className="text-3xl font-bold text-purple-600">$49.99</div>
                <div className="text-sm text-gray-500">/month</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Unlimited drawing uploads</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Unlimited AI extractions</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Advanced OCR processing</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Real-time collaboration</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Export to CSV/Excel</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Priority support</span>
                </div>
              </div>
              <Button 
                className={`w-full ${
                  isCurrentPlan('pro')
                    ? 'bg-green-100 text-green-700 border-green-200 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
                disabled={isCurrentPlan('pro') || isCheckingOut}
                onClick={() => handleGetStarted('pro')}
              >
                {isCurrentPlan('pro') ? (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Current Plan
                  </div>
                ) : isCheckingOut ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Redirecting to Checkout...
                  </div>
                ) : (
                  'Upgrade to Pro'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Koncurent Pro */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building className="h-6 w-6 text-gray-600" />
                <CardTitle className="text-xl">Koncurent Pro</CardTitle>
              </div>
              <CardDescription>Procurement Management & Tracking Platform</CardDescription>
              <div className="mt-4">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">Contact Us</div>
                <div className="text-sm text-gray-500">/project /year</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Everything in Hi-LYTE Pro</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Procurement management</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Project tracking platform</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Team collaboration (up to 50 users)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Dedicated support</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Custom branding</span>
                </div>
              </div>
              <Button 
                className={`w-full ${
                  isCurrentPlan('enterprise')
                    ? 'bg-green-100 text-green-700 border-green-200 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={isCurrentPlan('enterprise')}
                onClick={() => handleGetStarted('enterprise')}
              >
                {isCurrentPlan('enterprise') ? (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Current Plan
                  </div>
                ) : (
                  'Contact Sales'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-gray-50 dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl">Need Help Choosing?</CardTitle>
              <CardDescription>
                Contact our team for personalized recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Our Hi-LYTE tool transforms construction document management with AI-powered extraction and analysis.
                Start with our free trial and upgrade when you're ready for unlimited extractions.
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => setShowContactSales(true)}>
                  Schedule Demo
                </Button>
                <Button onClick={() => setShowContactSales(true)}>
                  Contact Sales
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {showWizard && (
          <PricingWizard
            onClose={() => setShowWizard(false)}
            onRecommendation={handleWizardRecommendation}
          />
        )}

        <ContactSalesModal
          isOpen={showContactSales}
          onClose={() => setShowContactSales(false)}
        />
      </div>
    </div>
  );
}