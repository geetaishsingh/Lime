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
  setPassword,
  changePassword,
  skipPasswordPrompt,
} from "../controllers/user.controller.js";
import isAuth from "../middleware/isAuth.js";
import { upload } from "../middleware/multer.js";

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
userRoute.post("/set-password", isAuth, setPassword);
userRoute.post("/change-password", isAuth, changePassword);
userRoute.post("/skip-password-prompt", isAuth, skipPasswordPrompt);

export default userRoute;

