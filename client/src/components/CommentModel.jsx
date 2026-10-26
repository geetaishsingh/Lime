import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import {
  X,
  Heart,
  Bookmark,
  Share2,
  Trash2,
  Send,
  MoreHorizontal,
} from "lucide-react";
import { serverUrl } from "../App";
import CustomVideoPlayer from "./CustomVideoPlayer";
import {
  addBookmark,
  addLiked,
  removeBookmark,
  removeLiked,
} from "../redux/user.slice";

const CommentModel = ({ post, handleOffModel }) => {
  const { user, myBookmarks } = useSelector((state) => state.user);
  const [text, setText] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [likes, setLikes] = useState(post?.likes || []);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const dispatch = useDispatch();

  const isLiked = likes.some(
    (id) => (id?._id || id)?.toString() === user?._id?.toString()
  );

  useEffect(() => {
    if (myBookmarks && post?._id) {
      const exists = myBookmarks.some(
        (id) => (id?._id || id)?.toString() === post._id?.toString()
      );
      setIsBookmarked(exists);
    }
  }, [myBookmarks, post?._id]);

  const fetchComments = async () => {
    try {
      const { data } = await axios.get(
        `${serverUrl}/api/post/${post._id}/post/comments`,
        { withCredentials: true }
      );
      if (data?.success) {
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [post?._id]);

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
    } catch (err) {
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
    } catch (err) {
      setLikes(post?.likes || []);
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
      await axios.post(
        `${serverUrl}/api/post/${post._id}/bookmark`,
        {},
        { withCredentials: true }
      );
    } catch (err) {}
  };

  const isVideo =
    post?.mediaType === "video" ||
    post?.image?.endsWith(".mp4") ||
    post?.image?.includes("/video/");

  const mediaSource = post?.image?.startsWith("http")
    ? post.image
    : `${serverUrl}${post.image}`;

  return (
    <div className="modal-overlay" onClick={handleOffModel}>
      <div
        className="comment-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-corner-btn" onClick={handleOffModel}>
          <X size={22} />
        </button>

        {/* Left Column: Media */}
        <div className="modal-media-pane">
          {isVideo ? (
            <CustomVideoPlayer
              src={mediaSource}
              autoPlay
              loop
              initialMuted={false}
              onDoubleClick={handleLikes}
              className="modal-media-content"
            />
          ) : (
            <img
              src={mediaSource}
              alt="Post"
              className="modal-media-content"
            />
          )}
        </div>

        {/* Right Column: Comments & Details */}
        <div className="modal-details-pane">
          {/* Header */}
          <div className="modal-author-header">
            <Link
              to={`/profile/${post?.author?._id}`}
              className="author-pill-link"
              onClick={handleOffModel}
            >
              <img
                src={post?.author?.profileImage}
                alt={post?.author?.username}
                className="author-avatar"
              />
              <span className="author-username">@{post?.author?.username}</span>
            </Link>
          </div>

          {/* Caption & Comments Scroll */}
          <div className="modal-comments-scroll">
            {post?.caption && (
              <div className="caption-entry-row">
                <img
                  src={post?.author?.profileImage}
                  alt=""
                  className="comment-avatar"
                />
                <div className="entry-body">
                  <p>
                    <strong className="entry-username">
                      @{post?.author?.username}
                    </strong>{" "}
                    {post.caption}
                  </p>
                </div>
              </div>
            )}

            {comments.length > 0 ? (
              comments.map((comment) => {
                const canDelete =
                  comment.author?._id?.toString() === user?._id?.toString() ||
                  post?.author?._id?.toString() === user?._id?.toString();

                return (
                  <div key={comment._id} className="comment-entry-row">
                    <Link
                      to={`/profile/${comment.author?._id}`}
                      onClick={handleOffModel}
                    >
                      <img
                        src={comment.author?.profileImage}
                        alt={comment.author?.username}
                        className="comment-avatar"
                      />
                    </Link>
                    <div className="entry-body">
                      <p>
                        <Link
                          to={`/profile/${comment.author?._id}`}
                          className="entry-username"
                          onClick={handleOffModel}
                        >
                          @{comment.author?.username}
                        </Link>{" "}
                        {comment.text}
                      </p>
                      <span className="comment-time">
                        {new Date(comment.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {canDelete && (
                      <button
                        className="delete-comment-btn"
                        onClick={() => handleDeleteComment(comment._id)}
                        title="Delete comment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="no-comments-note">
                <p>No comments yet. Start the conversation!</p>
              </div>
            )}
          </div>

          {/* Actions Bar */}
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
