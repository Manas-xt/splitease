import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
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
  MoreVertical, 
  UserMinus, 
  Crown, 
  Shield, 
  User, 
  Settings,
  LogOut,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';

const ROLE_ICONS = {
  admin: Crown,
  moderator: Shield,
  member: User
};

const ROLE_COLORS = {
  admin: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  moderator: 'bg-blue-100 text-blue-800 border-blue-300',
  member: 'bg-gray-100 text-gray-800 border-gray-300'
};

const ROLE_LABELS = {
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Member'
};

export default function GroupMembers({ group, onGroupUpdate }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removeReason, setRemoveReason] = useState('');
  const [newOwnerId, setNewOwnerId] = useState('');

  const currentUserId = user?.id || user?._id;
  const currentUserMember = group.members?.find(m => {
    const memberId = m.user._id || m.user;
    return memberId === currentUserId;
  });

  const isCreator = group.createdBy?._id === currentUserId || group.createdBy === currentUserId;
  const isAdmin = currentUserMember?.role === 'admin';
  const isModerator = currentUserMember?.role === 'moderator';
  const canRemoveMembers = currentUserMember?.permissions?.canRemoveMembers;

  const canRemoveMember = (member) => {
    const memberId = member.user._id || member.user;
    const isSelf = memberId === currentUserId;
    
    if (isSelf) return true; // Can always leave
    if (isCreator) return memberId !== currentUserId; // Creator can remove anyone except themselves
    if (isAdmin) return member.role === 'member' || member.role === 'moderator';
    if (isModerator) return member.role === 'member';
    if (canRemoveMembers) return member.role === 'member';
    
    return false;
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setLoading(true);
    try {
      const memberId = memberToRemove.user._id || memberToRemove.user;
      const response = await api.delete(`/api/groups/${group._id}/members/${memberId}`, {
        data: { reason: removeReason.trim() || undefined }
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: response.data.message,
        });

        // If group was deleted or user left, handle accordingly
        if (response.data.groupDeleted || memberId === currentUserId) {
          // Navigate away or refresh page
          window.location.href = '/groups';
        } else {
          // Update group data
          onGroupUpdate?.();
        }
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove member',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowRemoveDialog(false);
      setMemberToRemove(null);
      setRemoveReason('');
    }
  };

  const handleTransferOwnership = async () => {
    if (!newOwnerId) return;

    setLoading(true);
    try {
      const response = await api.patch(`/api/groups/${group._id}/transfer-ownership`, {
        newOwnerId
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: response.data.message,
        });
        onGroupUpdate?.();
      }
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to transfer ownership',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowTransferDialog(false);
      setNewOwnerId('');
    }
  };

  const openRemoveDialog = (member) => {
    setMemberToRemove(member);
    setShowRemoveDialog(true);
  };

  const getMemberActions = (member) => {
    const memberId = member.user._id || member.user;
    const isSelf = memberId === currentUserId;
    const actions = [];

    if (canRemoveMember(member)) {
      actions.push({
        label: isSelf ? 'Leave Group' : 'Remove Member',
        icon: isSelf ? LogOut : UserMinus,
        onClick: () => openRemoveDialog(member),
        variant: 'destructive'
      });
    }

    return actions;
  };

  if (!group.members || group.members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Members</CardTitle>
          <CardDescription>No members in this group</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Group Members</CardTitle>
              <CardDescription>
                {group.members.length} member{group.members.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            {isCreator && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowTransferDialog(true)}
              >
                <Crown className="h-4 w-4 mr-2" />
                Transfer Ownership
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {group.members.map((member) => {
              const memberId = member.user._id || member.user;
              const isSelf = memberId === currentUserId;
              const isGroupCreator = memberId === (group.createdBy?._id || group.createdBy);
              const RoleIcon = ROLE_ICONS[member.role] || User;
              const actions = getMemberActions(member);

              return (
                <div
                  key={memberId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user.avatar} />
                      <AvatarFallback>
                        {member.user.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.user.name || 'Unknown User'}
                          {isSelf && <span className="text-muted-foreground ml-1">(You)</span>}
                        </span>
                        {isGroupCreator && (
                          <Badge variant="outline" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Creator
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${ROLE_COLORS[member.role] || ROLE_COLORS.member}`}
                        >
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {ROLE_LABELS[member.role] || 'Member'}
                        </Badge>
                        
                        {member.joinedAt && (
                          <span className="text-xs text-muted-foreground">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {actions.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action, index) => (
                          <DropdownMenuItem
                            key={index}
                            onClick={action.onClick}
                            className={action.variant === 'destructive' ? 'text-destructive' : ''}
                          >
                            <action.icon className="h-4 w-4 mr-2" />
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Remove Member Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {memberToRemove?.user._id === currentUserId ? 'Leave Group' : 'Remove Member'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.user._id === currentUserId 
                ? 'Are you sure you want to leave this group? You will lose access to all group data and expenses.'
                : `Are you sure you want to remove ${memberToRemove?.user.name} from this group? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter a reason for this action..."
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Processing...' : (memberToRemove?.user._id === currentUserId ? 'Leave Group' : 'Remove Member')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Group Ownership</DialogTitle>
            <DialogDescription>
              Select a new owner for this group. The new owner will have full control over the group.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>New Owner</Label>
              <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member to transfer ownership to" />
                </SelectTrigger>
                <SelectContent>
                  {group.members
                    .filter(m => (m.user._id || m.user) !== currentUserId)
                    .map(member => (
                      <SelectItem key={member.user._id || member.user} value={member.user._id || member.user}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.user.avatar} />
                            <AvatarFallback>
                              {member.user.name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.user.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {ROLE_LABELS[member.role]}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransferOwnership}
              disabled={loading || !newOwnerId}
            >
              {loading ? 'Transferring...' : 'Transfer Ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
