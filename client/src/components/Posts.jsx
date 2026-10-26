import React, { useState } from "react";
import Post from "./Post";
import CommentModel from "./CommentModel";
import { Sparkles, Users, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

const Posts = ({ posts, activeFeedTab, onTabChange }) => {
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
          className={`feed-tab-btn ${activeFeedTab === "for-you" ? "active" : ""}`}
          onClick={() => onTabChange("for-you")}
        >
          <Sparkles size={16} />
          <span>For You</span>
        </button>
        <button
          className={`feed-tab-btn ${activeFeedTab === "following" ? "active" : ""}`}
          onClick={() => onTabChange("following")}
        >
          <Users size={16} />
          <span>Following</span>
        </button>
      </div>

      {/* Posts List */}
      <div className="posts-feed-list">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <Post key={post._id} post={post} handleComment={handleComment} />
          ))
        ) : (
          <div className="empty-feed-card">
            <div className="empty-icon-wrap">
              <ImageIcon size={42} color="#84cc16" />
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

      {/* Comment Modal */}
      {activeCommentPost && (
        <CommentModel
          post={activeCommentPost}
          handleOffModel={handleCloseComment}
        />
      )}
    </div>
  );
};

export default Posts;
