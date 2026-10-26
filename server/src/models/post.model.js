import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    images: [
      {
        type: String,
      },
    ],
    mediaUrl: {
      type: String,
      default: "",
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    videoDuration: {
      type: Number,
      default: 0,
    },
    thumbnail: {
      type: String,
      default: "",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Keep image, images, and mediaUrl in sync
postSchema.pre("save", function () {
  if (this.images && this.images.length > 0 && !this.image) {
    this.image = this.images[0];
  }
  if (this.image && (!this.images || this.images.length === 0)) {
    this.images = [this.image];
  }
  if (!this.mediaUrl && this.image) {
    this.mediaUrl = this.image;
  }
  if (!this.image && this.mediaUrl) {
    this.image = this.mediaUrl;
  }
});

const Post = mongoose.model("Post", postSchema);
export default Post;
