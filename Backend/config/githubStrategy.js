import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/user.model.js";

const normalizeCallbackUrl = (baseUrl, path) => {
  const origin = (baseUrl || "http://localhost:5000").replace(/\/+$/, "");
  return `${origin}${path}`;
};

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL:
          process.env.GITHUB_CALLBACK_URL ||
          normalizeCallbackUrl(process.env.BACKEND_URL, "/api/auth/github/callback"),
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const githubHandle = profile.username || profile.id;
          const email =
            profile.emails?.[0]?.value?.toLowerCase() ||
            `${githubHandle.toLowerCase()}@github.placeholder.com`;

          // 1. Check GitHub ID
          let user = await User.findOne({ githubId: profile.id });
          if (user) {
            return done(null, user);
          }

          // 2. Check Email
          user = await User.findOne({ email });
          if (user) {
            user.githubId = profile.id;
            if (!user.authProvider.includes("github")) {
              user.authProvider.push("github");
            }
            if (profile.photos?.[0]?.value && (!user.profileImage || user.profileImage.includes("ui-avatars.com"))) {
              user.profileImage = profile.photos[0].value;
            }
            await user.save();
            return done(null, user);
          }

          // 3. Create new user
          let baseUsername = (profile.username || "github_user")
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "");
          if (!baseUsername) baseUsername = "github_user";
          let username = baseUsername;
          let counter = 1;
          while (await User.findOne({ username })) {
            username = `${baseUsername}${counter++}`;
          }

          user = await User.create({
            username,
            name: profile.displayName || githubHandle,
            email,
            githubId: profile.id,
            profileImage:
              profile.photos?.[0]?.value ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                githubHandle
              )}&background=10b981&color=fff&size=256`,
            authProvider: ["github"],
            isEmailVerified: true,
          });

          return done(null, user);
        } catch (error) {
          console.error("GitHub Strategy Error:", error);
          return done(error, null);
        }
      }
    )
  );
}

export default passport;
