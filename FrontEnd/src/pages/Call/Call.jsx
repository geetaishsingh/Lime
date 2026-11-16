import './Call.scss';
import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ArrowLeft,
  RotateCw,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  X,
  ArrowUpRight,
} from "lucide-react";
import { serverUrl } from "../../config";
import { callSounds } from "../../utils/callSounds";

const SIGNALING_SERVER_URL = serverUrl;

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CallPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const roomId = location.state?.roomId || searchParams.get("roomId");
  const callType = location.state?.callType || searchParams.get("callType") || "video";
  const isCaller = location.state?.isCaller ?? (searchParams.get("isCaller") === "true");

  const remoteName =
    location.state?.otherUser?.name ||
    location.state?.otherUser?.username ||
    location.state?.callerName ||
    searchParams.get("remoteName") ||
    "Lime User";

  const remoteAvatar =
    location.state?.otherUser?.profileImage ||
    location.state?.avatarUrl ||
    searchParams.get("remoteAvatar") ||
    "";

  const isAudioOnly = callType === "audio";

  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(isAudioOnly);
  const [status, setStatus] = useState(
    isCaller ? "Calling..." : "Connecting..."
  );
  const [callDuration, setCallDuration] = useState(0);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [permissionError, setPermissionError] = useState(null); // null | 'mic' | 'camera' | 'blocked'
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const durationTimerRef = useRef(null);

  const endCall = useCallback(() => {
    callSounds.playCallEndTone();

    try {
      if (socketRef.current && roomId) {
        socketRef.current.emit("hang-up", { roomId });
      }
    } catch (_e) {}

    // Clean up local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }

    navigate(-1);
  }, [roomId, navigate]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote tracks (audio and video)
    pc.ontrack = (event) => {
      let stream = event.streams && event.streams[0];
      if (!stream) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(event.track);
        stream = remoteStreamRef.current;
      } else {
        remoteStreamRef.current = stream;
      }

      // 1. Play audio for ALL call types (audio & video)
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== stream) {
          remoteAudioRef.current.srcObject = stream;
        }
        remoteAudioRef.current.play().catch((err) => {
          if (err?.name !== "NotAllowedError") {
            console.error("Failed to play remote audio:", err);
          }
        });
      }

      // 2. Play video if video call
      if (remoteVideoRef.current && !isAudioOnly) {
        if (remoteVideoRef.current.srcObject !== stream) {
          remoteVideoRef.current.srcObject = stream;
        }
        remoteVideoRef.current.play().catch((err) => {
          if (err?.name !== "NotAllowedError") {
            console.error("Failed to play remote video:", err);
          }
        });
      }

      setIsPeerConnected(true);
      setStatus("Connected");
      callSounds.stopOutgoingTone();
    };

    // Send ICE candidates to signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("signal", {
          roomId,
          data: { candidate: event.candidate },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setStatus("Connected");
        setIsPeerConnected(true);
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        setStatus("Call ended");
        endCall();
      }
    };

    return pc;
  }, [roomId, endCall]);

  const handleRequestPermission = useCallback(async () => {
    setIsRequestingPermission(true);
    setStatus("Requesting permission...");

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: !isAudioOnly,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (_videoErr) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        setCamOff(true);
      }

      localStreamRef.current = stream;
      if (localVideoRef.current && !isAudioOnly) {
        localVideoRef.current.srcObject = stream;
      }
      setPermissionError(null);
      setShowPermissionGuide(false);
      setIsRequestingPermission(false);
      setStatus(isCaller ? "Calling..." : "Connecting...");
      setRetryCounter((c) => c + 1);
    } catch (err) {
      console.warn("Direct permission request failed:", err);
      setIsRequestingPermission(false);
      const isBlocked =
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError";
      setPermissionError(isBlocked ? "blocked" : "mic");
      setStatus("Microphone permission required. Please allow access.");
      if (isBlocked) {
        setShowPermissionGuide(true);
      }
    }
  }, [isAudioOnly, isCaller]);

  const handleToggleMic = () => {
    if (permissionError) {
      handleRequestPermission();
      return;
    }
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
      }
    }
  };

  const handleRefreshCall = () => {
    setIsRefreshing(true);
    if (permissionError) {
      handleRequestPermission();
    } else {
      setRetryCounter((c) => c + 1);
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  };

  const handleToggleCam = () => {
    if (localStreamRef.current && !isAudioOnly) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCamOff(!videoTrack.enabled);
      }
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Auto-detect when user grants permission in browser settings and returns to tab
  useEffect(() => {
    let micStatus;

    const checkPermissionState = async () => {
      if (!navigator.permissions || !navigator.permissions.query) return;
      try {
        const status = await navigator.permissions.query({ name: "microphone" });
        micStatus = status;

        const updateStatus = () => {
          if (status.state === "granted") {
            setPermissionError(null);
            if (!localStreamRef.current || !localStreamRef.current.active) {
              setRetryCounter((c) => c + 1);
            }
          } else if (status.state === "denied") {
            setPermissionError("blocked");
          }
        };

        updateStatus();
        status.onchange = updateStatus;
      } catch (_e) {
        // Ignored if permissions query is unsupported
      }
    };

    checkPermissionState();

    const handleFocus = () => {
      checkPermissionState();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      if (micStatus) micStatus.onchange = null;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  // Main lifecycle setup
  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    let cancelled = false;

    const initCall = async () => {
      try {
        let stream = localStreamRef.current;
        if (!stream || stream.getTracks().length === 0 || !stream.active) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: !isAudioOnly,
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
          } catch (_mediaErr) {
            // If video permission failed or device lacks camera, try audio only
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
              });
              setStatus("Camera unavailable — Audio only mode");
              setCamOff(true);
            } catch (_audioErr) {
              const isBlocked =
                _audioErr.name === "NotAllowedError" ||
                _audioErr.name === "PermissionDeniedError";
              setPermissionError(isBlocked ? "blocked" : "mic");
              setStatus("Microphone permission required. Please allow access.");
              setIsRequestingPermission(false);
              setIsRefreshing(false);
              return;
            }
          }
        }

        if (cancelled) return;
        setPermissionError(null);
        setIsRequestingPermission(false);
        setIsRefreshing(false);
        localStreamRef.current = stream;
        if (localVideoRef.current && !isAudioOnly) {
          localVideoRef.current.srcObject = stream;
        }

        // Close any prior peer connection
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }

        // Connect to signaling socket
        const socket = io(SIGNALING_SERVER_URL, {
          withCredentials: true,
          transports: ["websocket", "polling"],
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("join-room", roomId);
        });

        socket.on("joined-room", async ({ otherPeers }) => {
          if (cancelled) return;
          const pc = createPeerConnection();

          // If caller, create SDP Offer
          if (isCaller || otherPeers.length > 0) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit("signal", { roomId, data: { sdp: offer } });
            } catch (err) {
              console.error("Error creating offer:", err);
            }
          }
        });

        // Handle signaling data (SDP and ICE Candidates)
        socket.on("signal", async ({ data }) => {
          if (cancelled) return;
          const pc = pcRef.current || createPeerConnection();

          if (data.sdp) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              if (data.sdp.type === "offer") {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("signal", { roomId, data: { sdp: answer } });
              }
            } catch (err) {
              console.error("Error handling SDP:", err);
            }
          } else if (data.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.error("Error adding ICE candidate:", err);
            }
          }
        });

        socket.on("peer-hung-up", () => {
          setStatus("Other user hung up");
          callSounds.playCallEndTone();
          setTimeout(() => endCall(), 1200);
        });

        socket.on("room-full", () => {
          setStatus("Call room is full");
          callSounds.playCallEndTone();
          setTimeout(() => endCall(), 2000);
        });
      } catch (err) {
        console.error("Failed to initialize call:", err);
        setStatus("Could not access camera/microphone.");
        setPermissionError("blocked");
        setIsRequestingPermission(false);
        setIsRefreshing(false);
      }
    };

    initCall();

    return () => {
      cancelled = true;
      callSounds.cleanup();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [roomId, isAudioOnly, isCaller, createPeerConnection, endCall, navigate, retryCounter]);

  // Manage outgoing ringback tone while waiting for peer to answer
  useEffect(() => {
    if (isCaller && !isPeerConnected) {
      callSounds.startOutgoingTone();
    } else {
      callSounds.stopOutgoingTone();
    }

    return () => {
      callSounds.stopOutgoingTone();
    };
  }, [isCaller, isPeerConnected]);

  // Call duration counter
  useEffect(() => {
    if (isPeerConnected) {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [isPeerConnected]);

  // Handle any container click to ensure audio context / playback is unblocked
  const handleContainerInteraction = () => {
    if (remoteAudioRef.current && remoteAudioRef.current.srcObject && remoteAudioRef.current.paused) {
      remoteAudioRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      className={`call-container ${isAudioOnly ? "call-container--audio" : ""}`}
      onClick={handleContainerInteraction}
    >

      {/* Essential: Audio element for remote sound in BOTH audio and video calls */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        aria-hidden="true"
        style={{ display: "none" }}
      />
      {/* Top Header */}
      <div className="call-header">
        <button
          className="call-header-back-btn"
          onClick={endCall}
          aria-label="Exit Call"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="call-header-user">
          <span className="call-header-name">
            {remoteName ? `@${remoteName.replace('@', '')}` : "In Call"}
          </span>
          <span className="call-header-status">
            <span
              className={`status-indicator-dot ${
                isPeerConnected
                  ? "connected"
                  : permissionError
                  ? "error"
                  : "connecting"
              }`}
            />
            {isPeerConnected ? formatDuration(callDuration) : status}
          </span>
        </div>
        <div className="call-header-actions">
          <button
            type="button"
            className="call-header-refresh-btn"
            onClick={handleRefreshCall}
            title="Refresh / Reconnect Call"
            aria-label="Refresh Call"
          >
            <RotateCw size={18} className={isRefreshing ? "spin-icon" : ""} />
          </button>
        </div>
      </div>

      {/* Video / Audio Feeds */}
      <div className="call-streams">
        {/* Remote Video / Audio placeholder */}
        <div className="call-stream-remote">
          {!isAudioOnly && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="call-video-element"
            />
          )}

          {(!isPeerConnected || isAudioOnly) && (
            <div className="call-audio-avatar-card">
              <div className="call-avatar-pulse-container">
                <span className="pulse-ring ring-1" />
                <span className="pulse-ring ring-2" />
                <img
                  src={
                    remoteAvatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      remoteName
                    )}&background=84cc16&color=09090b&size=256`
                  }
                  alt={remoteName || "Caller"}
                  className="call-large-avatar"
                />
              </div>
              <h2 className="call-caller-name">
                {remoteName ? `@${remoteName.replace('@', '')}` : "Connecting..."}
              </h2>
              <div className="call-status-badge">
                <span
                  className={`status-indicator-dot ${
                    isPeerConnected
                      ? "connected"
                      : permissionError
                      ? "error"
                      : "connecting"
                  }`}
                />
                <span>
                  {isPeerConnected ? formatDuration(callDuration) : status}
                </span>
              </div>

              {/* Problem 2 Fix: Interactive Permission Grant Card */}
              {permissionError && (
                <div className="call-permission-card">
                  <div className="call-permission-card-icon">
                    <AlertTriangle size={24} color="#eab308" />
                  </div>
                  <h4 className="call-permission-card-title">
                    {permissionError === "blocked"
                      ? "Microphone Access Blocked"
                      : "Microphone Access Required"}
                  </h4>
                  <p className="call-permission-card-text">
                    {permissionError === "blocked"
                      ? "Your browser is currently blocking microphone access for Lime."
                      : "Lime needs microphone access so other participants can hear you."}
                  </p>

                  <div className="call-permission-steps">
                    <div className="call-permission-step">
                      <span className="step-num">1</span>
                      <span className="step-text">
                        Tap the <strong>3 dots (⋮)</strong> or <strong>tune/lock icon</strong> in your browser address bar.
                      </span>
                    </div>
                    <div className="call-permission-step">
                      <span className="step-num">2</span>
                      <span className="step-text">
                        Go to <strong>Site settings</strong> or <strong>Permissions</strong> → Set <strong>Microphone</strong> to <strong>Allow</strong>.
                      </span>
                    </div>
                    <div className="call-permission-step">
                      <span className="step-num">3</span>
                      <span className="step-text">
                        Tap <strong>Allow Permission / Retry</strong> below, or tap <strong>Reload &amp; Connect</strong>.
                      </span>
                    </div>
                  </div>

                  <div className="call-permission-actions">
                    <button
                      type="button"
                      className="call-permission-btn"
                      onClick={handleRequestPermission}
                      disabled={isRequestingPermission}
                    >
                      <ShieldCheck size={18} />
                      <span>
                        {isRequestingPermission
                          ? "Requesting Access..."
                          : "Allow Permission / Retry"}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="call-permission-guide-trigger"
                      onClick={() => setShowPermissionGuide(true)}
                    >
                      <HelpCircle size={16} />
                      <span>Where do I tap? Show Guide</span>
                    </button>

                    <button
                      type="button"
                      className="call-permission-reload-btn"
                      onClick={() => window.location.reload()}
                      title="Reload page to apply settings"
                    >
                      <RotateCw size={16} />
                      <span>Reload &amp; Connect</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Visual Guide Modal for Unblocking Microphone */}
              {showPermissionGuide && (
                <div
                  className="call-guide-backdrop"
                  onClick={() => setShowPermissionGuide(false)}
                >
                  <div
                    className="call-guide-modal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="call-guide-top-pointer">
                      <span className="pointer-text">
                        Tap <strong>⋮</strong> at top-right of your browser
                      </span>
                      <ArrowUpRight size={22} className="pointer-arrow" />
                    </div>

                    <div className="call-guide-header">
                      <div className="call-guide-badge">
                        <AlertTriangle size={18} color="#eab308" />
                        <span>Unblock Microphone</span>
                      </div>
                      <button
                        type="button"
                        className="call-guide-close-btn"
                        onClick={() => setShowPermissionGuide(false)}
                        aria-label="Close guide"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <p className="call-guide-subtitle">
                      Web browsers forbid websites from opening phone settings directly for security. Follow these 3 taps in Chrome:
                    </p>

                    <div className="call-guide-steps-list">
                      <div className="call-guide-step-card">
                        <div className="step-badge">1</div>
                        <div className="step-content">
                          <h5>Tap the 3 dots (⋮) in Chrome</h5>
                          <p>Top-right corner next to the address bar.</p>
                        </div>
                      </div>

                      <div className="call-guide-step-card">
                        <div className="step-badge">2</div>
                        <div className="step-content">
                          <h5>Tap Site settings or ⓘ Info</h5>
                          <p>
                            Go to <strong>Permissions</strong> → <strong>Microphone</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="call-guide-step-card">
                        <div className="step-badge">3</div>
                        <div className="step-content">
                          <h5>Change to &quot;Allow&quot;</h5>
                          <p>
                            Switch from <em>Blocked</em> to <strong>Allow</strong>.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="call-guide-actions">
                      <button
                        type="button"
                        className="call-permission-btn"
                        onClick={() => {
                          setShowPermissionGuide(false);
                          handleRequestPermission();
                        }}
                      >
                        <ShieldCheck size={18} />
                        <span>Try Allow Again</span>
                      </button>

                      <button
                        type="button"
                        className="call-permission-reload-btn"
                        onClick={() => window.location.reload()}
                      >
                        <RotateCw size={16} />
                        <span>Reload &amp; Connect</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Local Video Picture-in-Picture */}
        {!isAudioOnly && (
          <div className={`call-stream-local ${camOff ? "cam-off" : ""}`}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="call-video-element local"
            />
            {camOff && (
              <div className="cam-off-overlay">
                <VideoOff size={24} />
                <span>Camera Off</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="call-controls">
        <button
          className={`call-btn ${muted ? "call-btn--active" : ""} ${
            permissionError ? "call-btn--warning" : ""
          }`}
          onClick={handleToggleMic}
          title={
            permissionError
              ? "Tap to grant Microphone permission"
              : muted
              ? "Unmute Mic"
              : "Mute Mic"
          }
          aria-label={
            permissionError
              ? "Tap to grant Microphone permission"
              : muted
              ? "Unmute microphone"
              : "Mute microphone"
          }
        >
          {muted || permissionError ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {!isAudioOnly && (
          <button
            className={`call-btn ${camOff ? "call-btn--active" : ""}`}
            onClick={handleToggleCam}
            title={camOff ? "Turn Camera On" : "Turn Camera Off"}
            aria-label={camOff ? "Turn camera on" : "Turn camera off"}
          >
            {camOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>
        )}

        <button
          className="call-btn call-btn--hangup"
          onClick={endCall}
          title="End Call"
          aria-label="End call"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

export default CallPage;

