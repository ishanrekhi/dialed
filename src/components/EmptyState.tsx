export default function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </div>
  );
}
