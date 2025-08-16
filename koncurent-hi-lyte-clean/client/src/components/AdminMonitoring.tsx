import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Users, 
  MessageSquare, 
  AlertTriangle, 
  Server, 
  Zap,
  Calendar,
  TrendingUp,
  RefreshCw,
  ExternalLink
} from "lucide-react";

interface SystemHealth {
  status: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  database: {
    status: string;
    connections: number;
  };
  lastUpdate: string;
}

interface BetaFeedback {
  id: number;
  userId: number;
  feedbackType: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  userEmail: string;
  createdAt: string;
}

interface LogEntry {
  id: number;
  level: string;
  message: string;
  userId?: number;
  userEmail?: string;
  endpoint?: string;
  duration?: number;
  timestamp: string;
}

interface UserActivity {
  id: number;
  email: string;
  lastActive: string;
  totalProjects: number;
  totalExtractions: number;
  creditBalance: number;
  subscriptionStatus: string;
}

export function AdminMonitoring() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Query system health
  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['/api/beta/admin/system-health'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Query beta feedback
  const { data: betaFeedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ['/api/beta/admin/feedback'],
  });

  // Query error logs
  const { data: errorLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/beta/admin/error-logs'],
  });

  // Query user activity
  const { data: userActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['/api/beta/admin/user-activity'],
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'secondary';
      case 'resolved': return 'default';
      default: return 'outline';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warn': return 'secondary';
      case 'info': return 'default';
      default: return 'outline';
    }
  };

  const formatUptime = (uptimeMs: number) => {
    const seconds = Math.floor(uptimeMs / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const refreshData = () => {
    setLastRefresh(new Date());
    // Manually refetch all data
    window.location.reload();
  };

  const safeLength = (arr: any[]): number => {
    return Array.isArray(arr) ? arr.length : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Monitoring</h2>
          <p className="text-muted-foreground">
            Beta testing monitoring and system health dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button 
            onClick={refreshData}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* System Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {systemHealth?.status || 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {systemHealth ? formatUptime(systemHealth.uptime) : '--'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth ? `${systemHealth.memory.percentage.toFixed(1)}%` : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemHealth 
                ? `${(systemHealth.memory.used / 1024 / 1024).toFixed(0)}MB / ${(systemHealth.memory.total / 1024 / 1024).toFixed(0)}MB`
                : 'Loading...'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeLength(userActivity?.users)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total registered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {safeLength(betaFeedback?.feedback)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total feedback items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="feedback" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feedback">Beta Feedback</TabsTrigger>
          <TabsTrigger value="logs">Error Logs</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="system">System Details</TabsTrigger>
        </TabsList>

        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Beta Feedback
              </CardTitle>
              <CardDescription>
                User feedback and bug reports from beta testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedbackLoading ? (
                <div className="text-center py-8">Loading feedback...</div>
              ) : (
                <div className="space-y-4">
                  {betaFeedback?.feedback && Array.isArray(betaFeedback.feedback) && betaFeedback.feedback.length > 0 ? (
                    betaFeedback.feedback.slice(0, 10).map((feedback: any) => (
                      <div key={feedback.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={getSeverityColor(feedback.severity)}>
                                {feedback.severity}
                              </Badge>
                              <Badge variant={getStatusColor(feedback.status)}>
                                {feedback.status}
                              </Badge>
                              <span className="text-sm text-gray-500">{feedback.category}</span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">{feedback.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{feedback.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>From: {feedback.userEmail}</span>
                              <span>Date: {new Date(feedback.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No feedback received yet
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Error Logs
              </CardTitle>
              <CardDescription>
                System errors and application logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8">Loading logs...</div>
              ) : (
                <div className="space-y-2">
                  {errorLogs?.logs && Array.isArray(errorLogs.logs) && errorLogs.logs.length > 0 ? (
                    errorLogs.logs.slice(0, 20).map((log: any, index: number) => (
                      <div key={log.id || index} className="border border-gray-200 rounded p-3 text-sm">
                        <div className="flex items-start justify-between mb-1">
                          <Badge variant={getLogLevelColor(log.level)} className="text-xs">
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-900 mb-1">{log.message}</p>
                        {log.userEmail && (
                          <p className="text-xs text-gray-500">User: {log.userEmail}</p>
                        )}
                        {log.endpoint && (
                          <p className="text-xs text-gray-500">Endpoint: {log.endpoint}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No error logs found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Activity Overview
              </CardTitle>
              <CardDescription>
                Recent user registrations and activity patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="text-center py-8">Loading user activity...</div>
              ) : (
                <div className="space-y-4">
                  {userActivity?.users && Array.isArray(userActivity.users) && userActivity.users.length > 0 ? (
                    userActivity.users.slice(0, 10).map((user: any) => (
                      <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{user.email}</h4>
                            <p className="text-sm text-gray-600">
                              Credits: ${user.creditBalance} | Status: {user.subscriptionStatus}
                            </p>
                            <p className="text-xs text-gray-500">
                              Projects: {user.totalProjects} | Extractions: {user.totalExtractions}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              Last Active: {new Date(user.lastActive).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No user activity data available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Details
              </CardTitle>
              <CardDescription>
                Detailed system health and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <div className="text-center py-8">Loading system details...</div>
              ) : systemHealth ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Server Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant="default" className="bg-green-600">
                          {systemHealth.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Uptime:</span>
                        <span>{formatUptime(systemHealth.uptime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Update:</span>
                        <span>{new Date(systemHealth.lastUpdate).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Resource Usage</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Memory:</span>
                        <span>{systemHealth.memory.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CPU Usage:</span>
                        <span>{systemHealth.cpu.usage.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CPU Cores:</span>
                        <span>{systemHealth.cpu.cores}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Database</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant="default" className="bg-green-600">
                          {systemHealth.database.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Connections:</span>
                        <span>{systemHealth.database.connections}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  System health data unavailable
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}