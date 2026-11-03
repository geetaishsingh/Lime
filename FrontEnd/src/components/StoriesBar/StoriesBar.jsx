import './StoriesBar.scss';
import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { useSelector } from "react-redux";
import { serverUrl } from "../../config";
import StoryViewer from "../StoryViewer";
import CustomVideoPlayer from "../CustomVideoPlayer";

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
  const [_loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const storyBlobRef = useRef(null);

  useEffect(() => {
    return () => {
      if (storyBlobRef.current) URL.revokeObjectURL(storyBlobRef.current);
    };
  }, []);

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

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Media file exceeds 50MB size limit.");
      return;
    }

    const isVid = checkIsVideo(file);

    if (isVid) {
      const videoElement = document.createElement("video");
      videoElement.preload = "metadata";
      videoElement.src = URL.createObjectURL(file);
      videoElement.onloadedmetadata = () => {
        URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration > 30.5) {
          toast.error("Story video must be 30 seconds or shorter.");
          return;
        }
        setSelectedMedia({ file, isVideo: true, duration: videoElement.duration });
        setPreviewUrl(URL.createObjectURL(file));
        setUploadModalOpen(true);
      };
      videoElement.onerror = () => {
        setSelectedMedia({ file, isVideo: true, duration: 15 });
        setPreviewUrl(URL.createObjectURL(file));
        setUploadModalOpen(true);
      };
    } else {
      setSelectedMedia({ file, isVideo: false });
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (["heic", "heif", "tiff", "tif", "raw"].includes(ext)) {
        const formData = new FormData();
        formData.append("file", file);
        axios
          .post(`${serverUrl}/api/post/convert-preview`, formData, {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          })
          .then(({ data }) => {
            if (data?.previewUrl) {
              setPreviewUrl(data.previewUrl);
            } else {
              setPreviewUrl(URL.createObjectURL(file));
            }
          })
          .catch(() => {
            setPreviewUrl(URL.createObjectURL(file));
          });
      } else {
        setPreviewUrl(URL.createObjectURL(file));
      }
      setUploadModalOpen(true);
    }
  };

  const handleUploadStory = async (e) => {
    e.preventDefault();
    if (!selectedMedia) return;

    const formData = new FormData();
    if (selectedMedia?.file) {
      formData.append("media", selectedMedia.file);
      formData.append("image", selectedMedia.file);
    }
    if (selectedMedia.isVideo) {
      formData.append("isVideo", "true");
      formData.append("duration", Math.round(selectedMedia.duration || 15));
    }
    if (caption.trim()) {
      formData.append("caption", caption.trim());
    }

    try {
      setUploading(true);
      const { data } = await axios.post(`${serverUrl}/api/story/create`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      if (data?.success) {
        toast.success("Story shared for 24 hours!");
        setUploadModalOpen(false);
        setSelectedMedia(null);
        setPreviewUrl("");
        setCaption("");
        fetchActiveStories();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post story");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Check if current user has an active story
  const myStoryGroup = userGroups.find(
    (g) => g.user?._id?.toString() === user?._id?.toString()
  );

  return (
    <div className="stories-bar-container lime-stories-bar">
      <div className="stories-tray stories-scroll-container">
        {/* Your Story Action Node */}
        <div className="story-item my-story-item">
          <div
            className={`story-avatar-ring ${myStoryGroup ? "has-story" : "empty"}`}
            onClick={() => {
              if (myStoryGroup) {
                const myIdx = userGroups.findIndex(
                  (g) => g.user?._id?.toString() === user?._id?.toString()
                );
                setActiveViewerGroup(myIdx >= 0 ? myIdx : 0);
              } else {
                fileInputRef.current?.click();
              }
            }}
          >
            <img
              src={
                user?.profileImage ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.username || "User")}&background=84cc16&color=09090b`
              }
              alt="Your Story"
              className="story-avatar story-avatar-img"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.username || "User")}&background=84cc16&color=09090b`;
              }}
            />
            <button
              type="button"
              className="story-add-badge add-story-badge-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              title="Add to story"
              aria-label="Add to story"
            >
              <Plus size={11} strokeWidth={3.5} />
            </button>
          </div>
          <span className="story-username story-username-label">Your Story</span>
        </div>

        {/* Hidden file picker input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        {/* Other Users' Stories */}
        {userGroups
          .filter((g) => g.user?._id?.toString() !== user?._id?.toString())
          .map((group) => {
            const actualGroupIdx = userGroups.findIndex(
              (item) => item.user?._id === group.user?._id
            );
            return (
              <div
                key={group.user?._id}
                className="story-item"
                onClick={() => setActiveViewerGroup(actualGroupIdx)}
              >
                <div
                  className={`story-avatar-ring ${
                    group.hasUnviewed ? "unviewed has-story" : "viewed"
                  }`}
                >
                  <img
                    src={
                      group.user?.profileImage ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(group.user?.username || "User")}&background=27272a&color=f4f4f5`
                    }
                    alt={group.user?.username}
                    className="story-avatar story-avatar-img"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(group.user?.username || "User")}&background=27272a&color=f4f4f5`;
                    }}
                  />
                </div>
                <span className="story-username story-username-label">
                  @{group.user?.username}
                </span>
              </div>
            );
          })}
      </div>

      {/* Story Upload Preview Modal */}
      {uploadModalOpen && (
        <div className="modal-overlay story-upload-modal-backdrop">
          <div className="story-create-card">
            <div className="story-create-header">
              <div className="header-badge-title">
                <span className="live-dot" />
                <h3>24-Hour Story</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => {
                  setUploadModalOpen(false);
                  setSelectedMedia(null);
                  setPreviewUrl("");
                  setCaption("");
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="story-media-preview-box">
              {selectedMedia?.isVideo ? (
                <CustomVideoPlayer
                  src={previewUrl}
                  autoPlay={false}
                  loop
                  className="preview-media"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="preview-media"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60";
                  }}
                />
              )}
              {selectedMedia?.isVideo && (
                <div className="story-video-badge">
                  {Math.round(selectedMedia.duration || 0)}s Video
                </div>
              )}
            </div>

            <form onSubmit={handleUploadStory} className="story-form">
              <div className="caption-input-container">
                <input
                  type="text"
                  placeholder="Write a caption... (optional)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={120}
                  className="story-caption-input"
                />
                <span className="caption-char-count">{caption.length}/120</span>
              </div>

              <div className="story-form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setUploadModalOpen(false);
                    setSelectedMedia(null);
                    setPreviewUrl("");
                    setCaption("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-publish-story"
                  disabled={uploading}
                >
                  {uploading ? (
                    <BeatLoader size={6} color="#09090b" />
                  ) : (
                    "Share Story"
                  )}
                </button>
              </div>
            </form>
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

