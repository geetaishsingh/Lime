import Message from "../models/message.model.js";
import Conversation from "../models/convertation.js";
import { deleteMediaFile } from "../utils/mediaStorage.js";

/**
 * Sweeps and permanently purges chat messages (texts, photos, videos)
 * that are older than 24 hours, along with their physical media files.
 */
export const cleanupExpiredChats = async () => {
  try {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const now = new Date();

    // Query messages that have passed their 24h expiration
    const expiredMessages = await Message.find({
      $or: [
        { expiresAt: { $lte: now } },
        { createdAt: { $lte: cutoffTime } },
      ],
    }).select("_id attachment");

    if (!expiredMessages || expiredMessages.length === 0) {
      return { purgedCount: 0, mediaCount: 0 };
    }

    let mediaPurgedCount = 0;
    const expiredIds = [];

    // Delete any attached photos or videos from disk or Cloudinary
    for (const msg of expiredMessages) {
      expiredIds.push(msg._id);
      if (msg.attachment?.url) {
        await deleteMediaFile(msg.attachment.url);
        mediaPurgedCount++;
      }
    }

    // Delete the expired messages from MongoDB
    await Message.deleteMany({ _id: { $in: expiredIds } });

    // Remove expired message references from conversations
    await Conversation.updateMany(
      { messages: { $in: expiredIds } },
      { $pull: { messages: { $in: expiredIds } } }
    );

    // If conversation lastMessageTime is older than 24 hours, refresh preview
    const staleConversations = await Conversation.find({
      lastMessageTime: { $lte: cutoffTime },
    });

    for (const conv of staleConversations) {
      // Check if there are any remaining non-expired messages
      const remainingMsg = await Message.findOne({
        _id: { $in: conv.messages },
        createdAt: { $gt: cutoffTime },
      }).sort({ createdAt: -1 });

      if (remainingMsg) {
        conv.lastMessage = remainingMsg.message || (remainingMsg.attachment?.mediaType ? `[${remainingMsg.attachment.mediaType}]` : "Attachment");
        conv.lastMessageSender = remainingMsg.senderId;
        conv.lastMessageTime = remainingMsg.createdAt;
      } else {
        conv.lastMessage = "";
        conv.lastMessageSender = null;
        conv.lastMessageTime = null;
      }
      await conv.save();
    }

    console.log(
      `[24h Chat Cleanup] Successfully purged ${expiredIds.length} expired message(s) and ${mediaPurgedCount} media attachment(s).`
    );

    return { purgedCount: expiredIds.length, mediaCount: mediaPurgedCount };
  } catch (error) {
    console.error("[24h Chat Cleanup Error]:", error.message);
    return { error: error.message };
  }
};

/**
 * Initializes recurring 24-hour chat cleanup task
 * @param {number} intervalMs - Polling interval in ms (default: every 10 minutes)
 */
export const initChatCleanup = (intervalMs = 10 * 60 * 1000) => {
  // Run once immediately on server startup
  cleanupExpiredChats();

  // Run periodically in the background
  const timer = setInterval(() => {
    cleanupExpiredChats();
  }, intervalMs);

  return timer;
};

export default { cleanupExpiredChats, initChatCleanup };
