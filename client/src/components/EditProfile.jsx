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
} from "lucide-react";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../App";
import { setuser } from "../redux/user.slice";

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

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

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
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarRotation(0);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
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
        { withCredentials: true }
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
              onClick={() => coverInputRef.current?.click()}
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
