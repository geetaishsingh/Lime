import React from "react";
import Skeleton from "../../components/common/Skeleton";
import "./Messages.scss";

export const MessagesSkeleton = () => {
  return (
    <div className="messages-layout-container" aria-busy="true" aria-label="Loading messages">
      {/* Left Chat List Panel Skeleton */}
      <div
        style={{
          width: 320,
          minWidth: 320,
          borderRight: "1px solid var(--border-subtle)",
          backgroundColor: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Skeleton variant="text" width={110} height={20} />
          <Skeleton variant="text" width={70} height={12} style={{ marginTop: 4 }} />
        </div>

        {/* Search */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Skeleton variant="rectangular" width="100%" height={34} borderRadius={8} />
        </div>

        {/* Conversation rows */}
        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
              <Skeleton variant="circular" width={44} height={44} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Skeleton variant="text" width={90} height={13} />
                  <Skeleton variant="text" width={30} height={10} />
                </div>
                <Skeleton variant="text" width={140} height={11} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Conversation Panel Skeleton */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-card)",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Skeleton variant="circular" width={40} height={40} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Skeleton variant="text" width={120} height={14} />
            <Skeleton variant="text" width={60} height={10} />
          </div>
        </div>

        {/* Messages Body Placeholder */}
        <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ alignSelf: "flex-start", width: "45%" }}>
            <Skeleton variant="rectangular" width="100%" height={48} borderRadius={16} />
          </div>
          <div style={{ alignSelf: "flex-end", width: "50%" }}>
            <Skeleton variant="rectangular" width="100%" height={56} borderRadius={16} />
          </div>
          <div style={{ alignSelf: "flex-start", width: "35%" }}>
            <Skeleton variant="rectangular" width="100%" height={40} borderRadius={16} />
          </div>
        </div>

        {/* Input Bar Placeholder */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 10 }}>
          <Skeleton variant="rectangular" width="100%" height={42} borderRadius={999} />
          <Skeleton variant="circular" width={42} height={42} style={{ flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
};

export default MessagesSkeleton;
