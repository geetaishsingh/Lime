import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    caption: {
      type: String,
      default: "",
    },
    duration: {
      type: Number,
      default: 5, // 5 seconds for images, or video duration in seconds (max 30s)
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    viewers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index to auto-remove expired documents
    },
  },
  { timestamps: true }
);

// Virtual for checking if expired
storySchema.virtual("isExpired").get(function () {
  return new Date() > this.expiresAt;
});

const Story = mongoose.model("Story", storySchema);
export default Story;
