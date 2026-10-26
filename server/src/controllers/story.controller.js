import Story from "../models/story.model.js";
import User from "../models/user.model.js";
import { isVideoMedia, processAndUploadMedia } from "../utils/mediaStorage.js";
import { getIO } from "../../socket.js";
import { createNotification } from "./notification.controller.js";

/**
 * Create a new 24-hour story (photo or video up to 30s)
 */
export const createStory = async (req, res) => {
  try {
    const authorId = req.userId;
    const file = req.file;
    const { caption, rotation, duration } = req.body;

    if (!file) {
      return res.status(400).json({
        message: "Media file (photo or video) is required for a story.",
        success: false,
      });
    }

    const isExplicitVideo = req.body.isVideo === "true" || req.body.isVideo === true;
    const isVideo = isVideoMedia(file, { isVideo: isExplicitVideo });
    const uploadResult = await processAndUploadMedia(file, {
      rotation: Number(rotation) || 0,
      isVideo,
      duration: Number(duration) || (isVideo ? 15 : 5),
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // exactly 24 hours from now

    const story = await Story.create({
      author: authorId,
      mediaUrl: uploadResult.url,
      mediaType: uploadResult.mediaType,
      caption: caption || "",
      duration: uploadResult.duration || (uploadResult.mediaType === "video" ? 15 : 5),
      expiresAt,
    });

    await story.populate("author", "username profileImage name");

    try {
      const io = getIO();
      io.emit("story-created", story);
    } catch (e) {}

    return res.status(201).json({
      message: "Story shared successfully!",
      story,
      success: true,
    });
  } catch (error) {
    console.error("Create story error:", error);
    return res.status(500).json({
      message: `Failed to create story: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Get active (non-expired) stories grouped by user
 * Expiry calculated using server timestamp: expiresAt > new Date()
 */
export const getActiveStories = async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();

    // Query stories that have NOT expired
    const activeStories = await Story.find({
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: 1 })
      .populate("author", "username profileImage name followers following")
      .populate("viewers.user", "username profileImage name");

    // Group stories by author
    const storiesByUser = {};
    activeStories.forEach((story) => {
      if (!story.author) return;
      const authorId = story.author._id.toString();

      if (!storiesByUser[authorId]) {
        storiesByUser[authorId] = {
          user: story.author,
          stories: [],
          hasUnviewed: false,
          latestStoryAt: story.createdAt,
        };
      }

      // Check if current user has viewed this particular story
      const isViewed = story.viewers.some(
        (v) => v.user?._id?.toString() === userId.toString()
      );

      const likesArr = story.likes || [];
      const isLiked = likesArr.some(
        (id) => (id?._id || id)?.toString() === userId.toString()
      );

      const storyObj = {
        _id: story._id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        duration: story.duration,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        viewsCount: story.viewers.length,
        likesCount: likesArr.length,
        likes: likesArr,
        isLiked,
        viewers: story.author._id.toString() === userId.toString() ? story.viewers : [],
        isViewed,
      };

      if (!isViewed && authorId !== userId.toString()) {
        storiesByUser[authorId].hasUnviewed = true;
      }

      storiesByUser[authorId].stories.push(storyObj);
      storiesByUser[authorId].latestStoryAt = story.createdAt;
    });

    // Format list: sort so current user is first, then unviewed stories, then viewed
    const userGroups = Object.values(storiesByUser);
    userGroups.sort((a, b) => {
      if (a.user._id.toString() === userId.toString()) return -1;
      if (b.user._id.toString() === userId.toString()) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return new Date(b.latestStoryAt) - new Date(a.latestStoryAt);
    });

    return res.status(200).json({
      stories: userGroups,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to fetch stories: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Record a story view by the current user
 */
export const markStoryViewed = async (req, res) => {
  try {
    const userId = req.userId;
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found", success: false });
    }

    if (new Date() > story.expiresAt) {
      return res.status(400).json({ message: "Story has expired", success: false });
    }

    // Only add if not already viewed
    const alreadyViewed = story.viewers.some(
      (v) => v.user?.toString() === userId.toString()
    );

    if (!alreadyViewed && story.author.toString() !== userId.toString()) {
      story.viewers.push({
        user: userId,
        viewedAt: new Date(),
      });
      await story.save();
    }

    return res.status(200).json({
      message: "Story view recorded",
      viewsCount: story.viewers.length,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to record view: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Delete own story
 */
export const deleteStory = async (req, res) => {
  try {
    const userId = req.userId;
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found", success: false });
    }

    // Ownership check
    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can only delete your own stories.",
        success: false,
      });
    }

    await Story.findByIdAndDelete(storyId);

    return res.status(200).json({
      message: "Story deleted successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to delete story: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Like or Dislike / Unlike Story
 */
export const likeOrDislikeStory = async (req, res) => {
  try {
    const userId = req.userId;
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found", success: false });
    }

    if (new Date() > story.expiresAt) {
      return res.status(400).json({ message: "Story has expired", success: false });
    }

    const alreadyLiked = story.likes.some(
      (id) => (id?._id || id)?.toString() === userId.toString()
    );

    if (alreadyLiked) {
      story.likes = story.likes.filter(
        (id) => (id?._id || id)?.toString() !== userId.toString()
      );
      await story.save();

      return res.status(200).json({
        message: "Story unliked",
        liked: false,
        likesCount: story.likes.length,
        success: true,
      });
    } else {
      story.likes.push(userId);
      await story.save();

      // Trigger notification if liking someone else's story
      if (story.author.toString() !== userId.toString()) {
        await createNotification({
          recipient: story.author,
          sender: userId,
          type: "like",
          message: "liked your story.",
        }).catch(() => {});
      }

      return res.status(200).json({
        message: "Story liked",
        liked: true,
        likesCount: story.likes.length,
        success: true,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: `Error liking story: ${error.message}`,
      success: false,
    });
  }
};
