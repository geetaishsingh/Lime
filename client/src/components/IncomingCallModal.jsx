import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import { socket } from "../socket";

const IncomingCallModal = () => {
  const [incomingCall, setIncomingCall] = useState(null); // { caller, callType, roomId }
  const navigate = useNavigate();

  useEffect(() => {
    const handleIncomingCall = (data) => {
      setIncomingCall(data);
    };

    const handleCallCancelled = ({ roomId }) => {
      setIncomingCall((prev) => (prev?.roomId === roomId ? null : prev));
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-cancelled", handleCallCancelled);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-cancelled", handleCallCancelled);
    };
  }, []);

  if (!incomingCall) return null;

  const { caller, callType = "video", roomId } = incomingCall;
  const isVideo = callType === "video";

  const handleAccept = () => {
    socket.emit("call-response", {
      callerId: caller._id,
      accepted: true,
      roomId,
      callType,
    });

    const query = new URLSearchParams({
      roomId,
      callType,
      remoteName: caller.name || caller.username || "User",
      remoteAvatar: caller.profileImage || "",
    }).toString();

    setIncomingCall(null);
    navigate(`/call?${query}`, {
      state: {
        roomId,
        callType,
        callerName: caller.name || caller.username,
        avatarUrl: caller.profileImage,
      },
    });
  };

  const handleDecline = () => {
    socket.emit("call-response", {
      callerId: caller._id,
      accepted: false,
      roomId,
      callType,
    });
    setIncomingCall(null);
  };

  return (
    <div className="modal-overlay incoming-call-backdrop">
      <div className="incoming-call-card">
        {/* Pulsing Avatar Rings */}
        <div className="incoming-call-avatar-wrapper">
          <div className="pulsing-call-ring" />
          <div className="pulsing-call-ring delayed" />
          <img
            src={
              caller.profileImage ||
              "https://ui-avatars.com/api/?name=" + (caller.name || "User")
            }
            alt={caller.username}
            className="incoming-call-avatar"
          />
        </div>

        <div className="incoming-call-meta">
          <h3>{caller.name || `@${caller.username}`}</h3>
          <p className="incoming-call-type">
            {isVideo ? (
              <>
                <Video size={16} /> Incoming Video Call...
              </>
            ) : (
              <>
                <Phone size={16} /> Incoming Audio Call...
              </>
            )}
          </p>
        </div>

        {/* Action Buttons: Accept / Decline */}
        <div className="incoming-call-actions">
          <button
            className="call-action-circle-btn decline-btn"
            onClick={handleDecline}
            title="Decline Call"
            aria-label="Decline call"
          >
            <PhoneOff size={24} />
          </button>

          <button
            className="call-action-circle-btn accept-btn"
            onClick={handleAccept}
            title="Accept Call"
            aria-label="Accept call"
          >
            {isVideo ? <Video size={24} /> : <Phone size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
