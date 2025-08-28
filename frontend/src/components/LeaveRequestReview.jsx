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
  Clock, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  UserMinus,
  Calendar
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

export default function LeaveRequestReview({ group, onGroupUpdate }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [reviewAction, setReviewAction] = useState(null); // 'approve' or 'reject'

  const currentUserId = user?.id || user?._id;
  const isAdmin = group.members?.some(m => 
    (m.user._id || m.user) === currentUserId && (m.role === 'admin' || m.role === 'moderator')
  );
  const isCreator = group.createdBy?._id === currentUserId || group.createdBy === currentUserId;
  
  const canReviewRequests = isAdmin || isCreator;

  // Filter leave requests
  const pendingRequests = group.leaveRequests?.filter(request => request.status === 'pending') || [];
  const processedRequests = group.leaveRequests?.filter(request => request.status !== 'pending') || [];

  const handleReviewRequest = async () => {
    if (!selectedRequest || !reviewAction) return;

    setLoading(true);
    try {
      const response = await api.patch(`/api/groups/${group._id}/leave-requests/${selectedRequest._id}`, {
        action: reviewAction,
        adminNote: adminNote.trim() || undefined
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: `Leave request ${reviewAction}d successfully`,
        });
        setShowReviewDialog(false);
        setSelectedRequest(null);
        setAdminNote('');
        setReviewAction(null);
        onGroupUpdate?.();
      }
    } catch (error) {
      console.error('Error reviewing leave request:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || `Failed to ${reviewAction} leave request`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (request, action) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setAdminNote('');
    setShowReviewDialog(true);
  };

  if (!canReviewRequests) {
    return null; // Don't show component if user can't review requests
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            Leave Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingRequests.length} pending
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review and manage member leave requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequests.length === 0 && processedRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserMinus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leave requests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Pending Requests</h4>
                  {pendingRequests.map((request) => (
                    <div 
                      key={request._id} 
                      className="p-4 border rounded-lg bg-yellow-50 border-yellow-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${STATUS_COLORS.pending}`}>
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                            <span className="text-sm font-medium">
                              {request.user.name || request.user.email}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(request.requestedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">
                            <strong>Reason:</strong> {request.reason}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openReviewDialog(request, 'approve')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openReviewDialog(request, 'reject')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Processed Requests */}
              {processedRequests.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Recent Decisions ({processedRequests.length})
                  </h4>
                  {processedRequests.slice(0, 5).map((request) => {
                    const StatusIcon = STATUS_ICONS[request.status];
                    return (
                      <div 
                        key={request._id} 
                        className="p-3 border rounded-lg bg-card"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`${STATUS_COLORS[request.status]}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </Badge>
                              <span className="text-sm font-medium">
                                {request.user.name || request.user.email}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(request.reviewedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {request.reason}
                            </p>
                            {request.adminNote && (
                              <p className="text-sm text-blue-700 mt-1">
                                <strong>Admin note:</strong> {request.adminNote}
                              </p>
                            )}
                            {request.reviewedBy && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Reviewed by {request.reviewedBy.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Leave Request
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? `Are you sure you want to approve ${selectedRequest?.user.name}'s request to leave the group? They will lose access immediately.`
                : `Provide a reason for rejecting ${selectedRequest?.user.name}'s leave request.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 border rounded-lg">
              <p className="text-sm">
                <strong>Member:</strong> {selectedRequest?.user.name || selectedRequest?.user.email}
              </p>
              <p className="text-sm">
                <strong>Reason for leaving:</strong> {selectedRequest?.reason}
              </p>
              <p className="text-sm">
                <strong>Requested on:</strong> {selectedRequest && new Date(selectedRequest.requestedAt).toLocaleDateString()}
              </p>
            </div>

            <div>
              <Label htmlFor="adminNote">
                {reviewAction === 'approve' ? 'Optional note' : 'Reason for rejection *'}
              </Label>
              <Textarea
                id="adminNote"
                placeholder={
                  reviewAction === 'approve' 
                    ? "Add an optional note for this approval..."
                    : "Please explain why this request is being rejected..."
                }
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                maxLength={300}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {adminNote.length}/300 characters
              </div>
            </div>
            
            <div className={`p-3 border rounded-lg ${
              reviewAction === 'approve' 
                ? 'bg-red-50 border-red-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <p className={`text-sm ${
                reviewAction === 'approve' ? 'text-red-800' : 'text-blue-800'
              }`}>
                <strong>Note:</strong> {
                  reviewAction === 'approve'
                    ? 'Once approved, the member will be immediately removed from the group and lose access to all group data.'
                    : 'The member will be notified of the rejection and can submit a new request with updated information.'
                }
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowReviewDialog(false);
                setSelectedRequest(null);
                setAdminNote('');
                setReviewAction(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReviewRequest}
              disabled={loading || (reviewAction === 'reject' && !adminNote.trim())}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
              className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {loading ? 
                (reviewAction === 'approve' ? 'Approving...' : 'Rejecting...') : 
                (reviewAction === 'approve' ? 'Approve Request' : 'Reject Request')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
