import './EditProfile.scss';
import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Camera,
  RotateCw,
  Lock,
  Globe,
  User,
  AtSign,
  ChevronDown,
  Check,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../../config";
import { setuser } from "../../store/user.slice";

const oauthBaseUrl = import.meta.env.VITE_OAUTH_BASE_URL || serverUrl;

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

const EditProfile = () => {
  const { user } = useSelector((state) => state.user);
  const [form, setForm] = useState({
    name: "",
    username: "",
    bio: "",
    website: "",
    gender: "Prefer not to say",
    isPrivate: false,
  });

  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRotation, setAvatarRotation] = useState(0);

  const [coverPreview, setCoverPreview] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverRotation, setCoverRotation] = useState(0);

  // FIXED: Declaring showGenderDrop state!
  const [showGenderDrop, setShowGenderDrop] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isGoogleConnected = Boolean(
    user?.googleId || user?.hasGoogle || user?.authProvider?.includes("google")
  );
  const isGithubConnected = Boolean(
    user?.githubId || user?.hasGithub || user?.authProvider?.includes("github")
  );
  const isPasswordSet = Boolean(
    user?.hasPassword || (user?.authProvider?.includes("local") && user?.hasPassword !== false)
  );

  const handleOpenPasswordModal = (mode = "set") => {
    window.dispatchEvent(
      new CustomEvent("lime:open-password-modal", { detail: { mode } })
    );
  };

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const avatarBlobRef = useRef(null);
  const coverBlobRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    return () => {
      if (avatarBlobRef.current) URL.revokeObjectURL(avatarBlobRef.current);
      if (coverBlobRef.current) URL.revokeObjectURL(coverBlobRef.current);
    };
  }, []);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        username: user.username || "",
        bio: user.bio || "",
        website: user.website || "",
        gender: user.gender || "Prefer not to say",
        isPrivate: Boolean(user.isPrivate),
      });
      if (user.profileImage) {
        setAvatarPreview(user.profileImage);
      }
      if (user.coverImage) {
        setCoverPreview(
          user.coverImage.startsWith("http")
            ? user.coverImage
            : `${serverUrl}${user.coverImage}`
        );
      }
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (avatarBlobRef.current) URL.revokeObjectURL(avatarBlobRef.current);
    const blobUrl = URL.createObjectURL(file);
    avatarBlobRef.current = blobUrl;
    setAvatarFile(file);
    setAvatarPreview(blobUrl);
    setAvatarRotation(0);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (coverBlobRef.current) URL.revokeObjectURL(coverBlobRef.current);
    const blobUrl = URL.createObjectURL(file);
    coverBlobRef.current = blobUrl;
    setCoverFile(file);
    setCoverPreview(blobUrl);
    setCoverRotation(0);
  };

  /**
   * Rotate avatar image 90° clockwise using HTML5 canvas
   */
  const handleRotateAvatar = () => {
    if (!avatarPreview) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = avatarPreview;
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
          const rotated = new File([blob], "avatar_rotated.jpg", {
            type: "image/jpeg",
          });
          setAvatarFile(rotated);
          setAvatarPreview(URL.createObjectURL(blob));
          setAvatarRotation((r) => (r + 90) % 360);
          toast.success("Profile photo rotated 90°");
        }
      }, "image/jpeg");
    };
  };

  /**
   * Rotate cover photo 90° clockwise using HTML5 canvas
   */
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
          toast.success("Cover photo rotated 90°");
        }
      }, "image/jpeg");
    };
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!form.username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("username", form.username);
      formData.append("bio", form.bio);
      formData.append("website", form.website);
      formData.append("gender", form.gender);
      formData.append("isPrivate", form.isPrivate);

      if (avatarFile) {
        formData.append("image", avatarFile);
        formData.append("rotation", avatarRotation);
      }
      if (coverFile) {
        formData.append("coverImage", coverFile);
        formData.append("coverRotation", coverRotation);
      }

      const { data } = await axios.post(
        `${serverUrl}/api/user/profile/edit`,
        formData,
        {
          withCredentials: true,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          },
        }
      );

      if (data?.success) {
        toast.success("Profile updated successfully!");
        dispatch(setuser(data.user));
        navigate(`/profile/${user._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-card">
        {/* Top Header */}
        <header className="ep-top-header">
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate(`/profile/${user?._id}`)}
          >
            <ArrowLeft size={20} />
          </button>
          <h2>Edit Profile</h2>
          <button
            type="button"
            className="save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <BeatLoader size={6} color="#fff" /> : "Save Changes"}
          </button>
        </header>

        {/* Cover Photo Banner Edit */}
        <div className="ep-cover-edit-section">
          {coverPreview ? (
            <img src={coverPreview} alt="Cover preview" className="ep-cover-img" />
          ) : (
            <div className="default-cover-gradient" />
          )}
          <div className="cover-edit-overlay">
            <button
              type="button"
              className="ep-media-btn"
              onClick={(e) => {
                e.stopPropagation();
                coverInputRef.current?.click();
              }}
            >
              <Camera size={16} /> Change Cover
            </button>
            {coverPreview && (
              <button
                type="button"
                className="ep-media-btn"
                onClick={handleRotateCover}
                title="Rotate cover photo"
              >
                <RotateCw size={16} /> Rotate
              </button>
            )}
          </div>
          <input
            type="file"
            ref={coverInputRef}
            accept="image/*,.heic,.heif,.webp,.avif,.png,.jpg,.jpeg,.bmp,.svg,*"
            style={{ display: "none" }}
            onClick={(e) => {
              e.target.value = null;
            }}
            onChange={handleCoverChange}
          />
        </div>

        {/* Avatar Edit Section */}
        <div className="ep-avatar-edit-section">
          <div className="avatar-preview-box">
            <img src={avatarPreview} alt="Avatar" className="ep-avatar-img" />
            <button
              type="button"
              className="avatar-camera-badge"
              onClick={() => avatarInputRef.current?.click()}
              title="Upload new avatar"
            >
              <Camera size={16} />
            </button>
          </div>

          <div className="avatar-tools-row">
            <button
              type="button"
              className="change-photo-text-btn"
              onClick={() => avatarInputRef.current?.click()}
            >
              Upload Photo
            </button>
            {avatarPreview && (
              <button
                type="button"
                className="rotate-photo-text-btn"
                onClick={handleRotateAvatar}
              >
                <RotateCw size={14} /> Rotate
              </button>
            )}
          </div>
          <input
            type="file"
            ref={avatarInputRef}
            accept="image/*,.heic,.heif,.webp,.avif,.png,.jpg,.jpeg,.bmp,.svg,*"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
          />
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSave} className="ep-form-fields">
          <div className="ep-field-group">
            <label>Full Name</label>
            <div className="ep-input-wrapper">
              <User size={18} className="ep-field-icon" />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
                maxLength={50}
              />
            </div>
          </div>

          <div className="ep-field-group">
            <label>Username</label>
            <div className="ep-input-wrapper">
              <AtSign size={18} className="ep-field-icon" />
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="username"
                maxLength={30}
              />
            </div>
          </div>

          <div className="ep-field-group">
            <label>Bio</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell the community about yourself..."
              rows={4}
              maxLength={250}
            />
            <span className="ep-char-counter">{form.bio.length}/250</span>
          </div>

          <div className="ep-field-group">
            <label>Website</label>
            <div className="ep-input-wrapper">
              <Globe size={18} className="ep-field-icon" />
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://yoursite.com"
              />
            </div>
          </div>

          <div className="ep-field-group">
            <label>Gender</label>
            <div
              className="ep-gender-select-box"
              onClick={() => setShowGenderDrop(!showGenderDrop)}
            >
              <span>{form.gender}</span>
              <ChevronDown size={16} />
            </div>

            {showGenderDrop && (
              <div className="ep-gender-dropdown-menu">
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`gender-option-item ${
                      form.gender === g ? "selected" : ""
                    }`}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, gender: g }));
                      setShowGenderDrop(false);
                    }}
                  >
                    <span>{g}</span>
                    {form.gender === g && <Check size={16} color="#84cc16" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Privacy Toggle */}
          <div className="ep-privacy-toggle-box">
            <div className="privacy-info">
              <div className="privacy-title">
                <Lock size={16} color="#84cc16" />
                <strong>Private Account</strong>
              </div>
              <p>When your account is private, only followers can view your posts.</p>
            </div>
            <label className="switch-toggle">
              <input
                type="checkbox"
                name="isPrivate"
                checked={form.isPrivate}
                onChange={handleChange}
              />
              <span className="slider round" />
            </label>
          </div>

          {/* Login & Security Section */}
          <div className="ep-security-section">
            <div className="security-section-header">
              <Shield size={18} className="security-header-icon" />
              <h3>Login & Security</h3>
            </div>

            <div className="security-items-list">
              {/* Google */}
              <div className="security-item-card">
                <div className="item-left">
                  <div className="provider-icon-frame">
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/>
                      <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/>
                      <path fill="#4A90D9" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/>
                      <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"/>
                    </svg>
                  </div>
                  <div className="item-info">
                    <span className="provider-name">Google</span>
                    <span className={`status-badge ${isGoogleConnected ? "connected" : "not-connected"}`}>
                      {isGoogleConnected ? (
                        <>
                          <CheckCircle2 size={13} />
                          Connected
                        </>
                      ) : (
                        <>
                          <XCircle size={13} />
                          Not Connected
                        </>
                      )}
                    </span>
                  </div>
                </div>
                {!isGoogleConnected && (
                  <a
                    href={`${oauthBaseUrl}/api/auth/google`}
                    className="item-action-btn btn-connect"
                  >
                    <span>Connect Google</span>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>

              {/* GitHub */}
              <div className="security-item-card">
                <div className="item-left">
                  <div className="provider-icon-frame">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                  <div className="item-info">
                    <span className="provider-name">GitHub</span>
                    <span className={`status-badge ${isGithubConnected ? "connected" : "not-connected"}`}>
                      {isGithubConnected ? (
                        <>
                          <CheckCircle2 size={13} />
                          Connected
                        </>
                      ) : (
                        <>
                          <XCircle size={13} />
                          Not Connected
                        </>
                      )}
                    </span>
                  </div>
                </div>
                {!isGithubConnected && (
                  <a
                    href={`${oauthBaseUrl}/api/auth/github`}
                    className="item-action-btn btn-connect"
                  >
                    <span>Connect GitHub</span>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>

              {/* Password */}
              <div className="security-item-card">
                <div className="item-left">
                  <div className="provider-icon-frame">
                    <KeyRound size={20} color="#84cc16" />
                  </div>
                  <div className="item-info">
                    <span className="provider-name">Password</span>
                    <span className={`status-badge ${isPasswordSet ? "set" : "not-set"}`}>
                      {isPasswordSet ? (
                        <>
                          <CheckCircle2 size={13} />
                          Set
                        </>
                      ) : (
                        <>
                          <XCircle size={13} />
                          Not Set
                        </>
                      )}
                    </span>
                  </div>
                </div>
                {isPasswordSet ? (
                  <button
                    type="button"
                    className="item-action-btn btn-change-pwd"
                    onClick={() => handleOpenPasswordModal("change")}
                  >
                    Change Password
                  </button>
                ) : (
                  <button
                    type="button"
                    className="item-action-btn btn-set-pwd"
                    onClick={() => handleOpenPasswordModal("set")}
                  >
                    Set Password
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="ep-bottom-save-container">
            <button type="submit" className="ep-full-save-btn" disabled={saving}>
              {saving ? <BeatLoader size={8} color="#fff" /> : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;


