import { cn } from '@/lib/utils';

const VIDEO_SRC = '/forklift-loader/forklift-loader.mp4';

export type ForkliftCircleLoaderProps = {
  className?: string;
};

/** Vídeo da empilhadeira centralizado dentro de um círculo (ex.: passo ativo do stepper). */
export function ForkliftCircleLoader({ className }: ForkliftCircleLoaderProps) {
  return (
    <span
      className={cn(
        'relative flex size-full items-center justify-center overflow-hidden rounded-full',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Carregando"
    >
      <video
        src={VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
        className="max-h-[82%] max-w-[82%] object-contain object-center"
        aria-hidden
      />
    </span>
  );
}
