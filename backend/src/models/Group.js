const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a group name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    permissions: {
      canAddExpenses: { type: Boolean, default: true },
      canEditExpenses: { type: Boolean, default: false },
      canDeleteExpenses: { type: Boolean, default: false },
      canInviteMembers: { type: Boolean, default: false },
      canRemoveMembers: { type: Boolean, default: false }
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  }],
  joinRequests: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  }],
  leaveRequests: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: [true, 'Please provide a reason for leaving'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  }],
  expenses: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Expense'
  }],
  settings: {
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY']
    },
    defaultSplitMethod: {
      type: String,
      enum: ['equal', 'percentage', 'shares', 'manual'],
      default: 'equal'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    spendingLimit: {
      amount: { type: Number, default: 0 },
      period: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'monthly' },
      enabled: { type: Boolean, default: false }
    },
    notifications: {
      newExpense: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
      monthlyReport: { type: Boolean, default: true },
      spendingLimitWarning: { type: Boolean, default: true }
    },
    privacy: {
      type: String,
      enum: ['public', 'private', 'invite-only'],
      default: 'invite-only'
    }
  },
  categories: [{
    name: { type: String, required: true },
    icon: { type: String, default: '🏷️' },
    color: { type: String, default: '#3B82F6' },
    budget: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.ObjectId, ref: 'User' }
  }],
  inviteCode: {
    type: String,
    unique: true,
    sparse: true,  // Allows multiple null values
    default: function() {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  },
  inviteLink: {
    type: String,
    unique: true,
    sparse: true  // Allows multiple null values
  },
  groupType: {
    type: String,
    enum: ['general', 'trip', 'household', 'project', 'event', 'roommates'],
    default: 'general'
  },
  tags: [String],
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  totalExpenses: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate invite code and link before saving
groupSchema.pre('save', function(next) {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  if (!this.inviteLink) {
    this.inviteLink = `${this.inviteCode}-${Date.now().toString(36)}`;
  }
  this.updatedAt = new Date();
  next();
});

// Initialize default categories when group is created
groupSchema.pre('save', function(next) {
  if (this.isNew && this.categories.length === 0) {
    this.categories = [
      { name: 'Food & Dining', icon: '🍕', color: '#EF4444', createdBy: this.createdBy },
      { name: 'Transportation', icon: '🚗', color: '#3B82F6', createdBy: this.createdBy },
      { name: 'Entertainment', icon: '🎬', color: '#8B5CF6', createdBy: this.createdBy },
      { name: 'Shopping', icon: '🛍️', color: '#10B981', createdBy: this.createdBy },
      { name: 'Utilities', icon: '⚡', color: '#F59E0B', createdBy: this.createdBy },
      { name: 'Other', icon: '🏷️', color: '#6B7280', createdBy: this.createdBy }
    ];
  }
  next();
});

// Check if user is a member of the group
groupSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

// Check if user is an admin of the group
groupSchema.methods.isAdmin = function(userId) {
  return this.members.some(
    member => member.user.toString() === userId.toString() && (member.role === 'admin' || member.role === 'moderator')
  );
};

// Check if user has specific permission
groupSchema.methods.hasPermission = function(userId, permission) {
  const member = this.members.find(member => member.user.toString() === userId.toString());
  if (!member) return false;
  
  // Admins have all permissions
  if (member.role === 'admin') return true;
  
  // Moderators have most permissions
  if (member.role === 'moderator') {
    const moderatorPerms = ['canAddExpenses', 'canEditExpenses', 'canInviteMembers'];
    return moderatorPerms.includes(permission);
  }
  
  // Check specific permission
  return member.permissions[permission] || false;
};

// Add member to group
groupSchema.methods.addMember = function(userId, role = 'member', permissions = {}) {
  if (this.isMember(userId)) return false;
  
  const defaultPermissions = {
    canAddExpenses: true,
    canEditExpenses: false,
    canDeleteExpenses: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    ...permissions
  };
  
  this.members.push({
    user: userId,
    role,
    permissions: defaultPermissions,
    joinedAt: new Date(),
    lastActive: new Date()
  });
  
  return true;
};

// Remove member from group
groupSchema.methods.removeMember = function(userId) {
  const initialLength = this.members.length;
  this.members = this.members.filter(member => member.user.toString() !== userId.toString());
  return this.members.length < initialLength;
};

// Update member activity
groupSchema.methods.updateMemberActivity = function(userId) {
  const member = this.members.find(member => member.user.toString() === userId.toString());
  if (member) {
    member.lastActive = new Date();
  }
};

// Get group statistics
groupSchema.methods.getStatistics = async function() {
  const Expense = mongoose.model('Expense');
  const expenses = await Expense.find({ group: this._id });
  
  const stats = {
    totalExpenses: expenses.length,
    totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
    avgExpenseAmount: expenses.length > 0 ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length : 0,
    categoriesBreakdown: {},
    monthlyTrend: {},
    topSpenders: {},
    activeMembers: this.members.filter(m => {
      const daysSinceActive = (new Date() - m.lastActive) / (1000 * 60 * 60 * 24);
      return daysSinceActive <= 30;
    }).length
  };
  
  // Category breakdown
  expenses.forEach(expense => {
    const category = expense.category || 'Other';
    stats.categoriesBreakdown[category] = (stats.categoriesBreakdown[category] || 0) + expense.amount;
  });
  
  // Monthly trend (last 6 months)
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = month.toISOString().substr(0, 7);
    stats.monthlyTrend[monthKey] = expenses
      .filter(exp => exp.date.toISOString().substr(0, 7) === monthKey)
      .reduce((sum, exp) => sum + exp.amount, 0);
  }
  
  // Top spenders
  expenses.forEach(expense => {
    const payerId = expense.paidBy.toString();
    stats.topSpenders[payerId] = (stats.topSpenders[payerId] || 0) + expense.amount;
  });
  
  return stats;
};

