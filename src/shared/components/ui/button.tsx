import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/shared/lib/utils'

const buttonBaseClassName = cn(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl text-sm font-extrabold tracking-wide',
  'whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50',
  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
  'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40'
)

const buttonVariants = cva(
  buttonBaseClassName,
  {
    variants: {
      variant: {
        // Chunky "pressable" buttons: a solid bottom edge that collapses on press.
        default:
          'bg-primary text-primary-foreground shadow-edge-primary hover:brightness-105 active:translate-y-1 active:shadow-none',
        sky: 'bg-sky text-sky-foreground shadow-edge-sky hover:brightness-105 active:translate-y-1 active:shadow-none',
        destructive:
          'bg-destructive text-white shadow-edge-destructive hover:brightness-105 active:translate-y-1 active:shadow-none',
        outline:
          'border-2 border-border bg-card text-foreground shadow-edge hover:bg-muted active:translate-y-1 active:shadow-none',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2',
        xs: 'h-7 gap-1 rounded-lg px-2 text-xs',
        sm: 'h-9 gap-1.5 rounded-xl px-4',
        lg: 'h-12 px-8 text-base',
        icon: 'size-10 rounded-xl',
        'icon-xs': 'size-7 rounded-lg',
        'icon-sm': 'size-9 rounded-xl',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

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
