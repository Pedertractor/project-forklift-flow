import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PlantMapMachineDetail, type PlantMapMachineDetailData } from './PlantMapMachineDetail';
import { plantMapNodeFill } from '@/utils/plantMapNodeColors';
import { cn } from '@/lib/utils';

interface PlantMapMobileDetailSheetProps {
  detail: PlantMapMachineDetailData | null;
  onClose: () => void;
}

export function PlantMapMobileDetailSheet({ detail, onClose }: PlantMapMobileDetailSheetProps) {
  const open = detail !== null;

  useEffect(() => {
    if (!open) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!detail) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plant-map-mobile-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/45 backdrop-blur-[1px]"
        aria-label="Fechar detalhe"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative flex max-h-[min(82dvh,36rem)] w-full flex-col overflow-hidden',
          'rounded-t-2xl border border-b-0 border-zinc-200 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)]',
          'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        )}
      >
        <div className="flex shrink-0 justify-center pt-2 pb-1" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-zinc-300" />
        </div>
        <div className="flex shrink-0 items-start gap-3 border-b border-zinc-100 px-4 pb-3">
          <span
            className="mt-1 inline-block size-3 shrink-0 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: plantMapNodeFill(detail.visualKey) }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {detail.processLabel}
            </p>
            <h2
              id="plant-map-mobile-detail-title"
              className="m-0 truncate text-lg font-bold text-zinc-900"
            >
              {detail.machine.name}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-600">Há {detail.sinceLabel} neste estado</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="default"
            className="size-9 shrink-0 p-0"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="size-5" aria-hidden />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          <PlantMapMachineDetail detail={detail} hideTitle />
        </div>
        <div className="shrink-0 border-t border-zinc-100 px-4 py-3">
          <Button type="button" variant="outline" className="w-full gap-2" onClick={onClose}>
            <ChevronDown className="size-4" aria-hidden />
            Voltar à lista
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
