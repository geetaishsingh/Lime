import React from "react";
import Skeleton from "../common/Skeleton";
import "./StoriesBar.scss";

export const StoriesBarSkeleton = () => {
  return (
    <div className="stories-bar-container" aria-busy="true" aria-label="Loading stories">
      <div className="stories-tray">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="story-item">
            <div className="story-avatar-ring viewed-ring" style={{ border: "none" }}>
              <Skeleton variant="circular" width={56} height={56} />
            </div>
            <Skeleton variant="text" width={48} height={10} style={{ marginTop: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoriesBarSkeleton;
