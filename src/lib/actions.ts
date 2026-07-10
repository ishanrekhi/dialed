"use server";

import { z } from "zod";
import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { periodKeyFor, parseLocalDate, dayOfWeekIndex, todayKey } from "./dates";
import { requireUserId } from "./auth";
import { MAX_GROUP_SIZE } from "./group";
import { getDailyStreak } from "./streak";
import type { Recurrence } from "@prisma/client";

const STREAK_MILESTONES = [7, 14, 30, 50, 100];

async function notifyStreakMilestone(userId: string, streakCount: number) {
  const memberships = await prisma.groupMembership.findMany({
    where: { userId },
    select: { groupId: true },
  });
  for (const m of memberships) {
    await prisma.activity.create({
      data: { groupId: m.groupId, userId, type: "STREAK_MILESTONE", payload: { streakCount } },
    });
  }
}

async function assertCategoryOwned(categoryId: string, userId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!category) throw new Error("Category not found");
}

// Group-goal-spawned personal Goals need a category (Goal.categoryId is
// required); find-or-create a standing "Group" one rather than asking each
// member to pick.
async function ensureGroupCategory(userId: string): Promise<string> {
  const existing = await prisma.category.findFirst({
    where: { userId, name: "Group" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const count = await prisma.category.count({ where: { userId } });
  const created = await prisma.category.create({
    data: { userId, name: "Group", color: "#818cf8", order: count },
    select: { id: true },
  });
  return created.id;
}

// "1,3,5" -> [1,3,5]; ignores anything out of 0-6, dedupes, sorts. Only
// meaningful for DAILY goals — WEEKLY/ONE_OFF always store [].
function parseDaysOfWeek(raw: string | undefined): number[] {
  if (!raw) return [];
  const days = raw
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(80),
  categoryId: z.string().min(1),
  recurrence: z.enum(["DAILY", "WEEKLY", "ONE_OFF"]),
  specificDate: z.string().optional(),
  daysOfWeek: z.string().optional(),
});

export async function createGoal(formData: FormData) {
  const userId = await requireUserId();
  const parsed = createGoalSchema.parse({
    title: formData.get("title"),
    categoryId: formData.get("categoryId"),
    recurrence: formData.get("recurrence"),
    specificDate: formData.get("specificDate") || undefined,
    daysOfWeek: formData.get("daysOfWeek") || undefined,
  });

  await assertCategoryOwned(parsed.categoryId, userId);

  await prisma.goal.create({
    data: {
      userId,
      title: parsed.title,
      categoryId: parsed.categoryId,
      recurrence: parsed.recurrence,
      daysOfWeek: parsed.recurrence === "DAILY" ? parseDaysOfWeek(parsed.daysOfWeek) : [],
      specificDate:
        parsed.recurrence === "ONE_OFF" && parsed.specificDate
          ? parseLocalDate(parsed.specificDate)
          : null,
    },
  });

  revalidatePath("/");
}

const updateGoalSchema = createGoalSchema.extend({
  goalId: z.string().min(1),
});

export async function updateGoal(formData: FormData) {
  const userId = await requireUserId();
  const parsed = updateGoalSchema.parse({
    goalId: formData.get("goalId"),
    title: formData.get("title"),
    categoryId: formData.get("categoryId"),
    recurrence: formData.get("recurrence"),
    specificDate: formData.get("specificDate") || undefined,
    daysOfWeek: formData.get("daysOfWeek") || undefined,
  });

  await assertCategoryOwned(parsed.categoryId, userId);

  // updateMany with the userId filter: a non-owned id matches zero rows
  // instead of throwing, so ownership is enforced without extra reads.
  await prisma.goal.updateMany({
    where: { id: parsed.goalId, userId },
    data: {
      title: parsed.title,
      categoryId: parsed.categoryId,
      recurrence: parsed.recurrence,
      daysOfWeek: parsed.recurrence === "DAILY" ? parseDaysOfWeek(parsed.daysOfWeek) : [],
      specificDate:
        parsed.recurrence === "ONE_OFF" && parsed.specificDate
          ? parseLocalDate(parsed.specificDate)
          : null,
    },
  });

  revalidatePath("/");
}

export async function toggleCompletion(
  goalId: string,
  recurrence: Recurrence,
  atDate?: string
) {
  const userId = await requireUserId();

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true, groupGoalId: true },
  });
  if (!goal) return;

  const periodKey = periodKeyFor(recurrence, atDate ? parseLocalDate(atDate) : new Date());

  const existing = await prisma.completion.findUnique({
    where: { goalId_periodKey: { goalId, periodKey } },
  });

  // Only DAILY completions can move the daily streak — skip the extra
  // queries for WEEKLY/ONE_OFF toggles.
  const streakBefore = recurrence === "DAILY" ? await getDailyStreak(userId) : null;

  if (existing) {
    await prisma.completion.delete({ where: { id: existing.id } });
  } else {
    await prisma.completion.create({ data: { goalId, periodKey, completed: true } });
  }

  if (streakBefore !== null) {
    const streakAfter = await getDailyStreak(userId);
    if (streakAfter > streakBefore && STREAK_MILESTONES.includes(streakAfter)) {
      await notifyStreakMilestone(userId, streakAfter);
    }
  }

  if (goal.groupGoalId && !existing) {
    await notifyIfGroupGoalComplete(goal.groupGoalId, periodKey, userId);
  }

  revalidatePath("/");
}

