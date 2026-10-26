import React, { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  RotateCw,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  ArrowLeft,
  Sparkles,
  Plus,
  Clock,
  HardDrive,
} from "lucide-react";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../App";
import { addNewPost } from "../redux/user.slice";
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

const CreatePost = () => {
  const { user } = useSelector((state) => state.user);
  const [caption, setCaption] = useState("");
  const [mediaList, setMediaList] = useState([]); // [{ id, file, previewUrl, rotation, isVideo, duration, size, name }]
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVideo, setIsVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageLoadErrors, setImageLoadErrors] = useState({});

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    // Check if any video is selected by mimetype or extension
    const containsVideo = selectedFiles.some(checkIsVideo);

    if (containsVideo) {
      if (selectedFiles.length > 1) {
        toast("Please upload videos one at a time.", { icon: "ℹ️" });
      }
      const vidFile = selectedFiles.find(checkIsVideo);
      if (vidFile.size > 100 * 1024 * 1024) {
        toast.error("Video file must be under 100MB.");
        return;
      }

      const previewUrl = URL.createObjectURL(vidFile);

      const finalizeVideoSelection = (dur = 0) => {
        setIsVideo(true);
        setMediaList([
          {
            id: Math.random().toString(),
            file: vidFile,
            previewUrl,
            rotation: 0,
            isVideo: true,
            duration: dur,
            size: (vidFile.size / (1024 * 1024)).toFixed(1),
            name: vidFile.name,
          },
        ]);
        setActiveIndex(0);
      };

      // Check duration using temp video
      const tempVideo = document.createElement("video");
      tempVideo.preload = "metadata";
      tempVideo.src = previewUrl;

      tempVideo.onloadedmetadata = () => {
        if (tempVideo.duration > 61) {
          toast.error("Short videos must be 60 seconds or less.");
          return;
        }
        finalizeVideoSelection(tempVideo.duration);
      };

      // Fallback if browser can't decode metadata locally (e.g. MKV/AVI)
      tempVideo.onerror = () => {
        finalizeVideoSelection(0);
      };
      return;
    }

    // Images or other media files: allow multiple up to 10
    const newItems = selectedFiles.map((file) => ({
      id: Math.random().toString(),
      file,
      previewUrl: URL.createObjectURL(file),
      rotation: 0,
      isVideo: false,
      size: (file.size / (1024 * 1024)).toFixed(1),
      name: file.name,
    }));

    setIsVideo(false);
    setMediaList((prev) => {
      const combined = [...prev.filter((m) => !m.isVideo), ...newItems].slice(0, 10);
      if (combined.length === 10 && prev.length + newItems.length > 10) {
        toast("Maximum of 10 photos per post allowed.", { icon: "ℹ️" });
      }
      return combined;
    });
  };

  /**
   * Rotate active image 90 degrees clockwise using HTML5 canvas
   */
  const handleRotateActiveImage = () => {
    if (isVideo || !mediaList.length) return;
    const current = mediaList[activeIndex];
    if (!current || current.isVideo) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = current.previewUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.height;
      canvas.height = img.width;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const rotatedFile = new File([blob], current.file.name || "rotated.jpg", {
              type: "image/jpeg",
            });
            const newUrl = URL.createObjectURL(blob);

            setMediaList((prev) =>
              prev.map((item, idx) =>
                idx === activeIndex
                  ? {
                      ...item,
                      file: rotatedFile,
                      previewUrl: newUrl,
                      rotation: (item.rotation + 90) % 360,
                    }
                  : item
              )
            );
            toast.success("Photo rotated 90°");
          }
        },
        "image/jpeg",
        0.9
      );
    };
  };

  const handleRemoveItem = (indexToRemove) => {
    setMediaList((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (next.length === 0) {
        setIsVideo(false);
        setActiveIndex(0);
      } else if (activeIndex >= next.length) {
        setActiveIndex(next.length - 1);
      }
      return next;
    });
  };

  const handleClearAll = () => {
    mediaList.forEach((m) => URL.revokeObjectURL(m.previewUrl));
    setMediaList([]);
    setIsVideo(false);
    setActiveIndex(0);
    setUploadProgress(0);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!mediaList.length) {
      toast.error("Please select at least one photo or video to share.");
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("caption", caption.trim());

      if (isVideo) {
        const vid = mediaList[0];
        formData.append("image", vid.file);
        formData.append("isVideo", "true");
        formData.append("duration", vid.duration || 0);
        formData.append("rotation", vid.rotation || 0);
      } else {
        const rotations = [];
        mediaList.forEach((item) => {
          formData.append("images", item.file);
          rotations.push(item.rotation);
        });
        formData.append("isVideo", "false");
        formData.append("rotations", JSON.stringify(rotations));
      }

      const { data } = await axios.post(`${serverUrl}/api/post/add-post`, formData, {
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      if (data?.success) {
        toast.success("Post published successfully!");
        dispatch(addNewPost(data.post));
        navigate("/");
      }
    } catch (err) {
      console.error("Create post error:", err);
      toast.error(err.response?.data?.message || "Failed to publish post.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const activeMedia = mediaList[activeIndex] || null;

  return (
    <div className="feed-container">
      <div className="feed-inner-container">
        <div className="create-post-container">
          <div className="create-post-card">
            {/* Header */}
            <div className="card-top-bar">
              <button
                className="back-btn"
                onClick={() => navigate(-1)}
                aria-label="Back"
              >
                <ArrowLeft size={20} />
              </button>
              <h2>Create New Post</h2>
              <button
                className="publish-btn"
                onClick={handleSubmit}
                disabled={loading || !mediaList.length}
              >
                {loading ? <BeatLoader size={6} color="#09090b" /> : "Share Post"}
              </button>
            </div>

            {/* Upload Progress Bar */}
            {loading && (
              <div className="create-post-progress-bar-container">
                <div
                  className="create-post-progress-bar-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
                <span className="create-post-progress-text">
                  Uploading media... {uploadProgress}%
                </span>
              </div>
            )}

            <div className="card-body-grid">
              {/* Media Preview Column */}
              <div className="media-preview-column">
                {activeMedia ? (
                  <div className="media-preview-wrapper">
                    {/* Top Right: Remove/Cancel Button (Safe from video player controls!) */}
                    <button
                      type="button"
                      className="preview-cancel-btn-top"
                      onClick={handleClearAll}
                      title="Cancel and remove media"
                      aria-label="Remove media"
                    >
                      <X size={18} />
                    </button>

                    {/* Top Left: Duration or photo count badge */}
                    <div className="preview-top-badge">
                      {isVideo ? (
                        <>
                          <Clock size={13} />
                          <span>{Math.round(activeMedia.duration || 0)}s / max 60s</span>
                          <span className="badge-divider">•</span>
                          <HardDrive size={13} />
                          <span>{activeMedia.size} MB</span>
                        </>
                      ) : (
                        <span>
                          {activeIndex + 1} of {mediaList.length} photo{mediaList.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Media Display */}
                    {isVideo ? (
                      <div className="video-player-container">
                        <CustomVideoPlayer
                          src={activeMedia.previewUrl}
                          autoPlay={false}
                          loop
                          className="active-preview-media"
                        />
                      </div>
                    ) : (
                      <div className="image-viewer-container">
                        {imageLoadErrors[activeMedia.id] ? (
                          <div className="preview-fallback-card">
                            <ImageIcon size={44} color="#84cc16" />
                            <span className="fallback-name">{activeMedia.name || "Media File"}</span>
                            <span className="fallback-size">{activeMedia.size} MB</span>
                          </div>
                        ) : (
                          <img
                            src={activeMedia.previewUrl}
                            alt="Upload preview"
                            className="active-preview-media"
                            onError={() => {
                              setImageLoadErrors((prev) => ({
                                ...prev,
                                [activeMedia.id]: true,
                              }));
                            }}
                          />
                        )}

                        {/* Rotate Active Photo Button */}
                        {!imageLoadErrors[activeMedia.id] && (
                          <button
                            type="button"
                            className="preview-rotate-pill-btn"
                            onClick={handleRotateActiveImage}
                            title="Rotate active photo 90°"
                          >
                            <RotateCw size={16} />
                            <span>Rotate</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Multiple Image Thumbnail Strip */}
                    {!isVideo && mediaList.length > 1 && (
                      <div className="multi-thumbnail-strip">
                        {mediaList.map((item, idx) => (
                          <div
                            key={item.id}
                            className={`thumb-card ${idx === activeIndex ? "active" : ""}`}
                            onClick={() => setActiveIndex(idx)}
                          >
                            <img src={item.previewUrl} alt={`Thumbnail ${idx + 1}`} />
                            <button
                              type="button"
                              className="thumb-remove-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveItem(idx);
                              }}
                              title="Remove photo"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {mediaList.length < 10 && (
                          <button
                            type="button"
                            className="thumb-add-more-btn"
                            onClick={() => fileInputRef.current?.click()}
                            title="Add more photos"
                          >
                            <Plus size={18} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="dropzone-area"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="dropzone-icons">
                      <ImageIcon size={38} className="icon-img" />
                      <VideoIcon size={38} className="icon-vid" />
                    </div>
                    <h3>Drag photos and short videos here</h3>
                    <p>Select up to 10 photos or a short video (up to 60s)</p>
                    <button
                      type="button"
                      className="select-file-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Select from computer
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*,.mp4,.mov,.mkv,.webm,.avi,.wmv,.flv,.3gp,.m4v,.ts,.heic,.heif,.webp,.avif,*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </div>

              {/* Caption & Post Details Section */}
              <div className="details-column">
                <div className="author-pill">
                  <img
                    src={user?.profileImage}
                    alt={user?.username}
                    className="author-avatar"
                  />
                  <div>
                    <span className="author-name">{user?.name || user?.username}</span>
                    <span className="author-handle">@{user?.username}</span>
                  </div>
                </div>

                <div className="caption-input-box">
                  <textarea
                    placeholder="Write a caption... #lime #creative"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={1000}
                    rows={6}
                  />
                  <div className="caption-footer">
                    <span className="char-count">{caption.length}/1000</span>
                  </div>
                </div>

                <div className="tips-panel">
                  <div className="tips-title">
                    <Sparkles size={16} color="#84cc16" />
                    <span>Lime Posting Guidelines</span>
                  </div>
                  <ul>
                    <li>Upload up to 10 photos or 1 short video per post.</li>
                    <li>Rotate photos 90° clockwise before publishing.</li>
                    <li>Keep videos under 60 seconds for optimal engagement.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
