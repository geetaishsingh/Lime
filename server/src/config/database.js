import mongoose from "mongoose";

const connectDb = async () => {
  const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/lime_social";
  await mongoose.connect(mongoUrl);
};

export default connectDb;
