import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  Trash2,
  UserPlus,
  UserCheck,
  Flag,
  Ban,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../App";
import CustomVideoPlayer from "./CustomVideoPlayer";
import {
  addBookmark,
  addLiked,
  removeBookmark,
  removeLiked,
  removePost,
  toggleBlockUserInState,
  updatePostLikesInFeed,
} from "../redux/user.slice";

const Post = ({ post, handleComment }) => {
  const { user, myBookmarks } = useSelector((state) => state.user);
  const [likes, setLikes] = useState(post?.likes || []);
  const [showMenu, setShowMenu] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Report Modal states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const dispatch = useDispatch();

  const isLiked = likes.some(
    (id) => (id?._id || id)?.toString() === user?._id?.toString()
  );
  const isAuthor =
    (post?.author?._id || post?.author)?.toString() === user?._id?.toString();
  const isFollowing = user?.following?.some(
    (id) =>
      (id?._id || id)?.toString() ===
      (post?.author?._id || post?.author)?.toString()
  );

  // Sync bookmark state
  useEffect(() => {
    if (myBookmarks && post?._id) {
      const exists = myBookmarks.some(
        (id) => (id?._id || id)?.toString() === post._id?.toString()
      );
      setIsBookmarked(exists);
    }
  }, [myBookmarks, post?._id]);

  // Keep local likes in sync with prop updates
  useEffect(() => {
    if (post?.likes) {
      setLikes(post.likes);
    }
  }, [post?.likes]);

  const handleLikes = async () => {
    try {
      if (!isLiked) {
        setLikes((prev) => [...prev, user._id]);
        dispatch(addLiked(post));
        dispatch(updatePostLikesInFeed({ postId: post._id, userId: user._id }));
        await axios.post(
          `${serverUrl}/api/post/${post._id}/like`,
          {},
          { withCredentials: true }
        );
      } else {
        setLikes((prev) =>
          prev.filter((id) => (id?._id || id)?.toString() !== user._id?.toString())
        );
        dispatch(removeLiked(post._id));
        dispatch(updatePostLikesInFeed({ postId: post._id, userId: user._id }));
        await axios.post(
          `${serverUrl}/api/post/${post._id}/dislike`,
          {},
          { withCredentials: true }
        );
      }
    } catch (error) {
      setLikes(post?.likes || []);
      toast.error(error?.response?.data?.message || "Like update failed");
    }
  };

  const handleBookmark = async () => {
    try {
      if (isBookmarked) {
        setIsBookmarked(false);
        dispatch(removeBookmark(post._id));
      } else {
        setIsBookmarked(true);
        dispatch(addBookmark(post._id));
      }
      const { data } = await axios.post(
        `${serverUrl}/api/post/${post._id}/bookmark`,
        {},
        { withCredentials: true }
      );
      if (data?.success) {
        toast.success(data.message);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Bookmark failed");
    }
  };

  const handleFollowToggle = async () => {
    try {
      const authorId = post?.author?._id || post?.author;
      const { data } = await axios.post(
        `${serverUrl}/api/user/follow-or-unfollow/${authorId}`,
        {},
        { withCredentials: true }
      );
      if (data?.success) {
        toast.success(data.message);
        setShowMenu(false);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to follow/unfollow");
    }
  };

  const handleBlockAuthor = async () => {
    const authorId = post?.author?._id || post?.author;
    try {
      const { data } = await axios.post(
        `${serverUrl}/api/user/block/${authorId}`,
        {},
        { withCredentials: true }
      );
      if (data?.success) {
        toast.success(data.message || `Blocked @${post?.author?.username}`);
        dispatch(toggleBlockUserInState(authorId));
        setShowMenu(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to block user");
    }
  };

  const handleReportSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      setSubmittingReport(true);
      const { data } = await axios.post(
        `${serverUrl}/api/user/report`,
        {
          reportedPost: post._id,
          reason: reportReason,
          details: reportDetails.trim(),
        },
        { withCredentials: true }
      );
      if (data?.success) {
        toast.success("Thank you. Post reported for moderator review.");
        setReportModalOpen(false);
        setReportDetails("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit report");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDeletePost = async () => {
    try {
      const { data } = await axios.delete(
        `${serverUrl}/api/post/post/delete/${post._id}`,
        { withCredentials: true }
      );
      if (data?.success) {
        toast.success("Post deleted successfully");
        dispatch(removePost(post._id));
        setDeleteModalOpen(false);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete post");
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/profile/${post?.author?._id || ""}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by @${post?.author?.username}`,
          text: post?.caption || "Check out this post on Lime",
          url: postUrl,
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(postUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  const formatPostTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const diffSec = Math.floor((new Date() - date) / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isVideo =
    post?.mediaType === "video" ||
    post?.image?.endsWith(".mp4") ||
    post?.image?.includes("/video/");

  // Array of images for multiple image support
  const imagesList =
    post?.images && post.images.length > 0
      ? post.images
      : post?.image
      ? [post.image]
      : [];

  const currentMediaUrl = imagesList[currentImageIndex] || post?.image || "";
  const mediaSource = currentMediaUrl.startsWith("http")
    ? currentMediaUrl
    : `${serverUrl}${currentMediaUrl}`;

  const nextImage = () => {
    if (currentImageIndex < imagesList.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  };

  return (
    <article className="lime-post-card">
      {/* Post Header */}
      <header className="post-header">
        <Link to={`/profile/${post?.author?._id}`} className="author-link">
          <img
            src={post?.author?.profileImage}
            alt={post?.author?.username}
            className="author-avatar"
          />
          <div className="author-meta">
            <span className="author-username">@{post?.author?.username}</span>
            <span className="post-time">{formatPostTime(post?.createdAt)}</span>
          </div>
        </Link>

        <div className="menu-anchor">
          <button
            className="post-options-btn"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Post options"
          >
            <MoreHorizontal size={20} />
          </button>

          {showMenu && (
            <div className="post-dropdown-menu">
              {isAuthor ? (
                <button
                  className="dropdown-item danger"
                  onClick={() => {
                    setShowMenu(false);
                    setDeleteModalOpen(true);
                  }}
                >
                  <Trash2 size={16} /> Delete Post
                </button>
              ) : (
                <>
                  <button className="dropdown-item" onClick={handleFollowToggle}>
                    {isFollowing ? (
                      <>
                        <UserCheck size={16} /> Unfollow @{post?.author?.username}
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} /> Follow @{post?.author?.username}
                      </>
                    )}
                  </button>
                  <button className="dropdown-item danger" onClick={handleBlockAuthor}>
                    <Ban size={16} /> Block @{post?.author?.username}
                  </button>
                </>
              )}
              <button
                className="dropdown-item"
                onClick={() => {
                  setShowMenu(false);
                  handleShare();
                }}
              >
                <Share2 size={16} /> Share Post
              </button>
              {!isAuthor && (
                <button
                  className="dropdown-item danger"
                  onClick={() => {
                    setShowMenu(false);
                    setReportModalOpen(true);
                  }}
                >
                  <Flag size={16} /> Report Post
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Post Media Container */}
      <div className="post-media-container">
        {isVideo ? (
          <div className="video-player-wrapper">
            <CustomVideoPlayer
              src={mediaSource}
              loop
              initialMuted={isMuted}
              durationBadge={post?.videoDuration}
              onDoubleClick={handleLikes}
              className="post-media-content"
            />
          </div>
        ) : (
          <div className="image-carousel-wrapper">
            <img
              src={mediaSource}
              alt={post?.caption || "Lime post"}
              className="post-media-content"
              loading="lazy"
              onDoubleClick={handleLikes}
            />

            {/* Carousel Navigation for Multiple Images */}
            {imagesList.length > 1 && (
              <>
                {currentImageIndex > 0 && (
                  <button
                    className="carousel-btn carousel-prev"
                    onClick={prevImage}
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={22} />
                  </button>
                )}
                {currentImageIndex < imagesList.length - 1 && (
                  <button
                    className="carousel-btn carousel-next"
                    onClick={nextImage}
                    aria-label="Next image"
                  >
                    <ChevronRight size={22} />
                  </button>
                )}

                {/* Dot Indicators */}
                <div className="carousel-dots-tray">
                  {imagesList.map((_, idx) => (
                    <span
                      key={idx}
                      className={`carousel-dot ${
                        idx === currentImageIndex ? "active" : ""
                      }`}
                      onClick={() => setCurrentImageIndex(idx)}
                    />
                  ))}
                </div>

                {/* Counter Badge */}
                <span className="carousel-counter-badge">
                  {currentImageIndex + 1}/{imagesList.length}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="post-actions-bar">
        <div className="actions-left">
          <button
            className={`action-icon-btn ${isLiked ? "liked" : ""}`}
            onClick={handleLikes}
            aria-label={isLiked ? "Unlike post" : "Like post"}
          >
            <Heart
              size={22}
              fill={isLiked ? "#ef4444" : "none"}
              color={isLiked ? "#ef4444" : "currentColor"}
            />
          </button>

          <button
            className="action-icon-btn"
            onClick={() => handleComment(post)}
            aria-label="Comment"
          >
            <MessageCircle size={22} />
          </button>

          <button
            className="action-icon-btn"
            onClick={handleShare}
            aria-label="Share"
          >
            <Share2 size={20} />
          </button>
        </div>

        <button
          className={`action-icon-btn ${isBookmarked ? "bookmarked" : ""}`}
          onClick={handleBookmark}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark post"}
        >
          <Bookmark
            size={22}
            fill={isBookmarked ? "#84cc16" : "none"}
            color={isBookmarked ? "#84cc16" : "currentColor"}
          />
        </button>
      </div>

      {/* Likes count & Caption */}
      <div className="post-details-section">
        {likes.length > 0 && (
          <p className="likes-counter">
            <b>{likes.length}</b> {likes.length === 1 ? "like" : "likes"}
          </p>
        )}

        {post?.caption && (
          <div className="post-caption-block">
            <Link to={`/profile/${post?.author?._id}`} className="caption-author">
              @{post?.author?.username}
            </Link>{" "}
            <span className="caption-text">{post.caption}</span>
          </div>
        )}

        {/* Comments count shortcut */}
        {post?.comments?.length > 0 && (
          <button
            className="view-comments-btn"
            onClick={() => handleComment(post)}
          >
            View all {post.comments.length} comments
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="modal-overlay">
          <div className="confirm-dialog-card">
            <h3>Delete this post?</h3>
            <p>This action cannot be undone and will permanently remove your post.</p>
            <div className="dialog-actions">
              <button
                className="btn-cancel"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDeletePost}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Post Modal */}
      {reportModalOpen && (
        <div className="modal-overlay">
          <div className="report-modal-card">
            <div className="modal-title-bar">
              <h3>Report Post</h3>
              <button
                className="modal-close-icon"
                onClick={() => setReportModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="report-subtitle">
              Why are you reporting this post? Your report is anonymous.
            </p>

            <form onSubmit={handleReportSubmit}>
              <div className="report-options-group">
                {[
                  { value: "spam", label: "Spam or misleading" },
                  { value: "harassment", label: "Harassment or bullying" },
                  { value: "inappropriate", label: "Inappropriate or adult content" },
                  { value: "hate_speech", label: "Hate speech or discrimination" },
                  { value: "misinformation", label: "False information" },
                  { value: "other", label: "Other problem" },
                ].map((opt) => (
                  <label key={opt.value} className="report-radio-row">
                    <input
                      type="radio"
                      name="reportReason"
                      value={opt.value}
                      checked={reportReason === opt.value}
                      onChange={(e) => setReportReason(e.target.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              <textarea
                className="report-details-input"
                placeholder="Additional details (optional)..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                maxLength={300}
              />

              <div className="report-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setReportModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit-report"
                  disabled={submittingReport}
                >
                  {submittingReport ? <BeatLoader size={6} color="#fff" /> : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
};

export default Post;
