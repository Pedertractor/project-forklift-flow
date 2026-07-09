import { cn } from '@/lib/utils';
import { formatMachineMetaLine } from '@/utils/machine-display';

export function MachineMetaText({
  assetNumber,
  pillar,
  className,
}: {
  assetNumber?: string | null;
  pillar?: string | null;
  className?: string;
}) {
  const line = formatMachineMetaLine({ assetNumber, pillar });
  if (!line) {
    return null;
  }
  return <p className={cn('m-0 text-xs text-zinc-500', className)}>{line}</p>;
}
