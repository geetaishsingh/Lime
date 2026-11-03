import React, { useState, lazy, Suspense } from "react";
import Post from "../Post/Post";
import PostSkeleton from "../Post/PostSkeleton";
import ViewportLazy from "../common/ViewportLazy";
import { Sparkles, Users, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import "./Posts.scss";

// Lazy-load Comment Modal on demand
const CommentModal = lazy(() => import("../CommentModal/CommentModal"));

export const Posts = ({ posts, activeFeedTab, onTabChange }) => {
  const [activeCommentPost, setActiveCommentPost] = useState(null);

  const handleComment = (post) => {
    setActiveCommentPost(post);
  };

  const handleCloseComment = () => {
    setActiveCommentPost(null);
  };

  return (
    <div className="posts-container-section">
      {/* Feed Filter Tabs */}
      <div className="feed-filter-tabs">
        <button
          type="button"
          className={`feed-tab-btn ${activeFeedTab === "for-you" ? "active" : ""}`}
          onClick={() => onTabChange("for-you")}
        >
          <Sparkles size={16} />
          <span>For You</span>
        </button>
        <button
          type="button"
          className={`feed-tab-btn ${activeFeedTab === "following" ? "active" : ""}`}
          onClick={() => onTabChange("following")}
        >
          <Users size={16} />
          <span>Following</span>
        </button>
      </div>

      {/* Posts List with Viewport-based lazy loading */}
      <div className="posts-feed-list">
        {posts && posts.length > 0 ? (
          posts.map((post, index) => {
            // Prioritize above-the-fold posts (first 2 render immediately)
            if (index < 2) {
              return (
                <Post key={post._id} post={post} handleComment={handleComment} />
              );
            }

            // Below-the-fold posts load when entering within 250px of viewport
            return (
              <ViewportLazy
                key={post._id}
                placeholder={<PostSkeleton />}
                minHeight={450}
                rootMargin="250px 0px"
              >
                <Post post={post} handleComment={handleComment} />
              </ViewportLazy>
            );
          })
        ) : (
          <div className="empty-feed-card">
            <div className="empty-icon-wrap">
              <ImageIcon size={34} color="#84cc16" />
            </div>
            <h3>No posts yet</h3>
            <p>
              {activeFeedTab === "following"
                ? "Posts from people you follow will show up here. Follow some creators!"
                : "Be the first to share a moment, photo, or short video with the community."}
            </p>
            <Link to="/create-post" className="empty-create-btn">
              Create First Post
            </Link>
          </div>
        )}
      </div>

      {/* Comment Modal loaded lazily */}
      {activeCommentPost && (
        <Suspense fallback={null}>
          <CommentModal
            post={activeCommentPost}
            handleOffModel={handleCloseComment}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Posts;
