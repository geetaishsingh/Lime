import Notification from "../models/notification.model.js";
import { getIO, getReceiverSocketId } from "../../socket.js";

/**
 * Reusable helper to create a persistent notification and dispatch via socket
 */
export const createNotification = async ({
  recipient,
  sender,
  type,
  post = null,
  comment = null,
  message = "",
}) => {
  try {
    // Avoid self-notification
    if (!recipient || !sender || recipient.toString() === sender.toString()) {
      return null;
    }

    // Avoid duplicate unread notification for the same action
    if (type === "like" && post) {
      const existing = await Notification.findOne({
        recipient,
        sender,
        type: "like",
        post,
        isRead: false,
      });
      if (existing) return existing;
    }

    if (type === "follow") {
      const existing = await Notification.findOne({
        recipient,
        sender,
        type: "follow",
        isRead: false,
      });
      if (existing) return existing;
    }

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      post,
      comment,
      message,
    });

    await notification.populate("sender", "username name profileImage");
    if (post) {
      await notification.populate("post", "image mediaType caption");
    }

    // Real-time delivery via Socket.IO
    try {
      const io = getIO();
      const receiverSocketId = getReceiverSocketId(recipient.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("notification", notification);
      }
    } catch (sockErr) {
      // socket not initialized or disconnected
    }

    return notification;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
};

/**
 * Get all notifications for current user
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "username name profileImage")
      .populate("post", "image mediaType caption");

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    return res.status(200).json({
      notifications,
      unreadCount,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to fetch notifications: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
        success: false,
      });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
      unreadCount,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Error updating notification: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      message: "All notifications marked as read",
      unreadCount: 0,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Error marking all notifications as read: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    await Notification.findOneAndDelete({ _id: id, recipient: userId });

    return res.status(200).json({
      message: "Notification deleted",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Error deleting notification: ${error.message}`,
      success: false,
    });
  }
};
