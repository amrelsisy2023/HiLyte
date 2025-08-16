import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import WaitlistPage from "@/pages/waitlist";

interface BetaAccessGateProps {
  children: React.ReactNode;
  userEmail?: string;
}

export default function BetaAccessGate({ children, userEmail }: BetaAccessGateProps) {
  const [location] = useLocation();
  
  // Check if user has beta access
  const { data: betaAccess, isLoading } = useQuery({
    queryKey: ["/api/beta/access", userEmail],
    enabled: !!userEmail,
  });

  // Skip beta check for invitation and waitlist pages
  if (location.startsWith('/beta-invite/') || location === '/waitlist') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  // If user doesn't have beta access, show waitlist
  if (!betaAccess?.hasAccess) {
    return <WaitlistPage />;
  }

  // User has beta access, show the app
  return <>{children}</>;
}