const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const auth = require('../middleware/auth');

// Get recent expenses for current user
router.get('/recent', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({
      'splitBetween.user': req.user._id
    })
      .populate('paidBy', 'name')
      .populate('group', 'name')
      .sort({ date: -1 })
      .limit(10);

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Error fetching expenses' });
  }
});

// Add expense to group
router.post('/groups/:groupId', auth, async (req, res) => {
  try {
    const { 
      description, 
      amount, 
      category, 
      date,
      paidBy, 
      splitMethod,
      splitBetween,
      notes,
      tags,
      receipt
    } = req.body;
    const groupId = req.params.groupId;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Group not found' 
      });
    }

    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Not a member of this group' 
      });
    }

    // Validate and prepare split data
    let finalSplitBetween;
    if (splitBetween && splitBetween.length > 0) {
      finalSplitBetween = splitBetween;
    } else {
      // Default to equal split among all members
      finalSplitBetween = group.members.map(member => ({
        user: member.user,
        amount: amount / group.members.length
      }));
    }

    // Create new expense
    const expense = new Expense({
      description,
      amount: parseFloat(amount),
      category,
      date: date ? new Date(date) : new Date(),
      paidBy: paidBy || req.user._id,
      group: groupId,
      splitMethod: splitMethod || 'equal',
      splitBetween: finalSplitBetween,
      notes,
      tags: tags || [],
      receipt: receipt || undefined
    });

    // Calculate splits based on method
    switch (expense.splitMethod) {
      case 'equal':
        expense.calculateEqualSplit();
        break;
      case 'percentage':
        expense.calculatePercentageSplit();
        break;
      case 'shares':
        expense.calculateSharesSplit();
        break;
      // 'custom' uses the provided amounts as-is
    }

    await expense.save();

    // Add expense to group
    group.expenses.push(expense._id);
    await group.save();

    // Populate expense data
    await expense.populate('paidBy', 'name email');
    await expense.populate('splitBetween.user', 'name email');

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(groupId).emit('expense-added', {
        expense,
        groupId
      });
    }

    res.status(201).json({
      success: true,
      data: expense,
      message: 'Expense created successfully'
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error creating expense' 
    });
  }
});

// Get expenses for a group
router.get('/groups/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { startDate, endDate, category } = req.query;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    // Build query
    const query = { group: groupId };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (category) {
      query.category = category;
    }

    const expenses = await Expense.find(query)
      .populate('paidBy', 'name')
      .populate('splitBetween.user', 'name')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching expenses' 
    });
  }
});

// Mark expense as settled
router.patch('/:expenseId/settle', auth, async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { userId } = req.body;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Verify user is part of the split
    const split = expense.splitBetween.find(
      split => split.user.toString() === userId
    );

    if (!split) {
      return res.status(403).json({ message: 'Not part of this expense split' });
    }

    // Mark as settled
    split.settled = true;
    await expense.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(expense.group.toString()).emit('expense-settled', {
        expense,
        groupId: expense.group
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error settling expense:', error);
    res.status(500).json({ message: 'Error settling expense' });
  }
});

// Get settlement suggestions
router.get('/groups/:groupId/settlements', auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Get group and calculate balances
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const balances = await group.calculateBalances();

    // Convert balances to array of { user, amount }
    const balanceArray = Object.entries(balances).map(([userId, amount]) => ({
      user: userId,
      amount
    }));

    // Sort by amount
    balanceArray.sort((a, b) => a.amount - b.amount);

    // Calculate minimum transactions
    const settlements = [];
    let i = 0;
    let j = balanceArray.length - 1;

    while (i < j) {
      const debtor = balanceArray[i];
      const creditor = balanceArray[j];

      if (Math.abs(debtor.amount) < 0.01 && Math.abs(creditor.amount) < 0.01) {
        break;
      }

      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
      if (amount > 0.01) {
        settlements.push({
          from: debtor.user,
          to: creditor.user,
          amount: parseFloat(amount.toFixed(2))
        });
      }

      debtor.amount += amount;
      creditor.amount -= amount;

      if (Math.abs(debtor.amount) < 0.01) i++;
      if (Math.abs(creditor.amount) < 0.01) j--;
    }

    res.json({
      success: true,
      data: settlements
    });
  } catch (error) {
    console.error('Error calculating settlements:', error);
    res.status(500).json({ message: 'Error calculating settlements' });
  }
});

// Update expense
router.put('/:expenseId', auth, async (req, res) => {
  try {
    const { expenseId } = req.params;
    const {
      description,
      amount,
      category,
      date,
      paidBy,
      splitMethod,
      splitBetween,
      notes,
      tags
    } = req.body;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Verify group membership
    const group = await Group.findById(expense.group);
    if (!group || !group.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this expense'
      });
    }

    // Only allow creator or admin to edit
    const isCreator = expense.paidBy.toString() === req.user._id.toString();
    const isAdmin = group.admins.some(admin => admin.toString() === req.user._id.toString());
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only expense creator or group admin can edit expenses'
      });
    }

    // Update expense fields
    if (description) expense.description = description;
    if (amount) expense.amount = parseFloat(amount);
    if (category) expense.category = category;
    if (date) expense.date = new Date(date);
    if (paidBy) expense.paidBy = paidBy;
    if (splitMethod) expense.splitMethod = splitMethod;
    if (splitBetween) expense.splitBetween = splitBetween;
    if (notes !== undefined) expense.notes = notes;
    if (tags) expense.tags = tags;

    // Recalculate splits if method or amount changed
    if (amount || splitMethod || splitBetween) {
      switch (expense.splitMethod) {
        case 'equal':
          expense.calculateEqualSplit();
          break;
        case 'percentage':
          expense.calculatePercentageSplit();
          break;
        case 'shares':
          expense.calculateSharesSplit();
          break;
      }
    }

    await expense.save();
    await expense.populate('paidBy', 'name email');
    await expense.populate('splitBetween.user', 'name email');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(expense.group.toString()).emit('expense-updated', {
        expense,
        groupId: expense.group
      });
    }

    res.json({
      success: true,
      data: expense,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating expense'
    });
  }
});

// Delete expense
router.delete('/:expenseId', auth, async (req, res) => {
  try {
    const { expenseId } = req.params;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Verify group membership
    const group = await Group.findById(expense.group);
    if (!group || !group.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this expense'
      });
    }

    // Only allow creator or admin to delete
    const isCreator = expense.paidBy.toString() === req.user._id.toString();
    const isAdmin = group.admins.some(admin => admin.toString() === req.user._id.toString());
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only expense creator or group admin can delete expenses'
      });
    }

    // Remove expense from group
    group.expenses = group.expenses.filter(expId => expId.toString() !== expenseId);
    await group.save();

    // Delete expense
    await Expense.findByIdAndDelete(expenseId);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(expense.group.toString()).emit('expense-deleted', {
        expenseId,
        groupId: expense.group
      });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting expense'
    });
  }
});

// Get categories with icons
router.get('/categories', (req, res) => {
  const categories = [
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

  res.json({
    success: true,
    data: categories
  });
});

module.exports = router; 