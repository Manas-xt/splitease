import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, ArrowLeft, UserPlus, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

export default function JoinGroup() {
  const { inviteCode: urlInviteCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  // Get invite code from URL parameter or query parameter
  const inviteCode = urlInviteCode || searchParams.get('code');

  useEffect(() => {
    if (inviteCode) {
      fetchGroupInfo();
    } else {
      setLoading(false);
      toast({
        title: 'Error',
        description: 'No invite code provided',
        variant: 'destructive',
      });
    }
  }, [inviteCode]);

  const fetchGroupInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/groups/info/${inviteCode}`);
      if (response.data.success) {
        setGroupInfo(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching group info:', error);
      toast({
        title: 'Error',
        description: 'Invalid or expired invite link',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    try {
      setJoining(true);
      const response = await api.post(`/api/groups/join/${inviteCode}`);
      
      if (response.data.success) {
        // All joins now create requests that need admin approval
        toast({
          title: 'Request Sent',
          description: response.data.message,
        });
        
        // Redirect to groups page
        setTimeout(() => {
          navigate('/groups');
        }, 2000);
      }
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to join group',
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  const getGroupTypeIcon = (type) => {
    const icons = {
      trip: '✈️',
      household: '🏠',
      project: '💼',
      event: '🎉',
      roommates: '🏠',
      general: '📋'
    };
    return icons[type] || '📋';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading group details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Invite</CardTitle>
            <CardDescription>
              This invite link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/groups')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Groups
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Successfully Joined!</CardTitle>
            <CardDescription>
              Welcome to {groupInfo.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              Redirecting to group details...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full animate-pulse w-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto text-4xl mb-4">
            {getGroupTypeIcon(groupInfo.groupType)}
          </div>
          <CardTitle className="text-xl">{groupInfo.name}</CardTitle>
          <CardDescription>
            {groupInfo.description || 'Join this group to start splitting expenses'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Group Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Group Type</span>
              <Badge variant="outline" className="capitalize">
                {groupInfo.groupType}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Members</span>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{groupInfo.memberCount}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(groupInfo.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            {groupInfo.createdBy && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created by</span>
                <span>{groupInfo.createdBy}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground text-center bg-blue-50 p-3 rounded-lg border">
              <p>📋 Your join request will be sent to the group admins for approval.</p>
            </div>
            
            <Button 
              onClick={handleJoinGroup} 
              disabled={joining}
              className="w-full"
            >
              {joining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Joining...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Join {groupInfo.name}
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/groups')}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Groups
            </Button>
          </div>

          {/* Invite Code */}
          <div className="text-center text-xs text-muted-foreground border-t pt-4">
            <p>Invite Code: <span className="font-mono">{groupInfo.inviteCode}</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
