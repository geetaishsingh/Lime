import React from "react";
import Skeleton from "../common/Skeleton";
import "./Post.scss";

export const PostSkeleton = () => {
  return (
    <article className="lime-post-card" aria-busy="true" aria-label="Loading post">
      {/* Header */}
      <div className="post-header">
        <div className="author-link" style={{ pointerEvents: "none" }}>
          <Skeleton variant="circular" width={38} height={38} />
          <div className="author-meta" style={{ gap: 6 }}>
            <Skeleton variant="text" width={110} height={13} />
            <Skeleton variant="text" width={60} height={10} />
          </div>
        </div>
        <Skeleton variant="circular" width={24} height={24} />
      </div>

      {/* Media Canvas Placeholder */}
      <div className="post-media-stage" style={{ minHeight: "380px", backgroundColor: "transparent" }}>
        <Skeleton variant="rectangular" width="100%" height={380} borderRadius={0} />
      </div>

      {/* Action Buttons Bar */}
      <div className="post-actions-bar">
        <div className="actions-left" style={{ gap: 14 }}>
          <Skeleton variant="circular" width={22} height={22} />
          <Skeleton variant="circular" width={22} height={22} />
          <Skeleton variant="circular" width={22} height={22} />
        </div>
        <Skeleton variant="circular" width={22} height={22} />
      </div>

      {/* Details / Caption */}
      <div className="post-details-section" style={{ gap: 8, paddingBottom: 16 }}>
        <Skeleton variant="text" width={90} height={13} />
        <Skeleton variant="text" width="75%" height={12} />
        <Skeleton variant="text" width={120} height={11} style={{ marginTop: 4 }} />
      </div>
    </article>
  );
};

export default PostSkeleton;
