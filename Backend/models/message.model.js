import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      default: "",
    },
    attachment: {
      url: { type: String, default: "" },
      mediaType: { type: String, enum: ["image", "video", "file", ""], default: "" },
      public_id: { type: String, default: "" },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      format: { type: String, default: "" },
      bytes: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "read"],
      default: "sent",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // 24-Hour Ephemeral Chat Expiration
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Automatically +24 hours
      index: { expires: 0 }, // MongoDB TTL Index to automatically delete documents at expiresAt
    },
  },
  { timestamps: true }
);

// Virtual for checking if message has expired
messageSchema.virtual("isExpired").get(function () {
  return new Date() > this.expiresAt;
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
