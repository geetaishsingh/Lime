import React from "react";
import Skeleton from "../../components/common/Skeleton";
import "./Profile.scss";

export const ProfileSkeleton = () => {
  return (
    <div className="lime-full-profile-page" aria-busy="true" aria-label="Loading profile">
      <div className="profile-container-card">
        {/* Profile Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "36px",
            padding: "32px 24px",
            flexWrap: "wrap",
          }}
        >
          {/* Avatar */}
          <Skeleton variant="circular" width={120} height={120} style={{ flexShrink: 0 }} />

          {/* User Details */}
          <div style={{ flex: 1, minWidth: "260px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <Skeleton variant="text" width={160} height={24} />
              <Skeleton variant="rectangular" width={110} height={34} borderRadius={999} />
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: "24px" }}>
              <Skeleton variant="text" width={75} height={16} />
              <Skeleton variant="text" width={85} height={16} />
              <Skeleton variant="text" width={85} height={16} />
            </div>

            {/* Bio lines */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <Skeleton variant="text" width={140} height={14} />
              <Skeleton variant="text" width="60%" height={12} />
              <Skeleton variant="text" width="40%" height={12} />
            </div>
          </div>
        </div>

        {/* Tab row */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "32px",
            borderTop: "1px solid var(--border-subtle)",
            padding: "16px 0",
          }}
        >
          <Skeleton variant="rectangular" width={80} height={20} borderRadius={6} />
          <Skeleton variant="rectangular" width={80} height={20} borderRadius={6} />
          <Skeleton variant="rectangular" width={80} height={20} borderRadius={6} />
        </div>

        {/* 3x3 Photo Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "6px",
            padding: "4px",
          }}
        >
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} style={{ aspectRatio: "1 / 1", width: "100%", overflow: "hidden", borderRadius: 8 }}>
              <Skeleton variant="rectangular" width="100%" height="100%" borderRadius={8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
