import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search as SearchIcon, X, ArrowLeft, UserPlus, UserCheck } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { serverUrl } from "../App";

const Search = ({ handleShow }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState({});

  const { user } = useSelector((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `${serverUrl}/api/user/search?search=${encodeURIComponent(
            searchTerm.trim()
          )}`,
          { withCredentials: true }
        );
        if (data?.users) {
          setResults(data.users);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

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
    <div className="search-flyout-wrapper">
      <div className="search-flyout-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="search-back-btn"
            onClick={() => (handleShow ? handleShow() : navigate(-1))}
            aria-label="Back"
            title="Go back"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <h2>Explore Lime</h2>
        </div>
        {handleShow && (
          <button className="close-search-btn" onClick={handleShow}>
            <X size={20} />
          </button>
        )}
      </div>

      <div className="search-input-box">
        <SearchIcon size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search by name or username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
        {searchTerm && (
          <button
            className="clear-search-btn"
            onClick={() => setSearchTerm("")}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="search-results-list">
        {loading ? (
          <div className="search-loading-state">
            <div className="loading-spinner" />
            <span>Searching...</span>
          </div>
        ) : results.length > 0 ? (
          results.map((targetUser) => {
            const isFollowing = isUserFollowing(targetUser._id);
            return (
              <div key={targetUser._id} className="search-result-row">
                <Link
                  to={`/profile/${targetUser._id}`}
                  className="search-user-info"
                  onClick={handleShow}
                >
                  <img
                    src={targetUser.profileImage}
                    alt={targetUser.username}
                    className="search-avatar"
                  />
                  <div className="search-user-text">
                    <span className="search-username">
                      @{targetUser.username}
                    </span>
                    <span className="search-name">
                      {targetUser.name || "Lime Member"}
                    </span>
                  </div>
                </Link>

                {targetUser._id !== user?._id && (
                  <button
                    className={`search-follow-btn ${
                      isFollowing ? "following" : ""
                    }`}
                    onClick={() =>
                      followAndUnFollow(targetUser._id, targetUser.username)
                    }
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck size={14} /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} /> Follow
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })
        ) : searchTerm ? (
          <div className="search-empty-state">
            <p>No results found for "{searchTerm}"</p>
          </div>
        ) : (
          <div className="search-placeholder-state">
            <SearchIcon size={36} color="#84cc16" />
            <p>Find friends, creators, and colleagues on Lime.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
