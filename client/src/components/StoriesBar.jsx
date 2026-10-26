import React, { useState, useEffect, useRef } from "react";
import { Plus, Camera, Video, Image, X } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { useSelector } from "react-redux";
import { serverUrl } from "../App";
import StoryViewer from "./StoryViewer";
import CustomVideoPlayer from "./CustomVideoPlayer";

const VIDEO_EXTENSIONS = [
  "mp4", "m4v", "mov", "mkv", "webm", "avi", "wmv", "flv", "3gp",
  "3g2", "ts", "mts", "m2ts", "ogv", "vob", "qt", "asf", "rm",
  "rmvb", "f4v", "divx", "mpg", "mpeg"
];

const checkIsVideo = (file) => {
  if (!file) return false;
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const ext = name.split(".").pop();
  return mime.startsWith("video/") || VIDEO_EXTENSIONS.includes(ext);
};

const StoriesBar = () => {
  const { user } = useSelector((state) => state.user);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  // Active story viewer state
  const [activeViewerGroup, setActiveViewerGroup] = useState(null);
  const fileInputRef = useRef(null);

  const fetchActiveStories = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${serverUrl}/api/story/active`, {
        withCredentials: true,
      });
      if (data?.success) {
        setUserGroups(data.stories || []);
      }
    } catch (err) {
      console.error("Failed to fetch stories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchActiveStories();
    }
  }, [user?._id]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Media file exceeds 50MB size limit.");
      return;
    }

    setSelectedMedia(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadModalOpen(true);
  };

  const handleUploadStory = async (e) => {
    if (e) e.preventDefault();
    if (!selectedMedia) return;

    try {
      setUploading(true);
      const isVid = checkIsVideo(selectedMedia);
      const formData = new FormData();
      formData.append("media", selectedMedia);
      formData.append("isVideo", isVid ? "true" : "false");
      if (caption) formData.append("caption", caption);

      const { data } = await axios.post(
        `${serverUrl}/api/story/create`,
        formData,
        { withCredentials: true }
      );

      if (data?.success) {
        toast.success("Story shared to your feed!");
        setUploadModalOpen(false);
        setSelectedMedia(null);
        setPreviewUrl("");
        setCaption("");
        fetchActiveStories();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload story.");
    } finally {
      setUploading(false);
    }
  };

  const openStoryViewer = (groupIndex) => {
    setActiveViewerGroup(groupIndex);
  };

  // Find own active story group if present
  const ownGroup = userGroups.find(
    (g) => g.user?._id?.toString() === user?._id?.toString()
  );

  return (
    <div className="stories-bar-container">
      <div className="stories-tray">
        {/* Current User Story Item (Add Story) */}
        <div className="story-item own-story-item">
          <div
            className={`story-avatar-ring ${
              ownGroup?.stories?.length > 0 ? "has-story active-ring" : "no-story"
            }`}
            onClick={() => {
              if (ownGroup?.stories?.length > 0) {
                const idx = userGroups.findIndex(
                  (g) => g.user?._id?.toString() === user?._id?.toString()
                );
                openStoryViewer(idx);
              } else {
                fileInputRef.current?.click();
              }
            }}
          >
            <img
              src={user?.profileImage}
              alt="Your Story"
              className="story-avatar-img"
            />
            <button
              className="story-add-badge"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              title="Add to story"
            >
              <Plus size={14} />
            </button>
          </div>
          <span className="story-username">Your Story</span>
        </div>

        {/* Other Users' Stories */}
        {userGroups
          .filter((g) => g.user?._id?.toString() !== user?._id?.toString())
          .map((group) => {
            const groupIndex = userGroups.findIndex(
              (g) => g.user?._id?.toString() === group.user?._id?.toString()
            );
            return (
              <div
                key={group.user?._id}
                className="story-item"
                onClick={() => openStoryViewer(groupIndex)}
              >
                <div
                  className={`story-avatar-ring ${
                    group.hasUnviewed ? "unviewed-ring" : "viewed-ring"
                  }`}
                >
                  <img
                    src={group.user?.profileImage}
                    alt={group.user?.username}
                    className="story-avatar-img"
                  />
                </div>
                <span className="story-username">@{group.user?.username}</span>
              </div>
            );
          })}
      </div>

      {/* Hidden File Input for Story Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*,.mp4,.mov,.mkv,.webm,.avi,.wmv,.flv,.3gp,.m4v,.ts,.heic,.heif,.webp,.avif,*"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* Story Upload Modal */}
      {uploadModalOpen && (
        <div className="modal-overlay">
          <div className="story-upload-card">
            <div className="story-upload-header">
              <h3>Create Story</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setUploadModalOpen(false);
                  setSelectedMedia(null);
                  setPreviewUrl("");
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="story-preview-area">
              {checkIsVideo(selectedMedia) ? (
                <CustomVideoPlayer
                  src={previewUrl}
                  autoPlay
                  loop
                  initialMuted={false}
                  className="story-preview-media"
                />
              ) : (
                <img src={previewUrl} alt="Preview" className="story-preview-media" />
              )}
            </div>

            <div className="story-caption-field">
              <input
                type="text"
                placeholder="Add a caption to your story..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="story-upload-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setUploadModalOpen(false);
                  setSelectedMedia(null);
                  setPreviewUrl("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn-share-story"
                onClick={handleUploadStory}
                disabled={uploading}
              >
                {uploading ? <BeatLoader size={8} color="#fff" /> : "Share to Story (24h)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Story Viewer */}
      {activeViewerGroup !== null && (
        <StoryViewer
          userGroups={userGroups}
          initialGroupIndex={activeViewerGroup}
          currentUserId={user?._id}
          onClose={() => setActiveViewerGroup(null)}
          onStoryDeleted={() => fetchActiveStories()}
        />
      )}
    </div>
  );
};

export default StoriesBar;
