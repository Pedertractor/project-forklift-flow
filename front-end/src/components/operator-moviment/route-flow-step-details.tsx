import { formatReplenishmentMovementCubeDisplay } from '@/constants/operator-machine-replenishment';
import { cn } from '@/lib/utils';
import { Box, MapPin, Truck, Warehouse, type LucideIcon } from 'lucide-react';

export type RouteFlowDetailKind =
  | 'location'
  | 'prisma'
  | 'receiving'
  | 'expedition';

const DETAIL_META: Record<
  RouteFlowDetailKind,
  { Icon: LucideIcon; iconClass: string }
> = {
  location: { Icon: MapPin, iconClass: 'text-brand' },
  prisma: { Icon: Box, iconClass: 'text-amber-700' },
  receiving: { Icon: Warehouse, iconClass: 'text-emerald-700' },
  expedition: { Icon: Truck, iconClass: 'text-sky-700' },
};

export interface RouteFlowDetailItem {
  kind: RouteFlowDetailKind;
  text: string;
}

export function machineLocationDetail(name: string): RouteFlowDetailItem {
  return { kind: 'location', text: `${name}` };
}

export function prismaDetail(
  cube: string | undefined | null,
  variant:
    | 'pick-at-receiving'
    | 'deliver-to-machine'
    | 'pick-at-machine'
    | 'carry-to-expedition',
): RouteFlowDetailItem {
  const display = cube
    ? formatReplenishmentMovementCubeDisplay(cube)
    : 'A definir';
  const textByVariant: Record<typeof variant, string> = {
    'pick-at-receiving': `Pegar pallet no Prisma ${display}`,
    'deliver-to-machine': `Pallet para entregar: Prisma ${display}`,
    'pick-at-machine': `Retirar pallet no Prisma ${display}`,
    'carry-to-expedition': `Levar à expedição: Prisma ${display}`,
  };
  return { kind: 'prisma', text: textByVariant[variant] };
}

export function receivingAreaDetail(
  label = 'Área de recebimento',
): RouteFlowDetailItem {
  return { kind: 'receiving', text: label };
}

export function expeditionAreaDetail(
  label = 'Expedição — destino final',
): RouteFlowDetailItem {
  return { kind: 'expedition', text: label };
}

export function RouteFlowStepDetails({
  items,
  size = 'default',
  className,
}: {
  items: RouteFlowDetailItem[];
  size?: 'default' | 'compact';
  className?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  const compact = size === 'compact';

  return (
    <ul
      className={cn(
        'm-0 flex w-full list-none flex-col gap-1 p-0',
        compact ? 'mt-1' : 'mt-1.5',
        className,
      )}
    >
      {items.map((item, index) => {
        const { Icon, iconClass } = DETAIL_META[item.kind];
        return (
          <li
            key={`${item.kind}-${index}`}
            className={cn(
              'flex items-start gap-1.5 rounded-md bg-zinc-50/90 px-1.5 py-1 text-left',
              compact && 'px-1 py-0.5',
            )}
          >
            <Icon
              className={cn(
                'mt-px shrink-0',
                iconClass,
                compact ? 'size-3' : 'size-3.5',
              )}
              aria-hidden
            />
            <span
              className={cn(
                'min-w-0 flex-1 font-medium leading-snug text-zinc-800',
                compact
                  ? 'text-[0.5625rem] sm:text-[0.6rem]'
                  : 'text-[0.6875rem] sm:text-xs',
              )}
            >
              {item.text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
