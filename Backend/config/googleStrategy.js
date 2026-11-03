import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model.js";

const nodeEnv = process.env.NODE_ENV || "development";
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const backendUrl = process.env.BACKEND_URL?.trim();

const normalizeCallbackUrl = (baseUrl, path) => {
  const origin = (baseUrl || "http://localhost:5000")
    .replace(/\/+$/, "");

  return `${origin}${path}`;
};

const googleCallbackUrl =
  process.env.GOOGLE_CALLBACK_URL?.trim() ||
  (backendUrl
    ? normalizeCallbackUrl(backendUrl, "/api/auth/google/callback")
    : nodeEnv === "production"
      ? ""
      : normalizeCallbackUrl(undefined, "/api/auth/google/callback"));

console.info(
  `[Google OAuth] environment=${nodeEnv} ` +
    `clientIdLoaded=${Boolean(googleClientId)} ` +
    `clientSecretLoaded=${Boolean(googleClientSecret)} ` +
    `callbackURL=${googleCallbackUrl || "not configured"}`
);

if (googleClientId && googleClientSecret && !googleCallbackUrl) {
  throw new Error(
    "Google OAuth is enabled in production, but GOOGLE_CALLBACK_URL or BACKEND_URL is not configured."
  );
}

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();

          if (!email) {
            return done(null, false, {
              message: "Google email not found",
            });
          }

          // 1. Check Google ID
          let user = await User.findOne({ googleId: profile.id });
          if (user) {
            return done(null, user);
          }

          // 2. Check Email
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            if (!user.authProvider.includes("google")) {
              user.authProvider.push("google");
            }
            if (profile.photos?.[0]?.value && (!user.profileImage || user.profileImage.includes("ui-avatars.com"))) {
              user.profileImage = profile.photos[0].value;
            }
            await user.save();
            return done(null, user);
          }

          // 3. Create new User
          let baseUsername = (profile.displayName || email.split("@")[0])
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "");
          if (!baseUsername) baseUsername = "user";
          let username = baseUsername;
          let counter = 1;
          while (await User.findOne({ username })) {
            username = `${baseUsername}${counter++}`;
          }

          user = await User.create({
            username,
            name: profile.displayName || baseUsername,
            email,
            googleId: profile.id,
            profileImage:
              profile.photos?.[0]?.value ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                profile.displayName || "User"
              )}&background=10b981&color=fff&size=256`,
            authProvider: ["google"],
            isEmailVerified: true,
          });

          return done(null, user);
        } catch (error) {
          console.error("Google Strategy Error:", error);
          return done(error, null);
        }
      }
    )
  );
}

export default passport;
