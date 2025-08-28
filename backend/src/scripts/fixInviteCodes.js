const mongoose = require('mongoose');
const Group = require('../models/Group');
require('dotenv').config();

async function fixInviteCodes() {
  try {
    // Connect to MongoDB (using the same URI from .env)
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop the problematic index if it exists
    try {
      await Group.collection.dropIndex('joinCode_1');
      console.log('Dropped old joinCode_1 index');
    } catch (error) {
      console.log('joinCode_1 index not found or already dropped');
    }

    try {
      await Group.collection.dropIndex('inviteCode_1');
      console.log('Dropped old inviteCode_1 index');
    } catch (error) {
      console.log('inviteCode_1 index not found or already dropped');
    }

    // Find all groups without invite codes
    const groupsWithoutInviteCode = await Group.find({
      $or: [
        { inviteCode: null },
        { inviteCode: { $exists: false } }
      ]
    });

    console.log(`Found ${groupsWithoutInviteCode.length} groups without invite codes`);

    // Update each group to generate invite codes
    for (const group of groupsWithoutInviteCode) {
      group.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      group.inviteLink = `${group.inviteCode}-${Date.now().toString(36)}`;
      await group.save();
      console.log(`Updated group ${group._id} with invite code: ${group.inviteCode}`);
    }

    // Recreate the indexes with sparse option
    try {
      await Group.collection.createIndex({ inviteCode: 1 }, { unique: true, sparse: true });
      console.log('Created inviteCode index with sparse option');
    } catch (error) {
      console.log('inviteCode index already exists or error:', error.message);
    }

    try {
      await Group.collection.createIndex({ inviteLink: 1 }, { unique: true, sparse: true });
      console.log('Created inviteLink index with sparse option');
    } catch (error) {
      console.log('inviteLink index already exists or error:', error.message);
    }

    console.log('Database cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during database cleanup:', error);
    process.exit(1);
  }
}

// Run the fix
fixInviteCodes();
