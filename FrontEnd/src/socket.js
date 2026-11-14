import { io } from "socket.io-client";

const serverUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const socket = io(serverUrl, {
  withCredentials: true,
  autoConnect: false,
  transports: ["websocket", "polling"],
});

socket.on("presence-ping", () => {
  socket.emit("presence-heartbeat");
});

export default socket;
