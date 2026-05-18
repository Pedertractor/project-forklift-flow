import { useCallback } from 'react';
import { Stage, Layer, Group, Image as KonvaImage, Circle, Text, Rect } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';

const MAX_SCALE = 2;
const SCALE_STEP = 0.1;

/** Metade do tamanho original do marcador (raio 16 → 8). */
const MACHINE_NODE_RADIUS = 8;
const MACHINE_NODE_STROKE = 1;
const MACHINE_NODE_STROKE_SELECTED = 1.5;
const MACHINE_LABEL_FONT_SIZE = 6;
const MACHINE_LABEL_Y = 11;
const MACHINE_LABEL_WIDTH = 60;
const MACHINE_LABEL_X = -MACHINE_LABEL_WIDTH / 2;
const PLACEMENT_MARKER_RADIUS = 9;

import type { PlantMapArea, PlantMapAreaKindValue } from '@/types/plant-map-area.types';
import type { PlantMapVisualKey } from '@/utils/plantMapMachineProcess';
import {
  plantMapAreaFill,
  plantMapAreaStroke,
  PLANT_MAP_AREA_KIND_LABEL,
} from '@/utils/plantMapAreaStyles';
import { plantMapNodeFill } from '@/utils/plantMapNodeColors';
import {
  clampMapNormalized,
  plantPixelsToNormalized,
  stagePointerToPlantPixels,
} from '@/utils/mapPlantPosition';

export interface PlantMapPlacedMachine {
  machineId: string;
  name: string;
  nx: number;
  ny: number;
  visualKey: PlantMapVisualKey;
}

export interface PlantMapAreaDraftRect {
  nx: number;
  ny: number;
  nw: number;
  nh: number;
  kind: PlantMapAreaKindValue;
}

interface PlantMapKonvaStageProps {
  containerWidth: number;
  containerHeight: number;
  plantPixelWidth: number;
  plantPixelHeight: number;
  backgroundImage: HTMLImageElement;
  scale: number;
  minScale: number;
  stagePos: { x: number; y: number };
  placedMachines: PlantMapPlacedMachine[];
  plantAreas: PlantMapArea[];
  areaDraftRect: PlantMapAreaDraftRect | null;
  areaDrawKind: PlantMapAreaKindValue | null;
  onAreaDrawStart?: (nx: number, ny: number) => void;
  onAreaDrawMove?: (nx: number, ny: number) => void;
  onAreaDrawEnd?: (nx: number, ny: number) => void;
  selectedMachineId: string | null;
  canEditMachines: boolean;
  placementMode: boolean;
  placementMarker: { nx: number; ny: number } | null;
  savingMachineId: string | null;
  onSelectMachine: (id: string | null) => void;
  onStagePosChange: (pos: { x: number; y: number }) => void;
  onScaleChange: (scale: number) => void;
  clampStagePos: (pos: { x: number; y: number }, scaleOverride?: number) => { x: number; y: number };
  onPlantMapClick?: (nx: number, ny: number) => void;
  onMachinePositionCommit?: (machineId: string, nx: number, ny: number) => void;
}

function snapGroupToNormalized(
  group: Konva.Group,
  plantPixelWidth: number,
  plantPixelHeight: number,
): { nx: number; ny: number } {
  const { nx, ny } = plantPixelsToNormalized(
    group.x(),
    group.y(),
    plantPixelWidth,
    plantPixelHeight,
  );
  group.position({ x: nx * plantPixelWidth, y: ny * plantPixelHeight });
  return { nx, ny };
}

