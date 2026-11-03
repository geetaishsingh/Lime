import React from "react";
import Skeleton from "../../components/common/Skeleton";
import "./Search.scss";

export const SearchSkeleton = () => {
  return (
    <div className="search-flyout-wrapper" aria-busy="true" aria-label="Loading search">
      <div className="search-flyout-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 12 }}>
          <Skeleton variant="text" width={80} height={20} />
          <Skeleton variant="circular" width={24} height={24} />
        </div>
        <Skeleton variant="rectangular" width="100%" height={40} borderRadius={10} />
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Skeleton variant="circular" width={42} height={42} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Skeleton variant="text" width={110} height={14} />
                <Skeleton variant="text" width={75} height={11} />
              </div>
            </div>
            <Skeleton variant="rectangular" width={64} height={28} borderRadius={999} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchSkeleton;
