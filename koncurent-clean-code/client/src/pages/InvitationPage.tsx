import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { FormHeader } from '@/components/koncurent-logo';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface InvitationData {
  id: number;
  projectId: number;
  inviterUserId: number;
  inviteeEmail: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function InvitationPage() {
  const [, params] = useRoute('/invitation/:token');
  const { toast } = useToast();
  const { login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Registration form state
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const token = params?.token;

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/${token}`);
      if (!response.ok) {
        throw new Error('Invalid or expired invitation');
      }
      const data = await response.json();
      setInvitation(data);
      setEmail(data.inviteeEmail);
      // Generate default username from email
      setUsername(data.inviteeEmail.split('@')[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    setAccepting(true);
    try {
      // First, check if user needs to register
      const userResponse = await fetch(`/api/users/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invitation.inviteeEmail })
      });

      const userExists = await userResponse.json();

      if (!userExists.exists) {
        // User needs to register first
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: invitation.inviteeEmail,
            password,
            confirmPassword: password, // Same as password for invitation flow
            firstName,
            lastName
          })
        });

        if (!registerResponse.ok) {
          const errorText = await registerResponse.text();
          throw new Error(`Failed to create account: ${errorText}`);
        }

        // Auto-login after registration
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usernameOrEmail: invitation.inviteeEmail,
            password
          })
        });

        if (!loginResponse.ok) {
          throw new Error('Registration successful but login failed');
        }

        // Update auth context with new user data
        const loginData = await loginResponse.json();
        login(loginData.user);
      } else {
        // User exists, they need to log in first
        toast({
          title: "Account exists",
          description: "This email already has an account. Please log in first, then accept the invitation.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = `/login?redirect=/invitation/${token}`;
        }, 2000);
        return;
      }

      // Accept the invitation
      const acceptResponse = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!acceptResponse.ok) {
        throw new Error('Failed to accept invitation');
      }

      setAccepted(true);
      toast({
        title: "Invitation accepted!",
        description: "Redirecting to your collaborative drawing...",
      });

      // Redirect to the main application where they can access the drawing
      setTimeout(() => {
        window.location.href = '/?invited=true';
      }, 2000);

    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to accept invitation',
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Invitation Accepted!</CardTitle>
            <CardDescription>
              You're now a collaborator on this project. Redirecting...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <FormHeader 
            title="Collaboration Invitation"
            subtitle="Hi-LYTE Invitation"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p><strong>Email:</strong> {invitation?.inviteeEmail}</p>
            <p><strong>Role:</strong> {invitation?.role}</p>
            <p><strong>Expires:</strong> {invitation?.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString() : 'N/A'}</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                required
              />
            </div>

            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-gray-100"
              />
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
              />
            </div>
          </div>

          <Button 
            onClick={handleAcceptInvitation}
            disabled={accepting || !firstName || !lastName || !username || !password}
            className="w-full"
          >
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Accepting...
              </>
            ) : (
              'Accept Invitation & Create Account'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}