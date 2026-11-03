import React, { useState, memo } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { serverUrl } from "../../config";
import { Sparkles, UserPlus, UserCheck } from "lucide-react";
import "./RightSidebar.scss";

export const RightSidebar = () => {
  const { user, mySuggestions } = useSelector((state) => state.user);
  const [followingMap, setFollowingMap] = useState({});

  if (!user) return null;

  const followAndUnFollow = async (targetId) => {
    try {
      const { data } = await axios.post(
        `${serverUrl}/api/user/follow-or-unfollow/${targetId}`,
        {},
        { withCredentials: true }
      );
      if (data?.success) {
        toast.success(data.message);
        setFollowingMap((prev) => ({
          ...prev,
          [targetId]: data.isFollowing,
        }));
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Action failed");
    }
  };

  const isUserFollowing = (targetId) => {
    if (followingMap[targetId] !== undefined) {
      return followingMap[targetId];
    }
    return user?.following?.some(
      (id) => (id?._id || id)?.toString() === targetId?.toString()
    );
  };

  return (
    <aside className="right-sidebar">
      <div className="sidebar-inner-card">
        {/* Current User Snapshot */}
        <div className="current-user-card">
          <Link to={`/profile/${user._id}`} className="user-snapshot-link">
            <img
              src={user.profileImage || `https://ui-avatars.com/api/?name=${user.username}&background=84cc16&color=09090b`}
              alt={user.username}
              className="snapshot-avatar"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${user.username}&background=84cc16&color=09090b`;
              }}
            />
            <div className="snapshot-info">
              <span className="snapshot-username">@{user.username}</span>
              <span className="snapshot-name">{user.name || "Lime Member"}</span>
            </div>
          </Link>
          <Link to={`/edit-profile/${user._id}`} className="edit-link-pill">
            Switch
          </Link>
        </div>

        {/* Suggested Users Header */}
        <div className="suggested-section-header">
          <div className="header-left">
            <Sparkles size={16} color="#84cc16" />
            <span>Suggested for you</span>
          </div>
          <Link to="/search" className="see-all-link">
            See All
          </Link>
        </div>

        {/* Suggestions List */}
        <div className="suggested-users-list">
          {mySuggestions && mySuggestions.length > 0 ? (
            mySuggestions.slice(0, 5).map((suggestedUser) => {
              const following = isUserFollowing(suggestedUser._id);
              return (
                <div key={suggestedUser._id} className="suggested-user-row">
                  <div className="suggested-user-info">
                    <Link to={`/profile/${suggestedUser._id}`}>
                      <img
                        src={
                          suggestedUser.profileImage ||
                          `https://ui-avatars.com/api/?name=${suggestedUser.username}&background=27272a&color=f4f4f5`
                        }
                        alt={suggestedUser.username}
                        className="suggested-avatar"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${suggestedUser.username}&background=27272a&color=f4f4f5`;
                        }}
                      />
                    </Link>
                    <div className="user-text">
                      <Link
                        to={`/profile/${suggestedUser._id}`}
                        className="suggested-username"
                      >
                        @{suggestedUser.username}
                      </Link>
                      <span className="suggested-bio">
                        {suggestedUser.bio || suggestedUser.name || "Suggested for you"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`follow-toggle-btn ${following ? "following" : ""}`}
                    onClick={() => followAndUnFollow(suggestedUser._id)}
                  >
                    {following ? (
                      <>
                        <UserCheck size={14} /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} /> Follow
                      </>
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <p className="no-suggestions-note">No suggestions right now</p>
          )}
        </div>

        {/* Micro Footer */}
        <div className="sidebar-footer">
          <div className="footer-links">
            <a href="#about">About</a> &bull; <a href="#help">Help</a> &bull;{" "}
            <a href="#terms">Terms</a> &bull; <a href="#privacy">Privacy</a>
          </div>
          <p className="copyright-text">&copy; 2026 LIME PLATFORM</p>
        </div>
      </div>
    </aside>
  );
};

export default memo(RightSidebar);
