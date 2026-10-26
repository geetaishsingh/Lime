import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Grid,
  Video as VideoIcon,
  Bookmark,
  Edit3,
  UserPlus,
  UserCheck,
  Send,
  MoreHorizontal,
  ShieldAlert,
  Ban,
  Share2,
  Calendar,
  Globe,
  Lock,
  ArrowLeft,
  Camera,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Check,
} from "lucide-react";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../App";
import CommentModel from "./CommentModel";
import FollowersModal from "./FollowersModal";
import FollowingModal from "./FollowingModel";
import {
  toggleBlockUserInState,
  updateCoverImageInState,
} from "../redux/user.slice";

const Profile = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.user);

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts"); // 'posts' | 'videos' | 'saved'
  const [activeModal, setActiveModal] = useState(null); // 'followers' | 'following' | null
  const [selectedPost, setSelectedPost] = useState(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Requirement 2: Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // Requirement 11: Profile Picture Fullscreen Viewer
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarZoom, setAvatarZoom] = useState(1);

  // Requirement 5: Cover Image Direct Selector & Preview
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverRotation, setCoverRotation] = useState(0);
  const [savingCover, setSavingCover] = useState(false);

  const coverInputRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isOwner = user?._id?.toString() === id?.toString();

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${serverUrl}/api/user/${id}/profile`, {
        withCredentials: true,
      });
      setProfileData(data);
    } catch (err) {
      console.error("Failed to load profile:", err);
      toast.error("Could not load user profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  // Keyboard navigation for avatar viewer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setAvatarModalOpen(false);
        setAvatarZoom(1);
      }
    };
    if (avatarModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [avatarModalOpen]);

  const isFollowing = profileData?.followers?.some(
    (f) => (f?._id || f)?.toString() === user?._id?.toString()
  );

  const isBlockedByMe = Boolean(
    profileData?.isBlockedByMe ||
      user?.blockedUsers?.some(
        (bId) => (bId?._id || bId)?.toString() === profileData?._id?.toString()
      )
  );

  const handleFollowToggle = async () => {
    try {
      const { data } = await axios.post(
        `${serverUrl}/api/user/follow-or-unfollow/${profileData?._id}`,
        {},
        { withCredentials: true }
      );
      if (data?.success) {
        toast.success(data.message);
        fetchProfile();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to follow/unfollow");
    }
  };

  const handleBlockToggle = async () => {
    try {
      const { data } = await axios.post(
        `${serverUrl}/api/user/block/${profileData?._id}`,
        {},
        { withCredentials: true }
      );
      if (data?.success) {
        toast.success(data.message);
        dispatch(toggleBlockUserInState(profileData?._id));
        setProfileData((prev) => ({
          ...prev,
          isBlockedByMe: data.isBlocked,
        }));
        setShowOptionsMenu(false);
      }
    } catch (err) {
      toast.error("Failed to update block state");
    }
  };

  const handleReportUser = async (e) => {
    if (e) e.preventDefault();
    try {
      setSubmittingReport(true);
      const { data } = await axios.post(
        `${serverUrl}/api/user/report`,
        {
          reportedUser: profileData?._id,
          reason: reportReason,
          details: reportDetails.trim(),
        },
        { withCredentials: true }
      );
      if (data?.success) {
        toast.success("Report submitted. Our moderation team will review it.");
        setReportModalOpen(false);
        setReportDetails("");
      }
    } catch (err) {
      toast.error("Failed to submit report");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleSendMessage = () => {
    navigate(`/messages/${profileData?._id}`);
  };

  const handleShareProfile = () => {
    const profileUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${profileData?.name} (@${profileData?.username}) on Lime`,
        url: profileUrl,
      });
    } else {
      navigator.clipboard.writeText(profileUrl);
      toast.success("Profile link copied!");
    }
  };

  // Requirement 5: Cover Image handling
  const handleCoverSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverRotation(0);
  };

  const handleRotateCover = () => {
    if (!coverPreview) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = coverPreview;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.height;
      canvas.height = img.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob((blob) => {
        if (blob) {
          const rotated = new File([blob], "cover_rotated.jpg", {
            type: "image/jpeg",
          });
          setCoverFile(rotated);
          setCoverPreview(URL.createObjectURL(blob));
          setCoverRotation((r) => (r + 90) % 360);
          toast.success("Cover rotated 90°");
        }
      }, "image/jpeg");
    };
  };

  const handleSaveCover = async () => {
    if (!coverFile) return;
    try {
      setSavingCover(true);
      const formData = new FormData();
      formData.append("coverImage", coverFile);
      formData.append("coverRotation", coverRotation);

      const { data } = await axios.post(
        `${serverUrl}/api/user/profile/edit`,
        formData,
        { withCredentials: true }
      );

      if (data?.success) {
        toast.success("Cover photo updated!");
        dispatch(updateCoverImageInState(data.user.coverImage));
        setProfileData((prev) => ({
          ...prev,
          coverImage: data.user.coverImage,
        }));
        setCoverPreview("");
        setCoverFile(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update cover photo");
    } finally {
      setSavingCover(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading-screen">
        <div className="profile-skeleton-header">
          <div className="skeleton-cover" />
          <div className="skeleton-avatar" />
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="profile-not-found">
        <h2>User not found</h2>
        <p>The profile you are looking for may have been removed or does not exist.</p>
        <Link to="/" className="back-home-btn">
          Go Back Home
        </Link>
      </div>
    );
  }

  // Filter posts by media type for tabs
  const allPosts = profileData.posts || [];
  const videoPosts = allPosts.filter(
    (p) =>
      p.mediaType === "video" ||
      p.image?.endsWith(".mp4") ||
      p.image?.includes("/video/")
  );
  const savedPosts = profileData.bookmarks || [];

  const displayedPosts =
    activeTab === "videos"
      ? videoPosts
      : activeTab === "saved"
      ? savedPosts
      : allPosts;

  return (
    <div className="lime-full-profile-page">
      <div className="profile-container-card">
        {/* Requirement 9: Mobile Header with Back Button */}
        <div className="profile-mobile-top-bar">
          <button
            className="mobile-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="mobile-header-user">
            <span className="mobile-header-name">
              {profileData.name || profileData.username}
            </span>
            <span className="mobile-header-posts-count">
              {allPosts.length} posts
            </span>
          </div>
        </div>

        {/* Cover Photo Banner (Requirement 5) */}
        <div className="profile-cover-banner">
          {profileData.coverImage ? (
            <img
              src={
                profileData.coverImage.startsWith("http")
                  ? profileData.coverImage
                  : `${serverUrl}${profileData.coverImage}`
              }
              alt="Cover"
              className="cover-photo-img"
            />
          ) : (
            <div className="default-cover-gradient" />
          )}

          {/* Direct Cover Change for Owner */}
          {isOwner && (
            <div className="cover-action-overlay">
              <button
                type="button"
                className="edit-cover-btn"
                onClick={() => coverInputRef.current?.click()}
                title="Change cover photo"
              >
                <Camera size={15} /> Change Cover
              </button>
              <input
                type="file"
                ref={coverInputRef}
                accept="image/*,.heic,.heif,.webp,.avif,.png,.jpg,.jpeg,.bmp,.svg,*"
                style={{ display: "none" }}
                onChange={handleCoverSelect}
              />
            </div>
          )}
        </div>

        {/* Profile Info Header */}
        <div className="profile-meta-header">
          {/* Avatar (Click to open Fullscreen Viewer - Requirement 11) */}
          <div
            className="profile-avatar-wrapper clickable"
            onClick={() => {
              setAvatarZoom(1);
              setAvatarModalOpen(true);
            }}
            title="Click to view profile photo full-screen"
          >
            <img
              src={profileData.profileImage}
              alt={profileData.username}
              className="main-profile-avatar"
            />
            <div className="avatar-zoom-hint">
              <Maximize2 size={14} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="profile-action-controls">
            {isOwner ? (
              <div className="owner-buttons-group">
                <Link
                  to={`/edit-profile/${user._id}`}
                  className="profile-btn edit-profile-btn"
                >
                  <Edit3 size={16} /> Edit Profile
                </Link>
                <button
                  className="profile-btn secondary-action-btn"
                  onClick={handleShareProfile}
                >
                  <Share2 size={16} /> Share
                </button>
              </div>
            ) : (
              <div className="guest-buttons-group">
                {isBlockedByMe ? (
                  <button
                    className="profile-btn unblock-pill-btn"
                    onClick={handleBlockToggle}
                  >
                    <Ban size={15} /> Unblock
                  </button>
                ) : (
                  <>
                    <button
                      className={`profile-btn ${
                        isFollowing ? "following-btn" : "follow-btn"
                      }`}
                      onClick={handleFollowToggle}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck size={16} /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} /> Follow
                        </>
                      )}
                    </button>
                    <button
                      className="profile-btn message-btn"
                      onClick={handleSendMessage}
                    >
                      <Send size={16} /> Message
                    </button>
                  </>
                )}

                <div className="more-menu-wrapper">
                  <button
                    className="profile-btn more-options-btn"
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    aria-label="More options"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {showOptionsMenu && (
                    <div className="profile-options-dropdown">
                      <button
                        className="dropdown-item"
                        onClick={handleShareProfile}
                      >
                        <Share2 size={16} /> Share Profile
                      </button>
                      <button
                        className="dropdown-item danger"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          setReportModalOpen(true);
                        }}
                      >
                        <ShieldAlert size={16} /> Report Account
                      </button>
                      <button
                        className="dropdown-item danger"
                        onClick={handleBlockToggle}
                      >
                        <Ban size={16} />{" "}
                        {isBlockedByMe ? "Unblock User" : "Block User"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Requirement 1: Blocked User Banner */}
        {isBlockedByMe && (
          <div className="blocked-user-banner">
            <div className="banner-left">
              <Ban size={18} color="#f43f5e" />
              <span>You have blocked @{profileData.username}.</span>
            </div>
            <button className="banner-unblock-btn" onClick={handleBlockToggle}>
              Unblock
            </button>
          </div>
        )}

        {/* Bio, Name, Handles */}
        <div className="profile-bio-details">
          <div className="names-row">
            <h1 className="profile-display-name">
              {profileData.name || profileData.username}
            </h1>
            <span className="profile-handle">@{profileData.username}</span>
            {profileData.isPrivate && (
              <span className="private-badge" title="Private Account">
                <Lock size={12} /> Private
              </span>
            )}
          </div>

          {profileData.bio && (
            <p className="profile-bio-text">{profileData.bio}</p>
          )}

          <div className="profile-sub-meta">
            {profileData.website && (
              <a
                href={
                  profileData.website.startsWith("http")
                    ? profileData.website
                    : `https://${profileData.website}`
                }
                target="_blank"
                rel="noreferrer"
                className="meta-link"
              >
                <Globe size={14} /> {profileData.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            <span className="meta-item">
              <Calendar size={14} /> Joined{" "}
              {new Date(profileData.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Social Counts */}
          <div className="profile-stats-bar">
            <div className="stat-pill">
              <strong>{allPosts.length}</strong>
              <span>Posts</span>
            </div>
            <button
              className="stat-pill clickable"
              onClick={() => setActiveModal("followers")}
            >
              <strong>{profileData.followers?.length || 0}</strong>
              <span>Followers</span>
            </button>
            <button
              className="stat-pill clickable"
              onClick={() => setActiveModal("following")}
            >
              <strong>{profileData.following?.length || 0}</strong>
              <span>Following</span>
            </button>
          </div>
        </div>

        {/* Profile Content Tabs */}
        <div className="profile-content-tabs">
          <button
            className={`content-tab ${activeTab === "posts" ? "active" : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            <Grid size={16} />
            <span>Posts ({allPosts.length})</span>
          </button>
          <button
            className={`content-tab ${activeTab === "videos" ? "active" : ""}`}
            onClick={() => setActiveTab("videos")}
          >
            <VideoIcon size={16} />
            <span>Shorts ({videoPosts.length})</span>
          </button>
          {isOwner && (
            <button
              className={`content-tab ${activeTab === "saved" ? "active" : ""}`}
              onClick={() => setActiveTab("saved")}
            >
              <Bookmark size={16} />
              <span>Saved ({savedPosts.length})</span>
            </button>
          )}
        </div>

        {/* Media Grid */}
        <div className="profile-media-grid">
          {displayedPosts.length > 0 ? (
            displayedPosts.map((post) => {
              const isVid =
                post.mediaType === "video" ||
                post.image?.endsWith(".mp4") ||
                post.image?.includes("/video/");
              return (
                <div
                  key={post._id}
                  className="grid-media-item"
                  onClick={() => setSelectedPost(post)}
                >
                  {isVid ? (
                    <div className="grid-video-thumb">
                      <video
                        src={
                          post.image?.startsWith("http")
                            ? post.image
                            : `${serverUrl}${post.image}`
                        }
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <span className="grid-video-badge">
                        <VideoIcon size={14} />
                      </span>
                    </div>
                  ) : (
                    <img
                      src={
                        post.image?.startsWith("http")
                          ? post.image
                          : `${serverUrl}${post.image}`
                      }
                      alt={post.caption || "Post"}
                      loading="lazy"
                    />
                  )}
                  <div className="grid-media-overlay">
                    <span>❤️ {post.likes?.length || 0}</span>
                    <span>💬 {post.comments?.length || 0}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-profile-tab">
              <p>
                {isBlockedByMe
                  ? "Posts are hidden while this account is blocked."
                  : "No content in this tab yet."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Requirement 11: Profile Picture Fullscreen Viewer with Zoom Controls */}
      {avatarModalOpen && (
        <div
          className="modal-overlay avatar-viewer-backdrop"
          onClick={() => {
            setAvatarModalOpen(false);
            setAvatarZoom(1);
          }}
        >
          {/* Zoom & Close Toolbar */}
          <div
            className="avatar-viewer-toolbar"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="viewer-ctrl-btn"
              onClick={() => setAvatarZoom((z) => Math.min(3, z + 0.25))}
              title="Zoom In"
              aria-label="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
            <button
              className="viewer-ctrl-btn"
              onClick={() => setAvatarZoom((z) => Math.max(0.5, z - 0.25))}
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <button
              className="viewer-ctrl-btn"
              onClick={() => setAvatarZoom(1)}
              title="Reset Zoom"
              aria-label="Reset zoom"
            >
              100%
            </button>
            <button
              className="viewer-ctrl-btn close-btn"
              onClick={() => {
                setAvatarModalOpen(false);
                setAvatarZoom(1);
              }}
              title="Close Viewer"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div
            className="avatar-viewer-image-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={profileData.profileImage}
              alt={profileData.username}
              className="avatar-fullscreen-img"
              style={{
                transform: `scale(${avatarZoom})`,
                transition: "transform 0.15s ease-out",
              }}
            />
          </div>
        </div>
      )}

      {/* Requirement 5: Cover Image Preview & Save Modal */}
      {coverPreview && (
        <div className="modal-overlay">
          <div className="cover-preview-dialog-card">
            <div className="dialog-header">
              <h3>Update Cover Photo</h3>
              <button
                className="close-icon-btn"
                onClick={() => {
                  setCoverPreview("");
                  setCoverFile(null);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="cover-preview-box">
              <img src={coverPreview} alt="Cover preview" />
            </div>
            <div className="cover-dialog-actions">
              <button
                type="button"
                className="btn-rotate"
                onClick={handleRotateCover}
              >
                <RotateCw size={16} /> Rotate 90°
              </button>
              <div className="right-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setCoverPreview("");
                    setCoverFile(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-save-cover"
                  onClick={handleSaveCover}
                  disabled={savingCover}
                >
                  {savingCover ? <BeatLoader size={6} color="#09090b" /> : "Save Cover"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Followers & Following Modals */}
      {activeModal === "followers" && (
        <FollowersModal
          data={profileData.followers || []}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === "following" && (
        <FollowingModal
          data={profileData.following || []}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Post Viewer / Comment Modal */}
      {selectedPost && (
        <CommentModel
          post={selectedPost}
          handleOffModel={() => setSelectedPost(null)}
        />
      )}

      {/* Requirement 2: Report User Modal */}
      {reportModalOpen && (
        <div className="modal-overlay">
          <div className="report-modal-card">
            <div className="modal-title-bar">
              <h3>Report @{profileData.username}</h3>
              <button
                className="modal-close-icon"
                onClick={() => setReportModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="report-subtitle">
              Why are you reporting this user? Your report is confidential.
            </p>

            <form onSubmit={handleReportUser}>
              <div className="report-options-group">
                {[
                  { value: "spam", label: "Spam or fake account" },
                  { value: "harassment", label: "Harassment or bullying" },
                  { value: "inappropriate", label: "Inappropriate or adult content" },
                  { value: "hate_speech", label: "Hate speech or symbols" },
                  { value: "other", label: "Other problem" },
                ].map((opt) => (
                  <label key={opt.value} className="report-radio-row">
                    <input
                      type="radio"
                      name="reportReason"
                      value={opt.value}
                      checked={reportReason === opt.value}
                      onChange={(e) => setReportReason(e.target.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              <textarea
                className="report-details-input"
                placeholder="Additional details (optional)..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                maxLength={300}
              />

              <div className="report-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setReportModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit-report"
                  disabled={submittingReport}
                >
                  {submittingReport ? <BeatLoader size={6} color="#fff" /> : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
