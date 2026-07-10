import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { joinGroup } from "@/lib/actions";
import { MAX_GROUP_SIZE } from "@/lib/group";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center">
        {children}
      </div>
    </div>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;

  const invite = await prisma.groupInvite.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
      group: { select: { name: true, _count: { select: { members: true } } } },
    },
  });

  if (!invite) {
    return (
      <Shell>
        <p className="font-medium">This invite doesn&apos;t exist.</p>
        <p className="mt-2 text-sm text-muted">Ask for a new link.</p>
      </Shell>
    );
  }

  if (invite.usedBy) {
    return (
      <Shell>
        <p className="font-medium">This invite has already been used.</p>
        <a href="/social" className="mt-3 inline-block text-sm text-accent hover:underline">
          Back to Social
        </a>
      </Shell>
    );
  }

  if (invite.createdBy === userId) {
    return (
      <Shell>
        <p className="font-medium">This is your own invite link.</p>
        <p className="mt-2 text-sm text-muted">Send it to someone you want in your group.</p>
        <a href="/social" className="mt-3 inline-block text-sm text-accent hover:underline">
          Back to Social
        </a>
      </Shell>
    );
  }

  const existingMembership = await prisma.groupMembership.findFirst({ where: { userId } });
  if (existingMembership) {
    return (
      <Shell>
        <p className="font-medium">You&apos;re already in a group.</p>
        <p className="mt-2 text-sm text-muted">Leave your current group before joining another.</p>
        <a href="/social" className="mt-3 inline-block text-sm text-accent hover:underline">
          Back to Social
        </a>
      </Shell>
    );
  }

  if (invite.group._count.members >= MAX_GROUP_SIZE) {
    return (
      <Shell>
        <p className="font-medium">This group is full.</p>
        <p className="mt-2 text-sm text-muted">Groups top out at {MAX_GROUP_SIZE} people.</p>
      </Shell>
    );
  }

  const creatorName = invite.creator.name ?? invite.creator.email ?? "Someone";

  const accept = async () => {
    "use server";
    await joinGroup(id);
    redirect("/social");
  };

  return (
    <Shell>
      <span className="relative mx-auto flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
      </span>
      <h1 className="mt-4 text-xl font-bold tracking-tight">
        {creatorName} wants you in {invite.group.name}.
      </h1>
      <p className="mt-2 text-sm text-muted">
        Everyone in the group sees your daily and weekly goal completion — nothing more, and
        you can leave anytime.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <a
          href="/social"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          Not now
        </a>
        <form action={accept}>
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_0_24px_-6px_var(--accent-glow)] hover:opacity-90"
          >
            Join group
          </button>
        </form>
      </div>
    </Shell>
  );
}
