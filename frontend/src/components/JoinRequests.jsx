import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Check, X, Clock, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/contexts/SocketContext';
import api from '@/lib/axios';

export default function JoinRequests({ groupId, isAdmin = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState({});
  const { toast } = useToast();
  const { subscribeToJoinRequests } = useSocket();

  const fetchJoinRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/groups/${groupId}/join-requests`);
      if (response.data.success) {
        setRequests(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load join requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, toast]);

  // Initial fetch
  useEffect(() => {
    if (isAdmin && groupId) {
      fetchJoinRequests();
    }
  }, [groupId, isAdmin, fetchJoinRequests]);

  // Socket subscription (separate effect)
  useEffect(() => {
    if (isAdmin && groupId && subscribeToJoinRequests) {
      const unsubscribe = subscribeToJoinRequests(groupId, () => {
        // Refresh the join requests list when a new request is received
        fetchJoinRequests();
      });
      
      return unsubscribe;
    }
  }, [groupId, isAdmin, subscribeToJoinRequests, fetchJoinRequests]);

  const handleRequest = async (requestId, action) => {
    try {
      setProcessing(prev => ({ ...prev, [requestId]: action }));
      
      const response = await api.patch(`/api/groups/${groupId}/join-requests/${requestId}`, {
        action
      });
      
      if (response.data.success) {
        // Remove the processed request from the list
        setRequests(prev => prev.filter(req => req._id !== requestId));
        
        toast({
          title: 'Success',
          description: response.data.message,
        });
      }
    } catch (error) {
      console.error('Error handling join request:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || `Failed to ${action} request`,
        variant: 'destructive',
      });
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: false }));
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-muted-foreground">Loading join requests...</div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Join Requests
          </CardTitle>
          <CardDescription>
            Manage requests to join this group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pending join requests</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Join Requests
          {requests.length > 0 && (
            <Badge variant="secondary">{requests.length} pending</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Review and manage requests to join this group
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request._id} className="border rounded-lg p-4 space-y-3">
              {/* User Info */}
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={request.user.profilePicture} />
                  <AvatarFallback>
                    {request.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-medium">{request.user.name}</h4>
                  <p className="text-sm text-muted-foreground">{request.user.email}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(request.requestedAt).toLocaleDateString()}
                </Badge>
              </div>

              {/* Message */}
              {request.message && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Message:</p>
                      <p className="text-sm text-muted-foreground">{request.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleRequest(request._id, 'approve')}
                  disabled={processing[request._id]}
                  className="flex-1"
                >
                  {processing[request._id] === 'approve' ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Approving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRequest(request._id, 'reject')}
                  disabled={processing[request._id]}
                  className="flex-1"
                >
                  {processing[request._id] === 'reject' ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
