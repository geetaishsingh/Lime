import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

const notificationRoute = express.Router();

notificationRoute.get("/", isAuth, getNotifications);
notificationRoute.put("/:id/read", isAuth, markAsRead);
notificationRoute.put("/read-all", isAuth, markAllAsRead);
notificationRoute.delete("/:id", isAuth, deleteNotification);

export default notificationRoute;
