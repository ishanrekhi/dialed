import { getHeatmapData } from "@/lib/heatmap";
import { hexToRgba } from "@/lib/color";

const ACCENT = "#00e6c3";
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];
const LEGEND_STEPS = [0, 0.2, 0.5, 0.8, 1];

function levelColor(ratio: number): string {
  if (ratio <= 0) return "var(--border)";
  if (ratio < 0.34) return hexToRgba(ACCENT, 0.3);
  if (ratio < 0.67) return hexToRgba(ACCENT, 0.55);
  if (ratio < 1) return hexToRgba(ACCENT, 0.8);
  return ACCENT;
}

export default async function Heatmap({ userId }: { userId: string }) {
  const { weeksGrid, monthLabels } = await getHeatmapData(userId, 26);
  const monthByWeek = new Map(monthLabels.map((m) => [m.weekIndex, m.label]));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Consistency</h2>
        <p className="mt-1 text-xs text-muted">
          One square per day, last 6 months. Brighter = more of that day&apos;s goals got done.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface p-4">
        <div className="inline-flex flex-col gap-1.5">
          <div className="flex gap-[3px] pl-6">
            {weeksGrid.map((_, wi) => (
              <div key={wi} className="w-[11px] shrink-0 text-[10px] leading-none text-muted">
                {monthByWeek.get(wi) ?? ""}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] pr-1">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="flex h-[11px] w-5 items-center text-[10px] leading-none text-muted"
                >
                  {label}
                </div>
              ))}
            </div>
            {weeksGrid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date} — ${Math.round(day.ratio * 100)}% of goals done`}
                    className="h-[11px] w-[11px] rounded-[3px]"
                    style={{ backgroundColor: levelColor(day.ratio) }}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 pl-6 pt-1 text-[10px] text-muted">
            <span>Less</span>
            {LEGEND_STEPS.map((r) => (
              <div
                key={r}
                className="h-[11px] w-[11px] rounded-[3px]"
                style={{ backgroundColor: levelColor(r) }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </section>
  );
}
