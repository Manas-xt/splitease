import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Users, Share2, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

export default function GroupInvite({ groupId, isAdmin = false }) {
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchInviteData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/groups/${groupId}/invite`);
      if (response.data.success) {
        setInviteData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching invite data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invite details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${type} copied to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const shareInvite = async () => {
    if (!inviteData) return;
    
    const shareText = `Join my group "${inviteData.groupName}" on SplitEase!\n\nClick this link: ${inviteData.inviteLink}\n\nOr use invite code: ${inviteData.inviteCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${inviteData.groupName}`,
          text: shareText,
          url: inviteData.inviteLink
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyToClipboard(shareText, 'Invite message');
        }
      }
    } else {
      copyToClipboard(shareText, 'Invite message');
    }
  };

  if (!inviteData && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Group Invite
          </CardTitle>
          <CardDescription>
            Share this group with others
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchInviteData} className="w-full">
            <QrCode className="mr-2 h-4 w-4" />
            Get Invite Details
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-muted-foreground">Loading invite details...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Invite Members
        </CardTitle>
        <CardDescription>
          Share this code or link to invite people to {inviteData?.groupName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invite Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Share Link</label>
          <div className="flex gap-2">
            <div className="flex-1 p-2 bg-muted rounded-md text-sm font-mono break-all">
              {inviteData?.inviteLink}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(inviteData?.inviteLink, 'Invite link')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Invite Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Invite Code</label>
          <div className="flex gap-2">
            <div className="flex-1 p-2 bg-muted rounded-md font-mono text-center text-lg tracking-widest">
              {inviteData?.inviteCode}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(inviteData?.inviteCode, 'Invite code')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Group Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Group: {inviteData?.groupName}</span>
          <Badge variant="secondary">
            {inviteData?.memberCount} member{inviteData?.memberCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={shareInvite} className="flex-1">
            <Share2 className="mr-2 h-4 w-4" />
            Share Link
          </Button>
          <Button
            variant="outline"
            onClick={() => copyToClipboard(inviteData?.inviteLink, 'Invite link')}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <p className="font-medium mb-1">How to join:</p>
          <p>• Share the link above (easiest)</p>
          <p>• Or share the invite code</p>
          <p>• Recipients can click the link to join instantly</p>
        </div>
      </CardContent>
    </Card>
  );
}
