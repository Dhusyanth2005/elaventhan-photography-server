const User = require('../models/User');
const PhotoSelection = require('../models/PhotoSelection');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { extractFolderId, getFilesFromFolder } = require('../utils/driveHelper');

const createUser = async (req, res) => {
  const { username, password, driveFolderLink } = req.body;

  const folderId = extractFolderId(driveFolderLink);
  if (!folderId) return res.status(400).json({ message: 'Invalid Google Drive folder link' });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    username,
    password: hashedPassword,
    plainPassword: password,
    driveFolderLink,
    folderId
  });

  res.status(201).json({
    message: 'User created successfully',
    user: { username: user.username, driveFolderLink: user.driveFolderLink }
  });
};

// Get all users + their selections count
const getAllUsersWithSelections = async (req, res) => {
  const users = await User.find({ role: 'user' })
    .select('username plainPassword driveFolderLink folderId createdAt') // Include plainPassword, exclude hashed password
    .sort({ createdAt: -1 });

  const selections = await require('../models/PhotoSelection').aggregate([
    { $group: { _id: '$user', count: { $sum: 1 } } }
  ]);

  const result = users.map(user => {
    const sel = selections.find(s => s._id.toString() === user._id.toString());
    return {
      _id: user._id,
      username: user.username,
      plainPassword: user.plainPassword || '(not shown)', // fallback if missing
      password: user.plainPassword ? '••••••••' : '(set before your time)',
      driveLink: user.driveFolderLink,
      createdAt: user.createdAt?.toISOString().split('T')[0] || 'Unknown',
      selectedCount: sel ? sel.count : 0
    };
  });

  res.json(result);
};
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Find the user first (optional: to confirm existence + prevent deleting admin accidentally)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Optional: Prevent deleting the last admin or current logged-in admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(403).json({ message: 'Cannot delete the last admin account' });
      }
    }

    // Delete all photo selections by this user
    await PhotoSelection.deleteMany({ user: userId });

    // Now delete the user
    await User.findByIdAndDelete(userId);

    res.json({ 
      message: 'User and all their selections deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
};
const getAllUserSelectionsWithCount = async (req, res) => {
  try {
    // Get all users with role 'user' and their folderId
    const users = await User.find({ role: 'user' })
      .select('username folderId driveFolderLink')
      .lean();

    // Count selections per user
    const selectionCounts = await PhotoSelection.aggregate([
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ]);

    // Map counts to users
    const userSelectionMap = {};
    selectionCounts.forEach(item => {
      userSelectionMap[item._id.toString()] = item.count;
    });

    // Get total images in each user's Drive folder
    const result = await Promise.all(
      users.map(async (user) => {
        let totalImages = 0;
        if (user.folderId) {
          try {
            const files = await getFilesFromFolder(user.folderId);
            totalImages = files.length;
          } catch (err) {
            console.error(`Failed to fetch folder for ${user.username}:`, err.message);
            totalImages = 0;
          }
        }

        return {
          _id: user._id,
          username: user.username,
          driveLink: user.driveFolderLink,
          totalImages,
          selectedCount: userSelectionMap[user._id.toString()] || 0,
        };
      })
    );

    // Sort by most recently active or selected count
    result.sort((a, b) => b.selectedCount - a.selectedCount);

    res.json(result);
  } catch (error) {
    console.error('Error fetching user selections summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Bonus: Admin view specific user's selected photos (you already have this!)
const getUserSelectionsAdmin = async (req, res) => {
  const { userId } = req.params;

  try {
    const selections = await PhotoSelection.find({ user: userId })
      .sort({ selectedAt: -1 })
      .select('photoId photoName fullImageLink thumbnailLink selectedAt')
      .lean();

    res.json(selections);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching selections' });
  }
};
// controllers/adminController.js
const getDashboardStats = async (req, res) => {
  try {
    // Only count users that actually exist
    const validUserIds = await User.find({ role: 'user' }).distinct('_id');

    const totalUsers = validUserIds.length;

    // ONLY count selections from users that still exist!
    const totalSelectionsAgg = await PhotoSelection.aggregate([
      { $match: { user: { $in: validUserIds } } }, // ← THIS IS THE KEY LINE
      { $group: { _id: { user: '$user', photoId: '$photoId' } } },
      { $count: 'total' }
    ]);

    const totalSelections = totalSelectionsAgg[0]?.total || 0;

    // Recent activity — also only from valid users
    const recentActivity = await PhotoSelection.aggregate([
      { $match: { user: { $in: validUserIds } } },
      {
        $group: {
          _id: { user: '$user', photoId: '$photoId' },
          latestSelection: { $max: '$selectedAt' }
        }
      },
      {
        $group: {
          _id: '$_id.user',
          selectedCount: { $sum: 1 },
          latestSelection: { $max: '$latestSelection' }
        }
      },
      { $sort: { latestSelection: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          username: '$userInfo.username',
          selectedCount: 1,
          latestSelection: 1,
          folderId: '$userInfo.folderId'
        }
      }
    ]);

    const result = await Promise.all(
      recentActivity.map(async (item) => {
        let totalImages = 0;
        if (item.folderId) {
          try {
            const files = await getFilesFromFolder(item.folderId);
            totalImages = files.length;
          } catch (err) {
            console.error(`Failed folder: ${item.username}`, err.message);
          }
        }

        return {
          id: item._id.toString(),
          username: item.username,
          selectedCount: item.selectedCount,
          totalImages,
          date: item.latestSelection
        };
      })
    );

    res.json({
      totalUsers,
      totalSelections,        // ← NOW CORRECT: only from real users
      recentSelections: result
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
module.exports = { createUser, getAllUsersWithSelections, deleteUser, getAllUserSelectionsWithCount, getUserSelectionsAdmin, getDashboardStats };