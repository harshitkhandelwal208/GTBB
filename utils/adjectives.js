import fetch from "node-fetch";
const fallbackAdjectives = [
  "ingenious", "legendary", "fearless", "creative", "bold",
  "brilliant", "exceptional", "masterful", "visionary", "iconic"
];

export async function fetchAdjectives(names) {
  try {
    const response = await fetch("https://api.datamuse.com/words?rel_jjb=build&max=20");
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    const adjectives = data.map(item => item.word).filter(Boolean);
    if (adjectives.length < names.length) {
      adjectives.push(...fallbackAdjectives);
    }
    return names.map((_, i) => adjectives[i % adjectives.length] || fallbackAdjectives[i % fallbackAdjectives.length]);
  } catch {
    return names.map((_, i) => fallbackAdjectives[i % fallbackAdjectives.length]);
  }
}