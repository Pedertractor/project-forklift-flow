import { createPortal } from 'react-dom';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { APP_MAIN_PANE_ID } from '@/components/layout/main-content-portal';

function OverlayContent() {
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[100] flex items-center justify-center bg-white/90 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <AccordionLoader />
    </div>
  );
}

export function MainPaneLoaderOverlay() {
  const pane =
    typeof document !== 'undefined'
      ? document.getElementById(APP_MAIN_PANE_ID)
      : null;

  if (pane) {
    return createPortal(<OverlayContent />, pane);
  }

  return <OverlayContent />;
}
