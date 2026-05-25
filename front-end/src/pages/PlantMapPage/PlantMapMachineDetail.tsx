import type { MachineListItem } from '@/types/machine.types';
import type { ReplenishmentRequestListItem } from '@/types/replenishment-request.types';
import type { PlantMapVisualKey } from '@/utils/plantMapNodeColors';
import { plantMapNodeFill } from '@/utils/plantMapNodeColors';
import { priorityLevelLabel } from '@/utils/replenishment-labels';
import { cn } from '@/lib/utils';

export interface PlantMapMachineDetailData {
  machine: MachineListItem;
  processLabel: string;
  sinceLabel: string;
  typeImageSrc: string;
  openRequest: ReplenishmentRequestListItem | null;
  hasMapPlacement: boolean;
  visualKey: PlantMapVisualKey;
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

interface PlantMapMachineDetailProps {
  detail: PlantMapMachineDetailData;
  className?: string;
  /** Oculta o rótulo "Detalhe" (ex.: cabeçalho do sheet já mostra o nome). */
  hideTitle?: boolean;
}

export function PlantMapMachineDetail({
  detail,
  className,
  hideTitle = false,
}: PlantMapMachineDetailProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {!hideTitle ? (
        <>
          <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Detalhe
          </h3>
          <p className="m-0 text-base font-semibold text-zinc-900">
            {detail.machine.name}
          </p>
        </>
      ) : null}
      <div className="flex gap-3">
        <img
          src={detail.typeImageSrc}
          alt=""
          className="size-16 shrink-0 rounded-lg border border-zinc-200 bg-white object-contain p-1 sm:size-20"
        />
        <dl className="min-w-0 flex-1 space-y-2.5 text-xs">
          <div>
            <dt className="text-zinc-500">Setor</dt>
            <dd className="font-medium text-zinc-900">
              {detail.machine.sector.typeSector}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Tipo</dt>
            <dd className="font-medium text-zinc-900">
              {detail.machine.typeMachine.name}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Processo</dt>
            <dd className="flex items-center gap-1.5 font-medium text-zinc-900">
              <span
                className="inline-block size-2.5 shrink-0 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: plantMapNodeFill(detail.visualKey) }}
                aria-hidden
              />
              {detail.processLabel}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Tempo no estado</dt>
            <dd className="font-medium text-zinc-900">{detail.sinceLabel}</dd>
          </div>
        </dl>
      </div>
      {detail.openRequest ? (
        <div className="border-t border-zinc-100 pt-3">
          <h4 className="m-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Pedido em aberto
          </h4>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-50 px-2 py-1.5">
              <dt className="text-zinc-500">ID</dt>
              <dd className="font-mono font-medium text-zinc-900">
                {shortId(detail.openRequest.id)}
              </dd>
            </div>
            <div className="rounded-md bg-slate-50 px-2 py-1.5">
              <dt className="text-zinc-500">Cubo</dt>
              <dd className="font-medium text-zinc-900">
                {detail.openRequest.movementCube}
              </dd>
            </div>
            <div className="rounded-md bg-slate-50 px-2 py-1.5">
              <dt className="text-zinc-500">Prioridade</dt>
              <dd className="font-medium text-zinc-900">
                {priorityLevelLabel(detail.openRequest.priorityLevel)}
              </dd>
            </div>
            <div className="rounded-md bg-slate-50 px-2 py-1.5">
              <dt className="text-zinc-500">Solicitante</dt>
              <dd
                className="truncate font-medium text-zinc-900"
                title={detail.openRequest.requestedBy.name}
              >
                {detail.openRequest.requestedBy.name}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
