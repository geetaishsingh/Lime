import React from "react";
import Skeleton from "../../components/common/Skeleton";
import StoriesBarSkeleton from "../../components/StoriesBar/StoriesBarSkeleton";
import PostSkeleton from "../../components/Post/PostSkeleton";
import "./Home.scss";

export const HomeSkeleton = () => {
  return (
    <div className="feed-container" aria-busy="true" aria-label="Loading feed">
      <div className="feed-inner-container">
        <main className="central-feed-column">
          {/* Stories Bar Skeleton */}
          <StoriesBarSkeleton />

          {/* Filter Tabs Skeleton */}
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: 4,
              backgroundColor: "var(--bg-card)",
              borderRadius: 16,
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Skeleton variant="rectangular" width="50%" height={38} borderRadius={12} />
            <Skeleton variant="rectangular" width="50%" height={38} borderRadius={12} />
          </div>

          {/* Post Feed Skeletons */}
          <PostSkeleton />
          <PostSkeleton />
        </main>

        {/* Right Sidebar Skeleton (matches RightSidebar layout) */}
        <aside className="right-sidebar">
          <div className="sidebar-inner-card">
            {/* User snapshot skeleton */}
            <div className="current-user-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Skeleton variant="circular" width={46} height={46} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Skeleton variant="text" width={100} height={13} />
                  <Skeleton variant="text" width={75} height={11} />
                </div>
              </div>
              <Skeleton variant="rectangular" width={56} height={26} borderRadius={999} />
            </div>

            {/* Suggestions Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <Skeleton variant="text" width={120} height={14} />
              <Skeleton variant="text" width={45} height={12} />
            </div>

            {/* Suggestions rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Skeleton variant="circular" width={38} height={38} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <Skeleton variant="text" width={90} height={12} />
                      <Skeleton variant="text" width={65} height={10} />
                    </div>
                  </div>
                  <Skeleton variant="rectangular" width={60} height={26} borderRadius={999} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HomeSkeleton;
