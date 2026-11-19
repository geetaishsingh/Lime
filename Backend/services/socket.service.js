import User from "../models/user.model.js";

const userSocketMap = new Map();
const socketUserMap = new Map();
const rooms = {}; // { roomId: Set<socketId> }
const calls = new Map();
const callRecoveryTimers = new Map();
const CALL_RECOVERY_TIMEOUT_MS = 30_000;
let _io = null;

const recoveryKey = (roomId, userId) => `${roomId}:${userId}`;

const clearRecoveryTimer = (roomId, userId) => {
  const key = recoveryKey(roomId, userId);
  const timer = callRecoveryTimers.get(key);
  if (timer) clearTimeout(timer);
  callRecoveryTimers.delete(key);
};

const clearCall = (roomId) => {
  const call = calls.get(roomId);
  if (!call) return;

  clearRecoveryTimer(roomId, call.callerId);
  clearRecoveryTimer(roomId, call.recipientId);
  for (const socketId of rooms[roomId] || []) {
    _io.sockets.sockets.get(socketId)?.leave(roomId);
  }
  delete rooms[roomId];
  calls.delete(roomId);
};

const removeCall = (roomId, event, endedBy) => {
  const call = calls.get(roomId);
  if (!call) return;

  const otherUserId = endedBy === call.callerId ? call.recipientId : call.callerId;
  const otherSocketId =
    call.members.get(otherUserId) || getReceiverSocketId(otherUserId);
  if (otherSocketId) _io.to(otherSocketId).emit(event, { roomId });
  clearCall(roomId);
};

const removeSocketIdentity = (socketId) => {
  const userId = socketUserMap.get(socketId);
  if (!userId) return null;

  socketUserMap.delete(socketId);
  const socketIds = userSocketMap.get(userId);
  socketIds?.delete(socketId);

  if (socketIds?.size) return null;
  userSocketMap.delete(userId);
  return userId;
};

export const getIO = () => {
  if (!_io) throw new Error("Socket.IO is not initialized!");
  return _io;
};

export const getReceiverSocketId = (userId) => {
  const socketIds = userSocketMap.get(userId?.toString());
  return socketIds ? Array.from(socketIds).pop() : undefined;
};

