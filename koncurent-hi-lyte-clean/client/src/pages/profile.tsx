import { useState } from "react";
import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, User, Mail, Settings, Trash2, CreditCard, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // If no user or user doesn't exist, redirect to login
  if (!user || !user.id) {
    logout(); // Clear any stale session data
    setLocation("/login");
    return null;
  }
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);

  // Fetch payment methods
  const { data: paymentMethods, refetch: refetchPaymentMethods } = useQuery({
    queryKey: ['/api/billing/payment-methods'],
    enabled: !!user?.id,
  });

  // Handle payment setup success/cancel from URL params
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSetup = urlParams.get('payment_setup');
    
    if (paymentSetup === 'success') {
      toast({
        title: "Payment Method Added",
        description: "Your payment method has been successfully added and is ready to use.",
      });
      refetchPaymentMethods();
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
    } else if (paymentSetup === 'canceled') {
      toast({
        title: "Setup Canceled",
        description: "Payment method setup was canceled. You can try again anytime.",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
    }
  }, [toast, refetchPaymentMethods]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/users/${user?.id}`, 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("No user ID found");
      }
      
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // User already deleted - consider this a success
          return true;
        }
        const errorMessage = await response.text();
        throw new Error(errorMessage || "Failed to delete account");
      }
      
      return response.ok;
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      logout();
      setLocation("/");
    },
    onError: (error: any) => {
      console.error("Account deletion error:", error);
      
      // If the user doesn't exist, it might already be deleted
      if (error.message?.includes("User not found")) {
        toast({
          title: "Account already deleted",
          description: "This account has already been deleted.",
        });
        logout();
        setLocation("/");
        return;
      }
      
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
    });
  };

  const handleChangePassword = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  const handleDeleteAccount = () => {
    // Double check that user exists before showing delete dialog
    if (!user || !user.id) {
      toast({
        title: "Error",
        description: "No user session found. Please log in again.",
        variant: "destructive",
      });
      logout();
      setLocation("/");
      return;
    }
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation.toLowerCase() === "delete") {
      deleteAccountMutation.mutate();
      setShowDeleteDialog(false);
      setDeleteConfirmation("");
    } else {
      toast({
        title: "Confirmation failed",
        description: "Please type 'delete' to confirm account deletion",
        variant: "destructive",
      });
    }
  };

  const addPaymentMethodMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/billing/setup-intent', 'POST');
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Setup Ready",
        description: "Payment method setup is available. Stripe integration will be completed in the next update.",
      });
      refetchPaymentMethods();
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup payment method",
        variant: "destructive",
      });
    },
  });

  const removePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      return apiRequest(`/api/billing/payment-methods/${paymentMethodId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Payment Method Removed",
        description: "Payment method has been successfully removed.",
      });
      refetchPaymentMethods();
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove payment method",
        variant: "destructive",
      });
    },
  });

  const handleAddPaymentMethod = () => {
    addPaymentMethodMutation.mutate();
  };

  const handleRemovePaymentMethod = (paymentMethodId: string) => {
    if (confirm('Are you sure you want to remove this payment method?')) {
      removePaymentMethodMutation.mutate(paymentMethodId);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                logout();
                setLocation("/");
                toast({
                  title: "Logged out successfully",
                  description: "You have been securely logged out.",
                });
              }}
              className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <User className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                </div>

                <Button
                  onClick={handleUpdateProfile}
                  disabled={updateProfileMutation.isPending}
                  className="w-full md:w-auto"
                >
                  {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                </Button>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter your current password"
                  />
                </div>
                
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={updateProfileMutation.isPending || !formData.currentPassword || !formData.newPassword}
                  className="w-full md:w-auto"
                >
                  {updateProfileMutation.isPending ? "Updating..." : "Change Password"}
                </Button>
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Billing Information
                </CardTitle>
                <CardDescription>
                  Manage your payment methods for subscriptions and AI credits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Payment Methods List */}
                <div className="space-y-3">
                  {paymentMethods && paymentMethods.length > 0 ? (
                    paymentMethods.map((method: any) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-gray-500" />
                          <div>
                            <div className="font-medium">
                              •••• •••• •••• {method.card?.last4}
                            </div>
                            <div className="text-sm text-gray-500">
                              {method.card?.brand?.toUpperCase()} • Expires {method.card?.exp_month}/{method.card?.exp_year}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {method.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Default
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemovePaymentMethod(method.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No payment methods</p>
                      <p className="text-sm">Add a payment method to enable automatic billing and AI credit purchases</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Add Payment Method */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleAddPaymentMethod}
                    disabled={addPaymentMethodMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {addPaymentMethodMutation.isPending ? "Setting up..." : "Add Payment Method"}
                  </Button>
                  
                  {paymentMethods && paymentMethods.length > 0 && (
                    <Alert className="flex-1">
                      <AlertDescription>
                        Your default payment method will be used for subscription renewals and automatic AI credit purchases.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Overview */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Account Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">ID: {user?.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{user?.email}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="mt-6 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertDescription>
                    This action cannot be undone. All your projects, drawings, and collaboration data will be permanently deleted.
                  </AlertDescription>
                </Alert>
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleteAccountMutation.isPending}
                      className="w-full"
                    >
                      {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-red-600 flex items-center gap-2">
                        <Trash2 className="w-5 h-5" />
                        Confirm Account Deletion
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        <p className="mb-2">This will permanently delete your account and all associated data including:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>All your projects and drawings</li>
                          <li>Collaboration data and invitations</li>
                          <li>Account settings and preferences</li>
                        </ul>
                      </div>
                      <div className="border rounded-lg p-3 bg-red-50">
                        <p className="text-sm text-red-800 mb-2">
                          To confirm, type <strong>delete</strong> below:
                        </p>
                        <Input
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder="Type 'delete' to confirm"
                          className="mb-3"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDeleteDialog(false);
                            setDeleteConfirmation("");
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleConfirmDelete}
                          disabled={deleteConfirmation.toLowerCase() !== "delete" || deleteAccountMutation.isPending}
                          className="flex-1"
                        >
                          {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}