import { ModalActions, SimpleModal } from '@/components/crud/SimpleModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SectorListItem, TypeMachine } from '@/types/machine.types';
import type { PlantMapUnit } from '@/constants/plant-map';
import { PLANT_MAP_UNIT_SHORT_LABEL } from '@/constants/plant-map';
import { formatMapPlacement } from '@/utils/mapPlantPosition';

const selectClass =
  'flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005fb8]';

interface PlantMapCreateMachineModalProps {
  open: boolean;
  busy: boolean;
  error: string | null;
  draftNx: number;
  draftNy: number;
  name: string;
  onNameChange: (value: string) => void;
  typeMachineId: string;
  onTypeMachineIdChange: (value: string) => void;
  sectorId: string;
  onSectorIdChange: (value: string) => void;
  types: TypeMachine[] | undefined;
  sectors: SectorListItem[];
  plantUnit: PlantMapUnit;
  onClose: () => void;
  onSubmit: () => void;
}

export function PlantMapCreateMachineModal({
  open,
  busy,
  error,
  draftNx,
  draftNy,
  name,
  onNameChange,
  typeMachineId,
  onTypeMachineIdChange,
  sectorId,
  onSectorIdChange,
  types,
  sectors,
  plantUnit,
  onClose,
  onSubmit,
}: PlantMapCreateMachineModalProps) {
  const positionPreview = formatMapPlacement(draftNx, draftNy);

  return (
    <SimpleModal
      open={open}
      title="Nova máquina no mapa"
      description="A posição no desenho já foi definida pelo clique no mapa. Preencha os dados e salve."
      onClose={() => (!busy ? onClose() : undefined)}
      footer={
        <ModalActions
          onCancel={() => !busy && onClose()}
          submitLabel={busy ? 'Salvando…' : 'Cadastrar máquina'}
          disabled={busy}
          onSubmit={onSubmit}
        />
      }
    >
      {error ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <div className="space-y-4">
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
          <span className="font-medium">Unidade:</span> {PLANT_MAP_UNIT_SHORT_LABEL[plantUnit]}
          <span className="mx-2 text-sky-300" aria-hidden>
            ·
          </span>
          <span className="font-medium">Posição no mapa:</span>{' '}
          <span className="font-mono">{positionPreview}</span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="plant-map-m-name">Nome</Label>
          <Input
            id="plant-map-m-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ex.: Máquina linha A-01"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plant-map-m-type">Tipo de máquina</Label>
          <select
            id="plant-map-m-type"
            className={selectClass}
            value={typeMachineId}
            onChange={(e) => onTypeMachineIdChange(e.target.value)}
          >
            <option value="">Selecione…</option>
            {types?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="plant-map-m-sector">Setor</Label>
          <select
            id="plant-map-m-sector"
            className={selectClass}
            value={sectorId}
            onChange={(e) => onSectorIdChange(e.target.value)}
          >
            <option value="">Selecione…</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.typeSector}
                {typeof s.sectorIdAPI === 'number' ? ` (#${s.sectorIdAPI})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </SimpleModal>
  );
}