export function PlantMapKonvaStage({
  containerWidth,
  containerHeight,
  plantPixelWidth,
  plantPixelHeight,
  backgroundImage,
  scale,
  minScale,
  stagePos,
  placedMachines,
  plantAreas,
  areaDraftRect,
  areaDrawKind,
  onAreaDrawStart,
  onAreaDrawMove,
  onAreaDrawEnd,
  selectedMachineId,
  canEditMachines,
  placementMode,
  placementMarker,
  savingMachineId,
  onSelectMachine,
  onStagePosChange,
  onScaleChange,
  clampStagePos,
  onPlantMapClick,
  onMachinePositionCommit,
}: PlantMapKonvaStageProps) {
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) {
        return;
      }
      const pointer = stage.getPointerPosition();
      if (!pointer) {
        return;
      }
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = Math.max(minScale, Math.min(MAX_SCALE, scale + direction * SCALE_STEP));
      const contentX = (pointer.x - stagePos.x) / scale;
      const contentY = (pointer.y - stagePos.y) / scale;
      const newPos = {
        x: pointer.x - contentX * newScale,
        y: pointer.y - contentY * newScale,
      };
      onScaleChange(newScale);
      onStagePosChange(clampStagePos(newPos, newScale));
    },
    [scale, minScale, stagePos, clampStagePos, onScaleChange, onStagePosChange],
  );

  const handlePlacementClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!placementMode || !onPlantMapClick) {
        return;
      }
      const stage = e.target.getStage();
      if (!stage) {
        return;
      }
      const pointer = stage.getPointerPosition();
      if (!pointer) {
        return;
      }
      const plantPx = stagePointerToPlantPixels(pointer, stagePos, scale);
      if (
        plantPx.x < 0 ||
        plantPx.y < 0 ||
        plantPx.x > plantPixelWidth ||
        plantPx.y > plantPixelHeight
      ) {
        return;
      }
      const { nx, ny } = plantPixelsToNormalized(
        plantPx.x,
        plantPx.y,
        plantPixelWidth,
        plantPixelHeight,
      );
      onPlantMapClick(nx, ny);
    },
    [placementMode, onPlantMapClick, stagePos, scale, plantPixelWidth, plantPixelHeight],
  );

  const pointerToNormalized = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      if (!stage) {
        return null;
      }
      const pointer = stage.getPointerPosition();
      if (!pointer) {
        return null;
      }
      const plantPx = stagePointerToPlantPixels(pointer, stagePos, scale);
      if (
        plantPx.x < 0 ||
        plantPx.y < 0 ||
        plantPx.x > plantPixelWidth ||
        plantPx.y > plantPixelHeight
      ) {
        return null;
      }
      return plantPixelsToNormalized(
        plantPx.x,
        plantPx.y,
        plantPixelWidth,
        plantPixelHeight,
      );
    },
    [stagePos, scale, plantPixelWidth, plantPixelHeight],
  );

  const handleAreaDrawDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!areaDrawKind || !onAreaDrawStart) {
        return;
      }
      e.cancelBubble = true;
      const pt = pointerToNormalized(e);
      if (pt) {
        onAreaDrawStart(pt.nx, pt.ny);
      }
    },
    [areaDrawKind, onAreaDrawStart, pointerToNormalized],
  );

  const handleAreaDrawMove = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!areaDrawKind || !onAreaDrawMove) {
        return;
      }
      const pt = pointerToNormalized(e);
      if (pt) {
        onAreaDrawMove(pt.nx, pt.ny);
      }
    },
    [areaDrawKind, onAreaDrawMove, pointerToNormalized],
  );

  const handleAreaDrawUp = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!areaDrawKind || !onAreaDrawEnd) {
        return;
      }
      e.cancelBubble = true;
      const pt = pointerToNormalized(e);
      if (pt) {
        onAreaDrawEnd(pt.nx, pt.ny);
      }
    },
    [areaDrawKind, onAreaDrawEnd, pointerToNormalized],
  );

  return (
    <Stage
      width={containerWidth}
      height={containerHeight}
      scaleX={scale}
      scaleY={scale}
      x={stagePos.x}
      y={stagePos.y}
      draggable={!placementMode && !areaDrawKind}
      dragBoundFunc={(pos) => clampStagePos(pos)}
      onDragEnd={(ev) => {
        const stage = ev.target.getStage();
        if (!stage || ev.target !== stage) {
          return;
        }
        onStagePosChange(clampStagePos({ x: stage.x(), y: stage.y() }));
      }}
      onWheel={handleWheel}
    >
      <Layer>
        <KonvaImage
          image={backgroundImage}
          x={0}
          y={0}
          width={plantPixelWidth}
          height={plantPixelHeight}
        />
        {placementMode ? (
          <Rect
            x={0}
            y={0}
            width={plantPixelWidth}
            height={plantPixelHeight}
            fill="rgba(0, 95, 184, 0.06)"
            onClick={handlePlacementClick}
            onTap={handlePlacementClick}
          />
        ) : null}
      </Layer>
      <Layer listening={!placementMode}>
        {plantAreas.map((area) => {
          const x = area.nx * plantPixelWidth;
          const y = area.ny * plantPixelHeight;
          const w = area.nw * plantPixelWidth;
          const h = area.nh * plantPixelHeight;
          const label = PLANT_MAP_AREA_KIND_LABEL[area.kind];
          return (
            <Group key={area.id} listening={false}>
              <Rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={plantMapAreaFill(area.kind)}
                stroke={plantMapAreaStroke(area.kind)}
                strokeWidth={2}
                cornerRadius={2}
              />
              <Text
                text={label}
                x={x + 4}
                y={y + 4}
                fontSize={11}
                fontStyle="bold"
                fill={plantMapAreaStroke(area.kind)}
                listening={false}
              />
            </Group>
          );
        })}
        {areaDraftRect ? (
          <Rect
            x={areaDraftRect.nx * plantPixelWidth}
            y={areaDraftRect.ny * plantPixelHeight}
            width={areaDraftRect.nw * plantPixelWidth}
            height={areaDraftRect.nh * plantPixelHeight}
            fill={plantMapAreaFill(areaDraftRect.kind)}
            stroke={plantMapAreaStroke(areaDraftRect.kind)}
            strokeWidth={2}
            dash={[6, 4]}
            listening={false}
          />
        ) : null}
        {areaDrawKind ? (
          <Rect
            x={0}
            y={0}
            width={plantPixelWidth}
            height={plantPixelHeight}
            fill="rgba(0,0,0,0.01)"
            onMouseDown={handleAreaDrawDown}
            onMouseMove={handleAreaDrawMove}
            onMouseUp={handleAreaDrawUp}
            onTouchStart={handleAreaDrawDown}
            onTouchMove={handleAreaDrawMove}
            onTouchEnd={handleAreaDrawUp}
          />
        ) : null}
      </Layer>
      <Layer>
        <Group x={0} y={0}>
          {placementMarker ? (
            <Group
              x={placementMarker.nx * plantPixelWidth}
              y={placementMarker.ny * plantPixelHeight}
              listening={false}
            >
              <Circle
                radius={PLACEMENT_MARKER_RADIUS}
                stroke="#005fb8"
                strokeWidth={1}
                dash={[4, 3]}
                fill="rgba(0, 95, 184, 0.15)"
              />
            </Group>
          ) : null}
          {placedMachines.map((m) => {
            const x = m.nx * plantPixelWidth;
            const y = m.ny * plantPixelHeight;
            const selected = m.machineId === selectedMachineId;
            const saving = m.machineId === savingMachineId;
            const fill = plantMapNodeFill(m.visualKey);
            const draggable = canEditMachines && !placementMode;

            return (
              <Group
                key={m.machineId}
                x={x}
                y={y}
                draggable={draggable}
                dragBoundFunc={(pos) => ({
                  x: clampMapNormalized(pos.x / plantPixelWidth) * plantPixelWidth,
                  y: clampMapNormalized(pos.y / plantPixelHeight) * plantPixelHeight,
                })}
                onMouseDown={(e) => {
                  if (draggable) {
                    e.cancelBubble = true;
                  }
                }}
                onTouchStart={(e) => {
                  if (draggable) {
                    e.cancelBubble = true;
                  }
                }}
                onDragEnd={(e) => {
                  e.cancelBubble = true;
                  if (!onMachinePositionCommit) {
                    return;
                  }
                  const group = e.target as Konva.Group;
                  const { nx, ny } = snapGroupToNormalized(
                    group,
                    plantPixelWidth,
                    plantPixelHeight,
                  );
                  onMachinePositionCommit(m.machineId, nx, ny);
                }}
                onDragStart={() => onSelectMachine(m.machineId)}
              >
                <Circle
                  radius={MACHINE_NODE_RADIUS}
                  fill={fill}
                  stroke={selected ? '#0284c7' : saving ? '#f59e0b' : '#ffffff'}
                  strokeWidth={
                    selected || saving ? MACHINE_NODE_STROKE_SELECTED : MACHINE_NODE_STROKE
                  }
                  onClick={() => {
                    if (!placementMode) {
                      onSelectMachine(m.machineId);
                    }
                  }}
                  onTap={() => {
                    if (!placementMode) {
                      onSelectMachine(m.machineId);
                    }
                  }}
                />
                <Text
                  text={m.name.length > 18 ? `${m.name.slice(0, 17)}…` : m.name}
                  y={MACHINE_LABEL_Y}
                  x={MACHINE_LABEL_X}
                  width={MACHINE_LABEL_WIDTH}
                  align="center"
                  fontSize={MACHINE_LABEL_FONT_SIZE}
                  fontStyle="bold"
                  fill="#0f172a"
                  listening={false}
                />
              </Group>
            );
          })}
        </Group>
      </Layer>
    </Stage>
  );
}
