import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar,
  Upload,
  Users,
  DollarSign,
  Percent,
  Hash,
  Calculator,
  X,
  Plus,
  Minus,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food & Dining', icon: '🍽️', subcategories: ['groceries', 'restaurants', 'coffee'] },
  { value: 'travel', label: 'Travel & Transport', icon: '✈️', subcategories: ['transportation', 'accommodation'] },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', subcategories: ['clothing', 'electronics'] },
  { value: 'utilities', label: 'Bills & Utilities', icon: '💡', subcategories: ['rent', 'internet', 'phone'] },
  { value: 'entertainment', label: 'Entertainment', icon: '🎭', subcategories: ['movies', 'games', 'sports'] },
  { value: 'health', label: 'Health & Fitness', icon: '💊', subcategories: ['medical', 'fitness'] },
  { value: 'education', label: 'Education', icon: '📚', subcategories: ['books', 'courses'] },
  { value: 'gifts', label: 'Gifts & Charity', icon: '🎁', subcategories: ['charity'] },
  { value: 'other', label: 'Other', icon: '📄', subcategories: [] }
];

const SPLIT_METHODS = [
  { value: 'equal', label: 'Split Equally', icon: Users, description: 'Everyone pays the same amount' },
  { value: 'percentage', label: 'By Percentage', icon: Percent, description: 'Split by custom percentages' },
  { value: 'custom', label: 'Custom Amounts', icon: DollarSign, description: 'Set exact amounts for each person' },
  { value: 'shares', label: 'By Shares', icon: Hash, description: 'Split by proportional shares' }
];

export default function ExpenseForm({ 
  open, 
  onOpenChange, 
  group, 
  onSubmit, 
  expense = null, // For editing existing expenses
  isEditing = false 
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'other',
    date: format(new Date(), 'yyyy-MM-dd'),
    paidBy: '',
    splitMethod: 'equal',
    notes: '',
    tags: [],
    receipt: null
  });

  const [splitData, setSplitData] = useState([]);
  const [tagInput, setTagInput] = useState('');

  // Initialize form when editing
  useEffect(() => {
    if (isEditing && expense) {
      setFormData({
        description: expense.description || '',
        amount: expense.amount?.toString() || '',
        category: expense.category || 'other',
        date: expense.date ? format(new Date(expense.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        paidBy: expense.paidBy?._id || '',
        splitMethod: expense.splitMethod || 'equal',
        notes: expense.notes || '',
        tags: expense.tags || [],
        receipt: expense.receipt || null
      });
      
      if (expense.splitBetween) {
        setSplitData(expense.splitBetween.map(split => ({
          userId: split.user._id,
          userName: split.user.name,
          amount: split.amount,
          percentage: split.percentage || 0,
          shares: split.shares || 1,
          included: true
        })));
      }
    } else {
      // Reset form for new expense
      setFormData({
        description: '',
        amount: '',
        category: 'other',
        date: format(new Date(), 'yyyy-MM-dd'),
        paidBy: '',
        splitMethod: 'equal',
        notes: '',
        tags: [],
        receipt: null
      });
      
      if (group?.members) {
        setSplitData(group.members.map(member => ({
          userId: member.user._id,
          userName: member.user.name,
          amount: 0,
          percentage: 0,
          shares: 1,
          included: true
        })));
      }
    }
  }, [isEditing, expense, group, open]);

  // Update splits when amount or method changes
  useEffect(() => {
    if (formData.amount && splitData.length > 0) {
      calculateSplits();
    }
  }, [formData.amount, formData.splitMethod]);

  const calculateSplits = () => {
    const amount = parseFloat(formData.amount) || 0;
    const includedMembers = splitData.filter(member => member.included);
    
    if (amount <= 0 || includedMembers.length === 0) return;

    let updatedSplitData = [...splitData];

    switch (formData.splitMethod) {
      case 'equal':
        const equalAmount = amount / includedMembers.length;
        updatedSplitData = updatedSplitData.map(member => ({
          ...member,
          amount: member.included ? Math.round(equalAmount * 100) / 100 : 0
        }));
        break;
        
      case 'percentage':
        updatedSplitData = updatedSplitData.map(member => ({
          ...member,
          amount: member.included ? Math.round((amount * member.percentage / 100) * 100) / 100 : 0
        }));
        break;
        
      case 'shares':
        const totalShares = includedMembers.reduce((sum, member) => sum + member.shares, 0);
        updatedSplitData = updatedSplitData.map(member => ({
          ...member,
          amount: member.included && totalShares > 0 
            ? Math.round((amount * member.shares / totalShares) * 100) / 100 
            : 0
        }));
        break;
        
      // 'custom' - amounts are set manually, no auto-calculation
    }

    setSplitData(updatedSplitData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSplitChange = (userId, field, value) => {
    setSplitData(prev => prev.map(member => 
      member.userId === userId 
        ? { ...member, [field]: field === 'included' ? value : parseFloat(value) || 0 }
        : member
    ));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // In a real app, you'd upload to a file storage service
      setFormData(prev => ({
        ...prev,
        receipt: {
          filename: file.name,
          size: file.size,
          type: file.type
        }
      }));
    }
  };

  const validateForm = () => {
    if (!formData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a description for the expense',
        variant: 'destructive'
      });
      return false;
    }

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a valid amount',
        variant: 'destructive'
      });
      return false;
    }

    const includedMembers = splitData.filter(member => member.included);
    if (includedMembers.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one member must be included in the split',
        variant: 'destructive'
      });
      return false;
    }

    // Validate split totals
    const totalSplit = includedMembers.reduce((sum, member) => sum + member.amount, 0);
    if (Math.abs(totalSplit - amount) > 0.01) {
      toast({
        title: 'Validation Error',
        description: 'Split amounts must equal the total expense amount',
        variant: 'destructive'
      });
      return false;
    }

    if (formData.splitMethod === 'percentage') {
      const totalPercentage = includedMembers.reduce((sum, member) => sum + member.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast({
          title: 'Validation Error',
          description: 'Percentages must add up to 100%',
          variant: 'destructive'
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        splitBetween: splitData
          .filter(member => member.included)
          .map(member => ({
            user: member.userId,
            amount: member.amount,
            percentage: member.percentage,
            shares: member.shares
          }))
      };

      await onSubmit(expenseData);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        description: '',
        amount: '',
        category: 'other',
        date: format(new Date(), 'yyyy-MM-dd'),
        paidBy: '',
        splitMethod: 'equal',
        notes: '',
        tags: [],
        receipt: null
      });
      setSplitData([]);
      setActiveTab('details');
      
    } catch (error) {
      console.error('Error submitting expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSplitAmount = splitData.reduce((sum, member) => sum + (member.included ? member.amount : 0), 0);
  const selectedCategory = EXPENSE_CATEGORIES.find(cat => cat.value === formData.category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the expense details and split' : 'Add a new expense to split with the group'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="split">Split</TabsTrigger>
              <TabsTrigger value="extras">Extras</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    placeholder="What was this expense for?"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue>
                        {selectedCategory && (
                          <div className="flex items-center gap-2">
                            <span>{selectedCategory.icon}</span>
                            <span>{selectedCategory.label}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          <div className="flex items-center gap-2">
                            <span>{category.icon}</span>
                            <span>{category.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Paid by</Label>
                <Select value={formData.paidBy} onValueChange={(value) => handleInputChange('paidBy', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Who paid for this expense?" />
                  </SelectTrigger>
                  <SelectContent>
                    {group?.members?.map(member => (
                      <SelectItem key={member.user._id} value={member.user._id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.user.avatar} />
                            <AvatarFallback>{member.user.name?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{member.user.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="split" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label>Split Method</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {SPLIT_METHODS.map(method => {
                      const IconComponent = method.icon;
                      return (
                        <Card 
                          key={method.value}
                          className={`cursor-pointer transition-colors ${
                            formData.splitMethod === method.value 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => handleInputChange('splitMethod', method.value)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              <div>
                                <div className="font-medium text-sm">{method.label}</div>
                                <div className="text-xs text-muted-foreground">{method.description}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Split Details</Label>
                    <div className="text-sm text-muted-foreground">
                      Total: ₹{totalSplitAmount.toFixed(2)} / ₹{formData.amount || 0}
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {splitData.map(member => (
                      <Card key={member.userId}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={member.included}
                                onCheckedChange={(checked) => handleSplitChange(member.userId, 'included', checked)}
                              />
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{member.userName?.[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{member.userName}</span>
                            </div>
                            
                            {member.included && (
                              <div className="flex items-center gap-2">
                                {formData.splitMethod === 'percentage' && (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      className="w-16 h-8"
                                      value={member.percentage}
                                      onChange={(e) => handleSplitChange(member.userId, 'percentage', e.target.value)}
                                      min="0"
                                      max="100"
                                    />
                                    <span className="text-sm">%</span>
                                  </div>
                                )}
                                
                                {formData.splitMethod === 'shares' && (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      className="w-16 h-8"
                                      value={member.shares}
                                      onChange={(e) => handleSplitChange(member.userId, 'shares', e.target.value)}
                                      min="0"
                                    />
                                    <span className="text-sm">shares</span>
                                  </div>
                                )}
                                
                                {formData.splitMethod === 'custom' && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm">₹</span>
                                    <Input
                                      type="number"
                                      className="w-20 h-8"
                                      value={member.amount}
                                      onChange={(e) => handleSplitChange(member.userId, 'amount', e.target.value)}
                                      step="0.01"
                                      min="0"
                                    />
                                  </div>
                                )}
                                
                                <div className="text-sm font-medium min-w-[60px] text-right">
                                  ₹{member.amount.toFixed(2)}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="extras" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes about this expense..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt">Receipt</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    id="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="receipt" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {formData.receipt ? formData.receipt.filename : 'Click to upload receipt'}
                      </span>
                    </div>
                  </label>
                  {formData.receipt && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-green-600">✓ File selected</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleInputChange('receipt', null)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update Expense' : 'Add Expense')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
