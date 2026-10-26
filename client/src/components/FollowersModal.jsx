import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import { X, Search } from "lucide-react";
import { serverUrl } from "../App";

const FollowersModal = ({ data = [], onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [followersList, setFollowersList] = useState(data);
  const [followingMap, setFollowingMap] = useState({});

  const { user } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const filteredData = followersList.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.username?.toLowerCase().includes(q) ||
      item.name?.toLowerCase().includes(q)
    );
  });

  const handleFollowToggle = async (e, targetId) => {
    e.stopPropagation();
    try {
      const { data: resData } = await axios.post(
        `${serverUrl}/api/user/follow-or-unfollow/${targetId}`,
        {},
        { withCredentials: true }
      );
      if (resData?.success) {
        toast.success(resData.message);
        setFollowingMap((prev) => ({
          ...prev,
          [targetId]: resData.isFollowing,
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update follow state");
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="users-list-dialog-card" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-top-header">
          <h3>Followers</h3>
          <button className="close-dialog-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="dialog-search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search followers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="dialog-users-scroll">
          {filteredData.length > 0 ? (
            filteredData.map((fUser) => {
              const isFollowing = isUserFollowing(fUser._id);
              const isSelf = fUser._id?.toString() === user?._id?.toString();

              return (
                <div
                  key={fUser._id}
                  className="dialog-user-row"
                  onClick={() => {
                    onClose();
                    navigate(`/profile/${fUser._id}`);
                  }}
                >
                  <img
                    src={fUser.profileImage}
                    alt={fUser.username}
                    className="dialog-user-avatar"
                  />
                  <div className="dialog-user-info">
                    <span className="username">@{fUser.username}</span>
                    <span className="name">{fUser.name || "Lime Member"}</span>
                  </div>

                  {!isSelf && (
                    <button
                      className={`dialog-action-btn ${isFollowing ? "following" : ""}`}
                      onClick={(e) => handleFollowToggle(e, fUser._id)}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <p className="no-users-note">No followers found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowersModal;
