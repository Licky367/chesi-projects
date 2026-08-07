const mongoose = require("mongoose");

const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === "production";
  const preferredMongoUri = process.env.MONGO_URI;
  const fallbackMongoUri = "mongodb://127.0.0.1:27017/project_db";

  try {
    const MONGO_URI = preferredMongoUri || fallbackMongoUri;

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: isProduction ? 3000 : 5000,
    });

    console.log("🟢 MongoDB Connected");
    return true;
  } catch (error) {
    console.warn("🔴 MongoDB Error:", error.message);

    // Try local fallback first
    if (!isProduction) {
      try {
        await mongoose.connect(fallbackMongoUri, {
          serverSelectionTimeoutMS: 3000,
        });

        console.log("🟢 MongoDB Connected via local fallback");
        return true;
      } catch (fallbackError) {
        console.warn("🔴 MongoDB Local Fallback Error:", fallbackError.message);
      }

      // As a final development fallback, start an in-memory MongoDB
      try {
        console.log("⚠️ Starting in-memory MongoDB for development...");
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();

        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 3000,
        });

        console.log("🟢 Connected to in-memory MongoDB");
        return true;
      } catch (memErr) {
        console.warn("🔴 In-memory MongoDB failed:", memErr.message);
      }
    }

    console.warn("⚠️ MongoDB is unavailable. The app will continue in limited mode.");
    return false;
  }
};

module.exports = connectDB;