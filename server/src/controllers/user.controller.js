import User from "../models/user.model.js";
import Report from "../models/report.model.js";
import { processAndUploadMedia } from "../utils/mediaStorage.js";
import { createNotification } from "./notification.controller.js";
import { getIO, getReceiverSocketId } from "../../socket.js";

/**
 * Get logged-in user profile
 */
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId)
      .select("-password -signupOtp -resetOtp")
      .populate("bookmarks");

    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({
      message: `Get current user error: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Get Full User Profile by ID
 */
export const getProfile = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.userId;

    const user = await User.findById(targetUserId)
      .select("-password -signupOtp -resetOtp")
      .populate({
        path: "posts",
        options: { sort: { createdAt: -1 } },
        populate: [
          {
            path: "author",
            select: "username name profileImage",
          },
          {
            path: "comments",
            options: { sort: { createdAt: -1 } },
            populate: {
              path: "author",
              select: "username name profileImage",
            },
          },
        ],
      })
      .populate("followers", "username name profileImage following followers")
      .populate("following", "username name profileImage following followers")
      .populate({
        path: "bookmarks",
        options: { sort: { createdAt: -1 } },
        populate: {
          path: "author",
          select: "username name profileImage",
        },
      });

    if (!user) {
      return res.status(404).json({
        message: "User does not exist",
        success: false,
      });
    }

    const currentUser = await User.findById(currentUserId).select("blockedUsers");
    const isBlockedByMe = currentUser?.blockedUsers?.some(
      (id) => id.toString() === targetUserId.toString()
    );
    const isBlockedByTarget = user.blockedUsers?.some(
      (id) => id.toString() === currentUserId.toString()
    );

    return res.status(200).json({
      ...user.toObject(),
      isBlockedByMe: Boolean(isBlockedByMe),
      isBlockedByTarget: Boolean(isBlockedByTarget),
      // Hide bookmarks if viewing another user's profile
      bookmarks: targetUserId === currentUserId.toString() ? user.bookmarks : [],
      // Hide posts if either side is blocked
      posts:
        (isBlockedByMe || isBlockedByTarget) && targetUserId !== currentUserId.toString()
          ? []
          : user.posts,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Get Profile error: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Edit User Profile (with photo rotation and cover photo)
 */
export const editProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, username, bio, gender, website, isPrivate, rotation, coverRotation } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    const updateFields = {};

    if (name !== undefined) updateFields.name = name.trim();
    if (bio !== undefined) updateFields.bio = bio.trim();
    if (gender !== undefined) updateFields.gender = gender;
    if (website !== undefined) updateFields.website = website.trim();
    if (isPrivate !== undefined) updateFields.isPrivate = Boolean(isPrivate === "true" || isPrivate === true);

    if (username && username.trim().toLowerCase() !== user.username) {
      const cleanUsername = username.trim().toLowerCase();
      const existing = await User.findOne({ username: cleanUsername });
      if (existing) {
        return res.status(400).json({
          message: "Username is already taken. Please choose another.",
          success: false,
        });
      }
      updateFields.username = cleanUsername;
    }

    // Handle files (profile image and/or cover image)
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        const result = await processAndUploadMedia(req.files.image[0], {
          rotation: Number(rotation) || 0,
        });
        updateFields.profileImage = result.url;
      }
      if (req.files.coverImage && req.files.coverImage[0]) {
        const result = await processAndUploadMedia(req.files.coverImage[0], {
          rotation: Number(coverRotation) || 0,
        });
        updateFields.coverImage = result.url;
      }
    } else if (req.file) {
      const result = await processAndUploadMedia(req.file, {
        rotation: Number(rotation) || 0,
      });
      updateFields.profileImage = result.url;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
      new: true,
    }).select("-password -signupOtp -resetOtp");

    return res.status(200).json({
      message: "Profile updated successfully!",
      user: updatedUser,
      success: true,
    });
  } catch (error) {
    console.error("Edit profile error:", error);
    return res.status(500).json({
      message: `Edit Profile error: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Follow or Unfollow User
 */
export const followOrUnfollow = async (req, res) => {
  try {
    const followerId = req.userId;
    const targetUserId = req.params.id;

    if (followerId === targetUserId) {
      return res.status(400).json({
        message: "You cannot follow yourself.",
        success: false,
      });
    }

    const follower = await User.findById(followerId);
    const targetUser = await User.findById(targetUserId);

    if (!follower || !targetUser) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Fixed check for ObjectId equality
    const isFollowing = follower.following.some(
      (id) => id.toString() === targetUserId.toString()
    );

    if (isFollowing) {
      // Unfollow
      await Promise.all([
        User.findByIdAndUpdate(followerId, { $pull: { following: targetUserId } }),
        User.findByIdAndUpdate(targetUserId, { $pull: { followers: followerId } }),
      ]);

      return res.status(200).json({
        message: `Unfollowed @${targetUser.username}`,
        isFollowing: false,
        success: true,
      });
    } else {
      // Follow
      await Promise.all([
        User.findByIdAndUpdate(followerId, { $addToSet: { following: targetUserId } }),
        User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: followerId } }),
      ]);

      // Create persistent notification
      await createNotification({
        recipient: targetUserId,
        sender: followerId,
        type: "follow",
        message: "started following you.",
      });

      return res.status(200).json({
        message: `Following @${targetUser.username}`,
        isFollowing: true,
        success: true,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: `Follow/unfollow error: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Optimized Search Users by username or name
 */
export const searchUser = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search || !search.trim()) {
      return res.status(200).json({ users: [] });
    }

    const query = search.trim();
    const currentUserId = req.userId;

    // Database-level regex query with limit (NO memory overflow)
    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } },
        {
          $or: [
            { username: { $regex: query, $options: "i" } },
            { name: { $regex: query, $options: "i" } },
          ],
        },
      ],
    })
      .select("username name profileImage followers following bio")
      .limit(20);

    return res.status(200).json({ users, success: true });
  } catch (error) {
    return res.status(500).json({
      message: `Search error: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Suggested Users
 */
export const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.userId;
    const currentUser = await User.findById(userId).select("following");
    const excludedIds = [userId, ...(currentUser?.following || [])];

    // Find users not yet followed by current user
    const suggestedUsers = await User.find({
      _id: { $nin: excludedIds },
      isEmailVerified: true,
    })
      .select("username name profileImage bio followers")
      .limit(10);

    return res.status(200).json({ users: suggestedUsers, success: true });
  } catch (error) {
    return res.status(500).json({
      message: `Suggested users error: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Block or Unblock a User
 */
export const blockOrUnblockUser = async (req, res) => {
  try {
    const userId = req.userId;
    const targetUserId = req.params.id;

    if (userId === targetUserId) {
      return res.status(400).json({ message: "You cannot block yourself", success: false });
    }

    const user = await User.findById(userId);
    const isBlocked = user.blockedUsers?.some(
      (id) => id.toString() === targetUserId.toString()
    );

    if (isBlocked) {
      await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: targetUserId } });
      return res.status(200).json({
        message: "User unblocked",
        isBlocked: false,
        success: true,
      });
    } else {
      // Also remove follow connections
      await Promise.all([
        User.findByIdAndUpdate(userId, {
          $addToSet: { blockedUsers: targetUserId },
          $pull: { following: targetUserId, followers: targetUserId },
        }),
        User.findByIdAndUpdate(targetUserId, {
          $pull: { following: userId, followers: userId },
        }),
      ]);

      return res.status(200).json({
        message: "User blocked",
        isBlocked: true,
        success: true,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: `Block error: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Report User or Post
 */
export const reportContent = async (req, res) => {
  try {
    const reporterId = req.userId;
    const { reportedUser, reportedPost, reason, details } = req.body;

    if (!reason) {
      return res.status(400).json({
        message: "Please specify a reason for reporting.",
        success: false,
      });
    }

    const report = await Report.create({
      reporter: reporterId,
      reportedUser: reportedUser || null,
      reportedPost: reportedPost || null,
      reason,
      details: details || "",
    });

    return res.status(201).json({
      message: "Report submitted. Our moderation team will review it.",
      report,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Report error: ${error.message}`,
      success: false,
    });
  }
};
