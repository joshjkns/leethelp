import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const button = cva(
  'no-drag inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-[background,color,box-shadow,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg shadow-sm shadow-black/10 hover:brightness-110',
        secondary: 'bg-surface-2 text-fg border border-border hover:border-border-strong hover:bg-elevated',
        ghost: 'text-muted hover:text-fg hover:bg-surface-2',
        outline: 'border border-border text-fg hover:bg-surface-2',
        success: 'bg-easy text-white hover:brightness-110 shadow-sm shadow-black/10'
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-8 px-3 text-[13px]',
        lg: 'h-10 px-4 text-sm',
        icon: 'size-7 [&_svg]:size-4',
        iconSm: 'size-6 rounded-md [&_svg]:size-3.5'
      }
    },
    defaultVariants: { variant: 'secondary', size: 'md' }
  }
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'
