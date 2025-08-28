import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, Users, Plus, Copy, UserPlus, Trash2, Shield } from 'lucide-react';
import api from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';

export default function GroupSettings({ group, onGroupUpdate }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newCategory, setNewCategory] = useState({ name: '', icon: '🏷️', color: '#3B82F6' });
  const { toast } = useToast();

  const handleSettingsUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const settings = {
      currency: formData.get('currency'),
      defaultSplitMethod: formData.get('defaultSplitMethod'),
      privacy: formData.get('privacy'),
      notifications: {
        newExpense: formData.get('notifyNewExpense') === 'on',
        weeklyDigest: formData.get('notifyWeekly') === 'on',
        monthlyReport: formData.get('notifyMonthly') === 'on'
      },
      spendingLimit: {
        enabled: formData.get('spendingLimitEnabled') === 'on',
        amount: parseFloat(formData.get('spendingLimitAmount')) || 0,
        period: formData.get('spendingLimitPeriod') || 'monthly'
      }
    };

    try {
      const response = await api.put(`/api/groups/${group._id}/settings`, settings);
      if (response.data.success) {
        onGroupUpdate();
        setShowSettings(false);
        toast({
          title: 'Success',
          description: 'Group settings updated successfully',
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/api/groups/${group._id}/invite`, {
        email: inviteEmail,
        role: 'member'
      });
      
      if (response.data.success) {
        setInviteEmail('');
        setShowInvite(false);
        onGroupUpdate();
        toast({
          title: 'Success',
          description: 'Member invited successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to invite member',
        variant: 'destructive',
      });
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/api/groups/${group._id}/categories`, newCategory);
      
      if (response.data.success) {
        setNewCategory({ name: '', icon: '🏷️', color: '#3B82F6' });
        onGroupUpdate();
        toast({
          title: 'Success',
          description: 'Category added successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add category',
        variant: 'destructive',
      });
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    toast({
      title: 'Copied!',
      description: 'Invite code copied to clipboard',
    });
  };

  const isAdmin = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      const userId = user.id || user._id;
      return group.members?.some(m => 
        (m.user._id || m.user) === userId && (m.role === 'admin' || m.role === 'moderator')
      );
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-4">
      {/* Group Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Group Information</CardTitle>
            <div className="flex gap-2">
              <Dialog open={showInvite} onOpenChange={setShowInvite}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Member</DialogTitle>
                    <DialogDescription>
                      Invite someone to join this group
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleInviteMember} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="email">Email Address</label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Or share invite code:</p>
                        <p className="text-xs text-muted-foreground">{group.inviteCode}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={copyInviteCode}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button type="submit" className="w-full">
                      Send Invitation
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {isAdmin() && (
                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Group Settings</DialogTitle>
                      <DialogDescription>
                        Manage your group preferences and settings
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSettingsUpdate} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="currency">Currency</label>
                          <Select name="currency" defaultValue={group.settings?.currency || 'USD'}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                              <SelectItem value="INR">INR (₹)</SelectItem>
                              <SelectItem value="CAD">CAD (C$)</SelectItem>
                              <SelectItem value="AUD">AUD (A$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="defaultSplitMethod">Default Split Method</label>
                          <Select name="defaultSplitMethod" defaultValue={group.settings?.defaultSplitMethod || 'equal'}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equal">Equal Split</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="shares">Shares</SelectItem>
                              <SelectItem value="manual">Manual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="privacy">Privacy Level</label>
                        <Select name="privacy" defaultValue={group.settings?.privacy || 'invite-only'}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="invite-only">Invite Only</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <label>Spending Limit</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="spendingLimitEnabled"
                            name="spendingLimitEnabled"
                            defaultChecked={group.settings?.spendingLimit?.enabled}
                          />
                          <label htmlFor="spendingLimitEnabled" className="text-sm">
                            Enable spending limit
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            name="spendingLimitAmount"
                            type="number"
                            placeholder="Amount"
                            defaultValue={group.settings?.spendingLimit?.amount || ''}
                          />
                          <Select name="spendingLimitPeriod" defaultValue={group.settings?.spendingLimit?.period || 'monthly'}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label>Notifications</label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="notifyNewExpense"
                              name="notifyNewExpense"
                              defaultChecked={group.settings?.notifications?.newExpense !== false}
                            />
                            <label htmlFor="notifyNewExpense" className="text-sm">
                              New expense notifications
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="notifyWeekly"
                              name="notifyWeekly"
                              defaultChecked={group.settings?.notifications?.weeklyDigest !== false}
                            />
                            <label htmlFor="notifyWeekly" className="text-sm">
                              Weekly digest
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="notifyMonthly"
                              name="notifyMonthly"
                              defaultChecked={group.settings?.notifications?.monthlyReport !== false}
                            />
                            <label htmlFor="notifyMonthly" className="text-sm">
                              Monthly report
                            </label>
                          </div>
                        </div>
                      </div>

                      <Button type="submit" className="w-full">
                        Update Settings
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Invite Code:</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{group.inviteCode}</Badge>
                <Button variant="ghost" size="sm" onClick={copyInviteCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Currency:</span>
              <Badge>{group.settings?.currency || 'USD'}</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Split Method:</span>
              <Badge variant="outline">{group.settings?.defaultSplitMethod || 'equal'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members ({group.members?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {group.members?.map((member) => (
              <div key={member.user._id || member.user} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {member.user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.user.name}</p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                    {member.role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                    {member.role}
                  </Badge>
                  {member.role !== 'admin' && isAdmin() && (
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Categories</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowCategories(!showCategories)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCategories && (
            <form onSubmit={handleAddCategory} className="mb-4 p-4 border rounded-lg space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Category name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  required
                />
                <Input
                  placeholder="Icon (emoji)"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({...newCategory, icon: e.target.value})}
                />
                <Input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                />
              </div>
              <Button type="submit" size="sm">Add Category</Button>
            </form>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {group.categories?.map((category) => (
              <div
                key={category._id}
                className="flex items-center space-x-2 p-2 border rounded-lg"
                style={{ borderColor: category.color + '40' }}
              >
                <span style={{ color: category.color }}>{category.icon}</span>
                <span className="text-sm font-medium">{category.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
