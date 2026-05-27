import { ForkliftLoader } from '@/components/forklift-loader/forklifit-loader';

type OperatorMovimentTaskEntryOverlayProps = {
  message?: string;
};

export function OperatorMovimentTaskEntryOverlay({
  message = 'Preparando tarefa…',
}: OperatorMovimentTaskEntryOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/92 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-28 w-28 shrink-0">
        <ForkliftLoader />
      </div>
      <p className="mt-4 text-sm font-medium text-zinc-700">{message}</p>
    </div>
  );
}
