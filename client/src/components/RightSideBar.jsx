import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { serverUrl } from "../App";
import { Sparkles, UserPlus, UserCheck } from "lucide-react";

const RightSideBar = () => {
  const { user, mySuggestions } = useSelector((state) => state.user);
  const [followingMap, setFollowingMap] = useState({});

  if (!user) return null;

  const followAndUnFollow = async (targetId, username) => {
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
              src={user.profileImage}
              alt={user.username}
              className="snapshot-avatar"
            />
            <div className="snapshot-info">
              <span className="snapshot-username">@{user.username}</span>
              <span className="snapshot-name">{user.name || "Lime Member"}</span>
            </div>
          </Link>
          <Link to={`/edit-profile/${user._id}`} className="edit-link-pill">
            Edit
          </Link>
        </div>

        {/* Suggested For You Header */}
        <div className="suggested-section-header">
          <div className="header-left">
            <Sparkles size={16} color="#84cc16" />
            <span>Suggested for you</span>
          </div>
          <Link to="/search" className="see-all-link">
            Search
          </Link>
        </div>

        {/* Suggested Users List */}
        <div className="suggested-users-list">
          {mySuggestions && mySuggestions.length > 0 ? (
            mySuggestions.slice(0, 5).map((item) => {
              const following = isUserFollowing(item._id);
              return (
                <div className="suggested-user-row" key={item._id}>
                  <Link
                    to={`/profile/${item._id}`}
                    className="suggested-user-info"
                  >
                    <img
                      src={item.profileImage}
                      alt={item.username}
                      className="suggested-avatar"
                    />
                    <div className="user-text">
                      <span className="suggested-username">
                        @{item.username}
                      </span>
                      <span className="suggested-bio">
                        {item.name || "Member on Lime"}
                      </span>
                    </div>
                  </Link>

                  <button
                    className={`follow-toggle-btn ${following ? "following" : ""}`}
                    onClick={() => followAndUnFollow(item._id, item.username)}
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
            <p className="no-suggestions-note">
              No new suggestions right now. Explore people in search!
            </p>
          )}
        </div>

        {/* Footer */}
        <footer className="sidebar-footer">
          <div className="footer-links">
            <a href="#about">About</a> · <a href="#privacy">Privacy</a> ·{" "}
            <a href="#terms">Terms</a> · <a href="#help">Help</a>
          </div>
          <p className="copyright-text">© 2026 Lime Social Network</p>
        </footer>
      </div>
    </aside>
  );
};

export default RightSideBar;
