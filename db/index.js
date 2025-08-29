import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DBNAME || 'gtbb';

export const client = new MongoClient(uri);

export async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  return client.db(dbName);
}

export async function getCollection(name) {
  const db = await connectDB();
  return db.collection(name);
}

export async function getCurrentWeek() {
  const col = await getCollection('meta');
  let meta = await col.findOne({ _id: 'currentWeek' });
  if (!meta) {
    await col.insertOne({ _id: 'currentWeek', value: 1 });
    meta = { value: 1 };
  }
  return meta.value;
}

export async function setCurrentWeek(weekNum) {
  const col = await getCollection('meta');
  await col.updateOne({ _id: 'currentWeek' }, { $set: { value: weekNum } }, { upsert: true });
}

export async function getWeek(weekNum) {
  const col = await getCollection('weeks');
  let week = await col.findOne({ weekNum });
  if (!week) {
    week = {
      weekNum,
      bases: [],
      leaderboard: [],
      gtbbRound: { current: null, state: 'idle', round: null, responses: [] },
      gtbbRounds: [],
      ended: false
    };
    await col.insertOne(week);
  }
  return week;
}

export async function updateWeek(weekNum, update) {
  const col = await getCollection('weeks');
  await col.updateOne({ weekNum }, { $set: update }, { upsert: true });
}

export async function addBase(weekNum, baseObj) {
  const col = await getCollection('weeks');
  await col.updateOne(
    { weekNum },
    { $push: { bases: baseObj } },
    { upsert: true }
  );
}

export async function addLeaderboardEntry(weekNum, entry) {
  const col = await getCollection('weeks');
  await col.updateOne(
    { weekNum },
    { $push: { leaderboard: entry } },
    { upsert: true }
  );
}

export async function setLeaderboard(weekNum, leaderboard) {
  const col = await getCollection('weeks');
  await col.updateOne(
    { weekNum },
    { $set: { leaderboard } },
    { upsert: true }
  );
}

export async function addGTBBRound(weekNum, round) {
  const col = await getCollection('weeks');
  await col.updateOne(
    { weekNum },
    { $push: { gtbbRounds: round } },
    { upsert: true }
  );
}

export async function updateGTBB(weekNum, gtbbRound) {
  const col = await getCollection('weeks');
  await col.updateOne(
    { weekNum },
    { $set: { gtbbRound } },
    { upsert: true }
  );
}

export async function getLeaderboard(weekNum) {
  const week = await getWeek(weekNum);
  let points = {};
  for (const entry of week.leaderboard) {
    points[entry.userId] = (points[entry.userId] || 0) + entry.points;
  }
  return Object.entries(points)
    .map(([userId, points]) => ({ userId, points }))
    .sort((a, b) => b.points - a.points);
}

export async function getOverallLeaderboard() {
  const col = await getCollection('weeks');
  const weeks = await col.find({}).toArray();
  let points = {};
  for (const week of weeks) {
    for (const entry of week.leaderboard || []) {
      points[entry.userId] = (points[entry.userId] || 0) + entry.points;
    }
  }
  return Object.entries(points)
    .map(([userId, points]) => ({ userId, points }))
    .sort((a, b) => b.points - a.points);
}