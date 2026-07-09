"use server";

import { z } from "zod";
import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { periodKeyFor, parseLocalDate } from "./dates";
import { requireUserId } from "./auth";
import type { Recurrence } from "@prisma/client";

async function assertCategoryOwned(categoryId: string, userId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!category) throw new Error("Category not found");
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

export async function toggleCompletion(goalId: string, recurrence: Recurrence) {
  const userId = await requireUserId();

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true },
  });
  if (!goal) return;

  const periodKey = periodKeyFor(recurrence);

  const existing = await prisma.completion.findUnique({
    where: { goalId_periodKey: { goalId, periodKey } },
  });

  if (existing) {
    await prisma.completion.delete({ where: { id: existing.id } });
  } else {
    await prisma.completion.create({ data: { goalId, periodKey, completed: true } });
  }

  revalidatePath("/");
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

// ---------- Partnership ----------

async function hasAcceptedPartnership(userId: string): Promise<boolean> {
  const existing = await prisma.partnership.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { recipientId: userId }],
    },
    select: { id: true },
  });
  return existing !== null;
}

// Returns the invite id for building a shareable link. Idempotent: reuses an
// existing unclaimed invite rather than minting a new one per click.
export async function createInvite(): Promise<string> {
  const userId = await requireUserId();

  if (await hasAcceptedPartnership(userId)) {
    throw new Error("You already have a partner.");
  }

  const existing = await prisma.partnership.findFirst({
    where: { requesterId: userId, status: "PENDING", recipientId: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const invite = await prisma.partnership.create({
    data: { requesterId: userId },
    select: { id: true },
  });
  return invite.id;
}

export async function respondToInvite(partnershipId: string, accept: boolean) {
  const userId = await requireUserId();

  const invite = await prisma.partnership.findUnique({
    where: { id: partnershipId },
    select: { id: true, requesterId: true, recipientId: true, status: true },
  });
  if (!invite || invite.status !== "PENDING" || invite.recipientId !== null) return;
  if (invite.requesterId === userId) return; // can't accept your own invite

  if (accept && (await hasAcceptedPartnership(userId))) return;
  if (accept && (await hasAcceptedPartnership(invite.requesterId))) return;

  await prisma.partnership.update({
    where: { id: partnershipId },
    data: {
      recipientId: userId,
      status: accept ? "ACCEPTED" : "DECLINED",
      respondedAt: new Date(),
    },
  });

  revalidatePath("/");
}

export async function removePartnership(partnershipId: string) {
  const userId = await requireUserId();

  // Either side can end it; also lets a requester revoke an unclaimed invite.
  await prisma.partnership.deleteMany({
    where: {
      id: partnershipId,
      OR: [{ requesterId: userId }, { recipientId: userId }],
    },
  });

  revalidatePath("/");
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
