import type { RouteFlowDetailItem } from '@/components/operator-moviment/route-flow-step-details';

export type MachineDisplayInfo = {
  name: string;
  assetNumber?: string | null;
  pillar?: string | null;
};

export function formatMachineMetaLine(
  machine: Pick<MachineDisplayInfo, 'assetNumber' | 'pillar'>,
): string | null {
  const parts: string[] = [];
  const asset = machine.assetNumber?.trim();
  const pillar = machine.pillar?.trim();
  if (asset) {
    parts.push(`Patrimônio ${asset}`);
  }
  if (pillar) {
    parts.push(`Pilar ${pillar}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function machineLocationDetailItems(
  machine: MachineDisplayInfo,
): RouteFlowDetailItem[] {
  const items: RouteFlowDetailItem[] = [
    { kind: 'location', text: `Localização: ${machine.name}` },
  ];
  const asset = machine.assetNumber?.trim();
  const pillar = machine.pillar?.trim();
  if (asset) {
    items.push({ kind: 'location', text: `Patrimônio: ${asset}` });
  }
  if (pillar) {
    items.push({ kind: 'location', text: `Pilar: ${pillar}` });
  }
  return items;
}

export function formatMachineSelectLabel(
  machine: Pick<MachineDisplayInfo, 'name' | 'assetNumber' | 'pillar'>,
): string {
  const meta = formatMachineMetaLine(machine);
  return meta ? `${machine.name} — ${meta}` : machine.name;
}

export function toMachineDisplayInfo(
  machine:
    | (Partial<MachineDisplayInfo> & { name?: string | null })
    | null
    | undefined,
  fallbackName = '—',
): MachineDisplayInfo {
  return {
    name: machine?.name?.trim() || fallbackName,
    assetNumber: machine?.assetNumber ?? null,
    pillar: machine?.pillar ?? null,
  };
}
