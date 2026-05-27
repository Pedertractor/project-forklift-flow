import { Button } from '@/components/ui/Button';
import type {
  PlantMapArea,
  PlantMapAreaKindValue,
} from '@/types/plant-map-area.types';
import { PLANT_MAP_AREA_KIND_LABEL } from '@/utils/plantMapAreaStyles';

interface PlantMapAreasToolbarProps {
  canEdit: boolean;
  areaEditMode: boolean;
  areaDrawKind: PlantMapAreaKindValue | null;
  areas: PlantMapArea[];
  areaSaveBusy: boolean;
  onOpenEdit: () => void;
  onCloseEdit: () => void;
  onStartDraw: (kind: PlantMapAreaKindValue) => void;
  onCancelDraw: () => void;
  onRemove: (kind: PlantMapAreaKindValue) => void;
}

export function PlantMapAreasToolbar({
  canEdit,
  areaEditMode,
  areaDrawKind,
  areas,
  areaSaveBusy,
  onOpenEdit,
  onCloseEdit,
  onStartDraw,
  onCancelDraw,
  onRemove,
}: PlantMapAreasToolbarProps) {
  if (!canEdit) {
    return null;
  }

  const receiving = areas.find((a) => a.kind === 'RECEIVING');
  const expedition = areas.find((a) => a.kind === 'EXPEDITION');

  if (!areaEditMode) {
    return (
      <Button type="button" variant="secondary" onClick={onOpenEdit}>
        Áreas expedição / recebimento
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-sky-50 px-2 py-1.5">
      {areaDrawKind ? (
        <>
          <span className="text-xs font-medium text-sky-950">
            Arraste no mapa para marcar{' '}
            {PLANT_MAP_AREA_KIND_LABEL[areaDrawKind].toLowerCase()}
          </span>
          <Button
            type="button"
            variant="outline"
            size="default"
            className="h-8 text-xs"
            onClick={onCancelDraw}
          >
            Cancelar desenho
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="default"
            className="h-8 border-amber-300 text-xs text-amber-950 hover:bg-amber-50"
            disabled={areaSaveBusy}
            onClick={() => onStartDraw('RECEIVING')}
          >
            {receiving ? 'Redesenhar recebimento' : 'Desenhar recebimento'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="default"
            className="h-8 border-indigo-300 text-xs text-indigo-950 hover:bg-indigo-50"
            disabled={areaSaveBusy}
            onClick={() => onStartDraw('EXPEDITION')}
          >
            {expedition ? 'Redesenhar expedição' : 'Desenhar expedição'}
          </Button>
          {receiving ? (
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="h-8 text-xs text-red-700 hover:bg-red-50"
              disabled={areaSaveBusy}
              onClick={() => onRemove('RECEIVING')}
            >
              Remover recebimento
            </Button>
          ) : null}
          {expedition ? (
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="h-8 text-xs text-red-700 hover:bg-red-50"
              disabled={areaSaveBusy}
              onClick={() => onRemove('EXPEDITION')}
            >
              Remover expedição
            </Button>
          ) : null}
          <Button
            type="button"
            variant="default"
            size="default"
            className="h-8 text-xs"
            onClick={onCloseEdit}
          >
            Concluir
          </Button>
        </>
      )}
    </div>
  );
}
