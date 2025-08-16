import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  DollarSign, 
  Copy, 
  Share2, 
  CheckCircle,
  Calendar,
  Gift
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  referralCreditsEarned: number;
  referredUsers: Array<{ email: string, joinedAt: string }>;
}

export function ReferralDashboard() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch referral stats
  const { data: stats, isLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/referrals/stats"],
  });

  // Generate referral code mutation
  const generateCode = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/referrals/generate-code", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/stats"] });
      toast({
        title: "Referral Code Generated",
        description: "Your unique referral code has been created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate referral code",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const shareReferral = async () => {
    if (!stats?.referralCode) return;

    const referralUrl = `${window.location.origin}/signup?ref=${stats.referralCode}`;
    const shareData = {
      title: 'Join Hi-LYTE with my referral',
      text: 'Get $5 in AI credits when you sign up for Hi-LYTE using my referral link!',
      url: referralUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Fallback to clipboard if share API fails
        copyToClipboard(referralUrl);
      }
    } else {
      copyToClipboard(referralUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const referralUrl = stats?.referralCode 
    ? `${window.location.origin}/signup?ref=${stats.referralCode}`
    : '';

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReferrals || 0}</div>
            <p className="text-xs text-muted-foreground">
              Friends you've invited
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.referralCreditsEarned || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From successful referrals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonus Per Referral</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$5.00</div>
            <p className="text-xs text-muted-foreground">
              Credits for each signup
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Referral Code</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-mono">
              {stats?.referralCode || (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => generateCode.mutate()}
                  disabled={generateCode.isPending}
                >
                  Generate Code
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link Section */}
      {stats?.referralCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Your Referral Link
            </CardTitle>
            <CardDescription>
              Share this link with friends to earn $5 in AI credits for each successful signup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                readOnly
                value={referralUrl}
                className="flex-1 font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referralUrl)}
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button onClick={shareReferral}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">How it works:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Share your referral link with friends</li>
                <li>• They sign up using your link and get $5 welcome credits</li>
                <li>• You earn $5 in AI credits for each successful signup</li>
                <li>• Credits are automatically added to your account</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referred Users List */}
      {stats?.referredUsers && stats.referredUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Referrals ({stats.referredUsers.length})
            </CardTitle>
            <CardDescription>
              Friends who joined using your referral link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.referredUsers.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{user.email}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {new Date(user.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    +$5.00
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {stats?.referralCode && (!stats.referredUsers || stats.referredUsers.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No referrals yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Share your referral link with friends to start earning AI credits. 
              You'll earn $5 for each friend who signs up!
            </p>
            <Button onClick={shareReferral}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Your Link
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}