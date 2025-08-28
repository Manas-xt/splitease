const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

// Get all groups for current user
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user._id
    }).populate('members.user', 'name email profilePicture');

    // Calculate balances for each group
    const groupsWithBalances = await Promise.all(
      groups.map(async (group) => {
        const balances = await group.calculateBalances();
        return {
          ...group.toObject(),
          balance: balances[req.user._id.toString()]
        };
      })
    );

    res.json({
      success: true,
      data: groupsWithBalances
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching groups' 
    });
  }
});

// Create new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;

    const group = new Group({
      name,
      description,
      createdBy: req.user._id,
      members: [
        {
          user: req.user._id,
          role: 'admin'
        }
      ]
    });

    await group.save();

    res.status(201).json({
      success: true,
      data: group,
      message: 'Group created successfully'
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating group' 
    });
  }
});

// Get group details
router.get('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members.user', 'name email profilePicture')
      .populate('expenses');

    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Group not found' 
      });
    }

    // Check if user is a member
    const isMember = group.members.some(
      member => member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ 
        success: false,
        message: 'Not a member of this group' 
      });
    }

    // Get recent expenses
    const expenses = await Expense.find({ group: group._id })
      .populate('paidBy', 'name')
      .populate('splitBetween.user', 'name')
      .sort({ date: -1 })
      .limit(10);

    // Calculate balances
    const balances = await group.calculateBalances();

    res.json({
      success: true,
      data: {
        group,
        expenses,
        balances
      }
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching group' 
    });
  }
});

// Add member to group
router.post('/:groupId/members', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    const isAdmin = group.members.some(
      member =>
        member.user.toString() === req.user._id.toString() &&
        member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const isMember = group.members.some(
      member => member.user.toString() === user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // Add user to group
    group.members.push({
      user: user._id,
      role: 'member'
    });

    await group.save();

    res.json({
      success: true,
      data: group,
      message: 'Member added successfully'
    });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding member' 
    });
  }
});

// Join group by invite code
router.post('/join/:inviteCode', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.inviteCode });

    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Invalid invite code' 
      });
    }

    // Check if user is already a member
    const isMember = group.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({ 
        success: false,
        message: 'Already a member of this group' 
      });
    }

    // Check if user already has a pending request
    const existingRequest = group.joinRequests.find(
      request => 
        request.user.toString() === req.user._id.toString() &&
        request.status === 'pending'
    );

    if (existingRequest) {
      return res.status(400).json({ 
        success: false,
        message: 'You already have a pending join request for this group' 
      });
    }

    // Create join request instead of directly adding to group
    group.joinRequests.push({
      user: req.user._id,
      message: req.body.message || '',
      status: 'pending'
    });

    await group.save();

    res.json({
      success: true,
      data: group,
      message: 'Join request sent successfully. Waiting for admin approval.'
    });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error joining group' 
    });
  }
});

// Get join requests for a group
router.get('/:groupId/join-requests', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('joinRequests.user', 'name email profilePicture');

    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Group not found' 
      });
    }

    // Check if user is an admin
    const isAdmin = group.members.some(
      member =>
        member.user.toString() === req.user._id.toString() &&
        member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Only admins can view join requests' 
      });
    }

    // Return pending join requests
    const pendingRequests = group.joinRequests.filter(
      request => request.status === 'pending'
    );

    res.json({
      success: true,
      data: pendingRequests
    });
  } catch (error) {
    console.error('Error fetching join requests:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching join requests' 
    });
  }
});

// Approve or reject join request
router.patch('/:groupId/join-requests/:requestId', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const { groupId, requestId } = req.params;

    // Convert action to status
    const statusMap = {
      'approve': 'approved',
      'reject': 'rejected'
    };
    
    const status = statusMap[action];
    if (!status) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid action. Use approve or reject.' 
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Group not found' 
      });
    }

    // Check if user is an admin
    const isAdmin = group.members.some(
      member =>
        member.user.toString() === req.user._id.toString() &&
        member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Only admins can manage join requests' 
      });
    }

    // Find the join request
    const joinRequest = group.joinRequests.id(requestId);
    if (!joinRequest) {
      return res.status(404).json({ 
        success: false,
        message: 'Join request not found' 
      });
    }

    // Update the request status
    joinRequest.status = status;
    joinRequest.reviewedAt = new Date();
    joinRequest.reviewedBy = req.user._id;

    // If approved, add user to group members
    if (status === 'approved') {
      const isAlreadyMember = group.members.some(
        member => member.user.toString() === joinRequest.user.toString()
      );

      if (!isAlreadyMember) {
        group.members.push({
          user: joinRequest.user,
          role: 'member'
        });
      }
    }

    await group.save();

    res.json({
      success: true,
      data: joinRequest,
      message: `Join request ${action}d successfully`
    });
  } catch (error) {
    console.error('Error processing join request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing join request' 
    });
  }
});

// Approve or reject join request (PUT version for backward compatibility)
router.put('/:groupId/join-requests/:requestId', auth, async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    const { groupId, requestId } = req.params;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Group not found' 
      });
    }

    // Check if user is an admin
    const isAdmin = group.members.some(
      member =>
        member.user.toString() === req.user._id.toString() &&
        member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Only admins can manage join requests' 
      });
    }

    // Find the join request
    const joinRequest = group.joinRequests.id(requestId);
    if (!joinRequest) {
      return res.status(404).json({ 
        success: false,
        message: 'Join request not found' 
      });
    }

    // Update the request status
    joinRequest.status = status;
    joinRequest.reviewedAt = new Date();
    joinRequest.reviewedBy = req.user._id;

    // If approved, add user to group members
    if (status === 'approved') {
      const isAlreadyMember = group.members.some(
        member => member.user.toString() === joinRequest.user.toString()
      );

      if (!isAlreadyMember) {
        group.members.push({
          user: joinRequest.user,
          role: 'member'
        });
      }
    }

    await group.save();

    res.json({
      success: true,
      data: joinRequest,
      message: `Join request ${status} successfully`
    });
  } catch (error) {
    console.error('Error processing join request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing join request' 
    });
  }
});

// Get group info by invite code (for join page preview)
router.get('/info/:inviteCode', async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.inviteCode })
      .populate('createdBy', 'name')
      .select('name description groupType members createdAt createdBy inviteCode');

    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Invalid invite code' 
      });
    }

    // Return basic group info (no sensitive data)
    const groupInfo = {
      name: group.name,
      description: group.description,
      groupType: group.groupType,
      memberCount: group.members.length,
      createdAt: group.createdAt,
      createdBy: group.createdBy?.name,
      inviteCode: group.inviteCode
    };

    res.json({
      success: true,
      data: groupInfo
    });
  } catch (error) {
    console.error('Error fetching group info:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching group info' 
    });
  }
});

module.exports = router; 