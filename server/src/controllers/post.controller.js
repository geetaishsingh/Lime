import User from "../models/user.model.js";
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import { isVideoMedia, processAndUploadMedia } from "../utils/mediaStorage.js";
import { getIO } from "../../socket.js";
import { createNotification } from "./notification.controller.js";

/**
 * Add New Post (Multiple Photos or Short Videos up to 60s)
 */
export const addNewPost = async (req, res) => {
  try {
    const { caption, rotation, duration } = req.body;
    const authorId = req.userId;
    const files = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);

    if (files.length === 0) {
      return res.status(400).json({
        message: "An image or video file is required.",
        success: false,
      });
    }

    const firstFile = files[0];
    const isExplicitVideo = req.body.isVideo === "true" || req.body.isVideo === true;
    const isVideo = isVideoMedia(firstFile, { isVideo: isExplicitVideo });

    let mediaType = isVideo ? "video" : "image";
    let videoDuration = 0;
    let thumbnail = "";
    let uploadedUrls = [];

    if (isVideo) {
      const uploadResult = await processAndUploadMedia(firstFile, {
        rotation: Number(rotation) || 0,
        isVideo: true,
        duration: Number(duration) || 0,
      });
      uploadedUrls.push(uploadResult.url);
      videoDuration = uploadResult.duration || 0;
      thumbnail = uploadResult.thumbnail || "";
    } else {
      // Process multiple images with per-image rotation
      let rotations = [];
      if (typeof req.body.rotations === "string") {
        try {
          rotations = JSON.parse(req.body.rotations);
        } catch (e) {
          rotations = [Number(rotation) || 0];
        }
      } else if (Array.isArray(req.body.rotations)) {
        rotations = req.body.rotations.map(Number);
      } else {
        rotations = [Number(rotation) || 0];
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const rot = rotations[i] !== undefined ? rotations[i] : (Number(rotation) || 0);
        const uploadResult = await processAndUploadMedia(file, {
          rotation: rot,
          isVideo: false,
        });
        uploadedUrls.push(uploadResult.url);
      }
    }

    const post = await Post.create({
      caption: caption || "",
      image: uploadedUrls[0] || "",
      images: uploadedUrls,
      mediaUrl: uploadedUrls[0] || "",
      mediaType,
      videoDuration,
      thumbnail,
      author: authorId,
    });

    await post.populate({ path: "author", select: "username name profileImage" });

    // Update user posts array
    await User.findByIdAndUpdate(authorId, { $push: { posts: post._id } });

    // Real-time broadcast
    try {
      const io = getIO();
      io.emit("post-created", post);
    } catch (e) {}

    return res.status(201).json({
      message: "Post created successfully!",
      post,
      success: true,
    });
  } catch (error) {
    console.error("Add post error:", error);
    return res.status(500).json({
      message: error.message || "Failed to create post",
      success: false,
    });
  }
};

/**
 * Get All Posts (with stable pagination and optional following filter)
 */
export const getAllPost = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = req.query.filter; // 'following' or undefined

    let query = {};

    // Block filter: do not show posts from blocked users
    if (userId) {
      const currentUser = await User.findById(userId).select("blockedUsers following");
      const blockedIds = currentUser?.blockedUsers || [];
      if (filter === "following") {
        const followingIds = (currentUser?.following || []).filter(
          (id) => !blockedIds.some((b) => b.toString() === id.toString())
        );
        query.author = { $in: followingIds };
      } else if (blockedIds.length > 0) {
        query.author = { $nin: blockedIds };
      }
    }

    // Deterministic sorting with secondary _id tie-breaker to prevent re-ordering
    const posts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "author", select: "username name profileImage isPrivate" })
      .populate({
        path: "comments",
        options: { sort: { createdAt: -1 }, limit: 10 },
        populate: {
          path: "author",
          select: "username name profileImage",
        },
      });

    const totalPosts = await Post.countDocuments(query);

    return res.status(200).json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to fetch posts: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Get Posts of logged-in user or specific author
 */
