import { cn } from "@/lib/utils";

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full border border-border transition",
        checked ? "bg-accent" : "bg-bg-elevated"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 translate-x-1 rounded-full bg-white transition",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}
