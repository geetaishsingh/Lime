import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { upload } from "../middlewares/multer.js";
import {
  createStory,
  getActiveStories,
  markStoryViewed,
  deleteStory,
  likeOrDislikeStory,
} from "../controllers/story.controller.js";

const storyRoute = express.Router();

storyRoute.post("/create", isAuth, upload.single("media"), createStory);
storyRoute.get("/active", isAuth, getActiveStories);
storyRoute.post("/:storyId/view", isAuth, markStoryViewed);
storyRoute.post("/:storyId/like", isAuth, likeOrDislikeStory);
storyRoute.delete("/:storyId", isAuth, deleteStory);

export default storyRoute;
