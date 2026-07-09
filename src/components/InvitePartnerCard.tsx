"use client";

import { useState, useTransition } from "react";
import { createInvite, removePartnership } from "@/lib/actions";

export default function InvitePartnerCard({
  pendingInviteId,
}: {
  pendingInviteId: string | null;
}) {
  const [inviteId, setInviteId] = useState<string | null>(pendingInviteId);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const inviteUrl =
    inviteId && typeof window !== "undefined"
      ? `${window.location.origin}/invite/${inviteId}`
      : null;

  function generate() {
    startTransition(async () => {
      const id = await createInvite();
      setInviteId(id);
    });
  }

  async function copy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function revoke() {
    if (!inviteId) return;
    startTransition(async () => {
      await removePartnership(inviteId);
      setInviteId(null);
    });
  }

  return (
    <div className="rounded-2xl border border-dashed border-border p-5">
      {inviteId ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Invite link ready</p>
          <p className="text-xs text-muted">
            Send this to the person keeping you accountable. It pairs whoever opens
            it and signs in.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted">
              {inviteUrl ?? "…"}
            </code>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:opacity-90"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            onClick={revoke}
            disabled={isPending}
            className="text-xs text-muted hover:text-danger"
          >
            Revoke invite
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="text-sm font-medium">Accountability hits harder with a witness.</p>
          <p className="max-w-xs text-xs text-muted">
            Pair with one person — you'll each see whether the other showed up today.
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={isPending}
            className="mt-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            {isPending ? "Generating…" : "Invite a partner"}
          </button>
        </div>
      )}
    </div>
  );
}
