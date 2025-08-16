import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  User, 
  LogOut, 
  ChevronDown, 
  Bot, 
  CreditCard, 
  FileText, 
  Settings,
  DollarSign,
  Cog,
  MessageCircle,
  GitBranch
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import RevisionManagement from "@/components/RevisionManagement";
import { canAccessAIDashboard } from "@/utils/accessControl";
import { BetaFeedbackModal } from "@/components/BetaFeedbackModal";

export default function RevisionManagementPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showBetaFeedback, setShowBetaFeedback] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to be logged in to access revision management.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleLogout = () => {
    window.location.href = '/logout';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setLocation('/')}
              className="flex items-center space-x-2 text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <GitBranch className="h-6 w-6 text-blue-600" />
              <span>Koncurent Hi-LYTE</span>
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">Revision Management</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => setLocation('/')}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Drawings
            </button>
            <button
              onClick={() => setLocation('/revisions')}
              className="text-blue-600 dark:text-blue-400 font-medium"
            >
              Revisions
            </button>
            <button
              onClick={() => setLocation('/templates')}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Templates
            </button>
            <button
              onClick={() => setLocation('/ai-credits')}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Credits
            </button>
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="hidden sm:block text-sm text-gray-700 dark:text-gray-300">
                  {user?.firstName || user?.email || 'User'}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile & Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/subscription')}>
                <CreditCard className="mr-2 h-4 w-4" />
                Subscription
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/ai-credits')}>
                <DollarSign className="mr-2 h-4 w-4" />
                AI Credits
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/templates')}>
                <FileText className="mr-2 h-4 w-4" />
                Template Library
              </DropdownMenuItem>
              {canAccessAIDashboard(user?.email) && (
                <DropdownMenuItem onClick={() => setLocation('/admin')}>
                  <Bot className="mr-2 h-4 w-4" />
                  AI Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowBetaFeedback(true)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Beta Feedback
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="pt-16">
        <RevisionManagement />
      </main>

      <BetaFeedbackModal 
        isOpen={showBetaFeedback} 
        onClose={() => setShowBetaFeedback(false)} 
      />
    </div>
  );
}