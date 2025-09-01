// utils/adjectives.js
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const CACHE_FILE = path.resolve("./data/adjectives.json");
let adjectives = [];

// Default fallback adjectives of praise
const FALLBACK = [
  "brilliant",
  "outstanding",
  "exceptional",
  "legendary",
  "phenomenal",
  "remarkable",
  "incredible",
  "fantastic",
  "stellar",
  "magnificent",
];

// Fetch fresh adjectives of praise
async function fetchAdjectives() {
  try {
    const res = await fetch("https://www.englishclub.com/vocabulary/adjectives-personality-positive.htm");
    const text = await res.text();

    // Extract words from HTML (simple regex for list items)
    const matches = [...text.matchAll(/<li>(.*?)<\/li>/g)].map(m => m[1].toLowerCase());
    const praiseAdjs = matches.filter(w =>
      !w.includes("negative") && w.length > 3
    );

    if (praiseAdjs.length) {
      adjectives = praiseAdjs;
      fs.writeFileSync(CACHE_FILE, JSON.stringify({ adjectives, ts: Date.now() }, null, 2));
    }
  } catch (err) {
    console.error("⚠️ Failed to fetch adjectives, using fallback:", err.message);
    adjectives = FALLBACK;
  }
}

// Load adjectives, refreshing weekly
export async function getAdjectives() {
  if (adjectives.length) return adjectives;

  if (fs.existsSync(CACHE_FILE)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    if (Date.now() - cache.ts < oneWeek && cache.adjectives?.length) {
      adjectives = cache.adjectives;
      return adjectives;
    }
  }

  await fetchAdjectives();
  if (!adjectives.length) adjectives = FALLBACK;
  return adjectives;
}

export function getRandomAdjective() {
  if (!adjectives.length) adjectives = FALLBACK;
  return adjectives[Math.floor(Math.random() * adjectives.length)];
}
