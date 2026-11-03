import './Search.scss';
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search as SearchIcon, X, ArrowLeft, UserPlus, UserCheck } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { serverUrl } from "../../config";

const Search = ({ handleShow }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [_loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState({});

  const { user } = useSelector((state) => state.user);

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
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

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
    <div
      className="search-flyout-wrapper search-panel"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Panel Header */}
      <div className="search-flyout-header search-panel-header">
        <div className="header-top header-left">
          {handleShow ? null : (
            <button
              className="panel-back-btn backBtn"
              onClick={() => (handleShow ? handleShow() : navigate(-1))}
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="search-panel-title">Search</h2>
        </div>
        {handleShow && (
          <button
            className="close-search-btn panel-close-btn closeBtn"
            onClick={handleShow}
            aria-label="Close search"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="search-input-box search-input-field-wrapper">
        <SearchIcon size={18} className="search-field-icon" />
        <input
          type="text"
          placeholder="Search by username or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
        {searchTerm && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => setSearchTerm("")}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="search-results-list">
        {results.length > 0 ? (
          results.map((item) => {
            const isFollowing = isUserFollowing(item._id);
            return (
              <div key={item._id} className="search-result-row">
                <Link
                  to={`/profile/${item._id}`}
                  className="search-user-info"
                  onClick={handleShow}
                >
                  <img
                    src={
                      item.profileImage ||
                      `https://ui-avatars.com/api/?name=${item.username}`
                    }
                    alt={item.username}
                    className="search-avatar"
                  />
                  <div className="search-text">
                    <span className="search-username">@{item.username}</span>
                    <span className="search-name">{item.name || "Member on Lime"}</span>
                  </div>
                </Link>

                {item._id !== user?._id && (
                  <button
                    type="button"
                    className={`search-follow-btn ${isFollowing ? "following" : ""}`}
                    onClick={() => followAndUnFollow(item._id)}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck size={14} />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })
        ) : searchTerm.trim() ? (
          <div className="no-search-results">
            <p>No users found matching &ldquo;{searchTerm}&rdquo;</p>
          </div>
        ) : (
          <div className="search-empty-prompt">
            <p>Search for friends and creators across Lime</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;