// Get settlement suggestions
groupSchema.methods.getSettlementSuggestions = async function() {
  const balances = await this.calculateBalances();
  const suggestions = [];
  
  // Convert balances to array and sort
  const balanceArray = Object.entries(balances).map(([userId, balance]) => ({
    userId,
    balance: parseFloat(balance.toFixed(2))
  }));
  
  const debtors = balanceArray.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);
  const creditors = balanceArray.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
  
  // Greedy algorithm to minimize transactions
  let debtorIndex = 0;
  let creditorIndex = 0;
  
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    
    const settleAmount = Math.min(Math.abs(debtor.balance), creditor.balance);
    
    if (settleAmount > 0.01) { // Only suggest if amount is significant
      suggestions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: settleAmount,
        currency: this.settings.currency
      });
    }
    
    debtor.balance += settleAmount;
    creditor.balance -= settleAmount;
    
    if (Math.abs(debtor.balance) < 0.01) debtorIndex++;
    if (Math.abs(creditor.balance) < 0.01) creditorIndex++;
  }
  
  return suggestions;
};

// Calculate total balance for each member
groupSchema.methods.calculateBalances = async function() {
  try {
    const Expense = mongoose.model('Expense');
    const expenses = await Expense.find({ group: this._id })
      .populate('paidBy', '_id')
      .populate('splitBetween.user', '_id');
    
    const balances = {};
    
    // Initialize balances for all members
    this.members.forEach(member => {
      const userId = member.user._id ? member.user._id.toString() : member.user.toString();
      balances[userId] = 0;
    });
    
    // Calculate balances based on actual split amounts, not equal division
    expenses.forEach(expense => {
      if (expense.paidBy) {
        const payerId = expense.paidBy._id ? expense.paidBy._id.toString() : expense.paidBy.toString();
        
        // Add full amount to payer's balance
        if (balances.hasOwnProperty(payerId)) {
          balances[payerId] += expense.amount;
        }
        
        // Subtract each person's share
        expense.splitBetween.forEach(split => {
          const userId = split.user._id ? split.user._id.toString() : split.user.toString();
          if (balances.hasOwnProperty(userId)) {
            balances[userId] -= split.amount;
          }
        });
      }
    });
    
    return balances;
  } catch (error) {
    console.error('Error calculating balances:', error);
    return {};
  }
};

const Group = mongoose.model('Group', groupSchema);

module.exports = Group; 