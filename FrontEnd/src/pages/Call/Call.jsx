import './Call.scss';
import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ArrowLeft,
} from "lucide-react";
import { socket } from "../../socket";
import { callSounds } from "../../utils/callSounds";

const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];
const turnUrls = import.meta.env.VITE_TURN_SERVER_URL
  ?.split(",")
  .map((url) => url.trim())
  .filter(Boolean);

if (
  turnUrls?.length &&
  import.meta.env.VITE_TURN_USERNAME &&
  import.meta.env.VITE_TURN_CREDENTIAL
) {
  iceServers.push({
    urls: turnUrls,
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  });
}

const ICE_SERVERS = { iceServers };
const CONNECTION_RECOVERY_TIMEOUT_MS = 30_000;

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
  const connectionTimerRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const endedRef = useRef(false);
  const makingOfferRef = useRef(false);
  const everConnectedRef = useRef(false);
  const restartAttemptRef = useRef(0);
  const mountGenerationRef = useRef(0);

  const clearConnectionTimer = useCallback(() => {
    if (connectionTimerRef.current) {
      clearTimeout(connectionTimerRef.current);
      connectionTimerRef.current = null;
    }
  }, []);

  const cleanupCallResources = useCallback(() => {
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
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    clearConnectionTimer();
    pendingCandidatesRef.current = [];
  }, [clearConnectionTimer]);

  const endCall = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    callSounds.playCallEndTone();

    if (socketRef.current?.connected && roomId) {
      socketRef.current.emit("hang-up", { roomId });
    }

    cleanupCallResources();

    navigate(-1);
  }, [roomId, navigate, cleanupCallResources]);

  useEffect(() => {
    const generation = ++mountGenerationRef.current;
    return () => {
      Promise.resolve().then(() => {
        if (mountGenerationRef.current !== generation || endedRef.current) return;
        endedRef.current = true;
        if (socketRef.current?.connected && roomId) {
          socketRef.current.emit("hang-up", { roomId });
        }
        callSounds.cleanup();
        cleanupCallResources();
      });
    };
  }, [roomId, cleanupCallResources]);

  const markConnected = useCallback(() => {
    clearConnectionTimer();
    everConnectedRef.current = true;
    restartAttemptRef.current = 0;
    setStatus("Connected");
    setIsPeerConnected(true);
    callSounds.stopOutgoingTone();
  }, [clearConnectionTimer]);

  const startRecovery = useCallback(() => {
    if (endedRef.current) return;
    setStatus("Reconnecting...");
    setIsPeerConnected(false);
    if (!connectionTimerRef.current) {
      connectionTimerRef.current = setTimeout(
        endCall,
        CONNECTION_RECOVERY_TIMEOUT_MS
      );
    }
  }, [endCall]);

  const requestIceRestart = useCallback(() => {
    if (endedRef.current || !socketRef.current?.connected) return;
    if (!isCaller) {
      if (restartAttemptRef.current >= 1) return;
      restartAttemptRef.current += 1;
      socketRef.current.emit("signal", { roomId, data: { iceRestartRequest: true } });
      return;
    }

    const pc = pcRef.current;
    if (
      !pc ||
      pc.signalingState !== "stable" ||
      makingOfferRef.current ||
      restartAttemptRef.current >= 1
    ) return;

    restartAttemptRef.current += 1;
    makingOfferRef.current = true;
    pc.createOffer({ iceRestart: true })
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        socketRef.current?.emit("signal", {
          roomId,
          data: { sdp: pc.localDescription },
        });
      })
      .catch((error) => console.error("Failed to restart ICE:", error))
      .finally(() => {
        makingOfferRef.current = false;
      });
  }, [isCaller, roomId]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Send ICE candidates to signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.connected) {
        socketRef.current.emit("signal", {
          roomId,
          data: { candidate: event.candidate },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        markConnected();
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        startRecovery();
        if (pc.connectionState === "failed") requestIceRestart();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === "connected" ||
        pc.iceConnectionState === "completed"
      ) {
        markConnected();
      } else if (
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed"
      ) {
        startRecovery();
        if (pc.iceConnectionState === "failed") requestIceRestart();
      }
    };

    pc.ontrack = (event) => {
      let stream = event.streams && event.streams[0];
      if (!stream) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        if (!remoteStreamRef.current.getTracks().some((track) => track.id === event.track.id)) {
          remoteStreamRef.current.addTrack(event.track);
        }
        stream = remoteStreamRef.current;
      } else if (!remoteStreamRef.current) {
        remoteStreamRef.current = stream;
      } else if (remoteStreamRef.current !== stream) {
        stream.getTracks().forEach((track) => {
          if (!remoteStreamRef.current.getTracks().some((existing) => existing.id === track.id)) {
            remoteStreamRef.current.addTrack(track);
          }
        });
        stream = remoteStreamRef.current;
      }

      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== stream) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch((err) => {
          console.warn("Remote audio play prevented by browser:", err);
        });
      }

      if (remoteVideoRef.current && !isAudioOnly && remoteVideoRef.current.srcObject !== stream) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch((err) => {
          console.warn("Remote video play prevented by browser:", err);
        });
      }

      markConnected();
    };

    return pc;
  }, [roomId, isAudioOnly, markConnected, startRecovery, requestIceRestart]);

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
    const signalingHandlers = [];
    const listen = (event, handler) => {
      signalingHandlers.push([event, handler]);
      socket.on(event, handler);
    };

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

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current && !isAudioOnly) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch((err) => {
            console.warn("Local video play prevented by browser:", err);
          });
        }

        // Use the application's authenticated shared socket.
        // Opening a second socket here can create a separate identity
        // and is also invalid because the old code referenced io/SIGNALING_SERVER_URL.
        socketRef.current = socket;

        const joinRoom = () => {
          if (socket.connected) socket.emit("join-room", roomId);
        };
        const makeOffer = async (pc, iceRestart = false) => {
          if (makingOfferRef.current) return;
          makingOfferRef.current = true;
          try {
            const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
            await pc.setLocalDescription(offer);
            socket.emit("signal", { roomId, data: { sdp: pc.localDescription } });
          } catch (err) {
            console.error("Error creating offer:", err);
          } finally {
            makingOfferRef.current = false;
          }
        };

        listen("connect", () => {
          joinRoom();
          if (pcRef.current?.connectionState === "connected") {
            markConnected();
          }
        });
        listen("disconnect", startRecovery);
        if (socket.connected) {
          joinRoom();
        } else {
          socket.connect();
        }

        listen("joined-room", async ({ otherPeers }) => {
          if (cancelled) return;
          if (!pcRef.current) createPeerConnection();
        });

        listen("peer-ready", async ({ roomId: readyRoomId }) => {
          if (cancelled || readyRoomId !== roomId || !isCaller) return;
          const pc = pcRef.current || createPeerConnection();
          await makeOffer(pc, everConnectedRef.current);
        });

        // Handle signaling data (SDP and ICE Candidates)
        listen("signal", async ({ roomId: signalRoomId, data } = {}) => {
          if (cancelled || signalRoomId !== roomId || !data) return;
          if (data.iceRestartRequest) {
            if (isCaller) requestIceRestart();
            return;
          }

          const pc = pcRef.current || createPeerConnection();

          if (data.sdp) {
            try {
              await pc.setRemoteDescription(data.sdp);
              if (data.sdp.type === "offer") {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("signal", {
                  roomId,
                  data: { sdp: pc.localDescription },
                });
              }
              while (pendingCandidatesRef.current.length) {
                const candidate = pendingCandidatesRef.current.shift();
                await pc.addIceCandidate(candidate);
              }
            } catch (err) {
              console.error("Error handling SDP:", err);
            }
          } else if (data.candidate) {
            try {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(data.candidate);
              } else {
                pendingCandidatesRef.current.push(data.candidate);
              }
            } catch (err) {
              console.error("Error adding ICE candidate:", err);
            }
          }
        });

        listen("peer-hung-up", ({ roomId: endedRoomId } = {}) => {
          if (endedRoomId !== roomId) return;
          callSounds.playCallEndTone();
          endCall();
        });

        listen("room-full", () => {
          setStatus("Call room is full");
          callSounds.playCallEndTone();
          endCall();
        });

        const handleCallResponse = ({ accepted, roomId: responseRoomId } = {}) => {
          if (responseRoomId !== roomId || accepted !== false) return;
          setStatus("Call declined");
          callSounds.playCallEndTone();
          endCall();
        };
        listen("call-response", handleCallResponse);
      } catch (err) {
        console.error("Failed to initialize call:", err);
        setStatus("Could not access camera/microphone.");
      }
    };

    initCall();

    return () => {
      cancelled = true;
      callSounds.cleanup();
      clearConnectionTimer();
      if (socketRef.current) {
        signalingHandlers.forEach(([event, handler]) => {
          socketRef.current.off(event, handler);
        });
      }
    };
  }, [
    roomId,
    isAudioOnly,
    isCaller,
    createPeerConnection,
    endCall,
    navigate,
    clearConnectionTimer,
    markConnected,
    startRecovery,
    requestIceRestart,
  ]);

  useEffect(() => {
    const video = localVideoRef.current;
    const stream = localStreamRef.current;
    if (!video || isAudioOnly || !stream) return;

    video.muted = true;
    video.playsInline = true;
    if (video.srcObject !== stream) video.srcObject = stream;
    video.play().catch((err) => {
      console.warn("Local video play prevented by browser:", err);
    });
  }, [camOff, isAudioOnly]);

  // Manage outgoing ringback tone while waiting for peer to answer
  useEffect(() => {
    if (isCaller && !everConnectedRef.current) {
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
              muted
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

