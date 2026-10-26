import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { upload } from "../middlewares/multer.js";
import {
  addComment,
  addNewPost,
  bookmarkPost,
  deleteComment,
  deletePost,
  disLikePost,
  getAllPost,
  getMyLikes,
  getPostComments,
  getUserPosts,
  likePost,
} from "../controllers/post.controller.js";

const postRoute = express.Router();

postRoute.post("/add-post", isAuth, upload.any(), addNewPost);
postRoute.get("/posts", isAuth, getAllPost);
postRoute.get("/user/posts", isAuth, getUserPosts);
postRoute.get("/user/posts/:authorId", isAuth, getUserPosts);
postRoute.get("/:id/post/comments", isAuth, getPostComments);
postRoute.post("/:id/like", isAuth, likePost);
postRoute.post("/:id/dislike", isAuth, disLikePost);
postRoute.post("/:id/comment", isAuth, addComment);
postRoute.post("/:id/bookmark", isAuth, bookmarkPost);
postRoute.get("/my-likes", isAuth, getMyLikes);
postRoute.post("/post/delete/:id", isAuth, deletePost);
postRoute.delete("/post/delete/:id", isAuth, deletePost);
postRoute.delete("/post/comment/delete/:id", isAuth, deleteComment);

export default postRoute;
