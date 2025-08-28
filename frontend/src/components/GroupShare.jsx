import React, { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Share2, 
  Copy, 
  Mail, 
  MessageSquare,
  QrCode,
  Link,
  Users,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';

export default function GroupShare({ group }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const currentUserId = user?.id || user?._id;
  const isMember = group.members?.some(m => (m.user._id || m.user) === currentUserId);

  // Generate share link (you might want to make this configurable)
  const shareLink = `${window.location.origin}/join-group?code=${group.inviteCode || group._id}`;
  
  // Default message
  const defaultMessage = `Hey! I'd like to invite you to join our expense group "${group.name}" on SplitEase. It's a great way to track and split shared expenses.`;

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: 'Link copied to clipboard',
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: 'Copied!',
          description: 'Link copied to clipboard',
        });
      } catch (fallbackError) {
        toast({
          title: 'Error',
          description: 'Failed to copy link',
          variant: 'destructive',
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Join "${group.name}" on SplitEase`);
    const body = encodeURIComponent(
      `${customMessage || defaultMessage}\n\nClick here to join: ${shareLink}\n\nGroup Details:\n- Name: ${group.name}\n- Description: ${group.description || 'No description'}\n- Members: ${group.members?.length || 0}\n\nSplitEase makes it easy to track shared expenses and settle balances fairly.`
    );
    
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `${customMessage || defaultMessage}\n\n${shareLink}\n\n📊 Group: ${group.name}\n👥 Members: ${group.members?.length || 0}`
    );
    
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareViaSMS = () => {
    const message = encodeURIComponent(
      `${customMessage || defaultMessage}\n\n${shareLink}`
    );
    
    window.open(`sms:?body=${message}`, '_blank');
  };

  const shareViaWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join "${group.name}" on SplitEase`,
          text: customMessage || defaultMessage,
          url: shareLink,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast({
            title: 'Error',
            description: 'Failed to share via system dialog',
            variant: 'destructive',
          });
        }
      }
    } else {
      copyToClipboard(shareLink);
    }
  };

  const generateQRCode = () => {
    // Using QR Server API for simplicity
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareLink)}`;
    window.open(qrUrl, '_blank');
  };

  // Don't show to non-members
  if (!isMember) {
    return null;
  }

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setShowShareDialog(true)}
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share Group
      </Button>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share "{group.name}"
            </DialogTitle>
            <DialogDescription>
              Invite others to join your expense group
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Group Info */}
            <div className="p-3 bg-gray-50 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{group.name}</h4>
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {group.members?.length || 0}
                </Badge>
              </div>
              {group.description && (
                <p className="text-sm text-muted-foreground">{group.description}</p>
              )}
            </div>

            {/* Share Link */}
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={shareLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(shareLink)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Custom Message */}
            <div className="space-y-2">
              <Label htmlFor="customMessage">
                Custom Message (Optional)
              </Label>
              <Textarea
                id="customMessage"
                placeholder={defaultMessage}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground">
                {customMessage.length}/500 characters
              </div>
            </div>

            {/* Share Options */}
            <div className="space-y-3">
              <Label>Share Via</Label>
              
              <div className="grid grid-cols-2 gap-2">
                {/* Native Share (if supported) */}
                {navigator.share && (
                  <Button
                    variant="outline"
                    onClick={shareViaWebShare}
                    className="flex items-center gap-2 justify-start"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                )}

                {/* Copy Link */}
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(
                    `${customMessage || defaultMessage}\n\n${shareLink}`
                  )}
                  className="flex items-center gap-2 justify-start"
                >
                  <Copy className="h-4 w-4" />
                  Copy All
                </Button>

                {/* Email */}
                <Button
                  variant="outline"
                  onClick={shareViaEmail}
                  className="flex items-center gap-2 justify-start"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>

                {/* WhatsApp */}
                <Button
                  variant="outline"
                  onClick={shareViaWhatsApp}
                  className="flex items-center gap-2 justify-start"
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </Button>

                {/* SMS */}
                <Button
                  variant="outline"
                  onClick={shareViaSMS}
                  className="flex items-center gap-2 justify-start"
                >
                  <MessageSquare className="h-4 w-4" />
                  SMS
                </Button>

                {/* QR Code */}
                <Button
                  variant="outline"
                  onClick={generateQRCode}
                  className="flex items-center gap-2 justify-start"
                >
                  <QrCode className="h-4 w-4" />
                  QR Code
                </Button>
              </div>
            </div>

            {/* Tips */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Sharing Tips</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Share the link to let others join instantly</li>
                <li>• Use QR codes for easy mobile sharing</li>
                <li>• Customize the message to explain the group purpose</li>
                <li>• Members can also invite others using this feature</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowShareDialog(false);
                setCustomMessage('');
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
