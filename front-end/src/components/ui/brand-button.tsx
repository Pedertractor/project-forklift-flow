import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary';
export type ButtonSize = 'default' | 'icon-sm' | 'sm' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClass: Record<ButtonVariant, string> = {
  default:
    'border-2 border-transparent bg-brand text-white shadow-sm hover:bg-brand-hover focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/40',
  outline: 'border-2 border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50',
  ghost:
    'font-normal text-zinc-600 hover:bg-accent hover:text-accent-foreground',
  secondary:
    'border-2 border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
};

const sizeClass: Record<ButtonSize, string> = {
  default: 'h-[var(--control-height,2.5rem)] gap-2 px-4 text-sm font-semibold',
  'icon-sm':
    'size-10 rounded-[min(0.75rem,12px)] p-0 text-zinc-600 [&_svg]:size-4',
  sm: 'h-8 gap-1.5 rounded-md px-3 text-xs font-medium has-[>svg]:px-2.5 [&_svg:not([class*="size-"])]:size-4',
  icon: 'size-9 rounded-md p-0 font-normal [&_svg:not([class*="size-"])]:size-4',
};

const buttonBaseClass =
  'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0';

export function buttonVariants({
  variant = 'default',
  className,
}: {
  variant?: ButtonVariant;
  className?: string;
} = {}) {
  return cn(
    buttonBaseClass,
    variant === 'default' ? 'rounded-xl font-semibold' : 'rounded-md font-medium',
    variantClass[variant],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      variant = 'default',
      size = 'default',
      className = '',
      type = 'button',
      ...props
    },
    ref,
  ) {
    const roundedClass =
      size === 'sm' || size === 'icon' ? 'rounded-md' : 'rounded-xl';

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          buttonBaseClass,
          roundedClass,
          variantClass[variant],
          sizeClass[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
