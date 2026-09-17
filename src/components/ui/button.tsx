import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-action text-action-foreground shadow-action hover:brightness-110",
        primary: "bg-action text-action-foreground shadow-action hover:brightness-110",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
        outline: "border border-border bg-overlay text-foreground hover:bg-overlay-strong",
        secondary: "bg-secondary text-secondary-foreground hover:brightness-110",
        ghost: "text-muted-foreground hover:bg-overlay hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        icon: "bg-action text-action-foreground shadow-action hover:brightness-110",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-9 rounded-lg px-3 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };