import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  PictureInPicture2,
  Heart,
  Gauge,
  Check,
} from "lucide-react";

/**
 * Format seconds to MM:SS
 */
const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return "0:00";
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const CustomVideoPlayer = ({
  src,
  poster = "",
  autoPlay = false,
  initialMuted = true,
  loop = true,
  onDoubleClick,
  className = "",
  durationBadge,
}) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const scrubberRef = useRef(null);
  const hideControlsTimerRef = useRef(null);
  const clickTimeoutRef = useRef(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(initialMuted ? 0 : 1);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);

  // Hover scrubber tooltip
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);

  // Interactive feedback animations
  const [centerAnimation, setCenterAnimation] = useState(null); // 'play' | 'pause' | null
  const [showHeart, setShowHeart] = useState(false);

  // Track if user intentionally played or paused (for IntersectionObserver)
  const userPausedRef = useRef(!autoPlay);

  // Check PiP capability
  useEffect(() => {
    if (typeof document !== "undefined" && "pictureInPictureEnabled" in document) {
      setIsPiPSupported(document.pictureInPictureEnabled);
    }
  }, []);

  // Sync initial mute and volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = initialMuted;
      videoRef.current.volume = initialMuted ? 0 : 1;
    }
  }, [initialMuted]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Intersection Observer for auto-pause when scrolled off-screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!videoRef.current) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Auto-resume only if user hadn't manually paused
            if (!userPausedRef.current && videoRef.current.paused) {
              videoRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => {});
            }
          } else {
            // Pause when off-screen
            if (!videoRef.current.paused) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: [0, 0.5, 1] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Controls auto-hide timer
  const resetHideControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    // Only auto-hide if playing and speed menu is not open
    if (isPlaying && !isSpeedMenuOpen && !isDraggingScrubber) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPlaying, isSpeedMenuOpen, isDraggingScrubber]);

  const handleMouseMove = () => {
    resetHideControlsTimer();
  };

  const handleMouseLeave = () => {
    if (isPlaying && !isSpeedMenuOpen && !isDraggingScrubber) {
      setShowControls(false);
    }
  };

  // Video Time Update & Buffer
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);

    // Calculate buffer
    if (videoRef.current.buffered.length > 0 && videoRef.current.duration > 0) {
      const bufferedEnd = videoRef.current.buffered.end(
        videoRef.current.buffered.length - 1
      );
      setBufferedPercent((bufferedEnd / videoRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    if (autoPlay) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          userPausedRef.current = false;
        })
        .catch(() => {});
    }
  };

  // Play / Pause toggle
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          userPausedRef.current = false;
          setCenterAnimation("play");
          setTimeout(() => setCenterAnimation(null), 600);
        })
        .catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      userPausedRef.current = true;
      setShowControls(true);
      setCenterAnimation("pause");
      setTimeout(() => setCenterAnimation(null), 600);
    }
  }, []);

  // Click on video surface: distinguish single click (play/pause) vs double click (like)
  const handleVideoSurfaceClick = (e) => {
    // Avoid triggering when clicking controls
    if (e.target.closest(".custom-controls-wrapper")) return;

    if (clickTimeoutRef.current) {
      // Double click detected!
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
      if (onDoubleClick) {
        onDoubleClick(e);
      }
    } else {
      // Single click timer
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        togglePlayPause();
      }, 240);
    }
  };

  // Skip ±10 seconds
  const handleSkip = (seconds) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    resetHideControlsTimer();
  };

  // Volume & Mute handling
  const handleVolumeChange = (newVol) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    videoRef.current.volume = clamped;
    videoRef.current.muted = clamped === 0;
    setVolume(clamped);
    setIsMuted(clamped === 0);
    resetHideControlsTimer();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted || volume === 0) {
      const restored = volume > 0 ? volume : 0.8;
      videoRef.current.muted = false;
      videoRef.current.volume = restored;
      setIsMuted(false);
      setVolume(restored);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
      setVolume(0);
    }
    resetHideControlsTimer();
  };

  // Playback Speed
  const handleSpeedSelect = (speed) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setIsSpeedMenuOpen(false);
    resetHideControlsTimer();
  };

  // Picture in Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP error:", err);
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  // Scrubber seeking calculations
  const calculateScrubPosition = (e) => {
    if (!scrubberRef.current || duration <= 0) return 0;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return (offsetX / rect.width) * duration;
  };

  const handleScrubberMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingScrubber(true);
    setShowControls(true);
    const seekTime = calculateScrubPosition(e);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }

    const onMove = (moveEvent) => {
      const targetTime = calculateScrubPosition(moveEvent);
      if (videoRef.current) {
        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
      }
    };

    const onUp = () => {
      setIsDraggingScrubber(false);
      resetHideControlsTimer();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
  };

  const handleScrubberMouseMove = (e) => {
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = (offsetX / rect.width) * 100;
    const previewTime = (offsetX / rect.width) * duration;
    setHoverPosition(percent);
    setHoverTime(previewTime);
  };

  const handleScrubberMouseLeave = () => {
    setHoverTime(null);
  };

  // Keyboard controls
  const handleKeyDown = (e) => {
    // Only if target is container or its buttons
    if (["input", "textarea"].includes(e.target.tagName.toLowerCase())) return;

    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlayPause();
        break;
      case "m":
        e.preventDefault();
        toggleMute();
        break;
      case "f":
        e.preventDefault();
        toggleFullscreen();
        break;
      case "ArrowLeft":
      case "j":
        e.preventDefault();
        handleSkip(-10);
        break;
      case "ArrowRight":
      case "l":
        e.preventDefault();
        handleSkip(10);
        break;
      case "ArrowUp":
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
        break;
      case "ArrowDown":
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
        break;
      default:
        break;
    }
  };

  const playedPercent = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  return (
    <div
      ref={containerRef}
      className={`pro-video-player-container ${className} ${
        isFullscreen ? "is-fullscreen" : ""
      } ${!showControls && isPlaying ? "controls-hidden" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleVideoSurfaceClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Video Player"
    >
      {/* HTML5 Video Element (Without native controls) */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        loop={loop}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="pro-video-element"
      />

      {/* Floating Center Ripple Feedback */}
      {centerAnimation && (
        <div className="center-action-ripple">
          <div className="ripple-icon-circle">
            {centerAnimation === "play" ? (
              <Play size={36} fill="#ffffff" color="#ffffff" />
            ) : (
              <Pause size={36} fill="#ffffff" color="#ffffff" />
            )}
          </div>
        </div>
      )}

      {/* Double Tap Heart Pop Feedback */}
      {showHeart && (
        <div className="heart-burst-overlay">
          <Heart size={84} fill="#ef4444" color="#ef4444" className="heart-burst-icon" />
        </div>
      )}

      {/* Optional Top Duration Badge (if passed or metadata) */}
      {durationBadge && !isPlaying && (
        <span className="pro-video-top-badge">
          {Math.round(durationBadge)}s
        </span>
      )}

      {/* Custom Pro Controls Overlay */}
      <div
        className={`custom-controls-wrapper ${
          showControls || !isPlaying ? "visible" : "hidden"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrubber / Progress Bar with Hover Timestamp Preview */}
        <div
          ref={scrubberRef}
          className="video-scrubber-track"
          onMouseDown={handleScrubberMouseDown}
          onTouchStart={handleScrubberMouseDown}
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={handleScrubberMouseLeave}
        >
          {/* Buffered Progress */}
          <div
            className="scrubber-buffer-fill"
            style={{ width: `${bufferedPercent}%` }}
          />

          {/* Played Progress (Lime Accent) */}
          <div
            className="scrubber-played-fill"
            style={{ width: `${playedPercent}%` }}
          >
            <div className="scrubber-thumb-handle" />
          </div>

          {/* Hover Tooltip Timestamp */}
          {hoverTime !== null && (
            <div
              className="scrubber-hover-tooltip"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="controls-action-bar">
          {/* Left Controls: Play/Pause, ±10s, Volume, Time */}
          <div className="controls-left-group">
            {/* Play / Pause Toggle */}
            <button
              type="button"
              className="ctrl-btn play-pause-btn"
              onClick={togglePlayPause}
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause size={19} fill="currentColor" />
              ) : (
                <Play size={19} fill="currentColor" />
              )}
            </button>

            {/* Skip 10s Backward */}
            <button
              type="button"
              className="ctrl-btn skip-btn"
              onClick={() => handleSkip(-10)}
              title="Rewind 10 seconds (J / ←)"
            >
              <RotateCcw size={17} />
              <span className="skip-number">10</span>
            </button>

            {/* Skip 10s Forward */}
            <button
              type="button"
              className="ctrl-btn skip-btn"
              onClick={() => handleSkip(10)}
              title="Fast forward 10 seconds (L / →)"
            >
              <RotateCw size={17} />
              <span className="skip-number">10</span>
            </button>

            {/* Volume Icon & Hover Slider */}
            <div className="volume-control-wrapper">
              <button
                type="button"
                className="ctrl-btn volume-btn"
                onClick={toggleMute}
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={19} />
                ) : volume < 0.5 ? (
                  <Volume1 size={19} />
                ) : (
                  <Volume2 size={19} />
                )}
              </button>

              <div className="volume-slider-box">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="volume-slider-range"
                  aria-label="Volume slider"
                />
              </div>
            </div>

            {/* Current Time / Total Duration */}
            <div className="time-display-readout">
              <span className="current-time">{formatTime(currentTime)}</span>
              <span className="time-divider">/</span>
              <span className="total-time">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Speed Menu, PiP, Fullscreen */}
          <div className="controls-right-group">
            {/* Speed Selector Menu */}
            <div className="speed-menu-anchor">
              <button
                type="button"
                className={`ctrl-btn speed-btn ${playbackSpeed !== 1 ? "speed-active" : ""}`}
                onClick={() => setIsSpeedMenuOpen((prev) => !prev)}
                title="Playback Speed"
              >
                <Gauge size={16} />
                <span className="speed-text">{playbackSpeed}x</span>
              </button>

              {isSpeedMenuOpen && (
                <div className="speed-dropdown-panel">
                  <div className="speed-dropdown-header">Playback Speed</div>
                  {SPEED_OPTIONS.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      className={`speed-option-btn ${
                        playbackSpeed === speed ? "selected" : ""
                      }`}
                      onClick={() => handleSpeedSelect(speed)}
                    >
                      <span>{speed === 1 ? "Normal" : `${speed}x`}</span>
                      {playbackSpeed === speed && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picture-in-Picture Button */}
            {isPiPSupported && (
              <button
                type="button"
                className="ctrl-btn pip-btn"
                onClick={togglePiP}
                title="Picture in Picture"
              >
                <PictureInPicture2 size={18} />
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              type="button"
              className="ctrl-btn fullscreen-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomVideoPlayer;
