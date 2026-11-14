import User from "../models/user.model.js";

const userSocketMap = {}; // { userId: Set<socketId> }
const socketUserMap = {}; // { socketId: userId }
const rooms = {}; // { roomId: Set<socketId> }
let _io = null;

const emitOnlineUsers = () => {
  const onlineUsers = Object.keys(userSocketMap).filter(
    (userId) => userSocketMap[userId] && userSocketMap[userId].size > 0
  );
  _io.emit("getOnlineUsers", onlineUsers);
};

const updateUserPresence = async (userId, isOnline) => {
  if (!userId) return;

  const uId = userId.toString();
  const payload = {
    isOnline,
    lastSeen: new Date(),
  };

  await User.findByIdAndUpdate(uId, payload).catch(() => {});
};

export const getIO = () => {
  if (!_io) throw new Error("Socket.IO is not initialized!");
  return _io;
};

export const getReceiverSocketId = (userId) => {
  const socketIds = userSocketMap[userId?.toString()] || new Set();
  return socketIds.values().next().value || null;
};

export const getReceiverSocketIds = (userId) => {
  const socketIds = userSocketMap[userId?.toString()] || new Set();
  return Array.from(socketIds);
};

export const initSocket = (ioInstance) => {
  _io = ioInstance;

  _io.on("connection", (socket) => {
    socket.isAlive = true;

    socket.on("presence-heartbeat", async ({ userId } = {}) => {
      const uId = userId?.toString() || socketUserMap[socket.id];
      if (!uId) return;
      socket.isAlive = true;
      await updateUserPresence(uId, true);
      _io.emit("getOnlineUsers", Object.keys(userSocketMap).filter((id) => userSocketMap[id]?.size > 0));
    });

    // 1. User Identity & Presence
    socket.on("identity", async ({ userId }) => {
      try {
        if (!userId) return;
        const uId = userId.toString();

        if (!userSocketMap[uId]) {
          userSocketMap[uId] = new Set();
        }

        userSocketMap[uId].add(socket.id);
        socketUserMap[socket.id] = uId;

        await updateUserPresence(uId, true);
        emitOnlineUsers();
      } catch (error) {
        console.error("Socket identity error:", error);
      }
    });

    // 2. WebRTC Video / Audio Calling Signaling
    socket.on("call-user", ({ recipientId, caller, callType, roomId }) => {
      const recipientSocketIds = getReceiverSocketIds(recipientId);
      if (recipientSocketIds.length > 0) {
        recipientSocketIds.forEach((recipientSocketId) => {
          _io.to(recipientSocketId).emit("incoming-call", {
            caller,
            callType: callType || "video",
            roomId,
          });
        });
      } else {
        socket.emit("call-recipient-offline", { recipientId });
      }
    });

    socket.on("call-response", ({ callerId, accepted, roomId, callType }) => {
      const callerSocketIds = getReceiverSocketIds(callerId);
      callerSocketIds.forEach((callerSocketId) => {
        _io.to(callerSocketId).emit("call-response", {
          accepted,
          roomId,
          callType,
        });
      });
    });

    socket.on("cancel-call", ({ recipientId, roomId }) => {
      const recipientSocketIds = getReceiverSocketIds(recipientId);
      recipientSocketIds.forEach((recipientSocketId) => {
        _io.to(recipientSocketId).emit("call-cancelled", { roomId });
      });
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
        const activeSockets = userSocketMap[uId];
        if (activeSockets) {
          activeSockets.delete(socket.id);
          if (activeSockets.size === 0) {
            delete userSocketMap[uId];
            await updateUserPresence(uId, false);
          }
        }
        delete socketUserMap[socket.id];
        emitOnlineUsers();
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

  setInterval(() => {
    for (const socket of _io.sockets.sockets.values()) {
      if (socket.isAlive === false) {
        socket.disconnect(true);
        continue;
      }

      socket.isAlive = false;
      socket.emit("presence-ping");
    }
  }, 30000);
};
