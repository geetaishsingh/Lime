import User from "./src/models/user.model.js";

const userSocketMap = {}; // { userId: socketId }
const socketUserMap = {}; // { socketId: userId }
const rooms = {}; // { roomId: Set<socketId> }
let _io = null;

export const getIO = () => {
  if (!_io) throw new Error("Socket.IO is not initialized!");
  return _io;
};

export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId?.toString()];
};

export const initSocket = (ioInstance) => {
  _io = ioInstance;

  _io.on("connection", (socket) => {
    // 1. User Identity & Presence
    socket.on("identity", async ({ userId }) => {
      try {
        if (!userId) return;
        const uId = userId.toString();
        userSocketMap[uId] = socket.id;
        socketUserMap[socket.id] = uId;

        await User.findByIdAndUpdate(uId, { isOnline: true, socketId: socket.id }).catch(() => {});
        _io.emit("getOnlineUsers", Object.keys(userSocketMap));
      } catch (error) {
        console.error("Socket identity error:", error);
      }
    });

    // 2. WebRTC Video / Audio Calling Signaling
    socket.on("call-user", ({ recipientId, caller, callType, roomId }) => {
      const recipientSocketId = getReceiverSocketId(recipientId);
      if (recipientSocketId) {
        _io.to(recipientSocketId).emit("incoming-call", {
          caller,
          callType: callType || "video",
          roomId,
        });
      } else {
        socket.emit("call-recipient-offline", { recipientId });
      }
    });

    socket.on("call-response", ({ callerId, accepted, roomId, callType }) => {
      const callerSocketId = getReceiverSocketId(callerId);
      if (callerSocketId) {
        _io.to(callerSocketId).emit("call-response", {
          accepted,
          roomId,
          callType,
        });
      }
    });

    socket.on("cancel-call", ({ recipientId, roomId }) => {
      const recipientSocketId = getReceiverSocketId(recipientId);
      if (recipientSocketId) {
        _io.to(recipientSocketId).emit("call-cancelled", { roomId });
      }
    });

    socket.on("join-room", (roomId) => {
      if (!roomId) return;
      if (!rooms[roomId]) {
        rooms[roomId] = new Set();
      }

      if (rooms[roomId].size >= 2) {
        socket.emit("room-full");
        return;
      }

      rooms[roomId].add(socket.id);
      socket.join(roomId);

      const otherPeers = Array.from(rooms[roomId]).filter((id) => id !== socket.id);
      socket.emit("joined-room", { otherPeers });
    });

    socket.on("signal", ({ roomId, data }) => {
      socket.to(roomId).emit("signal", { data });
    });

    socket.on("hang-up", ({ roomId }) => {
      if (rooms[roomId]) {
        rooms[roomId].delete(socket.id);
        if (rooms[roomId].size === 0) {
          delete rooms[roomId];
        }
      }
      socket.to(roomId).emit("peer-hung-up");
      socket.leave(roomId);
    });

    // 3. Disconnect
    socket.on("disconnect", async () => {
      const uId = socketUserMap[socket.id];
      if (uId) {
        delete userSocketMap[uId];
        delete socketUserMap[socket.id];
        await User.findByIdAndUpdate(uId, { isOnline: false }).catch(() => {});
        _io.emit("getOnlineUsers", Object.keys(userSocketMap));
      }

      // Clean up rooms
      for (const roomId in rooms) {
        if (rooms[roomId].has(socket.id)) {
          rooms[roomId].delete(socket.id);
          socket.to(roomId).emit("peer-hung-up");
          if (rooms[roomId].size === 0) {
            delete rooms[roomId];
          }
        }
      }
    });
  });
};
