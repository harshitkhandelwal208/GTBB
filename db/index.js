/**
 * Modernized DB layer using mongoose (MongoDB).
 *
 * - Connection pooling & automatic reconnect (Mongoose handles this).
 * - Graceful disconnect helper for shutdown hooks.
 * - Simple Week schema to store GTBB weeks, bases, rounds, and per-week leaderboard.
 *
 * Required env:
 *   MONGODB_URI
 */

import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

const uri = process.env.MONGODB_URI;
if (!uri) {
  logger.error("MONGODB_URI is not set. Please set the environment variable.");
  throw new Error("MONGODB_URI missing");
}

// Mongoose connection with sensible defaults
mongoose.set("strictQuery", false);

async function connect() {
  try {
    await mongoose.connect(uri, {
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info("✅ Connected to MongoDB");
  } catch (err) {
    logger.error("❌ MongoDB connection error:", err?.message || err);
    throw err;
  }
}
connect().catch((e) => {
  logger.error("❌ Initial DB connect failed:", e?.message || e);
});

// -------------------- Schemas -------------------- //
const LeaderboardEntry = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    points: { type: Number, default: 0 },
  },
  { _id: false }
);

const GTBBRound = new mongoose.Schema(
  {
    baseIndex: Number,
    responses: [
      {
        userId: String,
        answer: Number,
        ts: { type: Date, default: () => new Date() },
      },
    ],
    roundTs: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WeekSchema = new mongoose.Schema({
  weekNum: { type: Number, required: true, unique: true },
  bases: [
    {
      baseName: String,
      options: [String],
      correct: Number,
      image: String,
    },
  ],
  gtbbRound: {
    current: { type: Number, default: null },
    state: { type: String, enum: ["idle", "running"], default: "idle" },
    round: { type: Number, default: null },
    responses: [
      {
        userId: String,
        answer: Number,
        ts: { type: Date, default: () => new Date() },
      },
    ],
  },
  gtbbRounds: [GTBBRound],
  leaderboard: [LeaderboardEntry],
  ended: { type: Boolean, default: false },
});

const Week = mongoose.model("Week", WeekSchema);

const ConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
});
const Config = mongoose.model("Config", ConfigSchema);

// -------------------- Helpers -------------------- //
export async function getWeek(n) {
  if (n == null) return null;
  let w = await Week.findOne({ weekNum: n }).lean();
  if (!w) {
    await Week.create({ weekNum: n });
    w = await Week.findOne({ weekNum: n }).lean();
  }
  return w;
}

export async function getCurrentWeek() {
  const cfg = await Config.findOne({ key: "current_week" }).lean();
  return cfg?.value ?? null;
}

export async function setCurrentWeek(n) {
  await Config.updateOne(
    { key: "current_week" },
    { key: "current_week", value: n },
    { upsert: true }
  );
  await getWeek(n); // ensure week doc exists
}

export async function updateWeek(weekNum, patch = {}) {
  await Week.updateOne({ weekNum }, { $set: patch }, { upsert: true });
}

export async function addBase(weekNum, base) {
  await Week.updateOne(
    { weekNum },
    { $push: { bases: base } },
    { upsert: true }
  );
}

export async function updateGTBB(weekNum, patch = {}) {
  const update = {};
  for (const k of Object.keys(patch)) {
    update[`gtbbRound.${k}`] = patch[k];
  }
  await Week.updateOne({ weekNum }, { $set: update }, { upsert: true });
}

export async function addGTBBRound(weekNum, roundObj) {
  await Week.updateOne(
    { weekNum },
    { $push: { gtbbRounds: roundObj } },
    { upsert: true }
  );
}

/**
 * Store or update a player's answer for a base in a given week.
 * - Ensures each user only has one answer per base per week.
 */
export async function addAnswer(weekNum, userId, baseIndex, choice) {
  const w = await Week.findOne({ weekNum });
  if (!w) {
    throw new Error(`Week ${weekNum} not found`);
  }

  // find or create round for this base
  let round = w.gtbbRounds.find((r) => r.baseIndex === baseIndex);
  if (!round) {
    round = { baseIndex, responses: [] };
    w.gtbbRounds.push(round);
  }

  // check if user already answered
  const existing = round.responses.find((r) => r.userId === userId);
  if (existing) {
    existing.answer = choice;
    existing.ts = new Date();
  } else {
    round.responses.push({ userId, answer: choice, ts: new Date() });
  }

  await w.save();
  logger.info(`✅ Saved answer: week ${weekNum}, base ${baseIndex}, user ${userId}, choice ${choice}`);
}

export async function addLeaderboardEntry(weekNum, { userId, points = 1 }) {
  const w = await Week.findOne({ weekNum });
  if (!w) {
    await Week.create({ weekNum, leaderboard: [{ userId, points }] });
    return;
  }
  const existing = w.leaderboard.find((e) => e.userId === userId);
  if (existing) {
    existing.points += points;
  } else {
    w.leaderboard.push({ userId, points });
  }
  await w.save();
}

export async function getLeaderboard(weekNum) {
  const w = await Week.findOne({ weekNum }).lean();
  if (!w || !w.leaderboard) return [];
  return w.leaderboard.sort((a, b) => b.points - a.points);
}

export async function getOverallLeaderboard(limit = 25) {
  const pipeline = [
    { $unwind: { path: "$leaderboard", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$leaderboard.userId",
        points: { $sum: "$leaderboard.points" },
      },
    },
    { $sort: { points: -1 } },
    { $limit: limit },
    {
      $project: {
        userId: "$_id",
        points: 1,
        _id: 0,
      },
    },
  ];
  return await Week.aggregate(pipeline);
}

// -------------------- Shutdown -------------------- //
export async function disconnect() {
  try {
    await mongoose.disconnect();
    logger.info("✅ Disconnected from MongoDB");
  } catch (err) {
    logger.error("❌ Error disconnecting MongoDB", err?.message || err);
  }
}
