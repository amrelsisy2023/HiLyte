import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bot, Brain, Zap, Lock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIDashboard } from "@/components/AIDashboardNew";
import { AdminMonitoring } from "@/components/AdminMonitoring";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAIDashboard } from "@/utils/accessControl";

export default function AITrainingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Check access permissions - redirect if not authorized
  if (!canAccessAIDashboard(user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-gray-900">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              The AI Dashboard is available exclusively to Koncurent team members.
            </p>
            <p className="text-sm text-gray-500">
              Please contact your administrator if you believe you should have access.
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="w-full"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check AI status
  const { data: aiStatus } = useQuery<any>({
    queryKey: ['/api/ai-status'],
    refetchInterval: 10000,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
            {aiStatus?.aiEnabled && (
              <Badge variant="default" className="bg-green-600">
                <Bot className="h-3 w-3 mr-1" />
                AI Active: {aiStatus.model}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold">AI Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            View AI insights, data extraction performance analytics, and system monitoring
          </p>
        </div>

        {/* Tabbed Dashboard Interface */}
        <Tabs defaultValue="ai-insights" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai-insights" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="system-monitoring" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Monitoring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-insights" className="space-y-6">
            {/* AI Status Overview */}
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <Zap className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="font-semibold">Provider</h3>
                    <p className="text-sm">{aiStatus?.provider || 'Not Available'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Model</h3>
                    <p className="text-sm">{aiStatus?.model || 'Not Configured'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Status</h3>
                    <p className="text-sm">{aiStatus?.aiEnabled ? 'Ready for Dashboard' : 'Not Available'}</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* AI Dashboard */}
            <AIDashboard user={user} />
          </TabsContent>

          <TabsContent value="system-monitoring">
            <AdminMonitoring />
          </TabsContent>
        </Tabs>


      </div>
    </div>
  );
}