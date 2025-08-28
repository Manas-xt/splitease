const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Please provide an amount'],
    min: [0.01, 'Amount must be at least 0.01']
  },
  paidBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.ObjectId,
    ref: 'Group',
    required: true
  },
  category: {
    type: String,
    enum: [
      'food', 'groceries', 'restaurants', 'coffee',
      'travel', 'transportation', 'accommodation',
      'shopping', 'clothing', 'electronics',
      'utilities', 'rent', 'internet', 'phone',
      'entertainment', 'movies', 'games', 'sports',
      'health', 'medical', 'fitness',
      'education', 'books', 'courses',
      'gifts', 'charity', 'other'
    ],
    default: 'other'
  },
  date: {
    type: Date,
    default: Date.now
  },
  splitMethod: {
    type: String,
    enum: ['equal', 'percentage', 'custom', 'shares'],
    default: 'equal'
  },
  splitBetween: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    shares: {
      type: Number,
      min: 0
    },
    settled: {
      type: Boolean,
      default: false
    }
  }],
  receipt: {
    filename: String,
    url: String,
    size: Number,
    mimetype: String
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Validate that split amounts sum up to total amount
expenseSchema.pre('save', function(next) {
  const totalSplit = this.splitBetween.reduce((sum, split) => sum + split.amount, 0);
  if (Math.abs(totalSplit - this.amount) > 0.01) {
    return next(new Error('Split amounts must sum up to the total amount'));
  }
  
  // Validate percentages if using percentage split
  if (this.splitMethod === 'percentage') {
    const totalPercentage = this.splitBetween.reduce((sum, split) => sum + (split.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return next(new Error('Split percentages must sum up to 100%'));
    }
  }
  
  // Validate shares if using shares split
  if (this.splitMethod === 'shares') {
    const hasShares = this.splitBetween.every(split => split.shares >= 0);
    if (!hasShares) {
      return next(new Error('All shares must be non-negative'));
    }
  }
  
  // Update updatedAt timestamp
  this.updatedAt = new Date();
  
  next();
});

// Method to calculate equal split
expenseSchema.methods.calculateEqualSplit = function() {
  const amountPerPerson = this.amount / this.splitBetween.length;
  this.splitBetween.forEach(split => {
    split.amount = Math.round(amountPerPerson * 100) / 100;
  });
  this.splitMethod = 'equal';
};

// Method to calculate percentage split
expenseSchema.methods.calculatePercentageSplit = function() {
  this.splitBetween.forEach(split => {
    if (split.percentage) {
      split.amount = Math.round((this.amount * split.percentage / 100) * 100) / 100;
    }
  });
  this.splitMethod = 'percentage';
};

// Method to calculate shares split
expenseSchema.methods.calculateSharesSplit = function() {
  const totalShares = this.splitBetween.reduce((sum, split) => sum + (split.shares || 0), 0);
  if (totalShares > 0) {
    this.splitBetween.forEach(split => {
      if (split.shares) {
        split.amount = Math.round((this.amount * split.shares / totalShares) * 100) / 100;
      }
    });
  }
  this.splitMethod = 'shares';
};

// Static method to get category icons
expenseSchema.statics.getCategoryIcon = function(category) {
  const icons = {
    'food': '🍽️',
    'groceries': '🛒',
    'restaurants': '🍴',
    'coffee': '☕',
    'travel': '✈️',
    'transportation': '🚗',
    'accommodation': '🏨',
    'shopping': '🛍️',
    'clothing': '👕',
    'electronics': '📱',
    'utilities': '💡',
    'rent': '🏠',
    'internet': '🌐',
    'phone': '📞',
    'entertainment': '🎭',
    'movies': '🎬',
    'games': '🎮',
    'sports': '⚽',
    'health': '💊',
    'medical': '🏥',
    'fitness': '💪',
    'education': '📚',
    'books': '📖',
    'courses': '🎓',
    'gifts': '🎁',
    'charity': '❤️',
    'other': '📄'
  };
  return icons[category] || icons.other;
};

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense; 