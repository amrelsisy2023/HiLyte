import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Users, 
  DollarSign, 
  Activity, 
  Settings,
  Plus,
  Minus,
  Search,
  Download,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  aiCreditsBalance: number;
  monthlyAiSpent: number;
  totalAiSpent: number;
  createdAt: string;
  lastLoginAt?: string;
}

interface CreditTransaction {
  id: number;
  userId: number;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [showCreditModal, setShowCreditModal] = useState(false);
  const { toast } = useToast();

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Fetch credit transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/admin/credit-transactions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/credit-transactions");
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
  });

  // Add credits mutation
  const addCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: number; amount: number; description: string }) => {
      const response = await apiRequest("POST", "/api/admin/add-credits", {
        userId,
        amount,
        description
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Credits Added",
        description: "AI credits have been successfully added to the user's account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-transactions"] });
      setShowCreditModal(false);
      setCreditAmount("");
      setCreditDescription("");
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add credits",
        variant: "destructive",
      });
    },
  });

  // Filter users based on search term
  const filteredUsers = users.filter((user: User) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const totalUsers = users.length;
  const totalCreditsBalance = users.reduce((sum: number, user: User) => sum + (user.aiCreditsBalance || 0), 0);
  const totalCreditsSpent = users.reduce((sum: number, user: User) => sum + (user.totalAiSpent || 0), 0);

  const handleAddCredits = (user: User) => {
    setSelectedUser(user);
    setShowCreditModal(true);
  };

  const handleSubmitCredits = () => {
    if (!selectedUser || !creditAmount || !creditDescription) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(creditAmount);
    if (isNaN(amount)) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    addCreditsMutation.mutate({
      userId: selectedUser.id,
      amount,
      description: creditDescription
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users and AI credit adjustments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Active platform users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCreditsBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across all user accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits Spent</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCreditsSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              All-time AI usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Management */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user accounts and AI credit balances
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Credits Balance</TableHead>
                <TableHead>Monthly Spent</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="font-mono">
                    ${(user.aiCreditsBalance || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono">
                    ${(user.monthlyAiSpent || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono">
                    ${(user.totalAiSpent || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddCredits(user)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Credits
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Credit Transactions</CardTitle>
          <CardDescription>
            Latest AI credit adjustments and purchases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 20).map((transaction: CreditTransaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {transaction.user ? `${transaction.user.firstName} ${transaction.user.lastName}` : 'Unknown'}
                    <div className="text-xs text-gray-500">{transaction.user?.email}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.type === 'purchase' ? 'bg-green-100 text-green-800' :
                      transaction.type === 'adjustment' ? 'bg-blue-100 text-blue-800' :
                      transaction.type === 'auto_purchase' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.type.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">
                    <span className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                      {transaction.amount > 0 ? '+' : ''}${transaction.amount.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">
                    ${transaction.balance.toFixed(2)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {transaction.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Credits Modal */}
      <Dialog open={showCreditModal} onOpenChange={setShowCreditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add AI Credits</DialogTitle>
            <DialogDescription>
              Add credits to {selectedUser?.firstName} {selectedUser?.lastName}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Credit Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="10.00"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                placeholder="Admin credit adjustment - promotional bonus"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSubmitCredits}
                disabled={addCreditsMutation.isPending}
                className="flex-1"
              >
                {addCreditsMutation.isPending ? "Adding..." : "Add Credits"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreditModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}