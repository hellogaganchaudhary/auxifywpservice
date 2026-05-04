import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-bg-surface shadow-sm shadow-black/10",
        className
      )}
      {...props}
    />
  );
}
