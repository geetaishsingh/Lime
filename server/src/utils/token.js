import jwt from "jsonwebtoken";

const getToken = async (userId) => {
  try {
    const secret = process.env.JWT_SECRET_KEY || "lime_fallback_secret_key_2026";
    const token = jwt.sign({ userId }, secret, {
      expiresIn: "30d",
    });
    return token;
  } catch (err) {
    console.error("Token generation error:", err);
    throw err;
  }
};

export default getToken;
