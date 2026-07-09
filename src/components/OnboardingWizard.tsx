"use client";

import { useState, useTransition } from "react";
import { completeOnboarding, skipOnboarding } from "@/lib/actions";
import DayOfWeekPicker from "./DayOfWeekPicker";

type FocusArea = "FITNESS" | "ACADEMIC" | "SOCIAL" | "OTHER";
type Frequency = "DAILY" | "WEEKLY";
type Schedule = { recurrence: Frequency; daysOfWeek: number[] };
type GoalChip = { id: string; title: string };
type StepId =
  | "landing"
  | "focus"
  | "fitness"
  | "academic"
  | "social"
  | "growth"
  | "milestone"
  | "review";

const AREA_META: Record<FocusArea, { name: string; color: string; emoji: string }> = {
  FITNESS: { name: "Fitness", color: "#fb5d3e", emoji: "🏋️" },
  ACADEMIC: { name: "Academic", color: "#a78bfa", emoji: "📚" },
  SOCIAL: { name: "Social", color: "#f472b6", emoji: "👥" },
  OTHER: { name: "Personal Growth", color: "#94b3ac", emoji: "✨" },
};

const FITNESS_CHIPS: GoalChip[] = [
  { id: "strength", title: "Strength training" },
  { id: "cardio", title: "Cardio session" },
  { id: "mobility", title: "Stretching & mobility" },
  { id: "nutrition", title: "Track nutrition" },
];
const ACADEMIC_EXTRA_CHIPS: GoalChip[] = [
  { id: "review", title: "Weekly review session" },
  { id: "practice", title: "Practice problems" },
  { id: "reading", title: "Reading assignments" },
];
const SOCIAL_CHIPS: GoalChip[] = [
  { id: "friend", title: "Call or text a friend" },
  { id: "meetup", title: "Meet up in person" },
  { id: "family", title: "Connect with family" },
];
const GROWTH_CHIPS: GoalChip[] = [
  { id: "read", title: "Read" },
  { id: "journal", title: "Journal" },
  { id: "meditate", title: "Meditate" },
  { id: "learn", title: "Learn something new" },
];

