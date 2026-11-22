import * as React from 'react'

import { cn } from '@/shared/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        `h-12 w-full min-w-0 rounded-xl border-2 border-input bg-muted px-4 py-1 text-base font-semibold
        transition-colors outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex
        file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground
        placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed
        disabled:opacity-50 dark:bg-input/30`,
        'focus-visible:border-sky focus-visible:bg-card',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className
      )}
      {...props}
    />
  )
}

export { Input }
