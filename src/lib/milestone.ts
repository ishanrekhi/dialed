import { prisma } from "./prisma";

// One milestone per user. First load after sign-up gets a sane default
// instead of a crash — the user edits it via the "Edit countdown" modal.
export async function getMilestone(userId: string) {
  const milestone = await prisma.milestone.findUnique({ where: { userId } });
  if (milestone) return milestone;

  return prisma.milestone.create({
    data: {
      userId,
      label: "days until your goal",
      targetDate: new Date(new Date().setDate(new Date().getDate() + 90)),
      windowDays: 90,
    },
  });
}
