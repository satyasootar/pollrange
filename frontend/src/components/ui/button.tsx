import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border-2 border-foreground bg-clip-padding text-sm font-bold uppercase tracking-tighter transition-all outline-none select-none active:translate-x-0.5 active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
        outline:
          "border-foreground bg-background hover:bg-muted hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
        ghost:
          "border-transparent hover:bg-muted hover:border-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6",
        xs: "h-8 px-3 text-xs",
        sm: "h-9 px-4",
        lg: "h-14 px-10 text-lg font-black",
        icon: "size-11",
        "icon-xs": "size-8",
        "icon-sm": "size-9",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
