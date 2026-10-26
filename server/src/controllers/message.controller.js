import Conversation from "../models/convertation.js";
import Message from "../models/message.model.js";
import { getIO, getReceiverSocketId } from "../../socket.js";
import { isVideoMedia, processAndUploadMedia } from "../utils/mediaStorage.js";

/**
 * Get or create a conversation between current user and target user
 */
export const getOrCreateConversation = async (req, res) => {
  try {
    const senderId = req.userId;
    const receiverId = req.params.id;

    if (senderId === receiverId) {
      return res.status(400).json({
        message: "You cannot start a conversation with yourself.",
        success: false,
      });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    })
      .populate("participants", "-password -signupOtp -resetOtp")
      .populate("messages");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        messages: [],
        lastMessage: "",
      });
      conversation = await conversation.populate(
        "participants",
        "-password -signupOtp -resetOtp"
      );
    }

    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    return res.status(500).json({ message: `Conversation error: ${error.message}` });
  }
};

/**
 * Get all conversations for current user
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.userId;
    const conversations = await Conversation.find({
      participants: { $in: [userId] },
      deletedFor: { $ne: userId },
    })
      .populate("participants", "-password -signupOtp -resetOtp")
      .sort({ lastMessageTime: -1, updatedAt: -1 });

    // Calculate unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = conv.participants.find(
          (p) => p._id.toString() !== userId.toString()
        );

        let unreadCount = 0;
        if (otherUser) {
          unreadCount = await Message.countDocuments({
            senderId: otherUser._id,
            receiverId: userId,
            isRead: false,
            deletedFor: { $ne: userId },
          });
        }

        return {
          ...conv.toObject(),
          unreadCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      conversations: conversationsWithUnread,
    });
  } catch (error) {
    return res.status(500).json({ message: `Get conversations error: ${error.message}` });
  }
};

/**
 * Send Message (supports text and/or attachment)
 */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.userId;
    const receiverId = req.params.id;
    const { message, attachmentUrl, attachmentType } = req.body;
    const file = req.file;

    let attachment = { url: attachmentUrl || "", mediaType: attachmentType || "" };

    // Process file attachment if uploaded directly
    if (file) {
      const isVideo = isVideoMedia(file);
      const result = await processAndUploadMedia(file, { isVideo });
      attachment = {
        url: result.url,
        mediaType: result.mediaType,
      };
    }

    if (!message?.trim() && !attachment.url) {
      return res.status(400).json({
        message: "Message text or attachment is required.",
        success: false,
      });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        messages: [],
      });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      message: message ? message.trim() : "",
      attachment,
      status: "sent",
      isRead: false,
    });

    // Broadcast in real-time
    try {
      const io = getIO();
      const receiverSocketId = getReceiverSocketId(receiverId.toString());
      const senderSocketId = getReceiverSocketId(senderId.toString());

      if (receiverSocketId) {
        // Mark as delivered
        newMessage.status = "delivered";
        await newMessage.save();
        io.to(receiverSocketId).emit("newMessage", newMessage);

        // Notify receiver with updated unread people count
        const receiverDistinctSenders = await Message.distinct("senderId", {
          receiverId,
          isRead: false,
          deletedFor: { $ne: receiverId },
        });
        io.to(receiverSocketId).emit("unreadMessageCount", {
          count: receiverDistinctSenders.length,
          unreadSenders: receiverDistinctSenders,
        });
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("newMessage", newMessage);
      }
    } catch (sockErr) {}

    // Update conversation record
    conversation.messages.push(newMessage._id);
    conversation.lastMessage = message || (attachment.mediaType ? `[${attachment.mediaType}]` : "Attachment");
    conversation.lastMessageSender = senderId;
    conversation.lastMessageTime = new Date();
    // Remove from deletedFor if a new message arrives
    conversation.deletedFor = conversation.deletedFor.filter(
      (id) => id.toString() !== senderId.toString() && id.toString() !== receiverId.toString()
    );
    await conversation.save();

    return res.status(200).json({
      message: "Message sent",
      newMessage,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: `Send message error: ${error.message}` });
  }
};

/**
 * Get messages of conversation with a user (with authorization check & pagination)
 */
export const getMessage = async (req, res) => {
  try {
    const senderId = req.userId;
    const receiverId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;

    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
      deletedFor: { $ne: senderId },
    })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({ messages, success: true });
  } catch (error) {
    return res.status(500).json({ message: `Get message error: ${error.message}` });
  }
};

/**
 * Get count of distinct people who sent unread messages to the current user
 */
