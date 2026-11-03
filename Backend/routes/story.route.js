import express from "express";
import isAuth from "../middleware/isAuth.js";
import { upload } from "../middleware/multer.js";
import {
  createStory,
  getActiveStories,
  markStoryViewed,
  deleteStory,
  likeOrDislikeStory,
} from "../controllers/story.controller.js";

const storyRoute = express.Router();

storyRoute.post("/create", isAuth, upload.any(), createStory);
storyRoute.get("/active", isAuth, getActiveStories);
storyRoute.post("/:storyId/view", isAuth, markStoryViewed);
storyRoute.post("/:storyId/like", isAuth, likeOrDislikeStory);
storyRoute.delete("/:storyId", isAuth, deleteStory);

export default storyRoute;

