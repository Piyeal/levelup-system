import { RANKS } from "./constants";

// XP to go from level n -> n+1 is 100 * n.
// Cumulative lifetime XP required to *be* at a given level:
export const cumulativeForLevel = (lvl: number) => (100 * (lvl - 1) * lvl) / 2;

export function levelFromXp(total: number): number {
  let lvl = 1;
  while (total >= cumulativeForLevel(lvl + 1)) lvl++;
  return lvl;
}

export function rankForLevel(lvl: number) {
  return [...RANKS].reverse().find((r) => lvl >= r.min) || RANKS[0];
}

export function derived(totalXp: number) {
  const level = levelFromXp(totalXp);
  const rank = rankForLevel(level);
  const xpInLevel = totalXp - cumulativeForLevel(level);
  const xpForNext = 100 * level;
  const pct = Math.min(100, (xpInLevel / xpForNext) * 100);
  return { level, rank, xpInLevel, xpForNext, pct };
}

/* ----------------------------- date utils ----------------------------- */
export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export const shortDay = (s: string) =>
  new Date(s).toLocaleDateString(undefined, { weekday: "short" });

export function last7Dates(): string[] {
  return [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return todayStr(d);
  });
}
