import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Crown, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

interface UpgradeButtonProps {
  variant?: 'default' | 'floating' | 'subtle' | 'prominent';
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  className?: string;
}

export function UpgradeButton({ 
  variant = 'default', 
  size = 'md',
  showBadge = true,
  className = ''
}: UpgradeButtonProps) {
  
  const [, setLocation] = useLocation();
  
  const handleUpgrade = () => {
    console.log('Upgrade button clicked');
    // Navigate to pricing page
    setLocation('/pricing');
  };

  const baseClasses = "relative transition-all duration-200";
  
  const variants = {
    default: "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg",
    floating: "fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl rounded-full hover:scale-110 transition-all duration-300",
    subtle: "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600",
    prominent: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  const buttonClass = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <div className="relative">
      <Button 
        onClick={handleUpgrade}
        className={buttonClass}
      >
        {variant === 'floating' ? (
          <Crown className="h-5 w-5" />
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Upgrade to Pro
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      
      {showBadge && variant !== 'floating' && (
        <Badge 
          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 animate-pulse"
        >
          Save 20%
        </Badge>
      )}
    </div>
  );
}

// Navigation bar upgrade button
export function NavUpgradeButton() {
  return (
    <UpgradeButton 
      variant="prominent" 
      size="sm"
      className="hidden md:flex"
    />
  );
}

// Floating action button
export function FloatingUpgradeButton() {
  return (
    <UpgradeButton 
      variant="floating"
      showBadge={false}
      className=""
    />
  );
}

// Inline upgrade prompt
export function InlineUpgradePrompt({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Crown className="h-4 w-4 text-blue-600" />
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {description}
          </p>
        </div>
        <UpgradeButton variant="default" size="sm" />
      </div>
    </div>
  );
}