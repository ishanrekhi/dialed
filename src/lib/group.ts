import { differenceInCalendarDays } from "date-fns";
import { prisma } from "./prisma";
import { getDailyStreak, getLongTermStats } from "./streak";
import { periodKeyFor } from "./dates";
import type { Recurrence } from "@prisma/client";

export const MAX_GROUP_SIZE = 8;

export type GroupMember = { id: string; name: string | null; email: string | null };
export type GroupSummary = { id: string; name: string; members: GroupMember[] };

// The group this user belongs to, if any. One group per user for now (the
// UI only ever shows a single active group) — schema doesn't prevent
// multiple memberships, so this picks the earliest-joined one.
export async function getUserGroup(userId: string): Promise<GroupSummary | null> {
  const membership = await prisma.groupMembership.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    include: {
      group: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
    },
  });
  if (!membership) return null;

  return {
    id: membership.group.id,
    name: membership.group.name,
    members: membership.group.members.map((m) => m.user),
  };
}

// An unclaimed invite link for this user's group, if one exists.
export async function getPendingInvite(groupId: string): Promise<string | null> {
  const invite = await prisma.groupInvite.findFirst({
    where: { groupId, usedBy: null },
    select: { id: true },
  });
  return invite?.id ?? null;
}

export type ActivityItem = {
  id: string;
  type: "STREAK_MILESTONE" | "GROUP_GOAL_COMPLETED" | "MEMBER_JOINED";
  payload: unknown;
  createdAt: Date;
  user: GroupMember;
  reactions: { emoji: string; count: number; reactedByMe: boolean }[];
};

export type LeaderboardEntry = {
  member: GroupMember;
  streak: number;
  longestStreak: number;
  completionRate: number;
};

// Reuses the same per-user stat functions the Personal page and heatmap
// already rely on — a group is just "call these for each member and sort."
export async function getGroupLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  const memberships = await prisma.groupMembership.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const entries = await Promise.all(
    memberships.map(async (m) => {
      const [streak, longTerm] = await Promise.all([
        getDailyStreak(m.user.id),
        getLongTermStats(m.user.id),
      ]);
      return {
        member: m.user,
        streak,
        longestStreak: longTerm.longestStreak,
        completionRate: longTerm.completionRate,
      };
    })
  );

  return entries.sort((a, b) => b.streak - a.streak || b.completionRate - a.completionRate);
}

export type GroupGoalProgress = {
  id: string;
  title: string;
  recurrence: Recurrence;
  daysOfWeek: number[];
  members: { member: GroupMember; completed: boolean }[];
};

export async function getGroupGoals(groupId: string): Promise<GroupGoalProgress[]> {
  const groupGoals = await prisma.groupGoal.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    include: {
      memberGoals: {
        where: { archivedAt: null },
        include: {
          user: { select: { id: true, name: true, email: true } },
          completions: true,
        },
      },
    },
  });

  return groupGoals.map((gg) => ({
    id: gg.id,
    title: gg.title,
    recurrence: gg.recurrence,
    daysOfWeek: gg.daysOfWeek,
    members: gg.memberGoals.map((g) => {
      const key = periodKeyFor(g.recurrence);
      return {
        member: g.user,
        completed: g.completions.some((c) => c.periodKey === key && c.completed),
      };
    }),
  }));
}

export type ChallengeSummary = { id: string; title: string; startDate: Date; endDate: Date };

// The currently-running challenge for a group, if any (most recent one
// whose window contains `now`).
export async function getActiveChallenge(
  groupId: string,
  now: Date = new Date()
): Promise<ChallengeSummary | null> {
  return prisma.challenge.findFirst({
    where: { groupId, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { startDate: "desc" },
  });
}

// Ranked by completion rate first (not raw current streak, which reflects
// all-time history, not just this window) — fairer for a time-boxed
// competition. Reuses getLongTermStats scoped to the elapsed portion of
// the challenge so an in-progress challenge doesn't get diluted by future
// (nonexistent) days.
export async function getChallengeLeaderboard(
  challengeId: string,
  now: Date = new Date()
): Promise<LeaderboardEntry[]> {
  const challenge = await prisma.challenge.findUniqueOrThrow({ where: { id: challengeId } });
  const effectiveEnd = now < challenge.endDate ? now : challenge.endDate;
  const days = Math.max(1, differenceInCalendarDays(effectiveEnd, challenge.startDate) + 1);

  const memberships = await prisma.groupMembership.findMany({
    where: { groupId: challenge.groupId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const entries = await Promise.all(
    memberships.map(async (m) => {
      const [streak, longTerm] = await Promise.all([
        getDailyStreak(m.user.id),
        getLongTermStats(m.user.id, effectiveEnd, days),
      ]);
      return {
        member: m.user,
        streak,
        longestStreak: longTerm.longestStreak,
        completionRate: longTerm.completionRate,
      };
    })
  );

  return entries.sort((a, b) => b.completionRate - a.completionRate || b.streak - a.streak);
}

export async function getGroupActivity(
  groupId: string,
  userId: string,
  limit: number = 20
): Promise<ActivityItem[]> {
  const activities = await prisma.activity.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
  });

  return activities.map((a) => {
    const grouped = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const r of a.reactions) {
      const entry = grouped.get(r.emoji) ?? { count: 0, reactedByMe: false };
      entry.count += 1;
      if (r.userId === userId) entry.reactedByMe = true;
      grouped.set(r.emoji, entry);
    }
    return {
      id: a.id,
      type: a.type,
      payload: a.payload,
      createdAt: a.createdAt,
      user: a.user,
      reactions: [...grouped.entries()].map(([emoji, v]) => ({ emoji, ...v })),
    };
  });
}
