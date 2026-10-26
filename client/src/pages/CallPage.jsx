import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  RefreshCw,
  PhoneOff,
  ArrowLeft,
  Phone,
} from "lucide-react";
import { serverUrl } from "../App";

const SIGNALING_SERVER_URL = serverUrl;

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CallPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const roomId = location.state?.roomId || searchParams.get("roomId");
  const callerName =
    location.state?.callerName || searchParams.get("remoteName") || "Lime User";
  const avatarUrl =
    location.state?.avatarUrl || searchParams.get("remoteAvatar");
  const callType =
    location.state?.callType || searchParams.get("callType") || "video";
  const isAudioOnly = callType === "audio";

  const [status, setStatus] = useState("Connecting...");
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(isAudioOnly);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setStatus("Connected");
      setConnected(true);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("signal", {
          roomId,
          data: { type: "ice-candidate", candidate: event.candidate },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        setStatus("Connection failed. Please retry.");
      }
    };

    return pc;
  }, [roomId]);

  const startCallAsInitiator = useCallback(async () => {
    pcRef.current = createPeerConnection();
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socketRef.current?.emit("signal", {
      roomId,
      data: { type: "offer", sdp: offer },
    });
    setStatus(isAudioOnly ? "Audio Calling..." : "Video Calling...");
  }, [createPeerConnection, roomId, isAudioOnly]);

  const handleOffer = useCallback(
    async (sdp) => {
      pcRef.current = createPeerConnection();
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socketRef.current?.emit("signal", {
        roomId,
        data: { type: "answer", sdp: answer },
      });
      setStatus("Connecting...");
    },
    [createPeerConnection, roomId]
  );

  const handleAnswer = useCallback(async (sdp) => {
    await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sdp));
  }, []);

  const handleIceCandidate = useCallback(async (candidate) => {
    try {
      await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Error adding ICE candidate:", err);
    }
  }, []);

  const endCall = useCallback(() => {
    if (roomId) socketRef.current?.emit("hang-up", { roomId });
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    socketRef.current?.disconnect();
    navigate(-1);
  }, [roomId, navigate]);

  useEffect(() => {
    // Guard: bounce if no roomId
    if (!roomId) {
      navigate("/messages", { replace: true });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: !isAudioOnly,
            audio: true,
          });
        } catch (mediaErr) {
          // If video permission failed or device lacks camera, try audio only
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            });
            setStatus("Camera unavailable — Audio only mode");
            setCamOff(true);
          } catch (audioErr) {
            setStatus("Microphone permission required. Please allow access.");
            return;
          }
        }

        if (cancelled) return;
        localStreamRef.current = stream;
        if (localVideoRef.current && !isAudioOnly) {
          localVideoRef.current.srcObject = stream;
        }

        const socket = io(SIGNALING_SERVER_URL);
        socketRef.current = socket;

        socket.on("joined-room", async ({ otherPeers }) => {
          if (otherPeers.length > 0) {
            await startCallAsInitiator();
          } else {
            setStatus(isAudioOnly ? "Ringing..." : "Video Calling...");
          }
        });

        socket.on("room-full", () => {
          setStatus("Call room is full.");
        });

        socket.on("signal", async ({ data }) => {
          if (data.type === "offer") await handleOffer(data.sdp);
          else if (data.type === "answer") await handleAnswer(data.sdp);
          else if (data.type === "ice-candidate")
            await handleIceCandidate(data.candidate);
        });

        socket.on("peer-hung-up", () => {
          setStatus("Call ended.");
          setConnected(false);
          setTimeout(() => navigate(-1), 1000);
        });

        socket.emit("join-room", roomId);
      } catch (err) {
        setStatus("Could not access devices: " + err.message);
      }
    })();

    return () => {
      cancelled = true;
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleToggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };

  const handleToggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOff(!track.enabled);
  };

  return (
    <div
      className={`calling-screen ${
        connected ? "calling-screen--connected" : ""
      }`}
    >
      {/* Top Header with Back Navigation (Requirement 9) */}
      <div className="call-top-bar">
        <button
          className="call-back-btn"
          onClick={endCall}
          aria-label="Back / Exit call"
          title="Exit Call"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="call-top-meta">
          <span className="call-top-title">{callerName}</span>
          <span className="call-top-status">{status}</span>
        </div>
      </div>

      {/* Remote peer's video — full background once connected */}
      {!isAudioOnly && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="calling-screen__remote-video"
        />
      )}

      {/* Self-preview (only in video mode) */}
      {!isAudioOnly && (
        <div className="calling-screen__self-preview">
          <video ref={localVideoRef} autoPlay playsInline muted />
        </div>
      )}

      {/* Center Avatar & Status (shown when connecting, or always in audio mode) */}
      {(!connected || isAudioOnly) && (
        <div className="calling-screen__center">
          <div className="calling-screen__avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={callerName} />
            ) : (
              <span className="calling-screen__avatar-fallback">
                {callerName.charAt(0)}
              </span>
            )}
          </div>
          <h1 className="calling-screen__name">{callerName}</h1>
          <p className="calling-screen__status">{status}</p>
        </div>
      )}

      {/* Controls Bar */}
      <div className="calling-screen__controls">
        <button
          className={`call-btn ${muted ? "call-btn--active" : ""}`}
          onClick={handleToggleMute}
          title={muted ? "Unmute Microphone" : "Mute Microphone"}
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
