import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, XCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function BetaInvitePage() {
  const [, params] = useRoute("/beta-invite/:code");
  const [isAccepted, setIsAccepted] = useState(false);
  const { toast } = useToast();

  const invitationCode = params?.code;

  // Fetch invitation details
  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ["/api/beta/invitation", invitationCode],
    enabled: !!invitationCode,
  });

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/beta/accept/${invitationCode}`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setIsAccepted(true);
        toast({
          title: "Welcome to the beta!",
          description: "Your invitation has been accepted successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    },
  });

  const handleAcceptInvitation = () => {
    acceptInvitationMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Clock className="h-12 w-12 text-blue-500 mx-auto animate-spin" />
              <h2 className="text-xl font-semibold">Loading invitation...</h2>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold">Invalid Invitation</h2>
              <p className="text-gray-600">
                This invitation link is invalid or has expired.
              </p>
              <Button asChild>
                <Link href="/waitlist">Join Waitlist Instead</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if invitation is expired
  const isExpired = new Date(invitation.expiresAt) < new Date();
  const isAlreadyAccepted = invitation.status === 'accepted';

  if (isAccepted || isAlreadyAccepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">Welcome to the Beta!</h2>
              <p className="text-gray-600">
                Your beta invitation has been accepted. You now have full access to Koncurent Hi-LYTE.
              </p>
              <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800">
                <p><strong>What's included:</strong></p>
                <ul className="mt-2 space-y-1 text-left">
                  <li>• Full access to AI-powered extraction</li>
                  <li>• $10 in free AI credits</li>
                  <li>• Priority support channel</li>
                  <li>• Early access to new features</li>
                </ul>
              </div>
              <Button asChild className="w-full">
                <Link href="/register">
                  Get Started Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold">Invitation Expired</h2>
              <p className="text-gray-600">
                This invitation expired on {new Date(invitation.expiresAt).toLocaleDateString()}.
              </p>
              <p className="text-sm text-gray-500">
                Please contact {invitation.invitedBy} for a new invitation.
              </p>
              <Button asChild>
                <Link href="/waitlist">Join Waitlist Instead</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription>
            Welcome to the exclusive beta of Koncurent Hi-LYTE
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Invited by:</strong> {invitation.invitedBy}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Email:</strong> {invitation.email}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Expires:</strong> {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Your beta access includes:</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">AI-Powered Document Analysis</p>
                  <p className="text-sm text-gray-600">
                    Extract critical data from construction drawings automatically
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">$10 Free AI Credits</p>
                  <p className="text-sm text-gray-600">
                    Start analyzing your drawings immediately
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Priority Support</p>
                  <p className="text-sm text-gray-600">
                    Direct access to our development team
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Early Feature Access</p>
                  <p className="text-sm text-gray-600">
                    Be first to try new capabilities as we develop them
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleAcceptInvitation}
            className="w-full"
            disabled={acceptInvitationMutation.isPending}
          >
            {acceptInvitationMutation.isPending ? (
              "Accepting invitation..."
            ) : (
              <>
                Accept Beta Invitation
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            By accepting this invitation, you agree to provide feedback and help improve the platform.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}