// Shared, pure constants — safe to import on client and server.

export type Difficulty = "Easy" | "Medium" | "Hard" | "Epic";

export const DIFFICULTY: Record<Difficulty, { xp: number; color: string }> = {
  Easy: { xp: 10, color: "#5ad1a0" },
  Medium: { xp: 25, color: "#4db5ff" },
  Hard: { xp: 50, color: "#c08bff" },
  Epic: { xp: 100, color: "#ffcb47" },
};

export const CATEGORIES = [
  "Fitness",
  "Nutrition",
  "Sleep",
  "Screen Time",
  "Work",
  "Mental Health",
  "Custom",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLOR: Record<string, string> = {
  Fitness: "#4db5ff",
  Nutrition: "#5ad1a0",
  Sleep: "#8b9eff",
  "Screen Time": "#ff9d5c",
  Work: "#c08bff",
  "Mental Health": "#ff7ba6",
  Custom: "#ffcb47",
};

export const RANKS = [
  { name: "E Rank", short: "E", min: 1, color: "#7f8aa3" },
  { name: "D Rank", short: "D", min: 11, color: "#5ad1a0" },
  { name: "C Rank", short: "C", min: 21, color: "#4db5ff" },
  { name: "B Rank", short: "B", min: 31, color: "#8b9eff" },
  { name: "A Rank", short: "A", min: 41, color: "#c08bff" },
  { name: "S Rank", short: "S", min: 51, color: "#ff7ba6" },
  { name: "National Rank", short: "N", min: 61, color: "#ff9d5c" },
  { name: "Monarch", short: "M", min: 71, color: "#ffcb47" },
];

// [title, category, difficulty]
export const DEFAULT_TEMPLATES: [string, Category, Difficulty][] = [
  ["Go to the gym", "Fitness", "Hard"],
  ["Complete a workout", "Fitness", "Medium"],
  ["Walk 8,000 steps", "Fitness", "Medium"],
  ["Stretch for 10 minutes", "Fitness", "Easy"],
  ["Hit protein target", "Nutrition", "Medium"],
  ["Drink 3 liters of water", "Nutrition", "Easy"],
  ["Avoid junk food", "Nutrition", "Medium"],
  ["Sleep 7–8 hours", "Sleep", "Medium"],
  ["Sleep before midnight", "Sleep", "Easy"],
  ["Social media under 90 min", "Screen Time", "Medium"],
  ["No phone for first hour awake", "Screen Time", "Easy"],
  ["Work on project for 2 hours", "Work", "Hard"],
  ["Complete one meaningful task", "Work", "Medium"],
  ["Push code to GitHub", "Work", "Medium"],
  ["Journal for 10 minutes", "Mental Health", "Easy"],
  ["Meditate for 5 minutes", "Mental Health", "Easy"],
  ["Gratitude entry", "Mental Health", "Easy"],
  ["Read 10 pages", "Mental Health", "Easy"],
];

export const ACHIEVEMENTS = [
  { id: "first_quest", name: "Awakening", desc: "Complete your first quest", icon: "Zap" },
  { id: "first_workout", name: "First Workout", desc: "Complete a Fitness quest", icon: "Dumbbell" },
  { id: "streak_7", name: "Gym Streak 7", desc: "Reach a 7-day streak", icon: "Flame" },
  { id: "streak_30", name: "Iron Will", desc: "Reach a 30-day streak", icon: "Flame" },
  { id: "protein_master", name: "Protein Master", desc: "Complete 10 Nutrition quests", icon: "Apple" },
  { id: "early_sleeper", name: "Early Sleeper", desc: "Sleep before midnight 5 times", icon: "Moon" },
  { id: "deep_work", name: "Deep Work Champion", desc: "Complete 15 Work quests", icon: "Code2" },
  { id: "mind_guardian", name: "Mind Guardian", desc: "Complete 20 Mental Health quests", icon: "Brain" },
  { id: "level_5", name: "Hunter Rising", desc: "Reach Level 5", icon: "Star" },
  { id: "level_10", name: "Ascendant", desc: "Reach Level 10", icon: "Crown" },
];
