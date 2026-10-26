import express from "express";
import {
  editProfile,
  followOrUnfollow,
  getCurrentUser,
  getProfile,
  getSuggestedUsers,
  searchUser,
  blockOrUnblockUser,
  reportContent,
} from "../controllers/user.controller.js";
import isAuth from "../middlewares/isAuth.js";
import { upload } from "../middlewares/multer.js";

const userRoute = express.Router();

userRoute.get("/user", isAuth, getCurrentUser);
userRoute.get("/:id/profile", isAuth, getProfile);
userRoute.post(
  "/profile/edit",
  isAuth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  editProfile
);
userRoute.get("/my-suggestions", isAuth, getSuggestedUsers);
userRoute.post("/follow-or-unfollow/:id", isAuth, followOrUnfollow);
userRoute.get("/search", isAuth, searchUser);
userRoute.post("/block/:id", isAuth, blockOrUnblockUser);
userRoute.post("/report", isAuth, reportContent);

export default userRoute;
