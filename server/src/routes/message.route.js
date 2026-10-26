import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { upload } from "../middlewares/multer.js";
import {
  deleteConversation,
  deleteMessage,
  getConversations,
  getMessage,
  getOrCreateConversation,
  getUnreadMessageCount,
  muteConversation,
  readMessage,
  sendMessage,
  unmuteConversation,
} from "../controllers/message.controller.js";

const messageRoute = express.Router();

messageRoute.get("/unread-count", isAuth, getUnreadMessageCount);
messageRoute.get("/conversations", isAuth, getConversations);
messageRoute.post("/conversation/:id", isAuth, getOrCreateConversation);
messageRoute.post("/send/:id", isAuth, upload.single("attachment"), sendMessage);
messageRoute.get("/messages/:id", isAuth, getMessage);
messageRoute.put("/read/:senderId", isAuth, readMessage);
messageRoute.delete("/delete", isAuth, deleteMessage);
messageRoute.delete("/delete/:convId", isAuth, deleteConversation);
messageRoute.post("/mute/:convId", isAuth, muteConversation);
messageRoute.post("/unmute/:convId", isAuth, unmuteConversation);

export default messageRoute;
