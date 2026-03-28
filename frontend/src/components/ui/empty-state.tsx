import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed border-gray-200 bg-white px-8 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-light">
        <Icon className="h-7 w-7 text-text-secondary" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-text-secondary">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
