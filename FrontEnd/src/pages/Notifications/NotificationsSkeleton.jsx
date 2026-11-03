import React from "react";
import Skeleton from "../../components/common/Skeleton";
import "./Notifications.scss";

export const NotificationsSkeleton = () => {
  return (
    <div className="notifContainer" aria-busy="true" aria-label="Loading notifications">
      <div className="notifHeader">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Skeleton variant="text" width={110} height={20} />
        </div>
        <Skeleton variant="circular" width={24} height={24} />
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <Skeleton variant="circular" width={42} height={42} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <Skeleton variant="text" width="80%" height={13} />
                <Skeleton variant="text" width={60} height={10} />
              </div>
            </div>
            <Skeleton variant="rectangular" width={56} height={28} borderRadius={8} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsSkeleton;