export const getUnreadMessageCount = async (req, res) => {
  try {
    const userId = req.userId;

    // Distinct senderIds who sent unread messages to this user and not deletedFor this user
    const distinctSenders = await Message.distinct("senderId", {
      receiverId: userId,
      isRead: false,
      deletedFor: { $ne: userId },
    });

    const totalUnreadMessages = await Message.countDocuments({
      receiverId: userId,
      isRead: false,
      deletedFor: { $ne: userId },
    });

    return res.status(200).json({
      success: true,
      count: distinctSenders.length, // Number of distinct people who sent unread messages
      unreadUsersCount: distinctSenders.length,
      totalUnreadMessages,
      unreadSenders: distinctSenders,
    });
  } catch (error) {
    return res.status(500).json({ message: `Unread count error: ${error.message}` });
  }
};

/**
 * Mark messages as read (Read receipts)
 */
export const readMessage = async (req, res) => {
  try {
    const { senderId } = req.params;
    const receiverId = req.userId;

    await Message.updateMany(
      { senderId, receiverId, isRead: false },
      { $set: { isRead: true, status: "read", readAt: new Date() } }
    );

    // Calculate remaining distinct senders with unread messages
    const distinctSenders = await Message.distinct("senderId", {
      receiverId,
      isRead: false,
      deletedFor: { $ne: receiverId },
    });

    // Notify sender & receiver in real time
    try {
      const io = getIO();
      const senderSocketId = getReceiverSocketId(senderId.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesSeen", { by: receiverId });
      }
      const receiverSocketId = getReceiverSocketId(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("unreadMessageCount", {
          count: distinctSenders.length,
          unreadSenders: distinctSenders,
        });
      }
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
      unreadCount: distinctSenders.length,
      unreadSenders: distinctSenders,
    });
  } catch (error) {
    return res.status(500).json({ message: `Read message error: ${error.message}` });
  }
};

/**
 * Delete message(s) (delete for me vs delete for everyone)
 */
export const deleteMessage = async (req, res) => {
  try {
    const { messageIds, deleteFor } = req.body;
    const userId = req.userId;

    if (!messageIds || messageIds.length === 0) {
      return res.status(400).json({ message: "No messages selected." });
    }

    if (deleteFor === "everyone") {
      const messages = await Message.find({
        _id: { $in: messageIds },
        senderId: userId, // Only author can delete for everyone
      });

      if (messages.length === 0) {
        return res.status(403).json({
          message: "You can only delete your own sent messages for everyone.",
        });
      }

      await Message.deleteMany({
        _id: { $in: messages.map((m) => m._id) },
        senderId: userId,
      });

      try {
        const io = getIO();
        messages.forEach((msg) => {
          const receiverSocketId = getReceiverSocketId(msg.receiverId.toString());
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("messagesDeleted", { messageIds });
          }
        });
      } catch (e) {}
    } else {
      // Delete for me
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $addToSet: { deletedFor: userId } }
      );
    }

    return res.status(200).json({ success: true, message: "Messages deleted." });
  } catch (error) {
    return res.status(500).json({ message: `Delete error: ${error.message}` });
  }
};

/**
 * Delete conversation for current user
 */
export const deleteConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { convId } = req.params;

    const conversation = await Conversation.findById(convId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(403).json({ message: "Unauthorized." });
    }

    await Conversation.findByIdAndUpdate(convId, {
      $addToSet: { deletedFor: userId },
    });

    return res.status(200).json({ success: true, message: "Conversation removed" });
  } catch (error) {
    return res.status(500).json({ message: `Delete conversation error: ${error.message}` });
  }
};

/**
 * Mute conversation notifications
 */
export const muteConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { convId } = req.params;
    const { duration } = req.body; // '8h' | '1w' | 'always'

    let mutedUntil = null;
    if (duration === "8h") {
      mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000);
    } else if (duration === "1w") {
      mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    await Conversation.findByIdAndUpdate(convId, {
      $pull: { mutedChats: { userId } },
    });

    await Conversation.findByIdAndUpdate(convId, {
      $push: { mutedChats: { userId, mutedUntil } },
    });

    return res.status(200).json({ success: true, message: "Conversation muted" });
  } catch (error) {
    return res.status(500).json({ message: `Mute error: ${error.message}` });
  }
};

/**
 * Unmute conversation
 */
export const unmuteConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { convId } = req.params;

    await Conversation.findByIdAndUpdate(convId, {
      $pull: { mutedChats: { userId } },
    });

    return res.status(200).json({ success: true, message: "Conversation unmuted" });
  } catch (error) {
    return res.status(500).json({ message: `Unmute error: ${error.message}` });
  }
};
