import './CreatePost.scss';
import React, { useEffect, useState, useRef } from "react";
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
import { serverUrl } from "../../config";
import { addNewPost } from "../../store/user.slice";
import CustomVideoPlayer from "../../components/CustomVideoPlayer";

const VIDEO_EXTENSIONS = [
  "mp4", "m4v", "mov", "mkv", "webm", "avi", "wmv", "flv", "3gp",
  "3g2", "ts", "mts", "m2ts", "ogv", "vob", "qt", "asf", "rm",
  "rmvb", "f4v", "divx", "mpg", "mpeg", "hevc"
];

// Formats that browsers cannot natively render in <img> tags without conversion
const NON_NATIVE_IMAGE_EXTS = [
  "heic", "heif", "tiff", "tif", "raw", "cr2", "nef", "arw", "dng",
  "orf", "rw2", "psd"
];

const getFileExt = (filename = "") => {
  return (filename.split(".").pop() || "").toLowerCase();
};

const checkIsVideo = (file) => {
  if (!file) return false;
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const ext = getFileExt(name);
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

  const convertingIdsRef = useRef(new Set());
  const fileInputRef = useRef(null);
  const mediaListRef = useRef([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    mediaListRef.current = mediaList;
  }, [mediaList]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      mediaListRef.current.forEach((m) => {
        if (m.previewUrl && m.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(m.previewUrl);
        }
      });
    };
  }, []);

  /**
   * Request backend conversion for exotic formats (HEIC, TIFF, RAW, etc.)
   */
  const convertPreview = async (id, file) => {
    if (!file || convertingIdsRef.current.has(id)) return;
    convertingIdsRef.current.add(id);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await axios.post(
        `${serverUrl}/api/post/convert-preview`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (data?.success && data?.previewUrl) {
        setMediaList((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, previewUrl: data.previewUrl } : item
          )
        );
        setImageLoadErrors((prev) => ({ ...prev, [id]: false }));
      }
    } catch (err) {
      // Backend could not convert preview, retain format badge fallback
      setImageLoadErrors((prev) => ({ ...prev, [id]: true }));
    } finally {
      convertingIdsRef.current.delete(id);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

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

      tempVideo.onerror = () => {
        // Fallback for video formats not decoded by browser video element (e.g. MKV, AVI, FLV)
        finalizeVideoSelection(0);
      };
      return;
    }

    const newItems = selectedFiles.map((file) => {
      const ext = getFileExt(file.name);
      const isNonNative = NON_NATIVE_IMAGE_EXTS.includes(ext);
      const id = Math.random().toString();

      if (isNonNative) {
        // Trigger instant backend conversion for exotic formats
        convertPreview(id, file);
      }

      return {
        id,
        file,
        previewUrl: URL.createObjectURL(file),
        rotation: 0,
        isVideo: false,
        size: (file.size / (1024 * 1024)).toFixed(1),
        name: file.name,
      };
    });

    setIsVideo(false);
    setMediaList((prev) => {
      const combined = [...prev.filter((m) => !m.isVideo), ...newItems].slice(0, 10);
      if (combined.length === 10 && prev.length + newItems.length > 10) {
        toast("Maximum of 10 photos per post allowed.", { icon: "ℹ️" });
      }
      return combined;
    });
  };

  const handleRotateActiveImage = () => {
    if (isVideo || !mediaList.length) return;
    const current = mediaList[activeIndex];
    if (!current || current.isVideo || imageLoadErrors[current.id]) return;

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
      const itemToRemove = prev[indexToRemove];
      if (itemToRemove?.previewUrl && itemToRemove.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      }

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
    mediaList.forEach((m) => {
      if (m.previewUrl && m.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(m.previewUrl);
      }
    });
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
    <div className="create-post-wrapper">
      <div className="create-post-container">
        <div className="create-post-card">
          {/* Top Bar Header */}
          <div className="card-top-bar">
            <button
              type="button"
              className="back-btn"
              onClick={() => navigate(-1)}
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <h2>Create New Post</h2>
            <button
              type="button"
              className="publish-btn"
              onClick={handleSubmit}
              disabled={loading || !mediaList.length}
            >
              {loading ? <BeatLoader size={6} color="#09090b" /> : "Share Post"}
            </button>
          </div>

          {/* Upload Progress Bar */}
          {loading && (
            <div className={`create-post-progress-bar-container ${uploadProgress >= 100 ? "processing" : ""}`}>
              <div
                className={`create-post-progress-bar-fill ${uploadProgress >= 100 ? "animated-pulse" : ""}`}
                style={{ width: `${Math.max(5, uploadProgress)}%` }}
              />
              <span className="create-post-progress-text">
                {uploadProgress >= 100
                  ? "Processing & publishing on server..."
                  : `Uploading media... ${uploadProgress}%`}
              </span>
            </div>
          )}

          <div className="card-body-grid">
            {/* Media Preview Column */}
            <div className="media-preview-column">
              {activeMedia ? (
                <div className="media-preview-wrapper">
                  {/* Top Left info badge */}
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
                        {activeIndex + 1} of {mediaList.length} photo
                        {mediaList.length > 1 ? "s" : ""}
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
                          <div className="fallback-icon-wrap">
                            <ImageIcon size={34} />
                          </div>
                          <span className="fallback-badge">
                            {getFileExt(activeMedia.name) || "MEDIA"}
                          </span>
                          <span className="fallback-name">
                            {activeMedia.name || "Media File"}
                          </span>
                          <span className="fallback-size">
                            {activeMedia.size} MB
                          </span>
                          <p className="fallback-hint">
                            High-resolution format. Processed and optimized automatically on upload.
                          </p>
                        </div>
                      ) : (
                        <img
                          src={activeMedia.previewUrl}
                          alt=""
                          className="active-preview-media"
                          onError={() => {
                            setImageLoadErrors((prev) => ({
                              ...prev,
                              [activeMedia.id]: true,
                            }));
                            convertPreview(activeMedia.id, activeMedia.file);
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

                  {/* Overlaid Bottom Remove Pill Button (Exact Screenshot 2 styling) */}
                  <button
                    type="button"
                    className="preview-remove-bottom-btn"
                    onClick={handleClearAll}
                    title="Remove media"
                    aria-label="Remove media"
                  >
                    <X size={15} />
                    <span>Remove</span>
                  </button>

                  {/* Multiple Image Thumbnail Strip */}
                  {!isVideo && mediaList.length > 1 && (
                    <div className="multi-thumbnail-strip">
                      {mediaList.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`thumb-card ${
                            idx === activeIndex ? "active" : ""
                          }`}
                          onClick={() => setActiveIndex(idx)}
                        >
                          {imageLoadErrors[item.id] ? (
                            <div className="thumb-fallback-badge">
                              <ImageIcon size={15} />
                              <span className="thumb-ext">
                                {getFileExt(item.name) || "IMG"}
                              </span>
                            </div>
                          ) : (
                            <img
                              src={item.previewUrl}
                              alt=""
                              onError={() => {
                                setImageLoadErrors((prev) => ({
                                  ...prev,
                                  [item.id]: true,
                                }));
                                convertPreview(item.id, item.file);
                              }}
                            />
                          )}
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
                  <p>Supports all formats: JPG, PNG, WEBP, HEIC, TIFF, RAW, MP4, MOV, MKV, etc.</p>
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
                accept="image/*,video/*,.mp4,.mov,.mkv,.webm,.avi,.wmv,.flv,.3gp,.m4v,.ts,.heic,.heif,.tiff,.tif,.raw,.cr2,.nef,.arw,.dng,.psd,.bmp,.webp,.avif,*"
                multiple
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>

            {/* Caption & Post Details Section */}
            <div className="details-column">
              <div className="author-pill">
                <div className="author-avatar-wrap">
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.username}
                      className="author-avatar"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className="author-avatar-placeholder"
                    style={{ display: user?.profileImage ? "none" : "flex" }}
                  >
                    {(user?.name || user?.username || "US")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                </div>
                <div className="author-meta">
                  <span className="author-name">
                    {user?.name || user?.username || "Lime Creator"}
                  </span>
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
                  <li>Photos can be rotated before publishing.</li>
                  <li>Videos are automatically formatted for smooth playback.</li>
                  <li>Keep videos under 60 seconds for optimal engagement.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