// Fires GROUP_GOAL_COMPLETED once per period the moment every member's
// linked goal is done — not on every toggle after that (guarded by
// checking whether the activity already exists for this groupGoal+period).
// Attributed to whoever's toggle was the one that completed it.
async function notifyIfGroupGoalComplete(
  groupGoalId: string,
  periodKey: string,
  completedByUserId: string
) {
  const groupGoal = await prisma.groupGoal.findUnique({ where: { id: groupGoalId } });
  if (!groupGoal) return;

  const memberGoals = await prisma.goal.findMany({
    where: { groupGoalId, archivedAt: null },
    include: { completions: { where: { periodKey, completed: true } } },
  });
  if (memberGoals.length === 0) return;
  const allDone = memberGoals.every((g) => g.completions.length > 0);
  if (!allDone) return;

  const alreadyNotified = await prisma.activity.findFirst({
    where: {
      groupId: groupGoal.groupId,
      type: "GROUP_GOAL_COMPLETED",
      AND: [
        { payload: { path: ["groupGoalId"], equals: groupGoalId } },
        { payload: { path: ["periodKey"], equals: periodKey } },
      ],
    },
  });
  if (alreadyNotified) return;

  await prisma.activity.create({
    data: {
      groupId: groupGoal.groupId,
      userId: completedByUserId,
      type: "GROUP_GOAL_COMPLETED",
      payload: { groupGoalId, periodKey, goalTitle: groupGoal.title },
    },
  });
}

export type DayDetailGoal = {
  id: string;
  title: string;
  category: { name: string; color: string };
  completed: boolean;
};

