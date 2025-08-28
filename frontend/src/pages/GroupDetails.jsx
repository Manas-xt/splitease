import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, IndianRupee, Users, Edit, Trash2 } from 'lucide-react';
import api from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';
import GroupInvite from '@/components/GroupInvite';
import JoinRequests from '@/components/JoinRequests';
import ExpenseForm from '@/components/ExpenseForm';
import GroupMembers from '@/components/GroupMembers';
import LeaveRequest from '@/components/LeaveRequest';
import LeaveRequestReview from '@/components/LeaveRequestReview';
import GroupDelete from '@/components/GroupDelete';
import GroupBalances from '@/components/GroupBalances';
import BalanceSummary from '@/components/BalanceSummary';
import GroupShare from '@/components/GroupShare';

function GroupDetails() {
  const { groupId } = useParams();
  const { socket, joinGroup, subscribeToGroupUpdates } = useSocket();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGroupData();
    joinGroup(groupId);

    const unsubscribe = subscribeToGroupUpdates(groupId, (data) => {
      if (data.group) setGroup(data.group);
      if (data.expenses) setExpenses(data.expenses);
      if (data.balances) setBalances(data.balances);
    });

    return () => {
      // Safely call unsubscribe if it exists and is a function
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [groupId, joinGroup, subscribeToGroupUpdates]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const [groupResponse, expensesResponse] = await Promise.all([
        api.get(`/api/groups/${groupId}`),
        api.get(`/api/expenses/groups/${groupId}`),
      ]);

      console.log('Group response:', groupResponse.data);
      console.log('Expenses response:', expensesResponse.data);

      // Handle group data
      if (groupResponse.data.success) {
        const groupData = groupResponse.data.data;
        if (groupData && groupData.group) {
          setGroup(groupData.group);
          setBalances(groupData.balances || {});
        }
      }
      
      // Handle expenses data
      setExpenses(expensesResponse.data.data || []);
    } catch (error) {
      console.error('Error fetching group data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (expenseData) => {
    try {
      const response = await api.post(`/api/expenses/groups/${groupId}`, expenseData);

      if (response.data.success) {
        fetchGroupData();
        toast({
          title: 'Success',
          description: 'Expense added successfully',
        });
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add expense',
        variant: 'destructive',
      });
      throw error; // Re-throw to handle in ExpenseForm
    }
  };

  const handleEditExpense = async (expenseId, expenseData) => {
    try {
      const response = await api.put(`/api/expenses/${expenseId}`, expenseData);

      if (response.data.success) {
        fetchGroupData();
        toast({
          title: 'Success',
          description: 'Expense updated successfully',
        });
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update expense',
        variant: 'destructive',
      });
      throw error; // Re-throw to handle in ExpenseForm
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const response = await api.delete(`/api/expenses/${expenseId}`);

      if (response.data.success) {
        fetchGroupData();
        toast({
          title: 'Success',
          description: 'Expense deleted successfully',
        });
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete expense',
        variant: 'destructive',
      });
    }
  };

  const getCurrentUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      return user.id || user._id;
    } catch {
      return null;
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!group) {
    return <div>Group not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground">{group.description}</p>
          {group.createdBy && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Created by {group.createdBy.name}</span>
              <span>•</span>
              <span>{new Date(group.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <GroupShare group={group} />
          <Button onClick={() => setShowAddExpense(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Expense Forms */}
      <ExpenseForm
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
        group={group}
        onSubmit={handleAddExpense}
        isEditing={false}
      />

      <ExpenseForm
        open={showEditExpense}
        onOpenChange={setShowEditExpense}
        group={group}
        expense={editingExpense}
        onSubmit={(expenseData) => handleEditExpense(editingExpense._id, expenseData)}
        isEditing={true}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <GroupMembers group={group} onGroupUpdate={fetchGroupData} />

        <LeaveRequest group={group} onGroupUpdate={fetchGroupData} />

        <BalanceSummary 
          balances={balances} 
          currentUserId={getCurrentUserId()} 
          members={group.members} 
        />
      </div>

      {/* Balance and Settlement Information */}
      <GroupBalances group={group} onUpdate={fetchGroupData} />

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Latest expenses in this group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expenses.slice(0, 5).map((expense) => {
                const currentUserId = getCurrentUserId();
                const isCreator = expense.paidBy?._id === currentUserId;
                const isAdmin = group.members?.some(m => 
                  m.user._id === currentUserId && (m.role === 'admin' || m.role === 'moderator')
                );
                const canEdit = isCreator || isAdmin;

                return (
                  <div
                    key={expense._id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {expense.category === 'food' ? '🍽️' :
                           expense.category === 'travel' ? '✈️' :
                           expense.category === 'shopping' ? '🛍️' :
                           expense.category === 'utilities' ? '💡' :
                           expense.category === 'entertainment' ? '🎭' :
                           expense.category === 'health' ? '💊' :
                           expense.category === 'education' ? '📚' :
                           expense.category === 'gifts' ? '🎁' : '📄'}
                        </span>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {expense.category} • {new Date(expense.date).toLocaleDateString()}
                            {expense.splitMethod && expense.splitMethod !== 'equal' && (
                              <> • {expense.splitMethod} split</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium">₹{expense.amount.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          Paid by {expense.paidBy?.name}
                        </p>
                        {/* Show current user's share */}
                        {(() => {
                          const userSplit = expense.splitBetween?.find(split => 
                            (split.user._id || split.user) === currentUserId
                          );
                          if (userSplit) {
                            return (
                              <div className={`text-xs mt-1 ${
                                userSplit.settled ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                Your share: ₹{userSplit.amount?.toFixed(2)}
                                {userSplit.settled ? ' ✓' : ' (pending)'}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingExpense(expense);
                              setShowEditExpense(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Quick settle button for current user */}
                      {(() => {
                        const userSplit = expense.splitBetween?.find(split => 
                          (split.user._id || split.user) === currentUserId
                        );
                        if (userSplit && !userSplit.settled && expense.paidBy?._id !== currentUserId) {
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const response = await api.patch(`/api/expenses/${expense._id}/settle`, {
                                    userId: currentUserId
                                  });
                                  if (response.data.success) {
                                    toast({
                                      title: 'Success',
                                      description: 'Expense marked as settled',
                                    });
                                    fetchGroupData();
                                  }
                                } catch (error) {
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to mark as settled',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                              className="text-xs"
                            >
                              Mark Paid
                            </Button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                );
              })}
              {expenses.length === 0 && (
                <p className="text-muted-foreground">No expenses yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Sections */}
      {(group.members?.some(m => 
        m.user._id === getCurrentUserId() && (m.role === 'admin' || m.role === 'moderator')
      ) || group.createdBy?._id === getCurrentUserId() || group.createdBy === getCurrentUserId()) && (
        <div className="mt-6 space-y-6">
          {/* Leave Request Review for Admins/Creators */}
          <LeaveRequestReview 
            group={group} 
            onGroupUpdate={fetchGroupData}
          />
          
          {/* Join Requests */}
          <JoinRequests 
            groupId={groupId} 
            isAdmin={true}
          />
          
          {/* Group Invite */}
          <GroupInvite 
            groupId={groupId} 
            isAdmin={true}
          />
        </div>
      )}

      {/* Group Creator Only - Delete Group */}
      {group.createdBy?._id === getCurrentUserId() || group.createdBy === getCurrentUserId() ? (
        <div className="mt-6">
          <GroupDelete group={group} />
        </div>
      ) : null}
    </div>
  );
}

export default GroupDetails; 