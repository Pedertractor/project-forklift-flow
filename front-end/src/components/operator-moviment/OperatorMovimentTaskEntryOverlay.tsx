import { APP_MAIN_PANE_ID } from '@/components/layout/main-content-portal';
import { createPortal } from 'react-dom';
import { ForkliftCircleLoader } from '../forklift-loader/forklift-circle-loader';
 
type OperatorMovimentTaskEntryOverlayProps = {
  message?: string;
};

function OverlayContent({ message }: { message: string }) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <ForkliftCircleLoader />
      <p className="mt-4 text-sm font-medium text-zinc-700">{message}</p>
    </div>
  );
}

export function OperatorMovimentTaskEntryOverlay({
  message = 'Preparando tarefa…',
}: OperatorMovimentTaskEntryOverlayProps) {
  const pane =
    typeof document !== 'undefined'
      ? document.getElementById(APP_MAIN_PANE_ID)
      : null;

  if (pane) {
    return createPortal(<OverlayContent message={message} />, pane);
  }

  return <OverlayContent message={message} />;
}
