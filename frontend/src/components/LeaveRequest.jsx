import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { 
  LogOut, 
  Clock, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300'
};

export default function LeaveRequest({ group, onGroupUpdate }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showQuickLeaveDialog, setShowQuickLeaveDialog] = useState(false);
  const [userExpenses, setUserExpenses] = useState([]);
  const [unsettledAmount, setUnsettledAmount] = useState(0);

  const currentUserId = user?.id || user?._id;
  const isCreator = group.createdBy?._id === currentUserId || group.createdBy === currentUserId;

  // Calculate user's unsettled expenses
  useEffect(() => {
    const calculateUnsettledExpenses = async () => {
      try {
        const response = await api.get(`/api/expenses/groups/${group._id}`);
        if (response.data.success) {
          const expenses = response.data.data;
          
          // Find expenses where current user owes money
          const userUnsettledExpenses = expenses.filter(expense => {
            const userSplit = expense.splitBetween?.find(split => 
              (split.user._id || split.user) === currentUserId
            );
            return userSplit && !userSplit.settled && expense.paidBy?._id !== currentUserId;
          });

          const totalUnsettled = userUnsettledExpenses.reduce((sum, expense) => {
            const userSplit = expense.splitBetween?.find(split => 
              (split.user._id || split.user) === currentUserId
            );
            return sum + (userSplit?.amount || 0);
          }, 0);

          setUserExpenses(userUnsettledExpenses);
          setUnsettledAmount(totalUnsettled);
        }
      } catch (error) {
        console.error('Error calculating unsettled expenses:', error);
      }
    };

    if (group._id && currentUserId) {
      calculateUnsettledExpenses();
    }
  }, [group._id, currentUserId]);

  // Find user's pending leave request
  const userLeaveRequest = group.leaveRequests?.find(request => 
    (request.user._id || request.user) === currentUserId && request.status === 'pending'
  );

  // Find user's processed leave requests
  const processedRequests = group.leaveRequests?.filter(request => 
    (request.user._id || request.user) === currentUserId && request.status !== 'pending'
  ) || [];

  const handleQuickLeave = async (reason) => {
    setLoading(true);
    try {
      const response = await api.post(`/api/groups/${group._id}/leave-request`, {
        reason: reason
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: response.data.message,
        });
        setShowQuickLeaveDialog(false);
        onGroupUpdate?.();
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit leave request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLeaveRequest = async () => {
    if (!leaveReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for leaving the group',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/api/groups/${group._id}/leave-request`, {
        reason: leaveReason.trim()
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: response.data.message,
        });
        setShowLeaveDialog(false);
        setLeaveReason('');
        onGroupUpdate?.();
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit leave request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLeaveRequest = async () => {
    if (!userLeaveRequest) return;

    setLoading(true);
    try {
      const response = await api.delete(`/api/groups/${group._id}/leave-requests/${userLeaveRequest._id}`);

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Leave request cancelled successfully',
        });
        setShowCancelDialog(false);
        onGroupUpdate?.();
      }
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to cancel leave request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Leave Group
          </CardTitle>
          <CardDescription>
            Request to leave this group with a reason
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCreator ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-3">
                As the group creator, you cannot request to leave. You have two options:
              </p>
              <ul className="text-xs text-blue-700 space-y-1 mb-3">
                <li>• Transfer ownership to another member, then request to leave</li>
                <li>• Delete the entire group permanently (see Danger Zone below)</li>
              </ul>
              <p className="text-xs text-blue-600">
                💡 Tip: Look for the "Danger Zone" section at the bottom of this page to delete the group.
              </p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-gray-50 border rounded-lg text-sm text-gray-700">
                <h4 className="font-medium mb-2">What happens when you leave:</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Your leave request will be reviewed by group admins</li>
                  <li>• Once approved, you'll lose access to all group data</li>
                  <li>• Your expense history will remain for other members</li>
                  <li>• You can rejoin only if invited again</li>
                </ul>
              </div>

              {/* Unsettled Expenses Warning */}
              {unsettledAmount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="text-amber-600 mt-0.5">⚠️</div>
                    <div className="text-sm">
                      <h4 className="font-medium text-amber-800 mb-1">Unsettled Expenses</h4>
                      <p className="text-amber-700">
                        You have ₹{unsettledAmount.toFixed(2)} in unsettled expenses across {userExpenses.length} expense{userExpenses.length !== 1 ? 's' : ''}. 
                        Consider settling these first before leaving the group.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {userLeaveRequest ? (
                <div className="space-y-3">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-yellow-800">Pending Leave Request</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Submitted on {new Date(userLeaveRequest.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={`${STATUS_COLORS.pending}`}>
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-yellow-700">
                        <strong>Reason:</strong> {userLeaveRequest.reason}
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCancelDialog(true)}
                    disabled={loading}
                    className="w-full"
                  >
                    Cancel Leave Request
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button 
                    onClick={() => setShowLeaveDialog(true)}
                    variant="destructive"
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Request to Leave Group
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">Quick leave options:</p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleQuickLeave("No longer needed")}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        className="flex-1"
                      >
                        Not needed
                      </Button>
                      <Button 
                        onClick={() => handleQuickLeave("Moving to different group")}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        className="flex-1"
                      >
                        Different group
                      </Button>
                      <Button 
                        onClick={() => handleQuickLeave("Personal reasons")}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        className="flex-1"
                      >
                        Personal
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Show processed requests history */}
          {processedRequests.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Previous Requests</h4>
              {processedRequests.slice(0, 3).map((request) => {
                const StatusIcon = STATUS_ICONS[request.status];
                return (
                  <div 
                    key={request._id} 
                    className="p-3 border rounded-lg bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`${STATUS_COLORS[request.status]}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(request.reviewedAt || request.requestedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{request.reason}</p>
                        {request.adminNote && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Admin note:</strong> {request.adminNote}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Request Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to Leave Group</DialogTitle>
            <DialogDescription>
              Please provide a reason for wanting to leave "{group.name}". This request will be reviewed by group admins.
              {unsettledAmount > 0 && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                  ⚠️ Note: You have ₹{unsettledAmount.toFixed(2)} in unsettled expenses.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason for leaving *</Label>
              <Textarea
                id="reason"
                placeholder="Please explain why you want to leave this group..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {leaveReason.length}/500 characters
              </div>
            </div>
            
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Once your request is approved, you will lose access to all group data and expenses. This action cannot be undone.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowLeaveDialog(false);
                setLeaveReason('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitLeaveRequest}
              disabled={loading || !leaveReason.trim()}
              variant="destructive"
            >
              {loading ? 'Submitting...' : 'Submit Leave Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Request Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Leave Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your pending leave request? You can submit a new request later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelLeaveRequest}
              disabled={loading}
            >
              {loading ? 'Cancelling...' : 'Cancel Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
