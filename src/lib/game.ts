import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  DEFAULT_TEMPLATES,
  DIFFICULTY,
  ACHIEVEMENTS,
  type Difficulty,
} from "./constants";
import { derived, todayStr, daysBetween, last7Dates, shortDay } from "./leveling";

type Counters = {
  Fitness: number;
  Nutrition: number;
  Sleep: number;
  Work: number;
  "Mental Health": number;
  beforeMidnight: number;
};

const emptyCounters = (): Counters => ({
  Fitness: 0,
  Nutrition: 0,
  Sleep: 0,
  Work: 0,
  "Mental Health": 0,
  beforeMidnight: 0,
});

async function getOrCreatePlayer(userId: string) {
  let player = await prisma.player.findUnique({ where: { userId } });
  if (!player) {
    player = await prisma.player.create({
      data: { userId, counters: emptyCounters() as Prisma.InputJsonValue },
    });
  }
  return player;
}

async function ensureToday(playerId: string) {
  const t = todayStr();
  const count = await prisma.questInstance.count({ where: { playerId, date: t } });
  if (count > 0) return;

  const custom = await prisma.questTemplate.findMany({ where: { playerId } });
  const all: [string, string, Difficulty][] = [
    ...DEFAULT_TEMPLATES.map((x) => [x[0], x[1], x[2]] as [string, string, Difficulty]),
    ...custom.map((c) => [c.title, c.category, c.difficulty as Difficulty] as [string, string, Difficulty]),
  ];
  await prisma.questInstance.createMany({
    data: all.map(([title, category, difficulty]) => ({
      playerId,
      date: t,
      title,
      category,
      difficulty,
      xp: DIFFICULTY[difficulty].xp,
      done: false,
    })),
  });
}

// Fair penalty engine — runs at most once per calendar day.
async function runPenaltyIfNeeded(playerId: string) {
  const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
  const t = todayStr();
  if (player.lastPenaltyCheck === t) return;

  const data: Prisma.PlayerUpdateInput = { lastPenaltyCheck: t };
  if (player.lastCompletionDate) {
    const gap = daysBetween(player.lastCompletionDate, t);
    if (gap >= 2) {
      const missed = Math.min(gap - 1, 3); // capped
      const penalty = missed * 50;
      data.totalXp = Math.max(0, player.totalXp - penalty);
      data.streak = 0;
      await prisma.activityLog.create({
        data: {
          playerId,
          date: t,
          text: `Penalty — missed ${gap - 1} day${gap - 1 > 1 ? "s" : ""}`,
          xp: -penalty,
        },
      });
    }
  }
  await prisma.player.update({ where: { id: playerId }, data });
}

async function checkAchievements(playerId: string) {
  const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
  const c = (player.counters as unknown as Counters) ?? emptyCounters();
  const { level } = derived(player.totalXp);

  const earned: string[] = [];
  const add = (cond: boolean, id: string) => cond && earned.push(id);

  add(player.totalCompleted >= 1, "first_quest");
  add(c.Fitness >= 1, "first_workout");
  add(player.bestStreak >= 7, "streak_7");
  add(player.bestStreak >= 30, "streak_30");
  add(c.Nutrition >= 10, "protein_master");
  add(c.beforeMidnight >= 5, "early_sleeper");
  add(c.Work >= 15, "deep_work");
  add(c["Mental Health"] >= 20, "mind_guardian");
  add(level >= 5, "level_5");
  add(level >= 10, "level_10");

  if (earned.length) {
    await prisma.achievementUnlock.createMany({
      data: earned.map((achievementId) => ({ playerId, achievementId })),
      skipDuplicates: true,
    });
  }
}

/* ------------------------------ mutations ------------------------------ */

