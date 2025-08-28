import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Badge
} from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Users, Settings, Archive, BarChart, QrCode, Search, Filter } from 'lucide-react';
import api from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';


export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const { toast } = useToast();

  const groupTemplates = [
    { 
      type: 'trip', 
      name: 'Trip/Vacation', 
      description: 'Perfect for travel expenses and group trips',
      icon: '✈️',
      defaultCategories: ['Transportation', 'Accommodation', 'Food & Dining', 'Activities']
    },
    { 
      type: 'household', 
      name: 'Household', 
      description: 'For roommates and shared living expenses',
      icon: '🏠',
      defaultCategories: ['Utilities', 'Groceries', 'Cleaning', 'Internet']
    },
    { 
      type: 'event', 
      name: 'Event/Party', 
      description: 'Organize expenses for events and celebrations',
      icon: '🎉',
      defaultCategories: ['Venue', 'Food & Catering', 'Decorations', 'Entertainment']
    },
    { 
      type: 'project', 
      name: 'Project', 
      description: 'Business or work-related shared expenses',
      icon: '💼',
      defaultCategories: ['Office Supplies', 'Equipment', 'Travel', 'Meals']
    },
    { 
      type: 'general', 
      name: 'General', 
      description: 'Simple group for any type of shared expenses',
      icon: '📋',
      defaultCategories: ['Food & Dining', 'Transportation', 'Entertainment', 'Other']
    }
  ];

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      console.log('Fetching groups...');
      const response = await api.get('/api/groups');
      console.log('Groups response:', response.data);
      
      if (response.data.success) {
        setGroups(response.data.data || []);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load groups',
        variant: 'destructive',
      });
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const groupData = {
      name: formData.get('name'),
      description: formData.get('description'),
      groupType: formData.get('groupType') || 'general',
      settings: {
        currency: formData.get('currency') || 'USD',
        defaultSplitMethod: formData.get('splitMethod') || 'equal',
        privacy: formData.get('privacy') || 'invite-only'
      }
    };

    try {
      console.log('Creating group with data:', groupData);
      const response = await api.post('/api/groups', groupData);
      console.log('Create group response:', response.data);

      if (response.data.success) {
        setShowCreateGroup(false);
        await fetchGroups(); // Add await to ensure groups are fetched
        toast({
          title: 'Success',
          description: 'Group created successfully',
        });
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create group',
        variant: 'destructive',
      });
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const inviteCode = formData.get('inviteCode');

    try {
      console.log('Attempting to join group with invite code:', inviteCode);
      const response = await api.post(`/api/groups/join/${inviteCode}`);
      console.log('Join group response:', response.data);

      if (response.data.success) {
        setShowJoinGroup(false);
        fetchGroups();
        toast({
          title: 'Request Sent',
          description: response.data.message || 'Join request sent successfully. Waiting for approval from group admins.',
        });
      }
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to join group',
        variant: 'destructive',
      });
    }
  };

  // Filter and sort groups
  const filteredGroups = groups
    .filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           group.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterType === 'all') return matchesSearch;
      if (filterType === 'archived') return matchesSearch && group.archived;
      if (filterType === 'active') return matchesSearch && !group.archived;
      if (filterType === 'admin') return matchesSearch && group.members?.some(m => 
        m.user._id === getCurrentUserId() && (m.role === 'admin' || m.role === 'moderator')
      );
      
      return matchesSearch && group.groupType === filterType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'members':
          return (b.members?.length || 0) - (a.members?.length || 0);
        case 'expenses':
          return (b.totalExpenses || 0) - (a.totalExpenses || 0);
        case 'recent':
        default:
          return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      }
    });

  const getCurrentUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      return user.id || user._id;
    } catch {
      return null;
    }
  };

  const getGroupTypeIcon = (type) => {
    const template = groupTemplates.find(t => t.type === type);
    return template?.icon || '📋';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Groups</h1>
          <p className="text-muted-foreground">
            Manage your expense groups
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showJoinGroup} onOpenChange={setShowJoinGroup}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <QrCode className="mr-2 h-4 w-4" />
                Join Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Group</DialogTitle>
                <DialogDescription>
                  Enter the invite code to join an existing group
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleJoinGroup} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="inviteCode" className="text-sm font-medium">Invite Code</label>
                  <Input
                    id="inviteCode"
                    name="inviteCode"
                    placeholder="e.g., ABC123"
                    className="font-mono text-center tracking-widest uppercase"
                    maxLength={6}
                    required
                    onChange={(e) => {
                      e.target.value = e.target.value.toUpperCase();
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-character code shared by a group member
                  </p>
                </div>
                <Button type="submit" className="w-full">
                  <QrCode className="mr-2 h-4 w-4" />
                  Join Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a new group to start splitting expenses
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name">Group Name</label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter group name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="description">Description</label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Enter group description"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="groupType">Group Type</label>
                  <Select name="groupType" defaultValue="general">
                    <SelectTrigger>
                      <SelectValue placeholder="Select group type" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupTemplates.map((template) => (
                        <SelectItem key={template.type} value={template.type}>
                          <div className="flex items-center gap-2">
                            <span>{template.icon}</span>
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-xs text-muted-foreground">{template.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="currency">Currency</label>
                    <Select name="currency" defaultValue="USD">
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
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
                    <label htmlFor="splitMethod">Default Split Method</label>
                    <Select name="splitMethod" defaultValue="equal">
                      <SelectTrigger>
                        <SelectValue placeholder="Select split method" />
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
                  <label htmlFor="privacy">Privacy</label>
                  <Select name="privacy" defaultValue="invite-only">
                    <SelectTrigger>
                      <SelectValue placeholder="Select privacy level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invite-only">Invite Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full">
                  Create Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="trip">Trips</SelectItem>
              <SelectItem value="household">Household</SelectItem>
              <SelectItem value="event">Events</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="members">Members</SelectItem>
              <SelectItem value="expenses">Expenses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.map((group) => (
          <Link key={group._id} to={`/groups/${group._id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getGroupTypeIcon(group.groupType)}</span>
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription className="text-sm">{group.description}</CardDescription>
                    </div>
                  </div>
                  {group.archived && (
                    <Badge variant="secondary">
                      <Archive className="mr-1 h-3 w-3" />
                      Archived
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{group.members?.length || 0} members</span>
                    </div>
                    <Badge variant="outline">
                      {group.settings?.currency || 'USD'}
                    </Badge>
                  </div>
                  
                  {group.balance !== undefined && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Your balance: </span>
                      <span className={`font-medium ${group.balance > 0 ? 'text-green-600' : group.balance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {group.balance > 0 ? '+' : ''}{group.balance.toFixed(2)} {group.settings?.currency || 'USD'}
                      </span>
                    </div>
                  )}
                  
                  {group.createdBy && (
                    <div className="text-xs text-muted-foreground">
                      Created by {group.createdBy.name}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{group.totalExpenses || 0} expenses</span>
                    <span>
                      {new Date(group.updatedAt || group.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        
        {filteredGroups.length === 0 && !loading && (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm || filterType !== 'all' 
                ? 'No groups match your search criteria.' 
                : 'No groups yet. Create your first group to get started!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 