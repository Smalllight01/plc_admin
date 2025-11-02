import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden isolate",
  {
    variants: {
      variant: {
        default: "text-primary-foreground bg-gradient-to-br from-primary to-primary-dark hover:from-primary-light hover:to-primary shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:shadow-md active:translate-y-0",
        destructive:
          "text-destructive-foreground bg-gradient-to-br from-destructive to-red-600 hover:from-red-500 hover:to-red-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        outline:
          "border-2 border-white/20 glass-surface-light hover:bg-white/10 hover:text-white hover:border-white/30 shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        secondary:
          "text-secondary-foreground bg-gradient-to-br from-secondary to-muted hover:from-muted hover:to-secondary shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        ghost: "hover:bg-white/10 hover:text-white shadow-transparent hover:shadow-lg hover:-translate-y-0.5",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-light shadow-transparent",
        neumorphic: "text-foreground bg-gradient-to-br from-white to-secondary dark:from-card dark:to-secondary hover:from-white hover:to-muted dark:hover:from-card dark:hover:to-muted border border-border/50 backdrop-blur-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        accent: "text-accent-foreground bg-gradient-to-br from-accent to-cyan-600 hover:from-accent-light hover:to-cyan-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        // Novara风格的玻璃拟态变体
        glass: "text-white glass-btn hover:bg-white/20 hover:shadow-xl hover:-translate-y-0.5",
        "glass-primary": "text-accent-foreground glass-btn-primary hover:shadow-xl hover:-translate-y-0.5",
        "glass-secondary": "text-white/90 glass-btn-secondary hover:shadow-xl hover:-translate-y-0.5",
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