export const initSocket = (ioInstance) => {
  _io = ioInstance;

  _io.on("connection", (socket) => {
    // 1. User Identity & Presence
    socket.on("identity", async ({ userId } = {}) => {
      try {
        const previousUserId = socketUserMap.get(socket.id);
        const nextUserId = userId?.toString();

        if (previousUserId === nextUserId) return;

        const becameOffline = removeSocketIdentity(socket.id);
        if (becameOffline) {
          await User.findByIdAndUpdate(becameOffline, {
            isOnline: false,
            $unset: { socketId: 1 },
          });
        }

        if (nextUserId) {
          let socketIds = userSocketMap.get(nextUserId);
          if (!socketIds) {
            socketIds = new Set();
            userSocketMap.set(nextUserId, socketIds);
          }
          socketIds.add(socket.id);
          socketUserMap.set(socket.id, nextUserId);
          await User.findByIdAndUpdate(nextUserId, {
            isOnline: true,
            socketId: socket.id,
          });
        }

        _io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
      } catch (error) {
        console.error("Socket identity error:", error);
      }
    });

    // 2. WebRTC Video / Audio Calling Signaling
    socket.on("call-user", ({ recipientId, caller, callType, roomId } = {}, acknowledge) => {
      const callerId = socketUserMap.get(socket.id);
      const recipientSocketId = getReceiverSocketId(recipientId);
      const validCall =
        callerId &&
        caller?._id?.toString() === callerId &&
        recipientId?.toString() !== callerId &&
        typeof roomId === "string" &&
        roomId.length > 0 &&
        roomId.length <= 128 &&
        ["audio", "video"].includes(callType) &&
        !calls.has(roomId);

      if (!validCall || !recipientSocketId) {
        acknowledge?.({ delivered: false });
        return;
      }

      const call = {
        callerId,
        recipientId: recipientId.toString(),
        callType,
        status: "ringing",
        members: new Map(),
      };
      calls.set(roomId, call);
      _io.to(recipientSocketId).emit("incoming-call", { caller, callType, roomId });
      acknowledge?.({ delivered: true });
    });

    socket.on("call-response", ({ callerId, accepted, roomId } = {}) => {
      const call = calls.get(roomId);
      const userId = socketUserMap.get(socket.id);
      if (
        !call ||
        userId !== call.recipientId ||
        callerId?.toString() !== call.callerId ||
        typeof accepted !== "boolean"
      ) return;

      call.status = accepted ? "accepted" : "ended";
      const callerSocketId = call.members.get(call.callerId) || getReceiverSocketId(call.callerId);
      if (callerSocketId) {
        _io.to(callerSocketId).emit("call-response", {
          accepted,
          roomId,
          callType: call.callType,
        });
      }
      if (!accepted) clearCall(roomId);
    });

    socket.on("cancel-call", ({ recipientId, roomId } = {}) => {
      const call = calls.get(roomId);
      const userId = socketUserMap.get(socket.id);
      if (!call || userId !== call.callerId || recipientId?.toString() !== call.recipientId) return;
      removeCall(roomId, "call-cancelled", call.callerId);
    });

    socket.on("join-room", (roomId) => {
      const call = calls.get(roomId);
      const userId = socketUserMap.get(socket.id);
      if (
        !call ||
        ![call.callerId, call.recipientId].includes(userId) ||
        (userId === call.recipientId && call.status !== "accepted")
      ) {
        socket.emit("room-full");
        return;
      }

      clearRecoveryTimer(roomId, userId);
      if (!rooms[roomId]) {
        rooms[roomId] = new Set();
      }

      const currentSocketId = call.members.get(userId);
      if (currentSocketId && currentSocketId !== socket.id) {
        socket.emit("room-full");
        return;
      }
      if (rooms[roomId].size >= 2 && !rooms[roomId].has(socket.id)) {
        socket.emit("room-full");
        return;
      }

      call.members.set(userId, socket.id);
      rooms[roomId].add(socket.id);
      socket.join(roomId);

      const otherPeers = Array.from(rooms[roomId]).filter((id) => id !== socket.id);
      socket.emit("joined-room", { otherPeers });

      if (rooms[roomId].size === 2) {
        _io.to(roomId).emit("peer-ready", { roomId });
      }
    });

    socket.on("signal", ({ roomId, data } = {}) => {
      const call = calls.get(roomId);
      const userId = socketUserMap.get(socket.id);
      if (!call || call.members.get(userId) !== socket.id || !data || typeof data !== "object") return;
      const otherUserId = userId === call.callerId ? call.recipientId : call.callerId;
      const otherSocketId = call.members.get(otherUserId);
      if (otherSocketId) _io.to(otherSocketId).emit("signal", { roomId, data });
    });

    socket.on("hang-up", ({ roomId } = {}) => {
      const call = calls.get(roomId);
      const userId = socketUserMap.get(socket.id);
      if (!call || ![call.callerId, call.recipientId].includes(userId)) return;
      removeCall(roomId, call.status === "ringing" ? "call-cancelled" : "peer-hung-up", userId);
    });

    // 3. Disconnect
    socket.on("disconnect", async () => {
      const disconnectedUserId = socketUserMap.get(socket.id);
      const userId = removeSocketIdentity(socket.id);
      if (userId) {
        try {
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            $unset: { socketId: 1 },
          });
        } catch (error) {
          console.error("Socket disconnect identity error:", error);
        }
        _io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
      }

      for (const [roomId, call] of calls) {
        if (call.members.get(disconnectedUserId) !== socket.id) continue;

        call.members.delete(disconnectedUserId);
        rooms[roomId]?.delete(socket.id);
        socket.leave(roomId);

        if (call.status === "ringing") {
          if (disconnectedUserId === call.recipientId) {
            const callerSocketId =
              call.members.get(call.callerId) || getReceiverSocketId(call.callerId);
            if (callerSocketId) {
              _io.to(callerSocketId).emit("call-response", {
                accepted: false,
                roomId,
                callType: call.callType,
              });
            }
            clearCall(roomId);
          } else {
            removeCall(roomId, "call-cancelled", disconnectedUserId);
          }
          continue;
        }

        const key = recoveryKey(roomId, disconnectedUserId);
        clearRecoveryTimer(roomId, disconnectedUserId);
        callRecoveryTimers.set(key, setTimeout(() => {
          if (calls.get(roomId) === call && !call.members.has(disconnectedUserId)) {
            removeCall(roomId, "peer-hung-up", disconnectedUserId);
          }
        }, CALL_RECOVERY_TIMEOUT_MS));
      }
    });
  });
};