export const getUserPosts = async (req, res) => {
  try {
    const authorId = req.params.authorId || req.userId;
    const posts = await Post.find({ author: authorId })
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username name profileImage" })
      .populate({
        path: "comments",
        options: { sort: { createdAt: -1 } },
        populate: {
          path: "author",
          select: "username name profileImage",
        },
      });

    return res.status(200).json({ posts, success: true });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to fetch user posts: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Like a post
 */
export const likePost = async (req, res) => {
  try {
    const userId = req.userId;
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found", success: false });
    }

    const alreadyLiked = post.likes.some(
      (id) => id.toString() === userId.toString()
    );

    if (!alreadyLiked) {
      await Post.findByIdAndUpdate(postId, { $addToSet: { likes: userId } });

      // Trigger persistent notification
      await createNotification({
        recipient: post.author,
        sender: userId,
        type: "like",
        post: post._id,
        message: "liked your post.",
      });

      // Emit real-time like event
      try {
        const io = getIO();
        io.emit("post-liked", { postId, userId, likesCount: post.likes.length + 1 });
      } catch (e) {}
    }

    return res.status(200).json({
      message: "Post liked",
      likesCount: alreadyLiked ? post.likes.length : post.likes.length + 1,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Like error: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Dislike (Unlike) a post
 */
export const disLikePost = async (req, res) => {
  try {
    const userId = req.userId;
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found", success: false });
    }

    await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } });

    // Emit real-time dislike event
    try {
      const io = getIO();
      io.emit("post-disliked", {
        postId,
        userId,
        likesCount: Math.max(0, post.likes.length - 1),
      });
    } catch (e) {}

    return res.status(200).json({
      message: "Post unliked",
      likesCount: Math.max(0, post.likes.length - 1),
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Dislike error: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Get posts liked by the current user (FIXED MongoDB query)
 */
export const getMyLikes = async (req, res) => {
  try {
    const userId = req.userId;
    // FIXED: { likes: userId } queries whether the likes array contains userId
    const likedPosts = await Post.find({ likes: userId })
      .sort({ createdAt: -1 })
      .populate("author", "username name profileImage");

    return res.status(200).json(likedPosts || []);
  } catch (error) {
    return res.status(500).json({
      message: `Failed to fetch liked posts: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Add Comment to a post
 */
export const addComment = async (req, res) => {
  try {
    const userId = req.userId;
    const postId = req.params.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Comment text cannot be empty.",
        success: false,
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found", success: false });
    }

    const comment = await Comment.create({
      text: text.trim(),
      post: postId,
      author: userId,
    });

    await comment.populate("author", "username name profileImage");

    post.comments.push(comment._id);
    await post.save();

    // Trigger persistent notification
    await createNotification({
      recipient: post.author,
      sender: userId,
      type: "comment",
      post: post._id,
      comment: comment._id,
      message: `commented: "${text.trim().substring(0, 40)}${text.length > 40 ? "..." : ""}"`,
    });

    return res.status(200).json({
      message: "Comment added",
      comment,
      commentsCount: post.comments.length,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Comment error: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Get all comments for a post
 */
export const getPostComments = async (req, res) => {
  try {
    const postId = req.params.id;
    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: -1 })
      .populate("author", "username name profileImage");

    return res.status(200).json({ comments, success: true });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to fetch comments: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Delete a comment (Author of comment or author of post can delete)
 */
export const deleteComment = async (req, res) => {
  try {
    const userId = req.userId;
    const commentId = req.params.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found", success: false });
    }

    const post = await Post.findById(comment.post);

    const isCommentAuthor = comment.author.toString() === userId.toString();
    const isPostAuthor = post && post.author.toString() === userId.toString();

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({
        message: "You are not authorized to delete this comment.",
        success: false,
      });
    }

    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: commentId },
    });

    await Comment.findByIdAndDelete(commentId);

    return res.status(200).json({
      message: "Comment deleted successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Delete comment error: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Delete a post (SECURITY FIXED: strict author verification)
 */
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const authorId = req.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found", success: false });
    }

    // STRICT OWNERSHIP CHECK: Only author can delete their post
    if (post.author.toString() !== authorId.toString()) {
      return res.status(403).json({
        message: "Unauthorized: You can only delete your own posts.",
        success: false,
      });
    }

    // Broadcast deletion
    try {
      const io = getIO();
      io.emit("delete-post", postId);
    } catch (e) {}

    await Post.findByIdAndDelete(postId);

    // Remove from user posts
    await User.findByIdAndUpdate(authorId, {
      $pull: { posts: postId, bookmarks: postId },
    });

    // Delete associated comments
    await Comment.deleteMany({ post: postId });

    return res.status(200).json({
      message: "Post deleted successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Delete post error: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Bookmark / Unbookmark post
 */
export const bookmarkPost = async (req, res) => {
  try {
    const userId = req.userId;
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found", success: false });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    const isBookmarked = user.bookmarks.some(
      (id) => id.toString() === postId.toString()
    );

    if (isBookmarked) {
      await User.findByIdAndUpdate(userId, { $pull: { bookmarks: postId } });
      return res.status(200).json({
        message: "Post removed from bookmarks",
        type: "unsaved",
        success: true,
      });
    } else {
      await User.findByIdAndUpdate(userId, { $addToSet: { bookmarks: postId } });
      return res.status(200).json({
        message: "Post saved to bookmarks",
        type: "saved",
        success: true,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: `Bookmark error: ${error.message}`,
      success: false,
    });
  }
};
