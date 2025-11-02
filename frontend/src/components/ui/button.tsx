import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden isolate shadow-neumorphic hover:shadow-neumorphic-lg hover:-translate-y-1 active:shadow-neumorphic-sm active:translate-y-0",
  {
    variants: {
      variant: {
        default: "text-primary-foreground bg-gradient-to-br from-primary to-primary-dark hover:from-primary-light hover:to-primary",
        destructive:
          "text-destructive-foreground bg-gradient-to-br from-destructive to-red-600 hover:from-red-500 hover:to-red-600",
        outline:
          "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent shadow-neumorphic-sm backdrop-blur-sm",
        secondary:
          "text-secondary-foreground bg-gradient-to-br from-secondary to-muted hover:from-muted hover:to-secondary shadow-neumorphic-sm",
        ghost: "hover:bg-accent/20 hover:text-accent-foreground shadow-transparent hover:shadow-neumorphic-sm",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-light shadow-transparent",
        neumorphic: "text-foreground bg-gradient-to-br from-white to-secondary dark:from-card dark:to-secondary hover:from-white hover:to-muted dark:hover:from-card dark:hover:to-muted border border-border/50 backdrop-blur-sm",
        accent: "text-accent-foreground bg-gradient-to-br from-accent to-cyan-600 hover:from-accent-light hover:to-cyan-600",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-14 px-8 py-4 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }