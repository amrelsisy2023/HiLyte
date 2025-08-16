import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Brain, Target, TrendingUp, Users, Crown, User, GripVertical, Search, ChevronLeft, ChevronRight, Activity, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isKoncurrentAdmin } from "@/utils/accessControl";

interface AIDashboardProps {
  user?: any;
}

export function AIDashboard({ user }: AIDashboardProps) {
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

  // Fetch data
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: isKoncurrentAdmin(user),
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['/api/admin/credit-transactions'],
    enabled: isKoncurrentAdmin(user),
  });

  const { data: extractedData = [] } = useQuery({
    queryKey: ['/api/extracted-data'],
  });

  // Debug logging
  console.log('User object:', user);
  console.log('Is admin?', isKoncurrentAdmin(user));
  console.log('All users data:', allUsers);
  console.log('All transactions data:', allTransactions);

  // Mock insights data
  const insights = {
    totalExtractions: Array.isArray(extractedData) ? extractedData.length : 12,
    avgConfidence: 85.4,
    userSessions: 3,
    weeklyProgress: 75,
    avgSessionTime: 24,
    topOperation: "Data Extraction",
    efficiency: "Improving",
    allUsers: Array.isArray(allUsers) ? allUsers : [],
    activeUsers: Array.isArray(allUsers) ? allUsers.filter((u: any) => u.subscriptionStatus === 'active') : []
  };

  // UI state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  const transactionTotalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const transactionStartIndex = (transactionCurrentPage - 1) * transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(transactionStartIndex, transactionStartIndex + transactionsPerPage);

  const creditUsersTotalPages = Math.ceil(insights.allUsers.length / creditUsersPerPage);
  const creditUsersStartIndex = (creditUsersCurrentPage - 1) * creditUsersPerPage;
  const paginatedCreditUsers = insights.allUsers.slice(creditUsersStartIndex, creditUsersStartIndex + creditUsersPerPage);

  // Widget definitions
  const widgets: Record<string, JSX.Element> = {
    'usage': (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">AI Usage Analytics</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{insights.totalExtractions}</div>
            <div className="text-xs text-gray-600">Total Extractions</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{insights.avgConfidence}%</div>
            <div className="text-xs text-gray-600">Avg Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{insights.userSessions}</div>
            <div className="text-xs text-gray-600">Sessions Today</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{insights.weeklyProgress}%</div>
            <div className="text-xs text-gray-600">Weekly Progress</div>
          </div>
        </div>
      </div>
    ),
    'productivity': (
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-green-500" />
          <h3 className="text-sm font-semibold text-gray-700">Productivity Metrics</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Avg Session Time</span>
            <span className="text-sm font-medium text-green-600">{insights.avgSessionTime} min</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Top Operation</span>
            <span className="text-sm font-medium text-green-600">{insights.topOperation}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Efficiency Trend</span>
            <span className="text-sm font-medium text-green-600">{insights.efficiency}</span>
          </div>
        </div>
      </div>
    ),
    'platform': isKoncurrentAdmin(user) ? (
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-700">Platform Overview</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">{insights.allUsers.length}</div>
            <div className="text-xs text-gray-600">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">{insights.activeUsers.length}</div>
            <div className="text-xs text-gray-600">Active Users</div>
          </div>
        </div>
      </div>
    ) : null,
    'credit-users': isKoncurrentAdmin(user) ? (
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold text-gray-700">Top Credit Users ({insights.allUsers.length})</h3>
          </div>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {paginatedCreditUsers.length > 0 ? (
            paginatedCreditUsers.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between text-xs border-b border-green-200 pb-1">
                <span className="text-gray-600 truncate">{user.email}</span>
                <span className="text-green-600 font-medium">${user.aiCreditsBalance || 0}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No users found</p>
            </div>
          )}
        </div>
      </div>
    ) : null,
    'all-users': isKoncurrentAdmin(user) ? (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
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
              className="pl-7 text-xs h-7 bg-white/80 border-blue-200 focus:border-blue-400"
            />
          </div>
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {paginatedUsers.length > 0 ? (
            paginatedUsers.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between text-xs border-b border-blue-200 pb-1 hover:bg-white/40 p-1 rounded transition-colors">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-gray-600 truncate font-medium">{user.email}</span>
                  <span className="text-gray-400 truncate">{user.firstName} {user.lastName}</span>
                  <span className="text-gray-400 text-xs">{user.subscriptionStatus}</span>
                </div>
                <div className="flex flex-col items-end text-right ml-2">
                  <span className="text-blue-600 font-medium">${user.aiCreditsBalance || 0}</span>
                  <span className="text-gray-400 text-xs">{user.totalReferrals || 0} refs</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Users className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No users found</p>
            </div>
          )}
        </div>
      </div>
    ) : null,
    'transactions': isKoncurrentAdmin(user) ? (
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
              {user?.firstName ? `${user.firstName}'s AI Insights` : 'Your AI Insights'}
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
                {personalWidgetOrder.map((widgetId: string, index: number) => {
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
      {isKoncurrentAdmin(user) && (
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
                  {platformWidgetOrder.map((widgetId: string, index: number) => {
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

      {/* User Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{selectedUser.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="text-sm text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Subscription Status</label>
                <p className="text-sm text-gray-900">{selectedUser.subscriptionStatus}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">AI Credits Balance</label>
                <p className="text-sm text-gray-900">${selectedUser.aiCreditsBalance || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Total Referrals</label>
                <p className="text-sm text-gray-900">{selectedUser.totalReferrals || 0}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}