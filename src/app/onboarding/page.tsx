import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import OnboardingWizard from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const userId = await requireUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardedAt: true },
  });
  if (user?.onboardedAt) redirect("/");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <OnboardingWizard />
    </div>
  );
}
