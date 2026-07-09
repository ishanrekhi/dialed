import { prisma } from "./prisma";

export type PartnerInfo = {
  partnershipId: string;
  partner: { id: string; name: string | null; email: string | null };
};

// The accepted partnership this user belongs to (either side), if any.
export async function getPartner(userId: string): Promise<PartnerInfo | null> {
  const partnership = await prisma.partnership.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { recipientId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
  });
  if (!partnership || !partnership.recipient) return null;

  const partner =
    partnership.requesterId === userId ? partnership.recipient : partnership.requester;
  return { partnershipId: partnership.id, partner };
}

// An unclaimed invite link this user has already generated, if any.
export async function getPendingInvite(userId: string): Promise<string | null> {
  const invite = await prisma.partnership.findFirst({
    where: { requesterId: userId, status: "PENDING", recipientId: null },
    select: { id: true },
  });
  return invite?.id ?? null;
}
