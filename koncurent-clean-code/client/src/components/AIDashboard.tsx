import { useState, useEffect } from "react";
import { Brain, Target, TrendingUp, Award, Activity, User, Clock, Zap, Lock, Users, DollarSign, Crown, X, ArrowLeft, Calendar, CreditCard, Search, ChevronLeft, ChevronRight, Filter, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAIDashboard, isKoncurrentAdmin } from "@/utils/accessControl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AIDashboard() {
  const { user } = useAuth();

  // Check access permissions
  if (!canAccessAIDashboard(user)) {
    return (
      <div className="p-4 space-y-4">
        <Alert className="border-amber-200 bg-amber-50">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="space-y-2">
              <p className="font-medium">Access Restricted</p>
              <p className="text-sm">
                The AI Dashboard is available exclusively to Koncurent team members. 
                Please contact your administrator if you believe you should have access.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  const [insights, setInsights] = useState({
    totalExtractions: 0,
    successfulExtractions: 0,
    avgConfidence: 0,
    topDivisions: [] as string[],
    recentActivity: [] as any[],
    userStats: {
      totalSessions: 0,
      avgSessionTime: 0,
      favoriteOperations: [] as string[],
      weeklyProgress: 0
    },
    // Admin-specific data
    allUsers: [] as any[],
    creditTransactions: [] as any[],
    topSpenders: [] as any[],
    activeUsers: [] as any[]
  });

  // User profile modal state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userProfileData, setUserProfileData] = useState<any>(null);
  
  // User list management state
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10); // Show 10 users per page
  
  // Transaction list management state
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const [transactionFilterType, setTransactionFilterType] = useState('all');
  const [transactionCurrentPage, setTransactionCurrentPage] = useState(1);
  const [transactionsPerPage] = useState(8); // Show 8 transactions per page
  
  // Active users list management state
  const [activeUsersSearchTerm, setActiveUsersSearchTerm] = useState('');
  const [activeUsersCurrentPage, setActiveUsersCurrentPage] = useState(1);
  const [activeUsersPerPage] = useState(6); // Show 6 active users per page
  
  // Credit users list management state
  const [creditUsersSearchTerm, setCreditUsersSearchTerm] = useState('');
  const [creditUsersCurrentPage, setCreditUsersCurrentPage] = useState(1);
  const [creditUsersPerPage] = useState(6); // Show 6 credit users per page
  
  // Widget order management for drag and drop
  const [widgetOrder, setWidgetOrder] = useState([
    'usage',
    'productivity', 
    'platform',
    'credit-users',
    'active-users',
    'transactions',
    'all-users'
  ]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    fetchAIInsights();
  }, []);

  // Function to fetch individual user profile data
  const fetchUserProfile = async (userId: string) => {
    try {
      // Get user's extraction data
      const extractionResponse = await fetch('/api/extracted-data');
      const extractionData = await extractionResponse.json();
      const userExtractions = extractionData.filter((item: any) => item.userId.toString() === userId);

      // Get user's credit transactions
      const transactionsResponse = await fetch('/api/admin/credit-transactions');
      const allTransactions = transactionsResponse.ok ? await transactionsResponse.json() : [];
      const userTransactions = allTransactions.filter((transaction: any) => transaction.userId.toString() === userId);

      // Get user's projects and drawings data
      const projectsResponse = await fetch('/api/projects');
      const allProjects = projectsResponse.ok ? await projectsResponse.json() : [];
      const userProjects = allProjects.filter((project: any) => project.userId?.toString() === userId);

      const drawingsResponse = await fetch('/api/drawings');
      const allDrawings = drawingsResponse.ok ? await drawingsResponse.json() : [];
      const userDrawings = allDrawings.filter((drawing: any) => {
        // Check if drawing belongs to user's project or has user ID
        return drawing.userId?.toString() === userId || 
               userProjects.some((project: any) => project.id === drawing.projectId);
      });

      // Calculate user statistics
      const totalSpent = userTransactions
        .filter((t: any) => t.type === 'usage' && t.amount < 0)
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

      const totalCreditsAdded = userTransactions
        .filter((t: any) => t.amount > 0)
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      // Get division usage statistics
      const divisionUsage = userExtractions.reduce((acc: any, extraction: any) => {
        const divisionName = `Division ${extraction.divisionId}`;
        acc[divisionName] = (acc[divisionName] || 0) + 1;
        return acc;
      }, {});

      const topDivisions = Object.entries(divisionUsage)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5);

      // Recent activity (last 10 extractions)
      const recentExtractions = userExtractions
        .sort((a: any, b: any) => new Date(b.extractedAt || 0).getTime() - new Date(a.extractedAt || 0).getTime())
        .slice(0, 10);

      // Analyze project types and drawing information
      const projectTypes = userProjects.reduce((acc: any, project: any) => {
        const type = project.type || 'General';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      // Analyze drawing types and file information
      const drawingStats = {
        totalDrawings: userDrawings.length,
        totalPages: userDrawings.reduce((sum: number, drawing: any) => sum + (drawing.totalPages || 1), 0),
        avgPagesPerDrawing: userDrawings.length > 0 ? 
          (userDrawings.reduce((sum: number, drawing: any) => sum + (drawing.totalPages || 1), 0) / userDrawings.length).toFixed(1) : 0,
        fileTypes: userDrawings.reduce((acc: any, drawing: any) => {
          const ext = drawing.fileName?.split('.').pop()?.toUpperCase() || 'PDF';
          acc[ext] = (acc[ext] || 0) + 1;
          return acc;
        }, {}),
        recentUploads: userDrawings
          .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 5)
      };

      setUserProfileData({
        extractions: userExtractions,
        transactions: userTransactions.slice(0, 10), // Most recent 10
        projects: userProjects,
        drawings: userDrawings,
        statistics: {
          totalExtractions: userExtractions.length,
          totalSpent: totalSpent,
          totalCreditsAdded: totalCreditsAdded,
          currentBalance: insights.allUsers.find((u: any) => u.id.toString() === userId)?.aiCreditsBalance || 0,
          topDivisions: topDivisions,
          recentExtractions: recentExtractions,
          joinedDate: insights.allUsers.find((u: any) => u.id.toString() === userId)?.createdAt,
          projectTypes: projectTypes,
          drawingStats: drawingStats
        }
      });
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  // Function to open user profile modal
  const openUserProfile = async (user: any) => {
    setSelectedUser(user);
    setIsProfileModalOpen(true);
    await fetchUserProfile(user.userId || user.id);
  };

  const fetchAIInsights = async () => {
    try {
      // Fetch extraction insights
      const extractionResponse = await fetch('/api/extracted-data');
      const extractionData = await extractionResponse.json();
      
      // Calculate insights from extracted data
      const total = extractionData.length;
      const successful = extractionData.filter((item: any) => item.data && item.data.length > 0).length;
      const avgConf = total > 0 ? (successful / total) * 100 : 0;
      
      // Get top divisions by extraction count
      const divisionCounts = extractionData.reduce((acc: any, item: any) => {
        acc[item.divisionId] = (acc[item.divisionId] || 0) + 1;
        return acc;
      }, {});
      
      const topDivs = Object.entries(divisionCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([divId]) => `Division ${divId}`);
      
      // Recent activity (last 10 extractions)
      const recent = extractionData
        .sort((a: any, b: any) => new Date(b.extractedAt || 0).getTime() - new Date(a.extractedAt || 0).getTime())
        .slice(0, 10);

      // Calculate user-specific insights
      const userSpecificData = extractionData.filter((item: any) => item.userId === user?.id);
      const userTotal = userSpecificData.length;
      
      // Simulate user session data (in real app, this would come from user analytics)
      const mockUserStats = {
        totalSessions: Math.max(1, Math.floor(userTotal / 3)), // Estimate sessions based on extractions
        avgSessionTime: 15 + Math.floor(Math.random() * 30), // 15-45 minutes
        favoriteOperations: ['Data Extraction', 'Template Management', 'Division Analysis'],
        weeklyProgress: Math.min(100, (userTotal * 10)) // Progress based on user activity
      };

      // Admin-specific data fetching
      let adminData = {
        allUsers: [],
        creditTransactions: [],
        topSpenders: [],
        activeUsers: []
      };

      if (isKoncurrentAdmin(user)) {
        try {
          // Fetch all users
          const usersResponse = await fetch('/api/admin/users');
          const allUsers = usersResponse.ok ? await usersResponse.json() : [];

          // Fetch all credit transactions
          const transactionsResponse = await fetch('/api/admin/credit-transactions');
          const creditTransactions = transactionsResponse.ok ? await transactionsResponse.json() : [];

          // Calculate top spenders from transactions
          const userSpending = creditTransactions.reduce((acc: any, transaction: any) => {
            if (transaction.type === 'usage' && transaction.amount < 0) {
              acc[transaction.userId] = (acc[transaction.userId] || 0) + Math.abs(transaction.amount);
            }
            return acc;
          }, {});

          const topSpenders = Object.entries(userSpending)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([userId, amount]) => {
              const userInfo = allUsers.find((u: any) => u.id.toString() === userId);
              return {
                userId,
                amount,
                email: userInfo?.email || 'Unknown',
                name: userInfo ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() : 'Unknown'
              };
            });

          // Calculate active users (users with recent extractions)
          const userExtractionCounts = extractionData.reduce((acc: any, item: any) => {
            acc[item.userId] = (acc[item.userId] || 0) + 1;
            return acc;
          }, {});

          const activeUsers = Object.entries(userExtractionCounts)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([userId, count]) => {
              const userInfo = allUsers.find((u: any) => u.id.toString() === userId);
              return {
                userId,
                extractionCount: count,
                email: userInfo?.email || 'Unknown',
                name: userInfo ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() : 'Unknown',
                aiCreditsBalance: userInfo?.aiCreditsBalance || 0
              };
            });

          adminData = {
            allUsers,
            creditTransactions: creditTransactions.slice(0, 10), // Most recent 10 transactions
            topSpenders,
            activeUsers
          };
        } catch (adminError) {
          console.error('Failed to fetch admin data:', adminError);
        }
      }
      
      setInsights({
        totalExtractions: total,
        successfulExtractions: successful,
        avgConfidence: avgConf,
        topDivisions: topDivs,
        recentActivity: recent,
        userStats: mockUserStats,
        ...adminData
      });
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
    }
  };

  // Filter and paginate users
  const filteredUsers = insights.allUsers.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         user.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         user.username?.toLowerCase().includes(userSearchTerm.toLowerCase());
    
    const matchesStatus = userFilterStatus === 'all' || 
                         (userFilterStatus === 'trial' && user.subscriptionStatus === 'free_trial') ||
                         (userFilterStatus === 'active' && user.subscriptionStatus === 'active') ||
                         (userFilterStatus === 'koncurrent' && user.email?.endsWith('@koncurent.com'));
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearchTerm, userFilterStatus]);

  // Filter and paginate transactions
  const filteredTransactions = insights.creditTransactions.filter(transaction => {
    const userEmail = transaction.user?.email || '';
    const matchesSearch = userEmail.toLowerCase().includes(transactionSearchTerm.toLowerCase()) ||
                         transaction.type.toLowerCase().includes(transactionSearchTerm.toLowerCase()) ||
                         transaction.description?.toLowerCase().includes(transactionSearchTerm.toLowerCase());
    
    const matchesType = transactionFilterType === 'all' || 
                       (transactionFilterType === 'credit' && transaction.amount > 0) ||
                       (transactionFilterType === 'debit' && transaction.amount < 0) ||
                       (transactionFilterType === 'signup_bonus' && transaction.type === 'signup_bonus') ||
                       (transactionFilterType === 'purchase' && transaction.type === 'credit_purchase') ||
                       (transactionFilterType === 'usage' && transaction.type === 'ai_usage');
    
    return matchesSearch && matchesType;
  });

  const transactionTotalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const transactionStartIndex = (transactionCurrentPage - 1) * transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(transactionStartIndex, transactionStartIndex + transactionsPerPage);

  // Reset transaction page when filters change
  useEffect(() => {
    setTransactionCurrentPage(1);
  }, [transactionSearchTerm, transactionFilterType]);

  // Filter and paginate active users
  const filteredActiveUsers = insights.activeUsers.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(activeUsersSearchTerm.toLowerCase()) ||
                         user.name?.toLowerCase().includes(activeUsersSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const activeUsersTotalPages = Math.ceil(filteredActiveUsers.length / activeUsersPerPage);
  const activeUsersStartIndex = (activeUsersCurrentPage - 1) * activeUsersPerPage;
  const paginatedActiveUsers = filteredActiveUsers.slice(activeUsersStartIndex, activeUsersStartIndex + activeUsersPerPage);

  // Reset active users page when filters change
  useEffect(() => {
    setActiveUsersCurrentPage(1);
  }, [activeUsersSearchTerm]);

  // Filter and paginate credit users (using top credit users from insights)
  const filteredCreditUsers = insights.allUsers
    .filter(user => user.aiCreditsBalance > 0) // Only show users with credits
    .sort((a, b) => b.aiCreditsBalance - a.aiCreditsBalance) // Sort by highest credits first
    .filter(user => {
      const matchesSearch = user.email?.toLowerCase().includes(creditUsersSearchTerm.toLowerCase()) ||
                           (user.firstName && user.lastName && `${user.firstName} ${user.lastName}`.toLowerCase().includes(creditUsersSearchTerm.toLowerCase()));
      return matchesSearch;
    });

  const creditUsersTotalPages = Math.ceil(filteredCreditUsers.length / creditUsersPerPage);
  const creditUsersStartIndex = (creditUsersCurrentPage - 1) * creditUsersPerPage;
  const paginatedCreditUsers = filteredCreditUsers.slice(creditUsersStartIndex, creditUsersStartIndex + creditUsersPerPage);

  // Reset credit users page when filters change
  useEffect(() => {
    setCreditUsersCurrentPage(1);
  }, [creditUsersSearchTerm]);

  // Handle drag and drop for widget reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(widgetOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setWidgetOrder(items);
  };

  // Define widget components
  const widgets = {
    'usage': (
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-700">Your Hi-LYTE Usage</h3>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Sessions</span>
            <span className="font-medium text-purple-600">{insights.userSessions}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Weekly Progress</span>
            <span className="font-medium text-purple-600">{insights.weeklyProgress}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Avg Time</span>
            <span className="font-medium text-purple-600">{insights.avgSessionTime}m</span>
          </div>
        </div>
      </div>
    ),
    'productivity': (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Productivity</h3>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Top Operation</span>
            <span className="font-medium text-blue-600">{insights.topOperation || 'Data Extraction'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Efficiency</span>
            <span className="font-medium text-blue-600">{insights.efficiency || 'Learning'}</span>
          </div>
        </div>
      </div>
    ),
    'platform': isKoncurrentAdmin(user) ? (
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-700">Platform Overview</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Users</span>
            <span className="font-medium text-orange-600">{insights.allUsers.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Active Users</span>
            <span className="font-medium text-orange-600">{insights.activeUsers.length}</span>
          </div>
        </div>
      </div>
    ) : null,
    'credit-users': isKoncurrentAdmin(user) ? (
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-700">Top Credit Users ({filteredCreditUsers.length})</h3>
          </div>
        </div>

        {/* Credit Users Search Control */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Search credit users..."
              value={creditUsersSearchTerm}
              onChange={(e) => setCreditUsersSearchTerm(e.target.value)}
              className="pl-7 text-xs h-7 bg-white/80 border-emerald-200 focus:border-emerald-400"
            />
          </div>
          {creditUsersSearchTerm && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCreditUsersSearchTerm('')}
              className="h-7 text-xs mt-2"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Credit Users List */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {paginatedCreditUsers.length > 0 ? (
            paginatedCreditUsers.map((user: any, index: number) => (
              <div key={user.id} className="flex items-center justify-between text-xs border-b border-emerald-200 pb-1 hover:bg-white/40 p-1 rounded transition-colors">
                <div className="flex flex-col flex-1 min-w-0">
                  <button 
                    onClick={() => openUserProfile({ ...user, id: user.id })}
                    className="text-gray-600 truncate hover:text-emerald-600 hover:underline text-left"
                  >
                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                  </button>
                  <span className="text-gray-400 truncate">{user.email}</span>
                </div>
                <div className="flex flex-col items-end text-right ml-2">
                  <span className="font-medium text-emerald-600">${user.aiCreditsBalance.toFixed(2)}</span>
                  <span className="text-gray-400 text-xs">credits</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Crown className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No users with credits found</p>
              {creditUsersSearchTerm && (
                <p className="text-xs mt-1">Try adjusting your search</p>
              )}
            </div>
          )}
        </div>

        {/* Credit Users Pagination */}
        {creditUsersTotalPages > 1 && (
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-emerald-200">
            <div className="text-xs text-gray-600">
              {creditUsersStartIndex + 1}-{Math.min(creditUsersStartIndex + creditUsersPerPage, filteredCreditUsers.length)} of {filteredCreditUsers.length}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreditUsersCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={creditUsersCurrentPage === 1}
                className="h-6 w-6 p-0 border-emerald-200"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="flex items-center px-2 py-1 bg-white/60 rounded text-xs border border-emerald-200">
                {creditUsersCurrentPage}/{creditUsersTotalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreditUsersCurrentPage(prev => Math.min(creditUsersTotalPages, prev + 1))}
                disabled={creditUsersCurrentPage === creditUsersTotalPages}
                className="h-6 w-6 p-0 border-emerald-200"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    ) : null,
    'active-users': isKoncurrentAdmin(user) ? (
      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-500" />
            <h3 className="text-sm font-semibold text-gray-700">Active Users ({filteredActiveUsers.length})</h3>
          </div>
        </div>

        {/* Active Users Search Control */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Search active users..."
              value={activeUsersSearchTerm}
              onChange={(e) => setActiveUsersSearchTerm(e.target.value)}
              className="pl-7 text-xs h-7 bg-white/80 border-cyan-200 focus:border-cyan-400"
            />
          </div>
          {activeUsersSearchTerm && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveUsersSearchTerm('')}
              className="h-7 text-xs mt-2"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Active Users List */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {paginatedActiveUsers.length > 0 ? (
            paginatedActiveUsers.map((activeUser: any, index: number) => (
              <div key={activeUser.userId} className="flex items-center justify-between text-xs border-b border-cyan-200 pb-1 hover:bg-white/40 p-1 rounded transition-colors">
                <div className="flex flex-col flex-1 min-w-0">
                  <button 
                    onClick={() => openUserProfile({ ...activeUser, id: activeUser.userId })}
                    className="text-gray-600 truncate hover:text-cyan-600 hover:underline text-left"
                  >
                    {activeUser.name || activeUser.email}
                  </button>
                  <span className="text-gray-400 truncate">${activeUser.aiCreditsBalance.toFixed(2)} credits</span>
                </div>
                <div className="flex flex-col items-end text-right ml-2">
                  <span className="font-medium text-cyan-600">{activeUser.extractionCount}</span>
                  <span className="text-gray-400 text-xs">extractions</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Activity className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No active users found</p>
              {activeUsersSearchTerm && (
                <p className="text-xs mt-1">Try adjusting your search</p>
              )}
            </div>
          )}
        </div>

        {/* Active Users Pagination */}
        {activeUsersTotalPages > 1 && (
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-cyan-200">
            <div className="text-xs text-gray-600">
              {activeUsersStartIndex + 1}-{Math.min(activeUsersStartIndex + activeUsersPerPage, filteredActiveUsers.length)} of {filteredActiveUsers.length}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveUsersCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={activeUsersCurrentPage === 1}
                className="h-6 w-6 p-0 border-cyan-200"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="flex items-center px-2 py-1 bg-white/60 rounded text-xs border border-cyan-200">
                {activeUsersCurrentPage}/{activeUsersTotalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveUsersCurrentPage(prev => Math.min(activeUsersTotalPages, prev + 1))}
                disabled={activeUsersCurrentPage === activeUsersTotalPages}
                className="h-6 w-6 p-0 border-cyan-200"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    ) : null,
    'transactions': isKoncurrentAdmin(user) ? (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-gray-700">Transactions ({filteredTransactions.length})</h3>
          </div>
        </div>

        {/* Transaction Filters */}
        <div className="space-y-2 mb-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Search transactions..."
              value={transactionSearchTerm}
              onChange={(e) => setTransactionSearchTerm(e.target.value)}
              className="pl-7 text-xs h-7 bg-white/80 border-slate-200 focus:border-slate-400"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Select value={transactionFilterType} onValueChange={setTransactionFilterType}>
              <SelectTrigger className="text-xs h-7 bg-white/80 border-slate-200 w-auto min-w-[100px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credits_added">Credits Added</SelectItem>
                <SelectItem value="credits_used">Credits Used</SelectItem>
                <SelectItem value="signup_bonus">Signup Bonus</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="ai_usage">AI Usage</SelectItem>
              </SelectContent>
            </Select>
            
            {(transactionSearchTerm || transactionFilterType !== 'all') && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setTransactionSearchTerm('');
                  setTransactionFilterType('all');
                }}
                className="h-7 text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {paginatedTransactions.length > 0 ? (
            paginatedTransactions.map((transaction: any, index: number) => (
              <div key={transaction.id} className="flex items-center justify-between text-xs border-b border-slate-200 pb-1 hover:bg-white/40 p-1 rounded transition-colors">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-gray-600 truncate">{transaction.description}</span>
                  <span className="text-gray-400 text-xs">{new Date(transaction.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col items-end text-right ml-2">
                  <span className={`font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.amount > 0 ? '+' : ''}${transaction.amount.toFixed(2)}
                  </span>
                  <span className="text-gray-400 text-xs">{transaction.type.replace('_', ' ')}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <DollarSign className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No transactions found</p>
              {(transactionSearchTerm || transactionFilterType !== 'all') && (
                <p className="text-xs mt-1">Try adjusting your filters</p>
              )}
            </div>
          )}
        </div>

        {/* Transaction Pagination */}
        {transactionTotalPages > 1 && (
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200">
            <div className="text-xs text-gray-600">
              {transactionStartIndex + 1}-{Math.min(transactionStartIndex + transactionsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransactionCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={transactionCurrentPage === 1}
                className="h-6 w-6 p-0 border-slate-200"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="flex items-center px-2 py-1 bg-white/60 rounded text-xs border border-slate-200">
                {transactionCurrentPage}/{transactionTotalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransactionCurrentPage(prev => Math.min(transactionTotalPages, prev + 1))}
                disabled={transactionCurrentPage === transactionTotalPages}
                className="h-6 w-6 p-0 border-slate-200"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    ) : null,
    'all-users': isKoncurrentAdmin(user) ? (
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-700">All Users ({filteredUsers.length})</h3>
          </div>
        </div>

        {/* User Filters */}
        <div className="space-y-2 mb-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              className="pl-7 text-xs h-7 bg-white/80 border-indigo-200 focus:border-indigo-400"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Select value={userFilterStatus} onValueChange={setUserFilterStatus}>
              <SelectTrigger className="text-xs h-7 bg-white/80 border-indigo-200 w-auto min-w-[100px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="free_trial">Free Trial</SelectItem>
                <SelectItem value="subscribed">Subscribed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            
            {(userSearchTerm || userFilterStatus !== 'all') && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setUserSearchTerm('');
                  setUserFilterStatus('all');
                }}
                className="h-7 text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {paginatedUsers.length > 0 ? (
            paginatedUsers.map((user: any, index: number) => (
              <div key={user.id} className="flex items-center justify-between text-xs border-b border-indigo-200 pb-2 hover:bg-white/40 p-2 rounded transition-colors">
                <div className="flex flex-col flex-1 min-w-0">
                  <button 
                    onClick={() => openUserProfile(user)}
                    className="text-gray-600 truncate hover:text-indigo-600 hover:underline text-left font-medium"
                  >
                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                  </button>
                  <span className="text-gray-400 truncate">{user.email}</span>
                  <span className="text-gray-400 text-xs">
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex flex-col items-end text-right ml-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.subscriptionStatus === 'active' ? 'bg-green-100 text-green-700' :
                    user.subscriptionStatus === 'free_trial' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {user.subscriptionStatus}
                  </span>
                  <span className="text-gray-500 text-xs mt-1">
                    ${user.aiCreditsBalance.toFixed(2)} credits
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Users className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No users found</p>
              {(userSearchTerm || userFilterStatus !== 'all') && (
                <p className="text-xs mt-1">Try adjusting your filters</p>
              )}
            </div>
          )}
        </div>

        {/* Users Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-indigo-200">
            <div className="text-xs text-gray-600">
              {startIndex + 1}-{Math.min(startIndex + usersPerPage, filteredUsers.length)} of {filteredUsers.length}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-6 w-6 p-0 border-indigo-200"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="flex items-center px-2 py-1 bg-white/60 rounded text-xs border border-indigo-200">
                {currentPage}/{totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-6 w-6 p-0 border-indigo-200"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    ) : null
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Brain className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {user?.firstName ? `${user.firstName}'s AI Insights` : 'AI Insights'}
            {isKoncurrentAdmin(user) && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500">Koncurent Hi-LYTE performance overview</p>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Total Extractions</p>
              <p className="text-2xl font-bold text-blue-600">{insights.totalExtractions}</p>
            </div>
            <Target className="h-6 w-6 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">{insights.avgConfidence.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
        </div>
      </div>

      {/* Top Performing Divisions */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Award className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-700">Top Active Divisions</h3>
        </div>
        <div className="space-y-1">
          {insights.topDivisions.slice(0, 3).map((division, index) => (
            <div key={division} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{division}</span>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  index === 0 ? 'bg-amber-400' : 
                  index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                }`} />
              </div>
            </div>
          ))}
          {insights.topDivisions.length === 0 && (
            <p className="text-xs text-gray-500">No extractions yet</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-700">Recent Activity</h3>
        </div>
        <div className="space-y-2 max-h-24 overflow-y-auto">
          {insights.recentActivity.slice(0, 4).map((activity, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <span className="text-gray-600 truncate">
                {activity.type || 'Data extraction'}
              </span>
              <span className="text-gray-400">
                {activity.extractedAt ? new Date(activity.extractedAt).toLocaleDateString() : 'Recent'}
              </span>
            </div>
          ))}
          {insights.recentActivity.length === 0 && (
            <p className="text-xs text-gray-500">No recent activity</p>
          )}
        </div>
      </div>

      {/* Draggable Widgets */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-4 ${snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg p-2' : ''}`}
            >
              {widgetOrder.map((widgetId, index) => {
                const widget = widgets[widgetId];
                if (!widget) return null;
                
                return (
                  <Draggable key={widgetId} draggableId={widgetId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`relative transition-all duration-200 ${
                          snapshot.isDragging ? 'shadow-lg scale-105 rotate-2' : ''
                        }`}
                      >
                        {/* Drag Handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="absolute top-2 right-2 p-1 rounded bg-white/80 shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
                        >
                          <GripVertical className="h-3 w-3 text-gray-400" />
                        </div>
                        
                        {/* Widget Content */}
                        <div className="group">
                          {widget}
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* User Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Profile: {selectedUser?.name || selectedUser?.email}
            </DialogTitle>
          </DialogHeader>

          {userProfileData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Overview */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    Account Overview
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedUser?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedUser?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Balance:</span>
                      <span className="font-medium text-green-600">${userProfileData.statistics.currentBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Spent:</span>
                      <span className="font-medium text-red-600">${userProfileData.statistics.totalSpent.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Extractions:</span>
                      <span className="font-medium text-blue-600">{userProfileData.statistics.totalExtractions}</span>
                    </div>
                    {userProfileData.statistics.joinedDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Joined:</span>
                        <span className="font-medium">{new Date(userProfileData.statistics.joinedDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Projects & Drawings Overview */}
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 border border-teal-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-teal-500" />
                    Projects & Drawings
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Projects:</span>
                      <span className="font-medium text-teal-600">{userProfileData.projects?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Drawings:</span>
                      <span className="font-medium text-teal-600">{userProfileData.statistics.drawingStats?.totalDrawings || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Pages:</span>
                      <span className="font-medium text-teal-600">{userProfileData.statistics.drawingStats?.totalPages || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Pages/Drawing:</span>
                      <span className="font-medium text-teal-600">{userProfileData.statistics.drawingStats?.avgPagesPerDrawing || 0}</span>
                    </div>
                    
                    {/* Project Types */}
                    {userProfileData.statistics.projectTypes && Object.keys(userProfileData.statistics.projectTypes).length > 0 && (
                      <div className="pt-2 border-t border-teal-200">
                        <span className="text-gray-600 font-medium">Project Types:</span>
                        <div className="mt-1 space-y-1">
                          {Object.entries(userProfileData.statistics.projectTypes).map(([type, count]: [string, any]) => (
                            <div key={type} className="flex justify-between text-xs">
                              <span className="text-gray-500">{type}</span>
                              <span className="text-teal-600">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* File Types */}
                    {userProfileData.statistics.drawingStats?.fileTypes && Object.keys(userProfileData.statistics.drawingStats.fileTypes).length > 0 && (
                      <div className="pt-2 border-t border-teal-200">
                        <span className="text-gray-600 font-medium">File Types:</span>
                        <div className="mt-1 space-y-1">
                          {Object.entries(userProfileData.statistics.drawingStats.fileTypes).map(([type, count]: [string, any]) => (
                            <div key={type} className="flex justify-between text-xs">
                              <span className="text-gray-500">{type}</span>
                              <span className="text-teal-600">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Divisions */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    Top Divisions Used
                  </h3>
                  <div className="space-y-2">
                    {userProfileData.statistics.topDivisions.length > 0 ? (
                      userProfileData.statistics.topDivisions.map(([division, count]: [string, number], index: number) => (
                        <div key={division} className="flex justify-between text-sm">
                          <span className="text-gray-600">{division}</span>
                          <span className="font-medium text-green-600">{count} extractions</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No extractions yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Details */}
              <div className="space-y-4">
                {/* Recent Transactions */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-purple-500" />
                    Recent Transactions
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {userProfileData.transactions.length > 0 ? (
                      userProfileData.transactions.map((transaction: any) => (
                        <div key={transaction.id} className="flex justify-between items-center text-sm border-b border-purple-200 pb-2">
                          <div className="flex flex-col">
                            <span className="text-gray-600">{transaction.type}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <span className={`font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No transactions yet</p>
                    )}
                  </div>
                </div>

                {/* Recent Uploads */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    Recent Uploads
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {userProfileData.statistics.drawingStats?.recentUploads?.length > 0 ? (
                      userProfileData.statistics.drawingStats.recentUploads.map((drawing: any, index: number) => (
                        <div key={drawing.id} className="flex justify-between items-center text-sm border-b border-amber-200 pb-2">
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-gray-600 truncate">{drawing.fileName || 'Unknown File'}</span>
                            <span className="text-xs text-gray-400">
                              {drawing.createdAt ? new Date(drawing.createdAt).toLocaleDateString() : 'Recently'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end text-right ml-2">
                            <span className="text-amber-600 font-medium text-xs">
                              {drawing.totalPages || 1} pages
                            </span>
                            <span className="text-xs text-gray-400">
                              {drawing.fileName?.split('.').pop()?.toUpperCase() || 'PDF'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No uploads yet</p>
                    )}
                  </div>
                </div>

                {/* Recent Extractions */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-orange-500" />
                    Recent Activity
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {userProfileData.statistics.recentExtractions.length > 0 ? (
                      userProfileData.statistics.recentExtractions.map((extraction: any, index: number) => (
                        <div key={extraction.id} className="flex justify-between items-center text-sm border-b border-orange-200 pb-2">
                          <div className="flex flex-col">
                            <span className="text-gray-600">Division {extraction.divisionId}</span>
                            <span className="text-xs text-gray-400">
                              {extraction.extractedAt ? new Date(extraction.extractedAt).toLocaleDateString() : 'Recently'}
                            </span>
                          </div>
                          <span className="text-orange-600 font-medium">
                            {extraction.data?.length || 0} items
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!userProfileData && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}