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
          console.warn("Remote audio play prevented by browser:", err);
        });
      }

      // 2. Play video if video call
      if (remoteVideoRef.current && !isAudioOnly) {
        if (remoteVideoRef.current.srcObject !== stream) {
          remoteVideoRef.current.srcObject = stream;
        }
        remoteVideoRef.current.play().catch((err) => {
          console.warn("Remote video play prevented by browser:", err);
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

  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
      }
    }
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

  // Main lifecycle setup
  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    let cancelled = false;

    const initCall = async () => {
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
            setStatus("Microphone permission required. Please allow access.");
            return;
          }
        }

        if (cancelled) return;
        localStreamRef.current = stream;
        if (localVideoRef.current && !isAudioOnly) {
          localVideoRef.current.srcObject = stream;
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
      }
    };

    initCall();

    return () => {
      cancelled = true;
      callSounds.cleanup();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, isAudioOnly, isCaller, createPeerConnection, endCall, navigate]);

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
                isPeerConnected ? "connected" : "connecting"
              }`}
            />
            {isPeerConnected ? formatDuration(callDuration) : status}
          </span>
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
                    isPeerConnected ? "connected" : "connecting"
                  }`}
                />
                <span>
                  {isPeerConnected ? formatDuration(callDuration) : status}
                </span>
              </div>
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
          className={`call-btn ${muted ? "call-btn--active" : ""}`}
          onClick={handleToggleMic}
          title={muted ? "Unmute Mic" : "Mute Mic"}
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
        >
          {muted ? <MicOff size={22} /> : <Mic size={22} />}
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

