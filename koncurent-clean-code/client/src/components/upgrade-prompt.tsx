import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

interface UpgradePromptProps {
  trigger?: 'time' | 'feature' | 'usage';
  onClose?: () => void;
}

export function UpgradePrompt({ trigger = 'time', onClose }: UpgradePromptProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Disable automatic popup - users can upgrade from pricing page instead
    // This prevents interference with the pricing page checkout flow
    return;
  }, [trigger, hasShown]);

  const handleClose = () => {
    setIsOpen(false);
    setHasShown(true);
    localStorage.setItem('koncurent-upgrade-shown', Date.now().toString());
    onClose?.();
  };

  const handleUpgrade = () => {
    // Track upgrade click
    console.log('Upgrade clicked from popup');
    // Navigate to pricing page
    setLocation('/pricing');
    handleClose();
  };

  const proFeatures = [
    'Unlimited PDF extractions',
    'Advanced table recognition',
    'Bulk processing capabilities',
    'Export to Excel & CAD formats',
    'Priority OCR processing',
    'Team collaboration tools',
    'API access for integrations',
    'Premium support'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute -top-2 -right-2 h-8 w-8 p-0"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-6 w-6 text-blue-600" />
            <DialogTitle className="text-xl font-bold">
              Upgrade to Koncurent Pro
            </DialogTitle>
          </div>
          <Badge variant="secondary" className="w-fit">
            Limited Time Offer
          </Badge>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Unlock the full power of intelligent document extraction for construction professionals.
          </p>
          
          <div className="grid gap-2">
            {proFeatures.slice(0, 4).map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
            <div className="text-xs text-gray-500 pl-6">
              + {proFeatures.length - 4} more features
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  Pro Plan
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  $49<span className="text-sm font-normal">/month</span>
                </div>
              </div>
              <Badge className="bg-blue-600 text-white">
                Save 20%
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleUpgrade}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Upgrade Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="px-4"
            >
              Later
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            30-day money-back guarantee • Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Trigger-specific components
export function FeatureUpgradePrompt({ featureName }: { featureName: string }) {
  const [, setLocation] = useLocation();
  
  const handleUpgrade = () => {
    setLocation('/pricing');
  };

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
      <div className="flex items-start gap-3">
        <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100">
            {featureName} - Pro Feature
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Upgrade to Pro to unlock advanced {featureName.toLowerCase()} capabilities.
          </p>
          <Button 
            size="sm" 
            className="mt-2 bg-blue-600 hover:bg-blue-700"
            onClick={handleUpgrade}
          >
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
}