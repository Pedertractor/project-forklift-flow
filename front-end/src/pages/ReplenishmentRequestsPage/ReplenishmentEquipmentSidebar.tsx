import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PanelRightOpen, X } from 'lucide-react';
import {
  ReplenishmentEquipmentPanel,
  type ReplenishmentEquipmentPanelProps,
} from './ReplenishmentEquipmentPanel';

export type ReplenishmentEquipmentSidebarProps =
  ReplenishmentEquipmentPanelProps & {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };

export function ReplenishmentEquipmentSidebar({
  open,
  onOpenChange,
  ...panelProps
}: ReplenishmentEquipmentSidebarProps) {
  const queueTotal =
    panelProps.forkliftStats.queuePending +
    panelProps.palletTruckStats.queuePending;
  const readyForQueueTotal =
    panelProps.forkliftStats.readyForQueue +
    panelProps.palletTruckStats.readyForQueue;
  const withoutTasksTotal =
    panelProps.forkliftStats.withoutActiveTasks +
    panelProps.palletTruckStats.withoutActiveTasks;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[45] bg-zinc-900/35 backdrop-blur-[1px]"
          aria-label="Fechar painel de equipamentos"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <aside
        id="replenishment-equipment-sidebar"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-[min(100vw,36rem)] flex-col border-l border-zinc-200 bg-zinc-50 shadow-2xl transition-[transform] duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none',
        )}
        aria-hidden={!open}
        aria-label="Meios de locomoção do setor"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-4">
          <div className="min-w-0">
            <h2 className="m-0 text-base font-semibold text-zinc-900">
              Meios de locomoção
            </h2>
            <p className="mt-1 m-0 text-xs leading-snug text-zinc-600">
              Operadores em operação no setor — sem tarefa ativa podem acatar
              reposição na fila.
            </p>
            {!panelProps.isLoading && !panelProps.isError ? (
              <p className="mt-2 m-0 text-[0.6875rem] font-medium text-zinc-700">
                <span className="text-sky-700">
                  {readyForQueueTotal} livre
                  {readyForQueueTotal === 1 ? '' : 's'} p/ fila agora
                </span>
                <span className="text-zinc-400"> · </span>
                <span className="text-emerald-700">
                  {withoutTasksTotal} sem tarefa ativa
                </span>
                {queueTotal > 0 ? (
                  <>
                    <span className="text-zinc-400"> · </span>
                    <span className="text-brand">
                      {queueTotal} pedido{queueTotal === 1 ? '' : 's'} na fila
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100"
            aria-label="Fechar painel"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <ReplenishmentEquipmentPanel {...panelProps} embedded />
        </div>
      </aside>
    </>
  );
}
