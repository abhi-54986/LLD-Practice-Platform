import mongoose from "mongoose";

export async function connectToDatabase(
  uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/lld-practice-platform",
): Promise<void> {
  await mongoose.connect(uri);
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}