export async function toggleQuest(userId: string, questId: string) {
  const player = await getOrCreatePlayer(userId);
  const quest = await prisma.questInstance.findUnique({ where: { id: questId } });
  if (!quest || quest.playerId !== player.id) throw new Error("Quest not found");

  const t = todayStr();
  const counters = (player.counters as unknown as Counters) ?? emptyCounters();

  if (!quest.done) {
    const otherDone = await prisma.questInstance.count({
      where: { playerId: player.id, date: t, done: true, NOT: { id: questId } },
    });

    if (counters[quest.category as keyof Counters] != null)
      (counters as Record<string, number>)[quest.category] += 1;
    if (quest.title.toLowerCase().includes("midnight")) counters.beforeMidnight += 1;

    const data: Prisma.PlayerUpdateInput = {
      totalXp: player.totalXp + quest.xp,
      totalCompleted: player.totalCompleted + 1,
      counters: counters as Prisma.InputJsonValue,
    };

    if (otherDone === 0) {
      const consecutive =
        !!player.lastCompletionDate && daysBetween(player.lastCompletionDate, t) === 1;
      const streak = consecutive ? player.streak + 1 : 1;
      data.streak = streak;
      data.lastCompletionDate = t;
      data.bestStreak = Math.max(player.bestStreak, streak);
    }

    await prisma.$transaction([
      prisma.questInstance.update({ where: { id: questId }, data: { done: true } }),
      prisma.player.update({ where: { id: player.id }, data }),
      prisma.activityLog.create({
        data: { playerId: player.id, date: t, text: quest.title, xp: quest.xp },
      }),
    ]);
    await checkAchievements(player.id);
  } else {
    if (counters[quest.category as keyof Counters] != null)
      (counters as Record<string, number>)[quest.category] = Math.max(
        0,
        (counters as Record<string, number>)[quest.category] - 1
      );
    await prisma.$transaction([
      prisma.questInstance.update({ where: { id: questId }, data: { done: false } }),
      prisma.player.update({
        where: { id: player.id },
        data: {
          totalXp: Math.max(0, player.totalXp - quest.xp),
          totalCompleted: Math.max(0, player.totalCompleted - 1),
          counters: counters as Prisma.InputJsonValue,
        },
      }),
    ]);
  }

  return buildState(userId);
}

export async function addCustomQuest(
  userId: string,
  input: { title: string; category: string; difficulty: Difficulty }
) {
  const player = await getOrCreatePlayer(userId);
  const title = input.title.trim();
  if (!title) throw new Error("Title required");
  const difficulty = (["Easy", "Medium", "Hard", "Epic"].includes(input.difficulty)
    ? input.difficulty
    : "Medium") as Difficulty;

  await prisma.$transaction([
    prisma.questTemplate.create({
      data: { playerId: player.id, title, category: input.category, difficulty },
    }),
    prisma.questInstance.create({
      data: {
        playerId: player.id,
        date: todayStr(),
        title,
        category: input.category,
        difficulty,
        xp: DIFFICULTY[difficulty].xp,
        done: false,
      },
    }),
  ]);
  return buildState(userId);
}

export async function deleteQuest(userId: string, questId: string) {
  const player = await getOrCreatePlayer(userId);
  const quest = await prisma.questInstance.findUnique({ where: { id: questId } });
  if (quest && quest.playerId === player.id) {
    // refund XP if it was completed
    if (quest.done) {
      await prisma.player.update({
        where: { id: player.id },
        data: {
          totalXp: Math.max(0, player.totalXp - quest.xp),
          totalCompleted: Math.max(0, player.totalCompleted - 1),
        },
      });
    }
    await prisma.questInstance.delete({ where: { id: questId } });
  }
  return buildState(userId);
}

export async function updatePlayer(
  userId: string,
  patch: { username?: string; proteinGoal?: number; gymGoal?: number }
) {
  const player = await getOrCreatePlayer(userId);
  await prisma.player.update({
    where: { id: player.id },
    data: {
      ...(patch.username !== undefined ? { username: patch.username.slice(0, 24) } : {}),
      ...(patch.proteinGoal !== undefined ? { proteinGoal: patch.proteinGoal } : {}),
      ...(patch.gymGoal !== undefined ? { gymGoal: patch.gymGoal } : {}),
    },
  });
  return buildState(userId);
}

