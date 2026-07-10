import { requireUserId } from "@/lib/auth";
import GroupView from "@/components/social/GroupView";

export default async function SocialPage() {
  const userId = await requireUserId();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Social</h1>
      <p className="mt-1 text-sm text-muted">
        Lock in with the people keeping you accountable.
      </p>

      <div className="mt-8">
        <GroupView userId={userId} />
      </div>
    </div>
  );
}
