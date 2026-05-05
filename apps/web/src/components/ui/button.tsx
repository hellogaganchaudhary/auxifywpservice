import { cn } from "@/lib/utils";

export type ButtonVariant = "solid" | "ghost" | "destructive";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  className,
  variant = "solid",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "solid" && "bg-accent text-white shadow-sm shadow-blue-500/20 hover:bg-accent-hover",
        variant === "ghost" &&
          "border border-border-strong bg-white text-text-primary hover:bg-bg-overlay",
        variant === "destructive" && "bg-error text-white hover:opacity-90",
        className
      )}
      {...props}
    />
  );
}
