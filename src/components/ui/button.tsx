import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "icon";
};

const variants = {
  primary:
    "bg-action text-action-foreground shadow-action hover:brightness-110 active:scale-[0.98]",
  ghost: "text-muted-foreground hover:bg-overlay hover:text-foreground",
  outline:
    "border border-border bg-overlay text-foreground hover:border-primary/50 hover:bg-overlay-strong",
  icon:
    "bg-action text-action-foreground shadow-action hover:brightness-110 active:scale-95",
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}