// Goals due on a given calendar date, using the *current* goal set (same
// approximation streak/heatmap make — we don't track historical goal-set
// changes) — matches exactly what that date's heatmap cell ratio is based
// on: DAILY goals filtered by day-of-week. WEEKLY/ONE_OFF are intentionally
// excluded so the panel's count always matches the cell it was opened from.
export async function getDayDetail(dateStr: string): Promise<DayDetailGoal[]> {
  const userId = await requireUserId();
  const date = parseLocalDate(dateStr);
  const dow = dayOfWeekIndex(date);
  const key = todayKey(date);

  const goals = await prisma.goal.findMany({
    where: {
      userId,
      archivedAt: null,
      recurrence: "DAILY",
      OR: [{ daysOfWeek: { isEmpty: true } }, { daysOfWeek: { has: dow } }],
    },
    include: {
      category: { select: { name: true, color: true } },
      completions: { where: { periodKey: key, completed: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return goals.map((g) => ({
    id: g.id,
    title: g.title,
    category: g.category,
    completed: g.completions.length > 0,
  }));
}

export async function archiveGoal(goalId: string) {
  const userId = await requireUserId();

  await prisma.goal.updateMany({
    where: { id: goalId, userId },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/");
}

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function createCategory(formData: FormData) {
  const userId = await requireUserId();
  const parsed = createCategorySchema.parse({
    name: formData.get("name"),
    color: formData.get("color"),
  });

  const count = await prisma.category.count({ where: { userId } });
  await prisma.category.create({
    data: { userId, name: parsed.name, color: parsed.color, order: count },
  });

  revalidatePath("/");
}

const updateCategorySchema = createCategorySchema.extend({
  categoryId: z.string().min(1),
});

export async function updateCategory(formData: FormData) {
  const userId = await requireUserId();
  const parsed = updateCategorySchema.parse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    color: formData.get("color"),
  });

  await prisma.category.updateMany({
    where: { id: parsed.categoryId, userId },
    data: { name: parsed.name, color: parsed.color },
  });

  revalidatePath("/");
}

export async function deleteCategory(categoryId: string) {
  const userId = await requireUserId();

  const goalCount = await prisma.goal.count({ where: { categoryId, userId } });
  if (goalCount > 0) return; // in use — refuse silently, UI already guards this

  await prisma.category.deleteMany({ where: { id: categoryId, userId } });
  revalidatePath("/");
}

const updateMilestoneSchema = z.object({
  label: z.string().trim().min(1).max(60),
  targetDate: z.string().min(1),
  windowDays: z.coerce.number().int().min(1).max(3650),
});

export async function updateMilestone(formData: FormData) {
  const userId = await requireUserId();
  const parsed = updateMilestoneSchema.parse({
    label: formData.get("label"),
    targetDate: formData.get("targetDate"),
    windowDays: formData.get("windowDays"),
  });

  await prisma.milestone.upsert({
    where: { userId },
    create: {
      userId,
      label: parsed.label,
      targetDate: parseLocalDate(parsed.targetDate),
      windowDays: parsed.windowDays,
    },
    update: {
      label: parsed.label,
      targetDate: parseLocalDate(parsed.targetDate),
      windowDays: parsed.windowDays,
    },
  });

  revalidatePath("/");
}

// ---------- Groups ----------

// Idempotent: reuses an existing unclaimed invite rather than minting a new
// one per click. Lazily creates the user's group on first call.
export async function createGroupInvite(): Promise<string> {
  const userId = await requireUserId();

  const existingMembership = await prisma.groupMembership.findFirst({
    where: { userId },
    select: { groupId: true },
  });

  let groupId: string;
  if (existingMembership) {
    groupId = existingMembership.groupId;
  } else {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const group = await prisma.group.create({
      data: {
        name: `${user?.name ?? user?.email ?? "My"}'s Group`,
        createdBy: userId,
        members: { create: { userId } },
      },
      select: { id: true },
    });
    groupId = group.id;
  }

  const memberCount = await prisma.groupMembership.count({ where: { groupId } });
  if (memberCount >= MAX_GROUP_SIZE) {
    throw new Error("This group is full.");
  }

  const existingInvite = await prisma.groupInvite.findFirst({
    where: { groupId, usedBy: null },
    select: { id: true },
  });
  if (existingInvite) return existingInvite.id;

  const invite = await prisma.groupInvite.create({
    data: { groupId, createdBy: userId },
    select: { id: true },
  });
  return invite.id;
}

export async function revokeGroupInvite(inviteId: string) {
  const userId = await requireUserId();
  await prisma.groupInvite.deleteMany({ where: { id: inviteId, createdBy: userId } });
  revalidatePath("/social");
}

// Claims an invite: joins its group. No-ops (rather than throwing) on any
// invalid state — the invite page reads the group/invite fresh afterward
// and shows the right message either way.
export async function joinGroup(inviteId: string) {
  const userId = await requireUserId();

  const invite = await prisma.groupInvite.findUnique({
    where: { id: inviteId },
    select: { id: true, groupId: true, usedBy: true, createdBy: true },
  });
  if (!invite || invite.usedBy || invite.createdBy === userId) return;

  const alreadyInAGroup = await prisma.groupMembership.findFirst({ where: { userId } });
  if (alreadyInAGroup) return;

  const memberCount = await prisma.groupMembership.count({ where: { groupId: invite.groupId } });
  if (memberCount >= MAX_GROUP_SIZE) return;

  await prisma.$transaction([
    prisma.groupMembership.create({ data: { groupId: invite.groupId, userId } }),
    prisma.groupInvite.update({ where: { id: inviteId }, data: { usedBy: userId } }),
  ]);

  await prisma.activity.create({
    data: { groupId: invite.groupId, userId, type: "MEMBER_JOINED", payload: {} },
  });

  // Backfill any group goals that already existed so the new member starts
  // with the same shared checklist as everyone else.
  const activeGroupGoals = await prisma.groupGoal.findMany({ where: { groupId: invite.groupId } });
  if (activeGroupGoals.length > 0) {
    const categoryId = await ensureGroupCategory(userId);
    await prisma.goal.createMany({
      data: activeGroupGoals.map((gg) => ({
        userId,
        categoryId,
        title: gg.title,
        recurrence: gg.recurrence,
        daysOfWeek: gg.daysOfWeek,
        groupGoalId: gg.id,
      })),
    });
  }

  revalidatePath("/");
  revalidatePath("/social");
}

export async function leaveGroup() {
  const userId = await requireUserId();

  const membership = await prisma.groupMembership.findFirst({
    where: { userId },
    select: { id: true, groupId: true },
  });
  if (!membership) return;

  await prisma.groupMembership.delete({ where: { id: membership.id } });

  const remaining = await prisma.groupMembership.count({ where: { groupId: membership.groupId } });
  if (remaining === 0) {
    await prisma.group.delete({ where: { id: membership.groupId } });
  }

  revalidatePath("/social");
}

const createGroupGoalSchema = z.object({
  groupId: z.string().min(1),
  title: z.string().trim().min(1).max(80),
  recurrence: z.enum(["DAILY", "WEEKLY"]),
  daysOfWeek: z.string().optional(),
});

export async function createGroupGoal(formData: FormData) {
  const userId = await requireUserId();
  const parsed = createGroupGoalSchema.parse({
    groupId: formData.get("groupId"),
    title: formData.get("title"),
    recurrence: formData.get("recurrence"),
    daysOfWeek: formData.get("daysOfWeek") || undefined,
  });

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: parsed.groupId, userId } },
  });
  if (!membership) return;

  const daysOfWeek = parsed.recurrence === "DAILY" ? parseDaysOfWeek(parsed.daysOfWeek) : [];

  const groupGoal = await prisma.groupGoal.create({
    data: { groupId: parsed.groupId, title: parsed.title, recurrence: parsed.recurrence, daysOfWeek },
  });

  const members = await prisma.groupMembership.findMany({
    where: { groupId: parsed.groupId },
    select: { userId: true },
  });

  for (const m of members) {
    const categoryId = await ensureGroupCategory(m.userId);
    await prisma.goal.create({
      data: {
        userId: m.userId,
        categoryId,
        title: parsed.title,
        recurrence: parsed.recurrence,
        daysOfWeek,
        groupGoalId: groupGoal.id,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/social");
}

const createChallengeSchema = z.object({
  groupId: z.string().min(1),
  title: z.string().trim().min(1).max(60),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function createChallenge(formData: FormData) {
  const userId = await requireUserId();
  const parsed = createChallengeSchema.parse({
    groupId: formData.get("groupId"),
    title: formData.get("title"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: parsed.groupId, userId } },
  });
  if (!membership) return;

  const startDate = parseLocalDate(parsed.startDate);
  const endDate = parseLocalDate(parsed.endDate);
  if (endDate < startDate) return;

  await prisma.challenge.create({
    data: { groupId: parsed.groupId, title: parsed.title, startDate, endDate },
  });

  revalidatePath("/social");
}

const REACTION_EMOJI = ["🔥", "👏", "💪"];

export async function toggleReaction(activityId: string, emoji: string) {
  const userId = await requireUserId();
  if (!REACTION_EMOJI.includes(emoji)) return;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { groupId: true },
  });
  if (!activity) return;

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: activity.groupId, userId } },
  });
  if (!membership) return;

  const existing = await prisma.reaction.findUnique({
    where: { activityId_userId_emoji: { activityId, userId, emoji } },
  });
  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({ data: { activityId, userId, emoji } });
  }

  revalidatePath("/social");
}

