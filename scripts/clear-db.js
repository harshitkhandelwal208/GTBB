// scripts/clear-db.js
import mongoose from "mongoose";
import "dotenv/config";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI is not set in environment variables.");
  process.exit(1);
}

async function clearDatabase() {
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    for (const { name } of collections) {
      await db.dropCollection(name);
      console.log(`🗑️ Dropped collection: ${name}`);
    }

    console.log("✅ Database cleared successfully.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("⚠️ Error clearing database:", err);
    process.exit(1);
  }
}

clearDatabase();
