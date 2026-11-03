import './CommentModal.scss';
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import {
  X,
  Heart,
  Bookmark,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { serverUrl, getMediaUrl } from "../../config";
import CustomVideoPlayer from "../CustomVideoPlayer";
import {
  addBookmark,
  addLiked,
  removeBookmark,
  removeLiked,
} from "../../store/user.slice";

const CommentModel = ({
  post,
  handleOffModel,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  const { user, myBookmarks } = useSelector((state) => state.user);
  const [text, setText] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [likes, setLikes] = useState(post?.likes || []);

  const dispatch = useDispatch();

  const isLiked = likes.some(
    (id) => (id?._id || id)?.toString() === user?._id?.toString()
  );

  const isBookmarked = Boolean(
    myBookmarks &&
      post?._id &&
      myBookmarks.some((id) => (id?._id || id)?.toString() === post._id?.toString())
  );

  const postId = post?._id;
  const fetchComments = useCallback(async () => {
    if (!postId) return;
    try {
      const { data } = await axios.get(
        `${serverUrl}/api/post/${postId}/post/comments`,
        { withCredentials: true }
      );
      if (data?.success) {
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    try {
      setLoading(true);
      const { data } = await axios.post(
        `${serverUrl}/api/post/${post._id}/comment`,
        { text: text.trim() },
        { withCredentials: true }
      );
      if (data?.success) {
        setComments((prev) => [data.comment, ...prev]);
        setText("");
        toast.success("Comment posted");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post comment");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const { data } = await axios.delete(
        `${serverUrl}/api/post/post/comment/delete/${commentId}`,
        { withCredentials: true }
      );
      if (data?.success) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        toast.success("Comment deleted");
      }
    } catch (_err) {
      toast.error("Failed to delete comment");
    }
  };

  const handleLikes = async () => {
    try {
      if (!isLiked) {
        setLikes((prev) => [...prev, user._id]);
        dispatch(addLiked(post));
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
        await axios.post(
          `${serverUrl}/api/post/${post._id}/dislike`,
          {},
          { withCredentials: true }
        );
      }
    } catch (_err) {
      setLikes(post?.likes || []);
    }
  };

  const handleBookmark = async () => {
    try {
      if (isBookmarked) {
        dispatch(removeBookmark(post._id));
      } else {
        dispatch(addBookmark(post._id));
      }
      await axios.post(
        `${serverUrl}/api/post/${post._id}/bookmark`,
        {},
        { withCredentials: true }
      );
    } catch (_err) {}
  };

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Extract images array for multi-image carousel support
  const imagesList =
    post?.images && post.images.length > 0
      ? post.images
      : post?.image
      ? [post.image]
      : post?.mediaUrl
      ? [post.mediaUrl]
      : [];

  // Reset image index when switching posts
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [post?._id]);

  const currentMedia = imagesList[currentImageIndex] || post?.image || post?.mediaUrl || "";
  const mediaSource = getMediaUrl(currentMedia);

  const isVideo =
    post?.mediaType === "video" ||
    currentMedia?.endsWith(".mp4") ||
    currentMedia?.includes("/video/");

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (imagesList.length > 1 && currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    } else if (hasPrevious && onPrevious) {
      onPrevious();
    }
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (imagesList.length > 1 && currentImageIndex < imagesList.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    } else if (hasNext && onNext) {
      onNext();
    }
  };

  // Keyboard navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        if (imagesList.length > 1 && currentImageIndex > 0) {
          setCurrentImageIndex((prev) => prev - 1);
        } else if (hasPrevious && onPrevious) {
          onPrevious();
        }
      } else if (e.key === "ArrowRight") {
        if (imagesList.length > 1 && currentImageIndex < imagesList.length - 1) {
          setCurrentImageIndex((prev) => prev + 1);
        } else if (hasNext && onNext) {
          onNext();
        }
      } else if (e.key === "Escape") {
        handleOffModel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentImageIndex, imagesList.length, hasPrevious, onPrevious, hasNext, onNext, handleOffModel]);

  return (
    <div className="modal-overlay" onClick={handleOffModel}>
      {/* Floating External Post Navigation (Desktop) */}
      {hasPrevious && onPrevious && (
        <button
          type="button"
          className="post-floating-nav post-floating-nav-prev"
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          aria-label="Previous post"
        >
          <ChevronLeft size={28} />
        </button>
      )}
      {hasNext && onNext && (
        <button
          type="button"
          className="post-floating-nav post-floating-nav-next"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next post"
        >
          <ChevronRight size={28} />
        </button>
      )}

      <div
        className="comment-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-corner-btn"
          onClick={handleOffModel}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Left Column: Media */}
        <div className="modal-media-pane">
          {/* Previous Button (navigates photos or previous post) */}
          {(currentImageIndex > 0 || (hasPrevious && onPrevious && imagesList.length <= 1)) && (
            <button
              type="button"
              className="carousel-btn carousel-prev"
              onClick={handlePrev}
              aria-label="Previous image"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {isVideo ? (
            <CustomVideoPlayer
              key={mediaSource}
              src={mediaSource}
              autoPlay
              loop
              initialMuted={false}
              onDoubleClick={handleLikes}
              className="modal-media-content"
            />
          ) : (
            <img
              key={mediaSource}
              src={mediaSource}
              alt="Post"
              className="modal-media-content"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60";
              }}
            />
          )}

          {/* Next Button (navigates photos or next post) */}
          {(currentImageIndex < imagesList.length - 1 || (hasNext && onNext && imagesList.length <= 1)) && (
            <button
              type="button"
              className="carousel-btn carousel-next"
              onClick={handleNext}
              aria-label="Next image"
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Carousel dots and counter badge for multiple images */}
          {imagesList.length > 1 && (
            <>
              <div className="carousel-dots-tray">
                {imagesList.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`carousel-dot ${
                      idx === currentImageIndex ? "active" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    aria-label={`Go to photo ${idx + 1}`}
                  />
                ))}
              </div>

              <span className="carousel-counter-badge">
                {currentImageIndex + 1}/{imagesList.length}
              </span>
            </>
          )}
        </div>

        {/* Right Column: Comments & Details */}
        <div className="modal-comments-pane">
          {/* Author Header */}
          <div className="modal-author-header">
            <Link
              to={`/profile/${post?.author?._id}`}
              className="author-info-link"
              onClick={handleOffModel}
            >
              <img
                src={getMediaUrl(post?.author?.profileImage)}
                alt={post?.author?.username}
                className="author-avatar"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    post?.author?.username || "User"
                  )}&background=84cc16&color=09090b`;
                }}
              />
              <div className="author-text-meta">
                <span className="author-name">@{post?.author?.username}</span>
                {post?.author?.name && (
                  <span className="author-sub">{post?.author?.name}</span>
                )}
              </div>
            </Link>
          </div>

          {/* Comments Feed List */}
          <div className="modal-comments-scrollable">
            {/* Post caption as first comment entry */}
            {post?.caption && (
              <div className="comment-bubble caption-bubble">
                <Link
                  to={`/profile/${post?.author?._id}`}
                  onClick={handleOffModel}
                >
                  <img
                    src={getMediaUrl(post?.author?.profileImage)}
                    alt=""
                    className="commenter-avatar"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        post?.author?.username || "User"
                      )}&background=27272a&color=f4f4f5`;
                    }}
                  />
                </Link>
                <div className="comment-text-box">
                  <p>
                    <strong className="commenter-name">
                      @{post?.author?.username}
                    </strong>{" "}
                    {post.caption}
                  </p>
                </div>
              </div>
            )}

            {/* User Comments */}
            {comments.length > 0 ? (
              comments.map((c) => {
                const canDelete =
                  c.author?._id === user?._id || post?.author?._id === user?._id;
                return (
                  <div key={c._id} className="comment-bubble">
                    <Link
                      to={`/profile/${c.author?._id}`}
                      onClick={handleOffModel}
                    >
                      <img
                        src={getMediaUrl(c.author?.profileImage)}
                        alt=""
                        className="commenter-avatar"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            c.author?.username || "User"
                          )}&background=27272a&color=f4f4f5`;
                        }}
                      />
                    </Link>
                    <div className="comment-text-box">
                      <p>
                        <strong className="commenter-name">
                          @{c.author?.username}
                        </strong>{" "}
                        {c.text}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        className="delete-comment-btn"
                        onClick={() => handleDeleteComment(c._id)}
                        title="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })
            ) : !post?.caption ? (
              <div className="empty-comments-state">
                <p>No comments yet.</p>
                <span>Be the first to share your thoughts!</span>
              </div>
            ) : null}
          </div>

          {/* Action Bar */}
          <div className="modal-actions-bar">
            <div className="actions-left">
              <button
                className={`action-btn ${isLiked ? "liked" : ""}`}
                onClick={handleLikes}
              >
                <Heart
                  size={22}
                  fill={isLiked ? "#ef4444" : "none"}
                  color={isLiked ? "#ef4444" : "currentColor"}
                />
              </button>
            </div>
            <button
              className={`action-btn ${isBookmarked ? "bookmarked" : ""}`}
              onClick={handleBookmark}
            >
              <Bookmark
                size={22}
                fill={isBookmarked ? "#84cc16" : "none"}
                color={isBookmarked ? "#84cc16" : "currentColor"}
              />
            </button>
          </div>

          <div className="modal-likes-count">
            <b>{likes.length}</b> {likes.length === 1 ? "like" : "likes"}
          </div>

          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="modal-comment-form">
            <input
              type="text"
              placeholder="Add a comment on Lime..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="modal-comment-input"
            />
            <button
              type="submit"
              className="modal-comment-submit-btn"
              disabled={loading || !text.trim()}
            >
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommentModel;


