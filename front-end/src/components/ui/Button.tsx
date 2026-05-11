import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'icon-sm';
};

const variantClass: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'border-2 border-transparent bg-[#005fb8] text-white shadow-sm hover:bg-[#004a94] focus-visible:border-[#005fb8] focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/40',
  outline:
    'border-2 border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50',
  ghost:
    'border-2 border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  secondary:
    'border-2 border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
};

const sizeClass: Record<NonNullable<ButtonProps['size']>, string> = {
  default:
    'h-[var(--control-height,2.5rem)] gap-2 px-4 text-sm font-semibold',
  'icon-sm':
    'size-10 rounded-[min(0.75rem,12px)] p-0 text-zinc-600 [&_svg]:size-4',
};

export function Button({
  children,
  variant = 'default',
  size = 'default',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
