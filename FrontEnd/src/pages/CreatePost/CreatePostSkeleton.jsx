import React from "react";
import Skeleton from "../../components/common/Skeleton";
import "./CreatePost.scss";

export const CreatePostSkeleton = () => {
  return (
    <div className="create-post-wrapper" aria-busy="true" aria-label="Loading create post">
      <div className="create-post-container">
        <div className="create-post-card">
          {/* Card Top Bar */}
          <div className="card-top-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="text" width={140} height={20} />
            <div style={{ width: 28 }} />
          </div>

          {/* Form Content */}
          <div style={{ display: "flex", flexWrap: "wrap", minHeight: "440px" }}>
            {/* Left Media Dropzone Placeholder */}
            <div style={{ flex: 1.3, minWidth: "280px", padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Skeleton variant="rectangular" width="100%" height={380} borderRadius={16} />
            </div>

            {/* Right Form Fields */}
            <div style={{ flex: 1, minWidth: "260px", padding: 24, display: "flex", flexDirection: "column", gap: 16, borderLeft: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Skeleton variant="circular" width={38} height={38} />
                <Skeleton variant="text" width={110} height={14} />
              </div>

              <Skeleton variant="rectangular" width="100%" height={120} borderRadius={12} />
              <Skeleton variant="rectangular" width="100%" height={44} borderRadius={10} />
              <div style={{ marginTop: "auto" }}>
                <Skeleton variant="rectangular" width="100%" height={44} borderRadius={999} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostSkeleton;
