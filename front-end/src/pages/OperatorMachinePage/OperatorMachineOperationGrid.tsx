import { HorizontalActivityStepper } from '@/components/activity/HorizontalActivityStepper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import type { OperatorPickupProgressPhase } from '@/types/operator-machine.types';
import type { ReplenishmentRequestListItem } from '@/types/replenishment-request.types';
import {
  PICKUP_FLOW_STEPS,
  SUPPLY_FLOW_STEPS,
  deriveSupplyFlowPhase,
  pickupFlowHeadline,
  pickupFlowProgressPct,
  pickupFlowStepStatuses,
  shouldShowPickupFlow,
  shouldShowReplenishmentPanel,
  shouldShowSupplyFlow,
  shouldShowSupplyPanel,
  supplyFlowHeadline,
  supplyFlowProgressPct,
  supplyFlowStepStatuses,
} from './operator-machine-flow';
import { InboxIcon } from 'lucide-react';

function statusToneClass(tone: 'neutral' | 'active' | 'success' | 'warning') {
  switch (tone) {
    case 'active':
      return 'border-[#005fb8]/30 bg-[#005fb8]/[0.06] text-[#005fb8]';
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-600';
  }
}

export interface OperatorMachineOperationGridProps {
  replenishmentRequests: ReplenishmentRequestListItem[];
  supplyLoading: boolean;
  supplyError: Error | null;
  openSupply: OperatorMachineSupplyRequestListItem | null;
  supplyFlowReplenishment: ReplenishmentRequestListItem | null;
  replenishmentLoading: boolean;
  replenishmentError: Error | null;
  pickupPanelReplenishment: ReplenishmentRequestListItem | null;
  pickupProgressLoading: boolean;
  pickupPhase: OperatorPickupProgressPhase | null;
  pickupTransportLabel: string;
  canRequestPallet: boolean;
  finalizePending: boolean;
  pickupMutationPending: boolean;
  busy: boolean;
  apiReady: boolean;
  onSolicitarPallet: () => void;
  onSolicitarRetirada: () => void;
}

export function OperatorMachineOperationGrid({
  replenishmentRequests,
  supplyLoading,
  supplyError,
  openSupply,
  supplyFlowReplenishment,
  replenishmentLoading,
  replenishmentError,
  pickupPanelReplenishment,
  pickupProgressLoading,
  pickupPhase,
  pickupTransportLabel,
  canRequestPallet,
  finalizePending,
  pickupMutationPending,
  busy,
  apiReady,
  onSolicitarPallet,
  onSolicitarRetirada,
}: OperatorMachineOperationGridProps) {
  const supplyPhase = deriveSupplyFlowPhase(
    openSupply,
    supplyFlowReplenishment,
  );
  const showSupplyFlow = shouldShowSupplyFlow(
    openSupply,
    supplyFlowReplenishment,
  );
  const showPickupFlow = shouldShowPickupFlow(pickupPanelReplenishment);
  const showReplenishmentPanel = shouldShowReplenishmentPanel(
    pickupPanelReplenishment,
    pickupPhase,
  );
  const showSupplyPanel = shouldShowSupplyPanel(
    replenishmentRequests,
    openSupply,
    pickupPanelReplenishment,
    pickupPhase,
  );
  const phase = pickupPhase ?? 'OTHER';

  if (!showSupplyPanel && !showReplenishmentPanel) {
    return null;
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        showSupplyPanel && showReplenishmentPanel && 'lg:grid-cols-2',
      )}
    >
      {showSupplyPanel ? (
      <Card className="flex flex-col border border-zinc-200 p-0 shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h3 className="m-0 text-sm font-semibold tracking-tight text-zinc-900">
            Solicitação ao abastecimento
          </h3>
          <p className="mt-1 mb-0 text-xs leading-relaxed text-zinc-500">
            Fluxo após você avisar que precisa de pallet.
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {supplyLoading ? (
            <p className="m-0 text-sm text-zinc-500">Carregando…</p>
          ) : supplyError ? (
            <p className="m-0 text-sm text-red-700">
              {supplyError.message || 'Erro ao carregar.'}
            </p>
          ) : showSupplyFlow ? (
            <HorizontalActivityStepper
              steps={[...SUPPLY_FLOW_STEPS]}
              statuses={supplyFlowStepStatuses(supplyPhase)}
              headline={supplyFlowHeadline(supplyPhase)}
              progressPct={supplyFlowProgressPct(supplyPhase)}
            />
          ) : (
            <div className="flex flex-col items-center py-4 text-center">
              <p
                className={cn(
                  'm-0 inline-flex items-center gap-2 rounded-2xl  px-5 py-3 text-base font-semibold',
                  statusToneClass('neutral'),
                )}
              >
                <InboxIcon className="size-4 text-blue-500" />
                Nenhuma solicitação em andamento
              </p>
              <p className="mt-3 mb-0 max-w-xs text-xs leading-relaxed text-zinc-500">
                Quando não houver pallet na máquina, solicite o abastecimento.
              </p>
            </div>
          )}

          {!showSupplyFlow ? (
            <Button
              type="button"
              className="w-full"
              disabled={
                !apiReady || !canRequestPallet || finalizePending || busy
              }
              onClick={onSolicitarPallet}
            >
              {finalizePending
                ? 'Enviando…'
                : 'Solicitar pallet (abastecimento)'}
            </Button>
          ) : null}
        </div>
      </Card>
      ) : null}

      {showReplenishmentPanel ? (
        <Card className="flex flex-col border border-zinc-200 p-0 shadow-sm">
          <div className="border-b border-zinc-100 px-4 py-3">
            <h3 className="m-0 text-sm font-semibold tracking-tight text-zinc-900">
              Pedido de reposição
            </h3>
            <p className="mt-1 mb-0 text-xs leading-relaxed text-zinc-500">
              Prisma do setor e fluxo após solicitar retirada na máquina.
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-4 p-4">
            {replenishmentLoading ? (
              <p className="m-0 text-sm text-zinc-500">Carregando…</p>
            ) : replenishmentError ? (
              <p className="m-0 text-sm text-red-700">
                {replenishmentError.message || 'Erro ao carregar.'}
              </p>
            ) : pickupPanelReplenishment ? (
              <>
                {showPickupFlow ? (
                  pickupProgressLoading && !pickupPhase ? (
                    <p className="m-0 text-sm text-zinc-500">
                      Carregando andamento…
                    </p>
                  ) : (
                    <HorizontalActivityStepper
                      steps={[...PICKUP_FLOW_STEPS]}
                      statuses={pickupFlowStepStatuses(phase)}
                      headline={pickupFlowHeadline(phase, pickupTransportLabel)}
                      progressPct={pickupFlowProgressPct(phase)}
                    />
                  )
                ) : (
                  <p className="m-0 text-center text-sm text-zinc-500">
                    O andamento da retirada aparece aqui quando o pallet estiver
                    na máquina.
                  </p>
                )}
              </>
            ) : null}

            {pickupPanelReplenishment?.status === 'ON_MACHINE' &&
            (pickupPhase === null ||
              pickupPhase === 'AT_MACHINE_AWAITING_PICKUP') ? (
              <Button
                type="button"
                className="w-full"
                disabled={pickupMutationPending || busy}
                onClick={onSolicitarRetirada}
              >
                {pickupMutationPending ? 'Enviando…' : 'Solicitar retirada'}
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
