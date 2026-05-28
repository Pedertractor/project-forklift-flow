import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  sm: 'size-14',
  md: 'size-24',
  lg: 'size-36',
} as const;

export type ForkliftLoaderProps = {
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  /** Sem sombra/anel — para encaixar em círculos já existentes (ex.: stepper) */
  bare?: boolean;
};

export function ForkliftLoader({
  size = 'md',
  className,
  bare = false,
}: ForkliftLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={cn(
          'relative aspect-square shrink-0 overflow-hidden rounded-full',
          SIZE_CLASS[size],
          !bare && 'bg-white shadow-md ring-2 ring-brand/20',
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label="Carregando"
      >
        <video
          src="/forklift-loader/forklift-loader.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 size-full object-cover"
          aria-hidden
        />
      </div>
      {/* <p>Carregando...</p> */}
    </div>
  );
}
