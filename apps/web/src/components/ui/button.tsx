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
        "inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
        variant === "solid" && "bg-accent text-black hover:bg-accent-hover",
        variant === "ghost" &&
          "border border-border-strong text-text-primary hover:bg-bg-overlay",
        variant === "destructive" && "bg-error text-white hover:opacity-90",
        className
      )}
      {...props}
    />
  );
}
