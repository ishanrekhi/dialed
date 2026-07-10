"use client";

import { useTransition } from "react";
import { toggleReaction } from "@/lib/actions";

const REACTION_EMOJI = ["🔥", "👏", "💪"];

export default function ReactionBar({
  activityId,
  reactions,
}: {
  activityId: string;
  reactions: { emoji: string; count: number; reactedByMe: boolean }[];
}) {
  const [isPending, startTransition] = useTransition();
  const byEmoji = new Map(reactions.map((r) => [r.emoji, r]));

  return (
    <div className="flex items-center gap-1">
      {REACTION_EMOJI.map((emoji) => {
        const r = byEmoji.get(emoji);
        return (
          <button
            key={emoji}
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => toggleReaction(activityId, emoji))}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors disabled:opacity-50 ${
              r?.reactedByMe
                ? "border-accent bg-accent-soft"
                : "border-border hover:bg-surface-hover"
            }`}
          >
            <span>{emoji}</span>
            {r && r.count > 0 && <span className="text-muted">{r.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
