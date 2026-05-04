import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "success" | "warning" | "error";
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
        tone === "default" && "bg-bg-overlay text-text-secondary",
        tone === "success" && "bg-accent-muted text-accent",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "error" && "bg-error/10 text-error",
        className
      )}
      {...props}
    />
  );
}
