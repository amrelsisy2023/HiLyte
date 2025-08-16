import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import DataExtractionHome from "@/pages/data-extraction-home";
import PricingPage from "@/pages/pricing";
import Profile from "@/pages/profile";
import AITrainingPage from "@/pages/ai-training";
import SubscriptionPage from "@/pages/subscription";
import AiCreditsPage from "@/pages/ai-credits";
import TemplateLibrary from "@/pages/template-library";
import AdminDashboard from "@/pages/admin-dashboard";


import Landing from "@/pages/landing";
import Register from "@/pages/register";
import Login from "@/pages/login";
import InvitationPage from "@/pages/InvitationPage";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Debug: Log authentication state
  console.log('Auth state:', { isAuthenticated, user: user ? 'present' : 'null' });

  return (
    <Switch>
      {isAuthenticated ? (
        <>
          <Route path="/" component={DataExtractionHome} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/profile" component={Profile} />
          <Route path="/ai-training" component={AITrainingPage} />
          <Route path="/subscription" component={SubscriptionPage} />
          <Route path="/ai-credits" component={AiCreditsPage} />
          <Route path="/templates" component={TemplateLibrary} />
          <Route path="/template-library" component={TemplateLibrary} />


          <Route path="/admin" component={AdminDashboard} />
        </>
      ) : (
        <>
          <Route path="/" component={Landing} />
          <Route path="/register" component={Register} />
          <Route path="/login" component={Login} />
        </>
      )}
      <Route path="/invitation/:token" component={InvitationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
