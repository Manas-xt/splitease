import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  DollarSign,
  Users,
  Receipt,
  CheckCircle,
  Clock,
  Calculator
} from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function GroupBalances({ group, onUpdate }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balances, setBalances] = useState({});
  const [settlements, setSettlements] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);

  const currentUserId = user?.id || user?._id;

  useEffect(() => {
    fetchBalanceData();
  }, [group._id]);

  const fetchBalanceData = async () => {
    try {
      setLoading(true);
      const [balanceResponse, settlementResponse, expenseResponse] = await Promise.all([
        api.get(`/api/groups/${group._id}`),
        api.get(`/api/expenses/groups/${group._id}/settlements`),
        api.get(`/api/expenses/groups/${group._id}`)
      ]);

      if (balanceResponse.data.success) {
        setBalances(balanceResponse.data.data.balances || {});
      }

      if (settlementResponse.data.success) {
        setSettlements(settlementResponse.data.data || []);
      }

      if (expenseResponse.data.success) {
        setExpenses(expenseResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching balance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load balance information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSettled = async (expenseId, userId) => {
    try {
      setSettling(true);
      const response = await api.patch(`/api/expenses/${expenseId}/settle`, {
        userId: userId
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Expense marked as settled',
        });
        fetchBalanceData(); // Refresh data
        onUpdate?.(); // Update parent component
      }
    } catch (error) {
      console.error('Error settling expense:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to mark as settled',
        variant: 'destructive',
      });
    } finally {
      setSettling(false);
    }
  };

  // Find member name by ID
  const getMemberName = (userId) => {
    const member = group.members?.find(m => 
      (m.user._id || m.user) === userId
    );
    return member?.user?.name || member?.user?.email || 'Unknown';
  };

  // Get current user's balance
  const currentUserBalance = balances[currentUserId] || 0;

  // Get expenses where current user owes money
  const userOwedExpenses = expenses.filter(expense => {
    const userSplit = expense.splitBetween?.find(split => 
      (split.user._id || split.user) === currentUserId
    );
    return userSplit && !userSplit.settled && expense.paidBy?._id !== currentUserId;
  });

  // Get expenses where current user is owed money
  const userOwingExpenses = expenses.filter(expense => {
    if (expense.paidBy?._id !== currentUserId) return false;
    return expense.splitBetween?.some(split => 
      !split.settled && (split.user._id || split.user) !== currentUserId
    );
  });

  // Calculate who owes current user money
  const whoOwesCurrentUser = settlements.filter(settlement => 
    settlement.to === currentUserId
  );

  // Calculate whom current user owes money to
  const currentUserOwes = settlements.filter(settlement => 
    settlement.from === currentUserId
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading balances...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current User Balance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Your Balance Summary
          </CardTitle>
          <CardDescription>
            Your financial position in this group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {currentUserBalance > 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : currentUserBalance < 0 ? (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                ) : (
                  <DollarSign className="h-6 w-6 text-gray-600" />
                )}
                <span className={`text-3xl font-bold ${
                  currentUserBalance > 0 ? 'text-green-600' : 
                  currentUserBalance < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  ₹{Math.abs(currentUserBalance).toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentUserBalance > 0 ? 'You are owed this much' : 
                 currentUserBalance < 0 ? 'You owe this much' : 'You are settled up'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Balance Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Balance Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="settlements" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="settlements">Settlements</TabsTrigger>
              <TabsTrigger value="you-owe">You Owe</TabsTrigger>
              <TabsTrigger value="owed-to-you">Owed to You</TabsTrigger>
              <TabsTrigger value="all-balances">All Members</TabsTrigger>
            </TabsList>

            {/* Suggested Settlements */}
            <TabsContent value="settlements" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Recommended transactions to settle all balances efficiently
              </div>
              {settlements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>All balances are settled!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {settlements.map((settlement, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        settlement.from === currentUserId || settlement.to === currentUserId 
                          ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <span className="font-medium">{getMemberName(settlement.from)}</span>
                          <ArrowRight className="h-4 w-4 mx-2 inline" />
                          <span className="font-medium">{getMemberName(settlement.to)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">₹{settlement.amount}</div>
                        {(settlement.from === currentUserId || settlement.to === currentUserId) && (
                          <Badge variant="secondary" className="text-xs">
                            Involves You
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* You Owe */}
            <TabsContent value="you-owe" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Expenses where you owe money to others
              </div>
              {currentUserOwes.length === 0 && userOwedExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>You don't owe anyone money!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOwedExpenses.map((expense) => {
                    const userSplit = expense.splitBetween?.find(split => 
                      (split.user._id || split.user) === currentUserId
                    );
                    return (
                      <div key={expense._id} className="p-4 border rounded-lg bg-red-50 border-red-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Receipt className="h-4 w-4 text-red-600" />
                              <span className="font-medium">{expense.description}</span>
                              <Badge variant="outline" className="text-xs">
                                {expense.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Paid by {expense.paidBy?.name} • {new Date(expense.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-600">
                              ₹{userSplit?.amount?.toFixed(2)}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkSettled(expense._id, currentUserId)}
                              disabled={settling}
                              className="mt-1"
                            >
                              {settling ? <Clock className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                              Mark Paid
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Owed to You */}
            <TabsContent value="owed-to-you" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Money that others owe you
              </div>
              {whoOwesCurrentUser.length === 0 && userOwingExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No one owes you money</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOwingExpenses.map((expense) => (
                    <div key={expense._id} className="p-4 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{expense.description}</span>
                          <Badge variant="outline" className="text-xs">
                            {expense.category}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {expense.splitBetween?.filter(split => 
                          !split.settled && (split.user._id || split.user) !== currentUserId
                        ).map((split, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                            <span className="text-sm">{split.user.name || split.user.email}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-green-600">
                                ₹{split.amount?.toFixed(2)}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkSettled(expense._id, split.user._id || split.user)}
                                disabled={settling}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* All Members Balance */}
            <TabsContent value="all-balances" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Overall balance for each group member
              </div>
              <div className="space-y-3">
                {group.members?.map((member) => {
                  const memberId = member.user._id || member.user;
                  const balance = balances[memberId] || 0;
                  const isCurrentUser = memberId === currentUserId;
                  
                  return (
                    <div 
                      key={memberId} 
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        isCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {(member.user.name || member.user.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {member.user.name || member.user.email}
                            {isCurrentUser && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {member.role === 'admin' ? 'Admin' : 'Member'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-lg ${
                          balance > 0 ? 'text-green-600' : 
                          balance < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {balance > 0 ? '+' : ''}₹{balance.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {balance > 0 ? 'Gets back' : balance < 0 ? 'Owes' : 'Settled'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