export async function resetPlayer(userId: string) {
  const player = await prisma.player.findUnique({ where: { userId } });
  if (player) {
    await prisma.$transaction([
      prisma.questInstance.deleteMany({ where: { playerId: player.id } }),
      prisma.questTemplate.deleteMany({ where: { playerId: player.id } }),
      prisma.achievementUnlock.deleteMany({ where: { playerId: player.id } }),
      prisma.activityLog.deleteMany({ where: { playerId: player.id } }),
      prisma.player.update({
        where: { id: player.id },
        data: {
          totalXp: 0,
          streak: 0,
          bestStreak: 0,
          totalCompleted: 0,
          lastCompletionDate: null,
          lastPenaltyCheck: null,
          counters: emptyCounters() as Prisma.InputJsonValue,
        },
      }),
    ]);
  }
  return buildState(userId);
}

/* ------------------------------ read state ------------------------------ */

export async function buildState(userId: string) {
  const player = await getOrCreatePlayer(userId);
  await ensureToday(player.id);
  await runPenaltyIfNeeded(player.id);

  const fresh = await prisma.player.findUniqueOrThrow({ where: { id: player.id } });
  const t = todayStr();

  const [todayQuests, unlocks, logs, weekQuests] = await Promise.all([
    prisma.questInstance.findMany({ where: { playerId: player.id, date: t }, orderBy: { id: "asc" } }),
    prisma.achievementUnlock.findMany({ where: { playerId: player.id } }),
    prisma.activityLog.findMany({
      where: { playerId: player.id },
      orderBy: { createdAt: "desc" },
      take: 18,
    }),
    prisma.questInstance.findMany({ where: { playerId: player.id, date: { in: last7Dates() } } }),
  ]);

  // weekly evaluation
  const dates = last7Dates();
  const cat: Record<string, number> = { Fitness: 0, Nutrition: 0, Sleep: 0, Work: 0, "Mental Health": 0 };
  let completed = 0;
  let total = 0;
  const byDate: Record<string, { xp: number; done: number }> = {};
  for (const d of dates) byDate[d] = { xp: 0, done: 0 };
  for (const q of weekQuests) {
    total++;
    if (q.done) {
      completed++;
      byDate[q.date].xp += q.xp;
      byDate[q.date].done += 1;
      if (cat[q.category] != null) cat[q.category] += 1;
    }
  }
  const ratio = total ? completed / total : 0;
  const grade =
    ratio >= 0.9 ? "S" : ratio >= 0.8 ? "A" : ratio >= 0.65 ? "B" : ratio >= 0.5 ? "C" : ratio >= 0.3 ? "D" : "F";

  return {
    player: {
      username: fresh.username,
      totalXp: fresh.totalXp,
      streak: fresh.streak,
      bestStreak: fresh.bestStreak,
      totalCompleted: fresh.totalCompleted,
      proteinGoal: fresh.proteinGoal,
      gymGoal: fresh.gymGoal,
    },
    derived: derived(fresh.totalXp),
    quests: todayQuests.map((q) => ({
      id: q.id,
      title: q.title,
      category: q.category,
      difficulty: q.difficulty,
      xp: q.xp,
      done: q.done,
    })),
    unlocked: unlocks.map((u) => u.achievementId),
    log: logs.map((l) => ({ text: l.text, xp: l.xp, date: l.date })),
    weekly: {
      grade,
      ratio,
      completed,
      total,
      cat,
      chart: dates.map((d) => ({ day: shortDay(d), xp: byDate[d].xp, done: byDate[d].done })),
    },
  };
}

export type GameState = Awaited<ReturnType<typeof buildState>>;
