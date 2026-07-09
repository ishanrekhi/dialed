import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { respondToInvite } from "@/lib/actions";

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

  const invite = await prisma.partnership.findUnique({
    where: { id },
    include: { requester: { select: { name: true, email: true } } },
  });

  if (!invite || invite.status === "DECLINED") {
    return (
      <Shell>
        <p className="font-medium">This invite doesn&apos;t exist or was declined.</p>
        <p className="mt-2 text-sm text-muted">Ask your partner to send a new link.</p>
      </Shell>
    );
  }

  if (invite.status === "ACCEPTED") {
    return (
      <Shell>
        <p className="font-medium">This invite has already been used.</p>
        <a href="/" className="mt-3 inline-block text-sm text-accent hover:underline">
          Back to your board
        </a>
      </Shell>
    );
  }

  if (invite.requesterId === userId) {
    return (
      <Shell>
        <p className="font-medium">This is your own invite link.</p>
        <p className="mt-2 text-sm text-muted">
          Send it to the person you want as your accountability partner.
        </p>
        <a href="/" className="mt-3 inline-block text-sm text-accent hover:underline">
          Back to your board
        </a>
      </Shell>
    );
  }

  const requesterName = invite.requester.name ?? invite.requester.email ?? "Someone";

  const accept = async () => {
    "use server";
    await respondToInvite(id, true);
    redirect("/");
  };

  const decline = async () => {
    "use server";
    await respondToInvite(id, false);
    redirect("/");
  };

  return (
    <Shell>
      <span className="relative mx-auto flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
      </span>
      <h1 className="mt-4 text-xl font-bold tracking-tight">
        {requesterName} wants you as their accountability partner.
      </h1>
      <p className="mt-2 text-sm text-muted">
        You&apos;ll each see whether the other completed their daily and weekly goals —
        nothing more, and either of you can end it anytime.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <form action={decline}>
          <button
            type="submit"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Decline
          </button>
        </form>
        <form action={accept}>
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_0_24px_-6px_var(--accent-glow)] hover:opacity-90"
          >
            Accept
          </button>
        </form>
      </div>
    </Shell>
  );
}
