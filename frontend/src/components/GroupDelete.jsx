import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Trash2, 
  AlertTriangle,
  Users,
  Receipt
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';

export default function GroupDelete({ group }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const currentUserId = user?.id || user?._id;
  const isCreator = group.createdBy?._id === currentUserId || group.createdBy === currentUserId;

  const handleDeleteGroup = async () => {
    if (confirmText.toLowerCase() !== 'delete') {
      toast({
        title: 'Invalid Confirmation',
        description: 'Please type "delete" to confirm',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.delete(`/api/groups/${group._id}`, {
        data: { confirmText }
      });

      if (response.data.success) {
        toast({
          title: 'Group Deleted',
          description: response.data.message,
        });
        
        // Navigate to groups list after short delay
        setTimeout(() => {
          navigate('/groups');
        }, 1500);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete group',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
      setConfirmText('');
    }
  };

  // Only show to group creator
  if (!isCreator) {
    return null;
  }

  return (
    <>
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-700">
            Permanently delete this group and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-100 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <h4 className="font-medium mb-2">Warning: This action cannot be undone</h4>
                <ul className="space-y-1 text-xs">
                  <li>• All group data will be permanently deleted</li>
                  <li>• All expense records will be lost forever</li>
                  <li>• All members will lose access immediately</li>
                  <li>• This action cannot be reversed</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-white border rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-gray-600">Members:</span>
              <span className="font-medium">{group.members?.length || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Receipt className="h-4 w-4 text-green-600" />
              <span className="text-gray-600">Expenses:</span>
              <span className="font-medium">{group.expenses?.length || 0}</span>
            </div>
          </div>

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Group Permanently
              </Button>
            </AlertDialogTrigger>
            
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Delete "{group.name}"?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    This will permanently delete the group and all associated data. 
                    This action cannot be undone.
                  </p>
                  
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium mb-2">
                      What will be deleted:
                    </p>
                    <ul className="text-xs text-red-700 space-y-1">
                      <li>• Group information and settings</li>
                      <li>• All {group.expenses?.length || 0} expense records</li>
                      <li>• Member list and roles</li>
                      <li>• Join requests and leave requests</li>
                      <li>• All chat history and notifications</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmDelete" className="text-sm font-medium">
                      Type <span className="font-mono bg-gray-100 px-1 rounded">delete</span> to confirm:
                    </Label>
                    <Input
                      id="confirmDelete"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Type 'delete' here"
                      className="font-mono"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteGroup}
                  disabled={loading || confirmText.toLowerCase() !== 'delete'}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  {loading ? 'Deleting...' : 'Delete Forever'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </>
  );
}