function ScheduleField({
  value,
  onChange,
}: {
  value: Schedule;
  onChange: (s: Schedule) => void;
}) {
  const mode: "EVERY_DAY" | "CERTAIN_DAYS" | "ONCE_A_WEEK" =
    value.recurrence === "WEEKLY"
      ? "ONCE_A_WEEK"
      : value.daysOfWeek.length === 0
        ? "EVERY_DAY"
        : "CERTAIN_DAYS";

  function setMode(next: typeof mode) {
    if (next === "EVERY_DAY") onChange({ recurrence: "DAILY", daysOfWeek: [] });
    else if (next === "ONCE_A_WEEK") onChange({ recurrence: "WEEKLY", daysOfWeek: [] });
    else onChange({ recurrence: "DAILY", daysOfWeek: value.daysOfWeek.length ? value.daysOfWeek : [0, 2, 4] });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {(["EVERY_DAY", "CERTAIN_DAYS", "ONCE_A_WEEK"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl border-2 px-2 py-2.5 text-xs font-medium transition-colors ${
              mode === m
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            {m === "EVERY_DAY" ? "Every day" : m === "CERTAIN_DAYS" ? "Certain days" : "Once a week"}
          </button>
        ))}
      </div>
      {mode === "CERTAIN_DAYS" && (
        <DayOfWeekPicker
          value={value.daysOfWeek}
          onChange={(days) => onChange({ recurrence: "DAILY", daysOfWeek: days })}
        />
      )}
    </div>
  );
}

function ChipMultiSelect({
  options,
  selected,
  onToggle,
}: {
  options: GoalChip[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={`rounded-full border-2 px-3.5 py-2 text-sm font-medium transition-colors ${
              isSelected
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            {opt.title}
          </button>
        );
      })}
    </div>
  );
}

function toggleInSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function WizardShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{eyebrow}</p>
      )}
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-6 space-y-4">{children}</div>
      <div className="mt-8 flex items-center justify-between">{footer}</div>
    </div>
  );
}

export default function OnboardingWizard() {
  const [step, setStep] = useState<StepId>("landing");
  const [focusAreas, setFocusAreas] = useState<Set<FocusArea>>(new Set());
  const [isPending, startTransition] = useTransition();

  const [fitnessSchedule, setFitnessSchedule] = useState<Schedule>({
    recurrence: "DAILY",
    daysOfWeek: [],
  });
  const [fitnessChips, setFitnessChips] = useState<Set<string>>(new Set(["strength"]));

  const [academicSubject, setAcademicSubject] = useState("");
  const [academicSchedule, setAcademicSchedule] = useState<Schedule>({
    recurrence: "DAILY",
    daysOfWeek: [],
  });
  const [academicChips, setAcademicChips] = useState<Set<string>>(new Set());

  const [socialSchedule, setSocialSchedule] = useState<Schedule>({
    recurrence: "WEEKLY",
    daysOfWeek: [],
  });
  const [socialChips, setSocialChips] = useState<Set<string>>(new Set(["friend"]));

  const [growthSchedule, setGrowthSchedule] = useState<Schedule>({
    recurrence: "DAILY",
    daysOfWeek: [],
  });
  const [growthChips, setGrowthChips] = useState<Set<string>>(new Set(["read"]));

  const [milestoneLabel, setMilestoneLabel] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");

  function toggleArea(area: FocusArea) {
    setFocusAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  }

  const stepOrder: StepId[] = [
    "focus",
    ...(focusAreas.has("FITNESS") ? (["fitness"] as StepId[]) : []),
    ...(focusAreas.has("ACADEMIC") ? (["academic"] as StepId[]) : []),
    ...(focusAreas.has("SOCIAL") ? (["social"] as StepId[]) : []),
    ...(focusAreas.has("OTHER") ? (["growth"] as StepId[]) : []),
    "milestone",
    "review",
  ];

  function goNext() {
    if (step === "landing") return setStep("focus");
    const i = stepOrder.indexOf(step);
    setStep(stepOrder[Math.min(i + 1, stepOrder.length - 1)]);
  }

  function goBack() {
    if (step === "focus") return setStep("landing");
    const i = stepOrder.indexOf(step);
    if (i > 0) setStep(stepOrder[i - 1]);
  }

  function scheduleGoal(schedule: Schedule, title: string) {
    return {
      title,
      recurrence: schedule.recurrence,
      daysOfWeek: schedule.recurrence === "DAILY" ? schedule.daysOfWeek : [],
    };
  }

  function chipGoals(chips: Set<string>, catalog: GoalChip[], schedule: Schedule) {
    return catalog.filter((c) => chips.has(c.id)).map((c) => scheduleGoal(schedule, c.title));
  }

  function buildPayload() {
    const categories: {
      name: string;
      color: string;
      goals: { title: string; recurrence: Frequency; daysOfWeek: number[] }[];
    }[] = [];

    if (focusAreas.has("FITNESS")) {
      const goals = chipGoals(fitnessChips, FITNESS_CHIPS, fitnessSchedule);
      if (goals.length > 0) {
        categories.push({ name: AREA_META.FITNESS.name, color: AREA_META.FITNESS.color, goals });
      }
    }

    if (focusAreas.has("ACADEMIC")) {
      const subject = academicSubject.trim() || "your studies";
      const core = scheduleGoal(academicSchedule, `Study ${subject}`);
      const extra = chipGoals(academicChips, ACADEMIC_EXTRA_CHIPS, academicSchedule);
      categories.push({
        name: AREA_META.ACADEMIC.name,
        color: AREA_META.ACADEMIC.color,
        goals: [core, ...extra],
      });
    }

    if (focusAreas.has("SOCIAL")) {
      const goals = chipGoals(socialChips, SOCIAL_CHIPS, socialSchedule);
      if (goals.length > 0) {
        categories.push({ name: AREA_META.SOCIAL.name, color: AREA_META.SOCIAL.color, goals });
      }
    }

    if (focusAreas.has("OTHER")) {
      const goals = chipGoals(growthChips, GROWTH_CHIPS, growthSchedule);
      if (goals.length > 0) {
        categories.push({ name: AREA_META.OTHER.name, color: AREA_META.OTHER.color, goals });
      }
    }

    const milestone =
      milestoneLabel.trim() && milestoneDate
        ? { label: milestoneLabel.trim(), targetDate: milestoneDate }
        : null;

    return { categories, milestone };
  }

  function finish() {
    startTransition(async () => {
      await completeOnboarding(buildPayload());
    });
  }

  function startFromScratch() {
    startTransition(async () => {
      await skipOnboarding();
    });
  }

  const NextButton = () => (
    <button
      type="button"
      onClick={goNext}
      className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_0_24px_-6px_var(--accent-glow)] transition-opacity hover:opacity-90"
    >
      Continue
    </button>
  );
  const BackButton = () => (
    <button type="button" onClick={goBack} className="text-sm text-muted hover:text-foreground">
      Back
    </button>
  );

  if (step === "landing") {
    return (
      <WizardShell
        title="Let's set up your board."
        subtitle="Answer a few quick questions and we'll build a starter goal list, or start with a totally blank board."
        footer={<div />}
      >
        <button
          type="button"
          onClick={goNext}
          className="flex w-full flex-col items-start gap-1 rounded-xl border-2 border-accent bg-accent-soft px-5 py-4 text-left transition-opacity hover:opacity-90"
        >
          <span className="font-semibold text-accent">Quick start</span>
          <span className="text-sm text-muted">
            Pick your focus areas and we&apos;ll generate goals for you.
          </span>
        </button>
        <button
          type="button"
          onClick={startFromScratch}
          disabled={isPending}
          className="flex w-full flex-col items-start gap-1 rounded-xl border-2 border-border px-5 py-4 text-left transition-colors hover:bg-surface-hover disabled:opacity-50"
        >
          <span className="font-semibold">Start from scratch</span>
          <span className="text-sm text-muted">
            Skip straight to an empty board and build it yourself.
          </span>
        </button>
      </WizardShell>
    );
  }

  if (step === "focus") {
    return (
      <WizardShell
        eyebrow="Step 1"
        title="What do you want to focus on?"
        subtitle="Pick as many as you want — each gets a couple of quick tap-to-add questions next."
        footer={
          <>
            <BackButton />
            <button
              type="button"
              onClick={goNext}
              disabled={focusAreas.size === 0}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_0_24px_-6px_var(--accent-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Continue
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(AREA_META) as FocusArea[]).map((area) => {
            const meta = AREA_META[area];
            const selected = focusAreas.has(area);
            return (
              <button
                key={area}
                type="button"
                onClick={() => toggleArea(area)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 transition-colors ${
                  selected ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-hover"
                }`}
              >
                <span className="text-2xl">{meta.emoji}</span>
                <span className={`text-sm font-medium ${selected ? "text-accent" : ""}`}>
                  {meta.name}
                </span>
              </button>
            );
          })}
        </div>
      </WizardShell>
    );
  }

  if (step === "fitness") {
    return (
      <WizardShell
        eyebrow="Fitness"
        title="How often, and what kind?"
        subtitle="Tap the ones you want — we've pre-picked a common starting point."
        footer={
          <>
            <BackButton />
            <NextButton />
          </>
        }
      >
        <ScheduleField value={fitnessSchedule} onChange={setFitnessSchedule} />
        <ChipMultiSelect
          options={FITNESS_CHIPS}
          selected={fitnessChips}
          onToggle={(id) => setFitnessChips((s) => toggleInSet(s, id))}
        />
      </WizardShell>
    );
  }

  if (step === "academic") {
    return (
      <WizardShell
        eyebrow="Academic"
        title="What are you studying?"
        subtitle="Optional — leave blank and we'll keep it general."
        footer={
          <>
            <BackButton />
            <NextButton />
          </>
        }
      >
        <input
          value={academicSubject}
          onChange={(e) => setAcademicSubject(e.target.value)}
          placeholder="e.g. Spanish, Finance, MCAT"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <p className="text-xs text-muted">How often?</p>
        <ScheduleField value={academicSchedule} onChange={setAcademicSchedule} />
        <p className="text-xs text-muted">Anything else?</p>
        <ChipMultiSelect
          options={ACADEMIC_EXTRA_CHIPS}
          selected={academicChips}
          onToggle={(id) => setAcademicChips((s) => toggleInSet(s, id))}
        />
      </WizardShell>
    );
  }

  if (step === "social") {
    return (
      <WizardShell
        eyebrow="Social"
        title="Staying connected?"
        subtitle="Tap the ones you want."
        footer={
          <>
            <BackButton />
            <NextButton />
          </>
        }
      >
        <ScheduleField value={socialSchedule} onChange={setSocialSchedule} />
        <ChipMultiSelect
          options={SOCIAL_CHIPS}
          selected={socialChips}
          onToggle={(id) => setSocialChips((s) => toggleInSet(s, id))}
        />
      </WizardShell>
    );
  }

  if (step === "growth") {
    return (
      <WizardShell
        eyebrow="Personal growth"
        title="Time for you?"
        subtitle="Tap the ones you want."
        footer={
          <>
            <BackButton />
            <NextButton />
          </>
        }
      >
        <ScheduleField value={growthSchedule} onChange={setGrowthSchedule} />
        <ChipMultiSelect
          options={GROWTH_CHIPS}
          selected={growthChips}
          onToggle={(id) => setGrowthChips((s) => toggleInSet(s, id))}
        />
      </WizardShell>
    );
  }

  if (step === "milestone") {
    return (
      <WizardShell
        eyebrow="Optional"
        title="Working toward a deadline?"
        subtitle="Powers the countdown ring on your dashboard. Skip it and add one later if you'd rather."
        footer={
          <>
            <BackButton />
            <NextButton />
          </>
        }
      >
        <input
          value={milestoneLabel}
          onChange={(e) => setMilestoneLabel(e.target.value)}
          placeholder="e.g. days until finals"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <input
          type="date"
          value={milestoneDate}
          onChange={(e) => setMilestoneDate(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent [color-scheme:dark]"
        />
      </WizardShell>
    );
  }

  // review
  const payload = buildPayload();
  const totalGoals = payload.categories.reduce((n, c) => n + c.goals.length, 0);

  function scheduleLabel(g: { recurrence: Frequency; daysOfWeek: number[] }) {
    if (g.recurrence === "WEEKLY") return "once a week";
    if (g.daysOfWeek.length === 0) return "daily";
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return g.daysOfWeek.map((d) => labels[d]).join("/");
  }

  return (
    <WizardShell
      eyebrow="Last step"
      title="Here's your starting board."
      subtitle={
        totalGoals > 0
          ? "You can rename, recolor, or delete any of this later."
          : "No goals selected yet — go back to add some, or just create an empty board."
      }
      footer={
        <>
          <BackButton />
          <button
            type="button"
            onClick={finish}
            disabled={isPending}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_0_24px_-6px_var(--accent-glow)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create my board"}
          </button>
        </>
      }
    >
      {payload.categories.map((c) => (
        <div key={c.name} className="rounded-xl border border-border p-3">
          <p className="text-sm font-semibold" style={{ color: c.color }}>
            {c.name}
          </p>
          <ul className="mt-1 space-y-0.5">
            {c.goals.map((g) => (
              <li key={g.title} className="text-sm text-muted">
                {g.title} · {scheduleLabel(g)}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {payload.milestone && (
        <div className="rounded-xl border border-accent/40 bg-accent-soft p-3">
          <p className="text-sm font-medium text-accent">
            Countdown: {payload.milestone.label}
          </p>
          <p className="text-xs text-muted">Target date: {payload.milestone.targetDate}</p>
        </div>
      )}
    </WizardShell>
  );
}
