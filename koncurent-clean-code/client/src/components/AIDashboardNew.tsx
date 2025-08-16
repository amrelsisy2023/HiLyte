import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Brain, Target, TrendingUp, Users, Crown, User, GripVertical, Search, ChevronLeft, ChevronRight, Activity, Calendar, DollarSign, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { isKoncurrentAdmin } from "@/utils/accessControl";

interface AIDashboardProps {
  user?: any;
}

export function AIDashboard({ user: currentUser }: AIDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Personal widget state
  const [personalWidgetOrder, setPersonalWidgetOrder] = useState(() => {
    const saved = localStorage.getItem('ai-dashboard-personal-widgets');
    return saved ? JSON.parse(saved) : ['usage', 'productivity'];
  });

  // Platform widget state
  const [platformWidgetOrder, setPlatformWidgetOrder] = useState(() => {
    const saved = localStorage.getItem('ai-dashboard-platform-widgets');
    return saved ? JSON.parse(saved) : ['platform', 'credit-users', 'all-users', 'transactions'];
  });

  // Fetch data first
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: isKoncurrentAdmin(currentUser),
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['/api/admin/credit-transactions'],
    enabled: isKoncurrentAdmin(currentUser),
  });

  const { data: extractedData = [] } = useQuery({
    queryKey: ['/api/extracted-data'],
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/admin/users/${userId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "User Removed",
        description: "User has been successfully removed from the system.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/credit-transactions'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove user. Please try again.",
        variant: "destructive",
      });
      console.error('Delete user error:', error);
    },
  });

  // Handle user deletion
  const handleDeleteUser = (userId: number, userEmail: string) => {
    setDeleteUserModal({ open: true, user: { id: userId, email: userEmail } });
  };

  const confirmDeleteUser = () => {
    if (deleteUserModal?.user) {
      deleteUserMutation.mutate(deleteUserModal.user.id);
      setDeleteUserModal(null);
    }
  };

  // Type guard for allUsers data
  const usersData = Array.isArray(allUsers) ? allUsers : [];
  const transactionsData = Array.isArray(allTransactions) ? allTransactions : [];

  // Mock insights data derived from queries
  const insights = {
    totalExtractions: Array.isArray(extractedData) ? extractedData.length : 12,
    avgConfidence: 85.4,
    userSessions: 3,
    weeklyProgress: 75,
    avgSessionTime: 24,
    topOperation: "Data Extraction",
    efficiency: "Improving",
    allUsers: usersData,
    activeUsers: usersData.filter((u: any) => u.subscriptionStatus === 'active')
  };

  // UI state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [deleteUserModal, setDeleteUserModal] = useState<{open: boolean, user: any} | null>(null);

  // Search and pagination states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const [transactionFilterType, setTransactionFilterType] = useState('all');
  const [transactionCurrentPage, setTransactionCurrentPage] = useState(1);
  const transactionsPerPage = 8;

  const [creditUsersSearchTerm, setCreditUsersSearchTerm] = useState('');
  const [creditUsersCurrentPage, setCreditUsersCurrentPage] = useState(1);
  const creditUsersPerPage = 6;





  // Handle drag end for both containers
  const handleDragEnd = (result: any, containerType: 'personal' | 'platform') => {
    if (!result.destination) return;

    if (containerType === 'personal') {
      const items = Array.from(personalWidgetOrder);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      setPersonalWidgetOrder(items);
      localStorage.setItem('ai-dashboard-personal-widgets', JSON.stringify(items));
    } else {
      const items = Array.from(platformWidgetOrder);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      setPlatformWidgetOrder(items);
      localStorage.setItem('ai-dashboard-platform-widgets', JSON.stringify(items));
    }
  };



  // Filtered data
  const filteredUsers = Array.isArray(allUsers) ? allUsers.filter((user: any) => {
    const matchesSearch = user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         user.firstName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesStatus = userFilterStatus === 'all' || user.subscriptionStatus === userFilterStatus;
    return matchesSearch && matchesStatus;
  }) : [];

  const filteredTransactions = Array.isArray(allTransactions) ? allTransactions.filter((transaction: any) => {
    const matchesSearch = transaction.description?.toLowerCase().includes(transactionSearchTerm.toLowerCase()) ||
                         transaction.type?.toLowerCase().includes(transactionSearchTerm.toLowerCase());
    const matchesType = transactionFilterType === 'all' || transaction.type === transactionFilterType;
    return matchesSearch && matchesType;
  }) : [];

  const filteredCreditUsers = allUsers.filter((user: any) => {
    const hasCredits = user.aiCreditsBalance > 0;
    const matchesSearch = user.email?.toLowerCase().includes(creditUsersSearchTerm.toLowerCase()) ||
                         user.firstName?.toLowerCase().includes(creditUsersSearchTerm.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(creditUsersSearchTerm.toLowerCase());
    return hasCredits && matchesSearch;
  }).sort((a: any, b: any) => b.aiCreditsBalance - a.aiCreditsBalance);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  const transactionTotalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const transactionStartIndex = (transactionCurrentPage - 1) * transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(transactionStartIndex, transactionStartIndex + transactionsPerPage);

  const creditUsersTotalPages = Math.ceil(filteredCreditUsers.length / creditUsersPerPage);
  const creditUsersStartIndex = (creditUsersCurrentPage - 1) * creditUsersPerPage;
  const paginatedCreditUsers = filteredCreditUsers.slice(creditUsersStartIndex, creditUsersStartIndex + creditUsersPerPage);

  // Define widgets
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
            <span className="font-medium text-blue-600">{insights.topOperation}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Efficiency</span>
            <span className="font-medium text-blue-600">{insights.efficiency}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Extractions</span>
            <span className="font-medium text-blue-600">{insights.totalExtractions}</span>
          </div>
        </div>
      </div>
    ),
    'platform': isKoncurrentAdmin(currentUser) ? (
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
    'credit-users': isKoncurrentAdmin(currentUser) ? (
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-700">Top Credit Users ({filteredCreditUsers.length})</h3>
          </div>
        </div>

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
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {paginatedCreditUsers.length > 0 ? (
            paginatedCreditUsers.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between text-xs border-b border-emerald-200 pb-1 hover:bg-white/40 p-1 rounded transition-colors">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-gray-600 truncate">
                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                  </span>
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
            </div>
          )}
        </div>

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
    'all-users': isKoncurrentAdmin(currentUser) ? (
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-700">All Users ({filteredUsers.length})</h3>
          </div>
        </div>

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
          </div>
        </div>

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {paginatedUsers.length > 0 ? (
            paginatedUsers.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between text-xs border-b border-indigo-200 pb-2 hover:bg-white/40 p-2 rounded transition-colors">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-gray-600 truncate font-medium">
                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                  </span>
                  <span className="text-gray-400 truncate">{user.email}</span>
                  <span className="text-gray-400 text-xs">
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end text-right">
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

                  {isKoncurrentAdmin(currentUser) && user.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title={`Remove ${user.email}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
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
    ) : null,
    'transactions': isKoncurrentAdmin(currentUser) ? (
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-yellow-500" />
            <h3 className="text-sm font-semibold text-gray-700">Recent Transactions ({filteredTransactions.length})</h3>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Search transactions..."
              value={transactionSearchTerm}
              onChange={(e) => setTransactionSearchTerm(e.target.value)}
              className="pl-7 text-xs h-7 bg-white/80 border-yellow-200 focus:border-yellow-400"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Select value={transactionFilterType} onValueChange={setTransactionFilterType}>
              <SelectTrigger className="text-xs h-7 bg-white/80 border-yellow-200 w-auto min-w-[120px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="signup_bonus">Signup Bonus</SelectItem>
                <SelectItem value="credits_added">Credits Added</SelectItem>
                <SelectItem value="credits_used">Credits Used</SelectItem>
                <SelectItem value="ai_usage">AI Usage</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {paginatedTransactions.length > 0 ? (
            paginatedTransactions.map((transaction: any) => (
              <div key={transaction.id} className="flex items-center justify-between text-xs border-b border-yellow-200 pb-1 hover:bg-white/40 p-1 rounded transition-colors">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-gray-600 truncate font-medium">{transaction.type}</span>
                  <span className="text-gray-400 truncate">{transaction.description}</span>
                  <span className="text-gray-400 text-xs">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex flex-col items-end text-right ml-2">
                  <span className={`font-medium ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}${transaction.amount.toFixed(2)}
                  </span>
                  <span className="text-gray-400 text-xs">
                    Balance: ${transaction.balance.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <DollarSign className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No transactions found</p>
            </div>
          )}
        </div>

        {transactionTotalPages > 1 && (
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-yellow-200">
            <div className="text-xs text-gray-600">
              {transactionStartIndex + 1}-{Math.min(transactionStartIndex + transactionsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransactionCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={transactionCurrentPage === 1}
                className="h-6 w-6 p-0 border-yellow-200"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="flex items-center px-2 py-1 bg-white/60 rounded text-xs border border-yellow-200">
                {transactionCurrentPage}/{transactionTotalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransactionCurrentPage(prev => Math.min(transactionTotalPages, prev + 1))}
                disabled={transactionCurrentPage === transactionTotalPages}
                className="h-6 w-6 p-0 border-yellow-200"
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
    <div className="space-y-8">
      {/* Personal AI Insights Section */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 rounded-lg">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {currentUser?.firstName ? `${currentUser.firstName}'s AI Insights` : 'Your AI Insights'}
            </h2>
            <p className="text-blue-600">Personal usage analytics and performance</p>
          </div>
        </div>

        <DragDropContext onDragEnd={(result) => handleDragEnd(result, 'personal')}>
          <Droppable droppableId="personal-dashboard">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${snapshot.isDraggingOver ? 'bg-blue-100 border-2 border-blue-300 border-dashed rounded-lg p-2' : ''}`}
              >
                {personalWidgetOrder.map((widgetId, index) => {
                  const widget = widgets[widgetId];
                  if (!widget) return null;
                  
                  return (
                    <Draggable key={widgetId} draggableId={widgetId} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`relative transition-all duration-200 group ${
                            snapshot.isDragging ? 'shadow-lg scale-105 rotate-1' : ''
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
                          {widget}
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
      </div>

      {/* Platform Analytics Section (Admin Only) */}
      {isKoncurrentAdmin(currentUser) && (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-600 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Platform Analytics</h2>
              <p className="text-orange-600">All Koncurent Hi-LYTE user data and insights</p>
            </div>
          </div>

          <DragDropContext onDragEnd={(result) => handleDragEnd(result, 'platform')}>
            <Droppable droppableId="platform-dashboard">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`space-y-4 ${snapshot.isDraggingOver ? 'bg-orange-100 border-2 border-orange-300 border-dashed rounded-lg p-2' : ''}`}
                >
                  {platformWidgetOrder.map((widgetId, index) => {
                    const widget = widgets[widgetId];
                    if (!widget) return null;
                    
                    return (
                      <Draggable key={widgetId} draggableId={widgetId} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`relative transition-all duration-200 group ${
                              snapshot.isDragging ? 'shadow-lg scale-105 rotate-1' : ''
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
                            {widget}
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
        </div>
      )}

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteUserModal?.open || false} onOpenChange={(open) => !open && setDeleteUserModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove user <strong>{deleteUserModal?.user?.email}</strong>? 
              This action cannot be undone and will permanently delete their account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}