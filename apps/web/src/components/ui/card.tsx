import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-bg-surface shadow-sm shadow-slate-900/5",
        className
      )}
      {...props}
    />
  );
}
