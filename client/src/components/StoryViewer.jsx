import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { serverUrl } from "../App";

const StoryViewer = ({
  userGroups,
  initialGroupIndex = 0,
  currentUserId,
  onClose,
  onStoryDeleted,
}) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showViewers, setShowViewers] = useState(false);

  // Status Likes state
  const [storyLiked, setStoryLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [heartAnim, setHeartAnim] = useState(false);

  const videoRef = useRef(null);
  const timerRef = useRef(null);

  const currentGroup = userGroups[groupIndex];
  const stories = currentGroup?.stories || [];
  const currentStory = stories[storyIndex];
  const isOwner =
    currentGroup?.user?._id?.toString() === currentUserId?.toString();

  // Story duration (default 5s for images, or video duration)
  const duration = (currentStory?.duration || 5) * 1000;

  // Sync likes state on story change
  useEffect(() => {
    if (currentStory) {
      setStoryLiked(Boolean(currentStory.isLiked));
      setLikesCount(currentStory.likesCount || 0);
    }
  }, [currentStory?._id]);

  // Record view on story change
  useEffect(() => {
    if (!currentStory?._id) return;

    axios
      .post(
        `${serverUrl}/api/story/${currentStory._id}/view`,
        {},
        { withCredentials: true }
      )
      .catch(() => {});
  }, [currentStory?._id]);

  // Manage progress bar animation
  useEffect(() => {
    if (isPaused || !currentStory) return;

    const interval = 50; // update every 50ms
    const step = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [currentStory, isPaused, duration, groupIndex, storyIndex]);

  // Reset progress when switching stories
  useEffect(() => {
    setProgress(0);
  }, [groupIndex, storyIndex]);

  // Handle keyboard navigation & escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") handleNextStory();
      else if (e.key === "ArrowLeft") handlePrevStory();
      else if (e.key === " ") setIsPaused((p) => !p);
      else if (e.key === "m" || e.key === "M") setIsMuted((m) => !m);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [groupIndex, storyIndex]);

  const handleNextStory = () => {
    if (storyIndex < stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
    } else if (groupIndex < userGroups.length - 1) {
      // Advance to next user's stories
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
    } else {
      // Reached the end of all stories
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
    } else if (groupIndex > 0) {
      // Go back to previous user's last story
      const prevGroup = userGroups[groupIndex - 1];
      setGroupIndex((prev) => prev - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
  };

  const handleLikeStory = async () => {
    if (!currentStory?._id) return;
    const nextLiked = !storyLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

    // Optimistic UI
    setStoryLiked(nextLiked);
    setLikesCount(nextCount);
    if (nextLiked) {
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 800);
    }

    try {
      const { data } = await axios.post(
        `${serverUrl}/api/story/${currentStory._id}/like`,
        {},
        { withCredentials: true }
      );
      if (data?.success) {
        setStoryLiked(data.liked);
        setLikesCount(data.likesCount);
      }
    } catch (err) {
      // Rollback on failure
      setStoryLiked(!nextLiked);
      setLikesCount(likesCount);
      toast.error("Failed to update status like");
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory?._id) return;
    try {
      const { data } = await axios.delete(
        `${serverUrl}/api/story/${currentStory._id}`,
        { withCredentials: true }
      );
      if (data?.success) {
        toast.success("Story deleted");
        if (onStoryDeleted) onStoryDeleted(currentStory._id);
        if (stories.length === 1) {
          onClose();
        } else {
          handleNextStory();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete story");
    }
  };

  const formatStoryTime = (dateStr) => {
    const date = new Date(dateStr);
    const diffHours = Math.floor((new Date() - date) / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.floor((new Date() - date) / (1000 * 60));
      return `${Math.max(1, diffMins)}m ago`;
    }
    return `${diffHours}h ago`;
  };

  if (!currentStory) return null;

  return (
    <div className="story-viewer-backdrop">
      {/* Desktop Backdrop Close Button */}
      <button
        className="story-viewer-close"
        onClick={onClose}
        aria-label="Close stories"
      >
        <X size={26} />
      </button>

      {/* Navigation Arrows */}
      {(groupIndex > 0 || storyIndex > 0) && (
        <button
          className="story-nav-btn story-nav-prev"
          onClick={handlePrevStory}
          aria-label="Previous story"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {(groupIndex < userGroups.length - 1 || storyIndex < stories.length - 1) && (
        <button
          className="story-nav-btn story-nav-next"
          onClick={handleNextStory}
          aria-label="Next story"
        >
          <ChevronRight size={32} />
        </button>
      )}

      <div
        className="story-viewer-card"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress Bars */}
        <div className="story-progress-bars">
          {stories.map((s, idx) => (
            <div key={s._id} className="story-progress-track">
              <div
                className="story-progress-fill"
                style={{
                  width:
                    idx < storyIndex
                      ? "100%"
                      : idx === storyIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header Bar with Correctly Positioned Controls */}
        <div className="story-viewer-header">
          <div className="story-user-badge">
            <img src={currentGroup.user?.profileImage} alt="" />
            <div>
              <span className="story-username">
                @{currentGroup.user?.username}
              </span>
              <span className="story-timestamp">
                {formatStoryTime(currentStory.createdAt)}
              </span>
            </div>
          </div>

          <div className="story-actions-header">
            {/* Audio Mute/Unmute Control */}
            {currentStory.mediaType === "video" && (
              <button
                className="story-ctrl-btn"
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? "Unmute audio" : "Mute audio"}
                aria-label="Toggle mute"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            )}

            {/* Pause / Resume Control */}
            <button
              className="story-ctrl-btn"
              onClick={() => setIsPaused((p) => !p)}
              title={isPaused ? "Play" : "Pause"}
              aria-label="Play or pause"
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
            </button>

            {/* Owner Delete Control */}
            {isOwner && (
              <button
                className="story-ctrl-btn danger"
                onClick={handleDeleteStory}
                title="Delete story"
                aria-label="Delete story"
              >
                <Trash2 size={18} />
              </button>
            )}

            {/* In-header Close Control (Responsive & accessible on mobile) */}
            <button
              className="story-ctrl-btn story-close-btn"
              onClick={onClose}
              title="Close"
              aria-label="Close story"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Media Content */}
        <div className="story-media-container">
          {currentStory.mediaType === "video" ? (
            <video
              ref={videoRef}
              src={
                currentStory.mediaUrl.startsWith("http")
                  ? currentStory.mediaUrl
                  : `${serverUrl}${currentStory.mediaUrl}`
              }
              autoPlay
              playsInline
              muted={isMuted}
              className="story-media-video"
            />
          ) : (
            <img
              src={
                currentStory.mediaUrl.startsWith("http")
                  ? currentStory.mediaUrl
                  : `${serverUrl}${currentStory.mediaUrl}`
              }
              alt="Story"
              className="story-media-image"
            />
          )}

          {/* Big Heart Animation on Double Click or Like */}
          {heartAnim && (
            <div className="story-heart-animation">
              <Heart size={80} fill="#ef4444" color="#ef4444" />
            </div>
          )}

          {/* Left / Right click trigger zones */}
          <div
            className="story-click-zone story-click-left"
            onClick={handlePrevStory}
          />
          <div
            className="story-click-zone story-click-right"
            onClick={handleNextStory}
          />
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="story-caption-overlay">
            <p>{currentStory.caption}</p>
          </div>
        )}

        {/* Footer: Status Likes & Viewers */}
        <div className="story-viewer-footer">
          {/* Owner Viewers Count Button */}
          {isOwner ? (
            <button
              className="story-viewers-count-btn"
              onClick={() => setShowViewers(!showViewers)}
            >
              <Eye size={16} />
              <span>{currentStory.viewsCount || 0} views</span>
            </button>
          ) : (
            <div className="story-footer-spacer" />
          )}

          {/* Status Likes Control */}
          <button
            className={`story-like-pill-btn ${storyLiked ? "liked" : ""}`}
            onClick={handleLikeStory}
            aria-label={storyLiked ? "Unlike status" : "Like status"}
          >
            <Heart
              size={18}
              fill={storyLiked ? "#ef4444" : "none"}
              color={storyLiked ? "#ef4444" : "#ffffff"}
            />
            <span>{likesCount}</span>
          </button>
        </div>

        {/* Viewers list popup */}
        {showViewers && (
          <div className="story-viewers-modal">
            <div className="modal-header">
              <h4>Viewed by ({currentStory.viewers?.length || 0})</h4>
              <button onClick={() => setShowViewers(false)}>✕</button>
            </div>
            <div className="viewers-list">
              {currentStory.viewers && currentStory.viewers.length > 0 ? (
                currentStory.viewers.map((v, i) => (
                  <div key={i} className="viewer-row">
                    <img src={v.user?.profileImage} alt="" />
                    <span>@{v.user?.username || "user"}</span>
                  </div>
                ))
              ) : (
                <p className="no-viewers">No views yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryViewer;
