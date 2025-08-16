import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Settings, 
  History,
  Zap,
  Brain,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { loadStripe } from "@stripe/stripe-js";
import { ReferralDashboard } from "./referral-dashboard";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CreditBalance {
  balance: number;
  monthlySpent: number;
  totalSpent: number;
  alertThreshold: number;
  autoPurchase: boolean;
  autoPurchaseAmount: number;
}

interface UsageRecord {
  id: number;
  operation: string;
  tokensUsed: number;
  cost: number;
  model: string;
  createdAt: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export function AiCreditsDashboard() {
  const [purchaseAmount, setPurchaseAmount] = useState(20);
  const [settings, setSettings] = useState({
    creditAlertThreshold: 5.0,
    autoPurchaseCredits: false,
    autoPurchaseAmount: 20.0
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch credit balance
  const { data: balance, isLoading: balanceLoading } = useQuery<CreditBalance>({
    queryKey: ["/api/ai-credits/balance"],
  });

  // Fetch usage history
  const { data: usage = [] } = useQuery<UsageRecord[]>({
    queryKey: ["/api/ai-credits/usage"],
  });

  // Fetch transaction history
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/ai-credits/transactions"],
  });

  // Fetch payment method
  const { data: paymentMethod } = useQuery<PaymentMethod | null>({
    queryKey: ["/api/ai-credits/payment-method"],
  });

  // Purchase credits mutation
  const purchaseCredits = useMutation({
    mutationFn: async (amount: number) => {
      try {
        console.log('Purchasing credits for amount:', amount);
        const response = await apiRequest("/api/ai-credits/purchase", "POST", { amount });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Purchase response:', data);
        return data;
      } catch (error: any) {
        console.error('Purchase API error:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      try {
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error("Stripe failed to load");
        }

        console.log('Redirecting to Stripe checkout with session:', data.sessionId);

        // Try Stripe's redirect method first
        try {
          const result = await stripe.redirectToCheckout({
            sessionId: data.sessionId
          });

          console.log('Stripe redirect result:', result);

          if (result.error) {
            console.error('Stripe redirect error:', result.error);
            // If Stripe redirect fails, try direct URL redirect as fallback
            if (data.url) {
              console.log('Falling back to direct URL redirect:', data.url);
              window.location.href = data.url;
              return;
            }
            throw new Error(result.error.message || "Unable to redirect to payment page");
          }
        } catch (redirectError: any) {
          console.error('Stripe redirect method failed:', redirectError);
          
          // Fallback: try direct URL redirect if available
          if (data.url) {
            console.log('Using fallback URL redirect:', data.url);
            window.location.href = data.url;
            return;
          }
          
          throw redirectError;
        }
      } catch (err: any) {
        console.error('Checkout error:', err);
        toast({
          title: "Checkout Error",
          description: err.message || "An unexpected error occurred",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      const response = await apiRequest("/api/ai-credits/settings", "PUT", newSettings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your AI credit settings have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-credits/balance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePurchase = () => {
    if (purchaseAmount < 5) {
      toast({
        title: "Invalid Amount",
        description: "Minimum purchase is $5.00",
        variant: "destructive",
      });
      return;
    }
    purchaseCredits.mutate(purchaseAmount);
  };

  const handleSettingsUpdate = () => {
    updateSettings.mutate(settings);
  };

  if (balanceLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const isLowBalance = balance && balance.balance <= balance.alertThreshold;

  return (
    <div className="space-y-6">
      {/* Credit Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${balance?.balance.toFixed(2) || '0.00'}</div>
            {isLowBalance && (
              <div className="flex items-center gap-1 text-orange-600 text-sm mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>Low balance</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${balance?.monthlySpent.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">This billing period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${balance?.totalSpent.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Purchase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Purchase AI Credits
          </CardTitle>
          <CardDescription>
            Add credits to your account for AI-powered document analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                min="5"
                step="5"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                placeholder="20.00"
              />
            </div>
            <Button
              onClick={handlePurchase}
              disabled={purchaseCredits.isPending}
              className="mt-6"
            >
              {purchaseCredits.isPending ? "Processing..." : "Purchase Credits"}
            </Button>
          </div>
          
          <div className="flex gap-2">
            {[5, 10, 20, 50, 100].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setPurchaseAmount(amount)}
              >
                ${amount}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">Usage History</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent AI Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usage.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No AI usage yet. Start analyzing documents to see your usage history.
                </p>
              ) : (
                <div className="space-y-2">
                  {usage.slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="font-medium capitalize">{record.operation.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {record.tokensUsed} tokens • {record.model}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${record.cost.toFixed(4)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No transactions yet. Purchase credits or use AI features to see activity.
                </p>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount > 0 ? '+' : ''}${transaction.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Balance: ${transaction.balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <ReferralDashboard />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Credit Settings
              </CardTitle>
              <CardDescription>
                Configure automatic credit purchases and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Method Section */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Method
                </h4>
                {paymentMethod ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">
                          •••• •••• •••• {paymentMethod.last4}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {paymentMethod.brand.toUpperCase()} • Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300">
                      Saved
                    </Badge>
                  </div>
                ) : (
                  <div className="p-3 border rounded-lg border-dashed">
                    <p className="text-sm text-muted-foreground text-center">
                      No payment method saved. Purchase credits to automatically save your payment method for future auto-purchases.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="alertThreshold">Low Credit Alert Threshold ($)</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  min="1"
                  step="1"
                  value={settings.creditAlertThreshold}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    creditAlertThreshold: Number(e.target.value)
                  }))}
                />
                <p className="text-sm text-muted-foreground">
                  Get notified when your balance drops below this amount
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Purchase Credits</Label>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethod 
                      ? "Automatically purchase credits when balance is low using your saved payment method"
                      : "Purchase credits first to save a payment method for auto-purchases"
                    }
                  </p>
                </div>
                <Switch
                  checked={settings.autoPurchaseCredits}
                  disabled={!paymentMethod}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    autoPurchaseCredits: checked
                  }))}
                />
              </div>

              {settings.autoPurchaseCredits && paymentMethod && (
                <div className="space-y-2">
                  <Label htmlFor="autoPurchaseAmount">Auto-Purchase Amount ($)</Label>
                  <Input
                    id="autoPurchaseAmount"
                    type="number"
                    min="5"
                    step="5"
                    value={settings.autoPurchaseAmount}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      autoPurchaseAmount: Number(e.target.value)
                    }))}
                  />
                  <p className="text-sm text-muted-foreground">
                    This amount will be automatically charged to your saved payment method when your balance drops below the alert threshold.
                  </p>
                </div>
              )}

              <Button 
                onClick={handleSettingsUpdate}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}