// ---------- Onboarding ----------

const onboardingGoalSchema = z.object({
  title: z.string().trim().min(1).max(80),
  recurrence: z.enum(["DAILY", "WEEKLY"]),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
});

const onboardingCategorySchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  goals: z.array(onboardingGoalSchema).min(1),
});

const completeOnboardingSchema = z.object({
  categories: z.array(onboardingCategorySchema).min(1),
  milestone: z
    .object({
      label: z.string().trim().min(1).max(60),
      targetDate: z.string().min(1),
    })
    .nullable(),
});

export async function completeOnboarding(
  input: z.infer<typeof completeOnboardingSchema>
) {
  const userId = await requireUserId();
  const parsed = completeOnboardingSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    for (const [order, category] of parsed.categories.entries()) {
      const created = await tx.category.create({
        data: { userId, name: category.name, color: category.color, order },
      });
      await tx.goal.createMany({
        data: category.goals.map((g) => ({
          userId,
          categoryId: created.id,
          title: g.title,
          recurrence: g.recurrence,
          daysOfWeek: g.recurrence === "DAILY" ? g.daysOfWeek : [],
        })),
      });
    }

    if (parsed.milestone) {
      await tx.milestone.upsert({
        where: { userId },
        create: {
          userId,
          label: parsed.milestone.label,
          targetDate: parseLocalDate(parsed.milestone.targetDate),
        },
        update: {
          label: parsed.milestone.label,
          targetDate: parseLocalDate(parsed.milestone.targetDate),
        },
      });
    }

    await tx.user.update({ where: { id: userId }, data: { onboardedAt: new Date() } });
  });

  revalidatePath("/");
  redirect("/");
}

export async function skipOnboarding() {
  const userId = await requireUserId();
  await prisma.user.update({ where: { id: userId }, data: { onboardedAt: new Date() } });
  revalidatePath("/");
  redirect("/");
}
