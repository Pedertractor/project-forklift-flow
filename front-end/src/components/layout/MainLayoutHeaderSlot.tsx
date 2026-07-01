import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const APP_HEADER_ACTIONS_ID = 'app-header-actions';

export function MainLayoutHeaderSlot({ children }: { children: ReactNode }) {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMount(document.getElementById(APP_HEADER_ACTIONS_ID));
  }, []);

  if (!mount) {
    return null;
  }

  return createPortal(children, mount);
}
