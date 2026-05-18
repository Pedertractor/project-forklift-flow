/** Estados de supervisão no mapa (legenda e cor do ponto). */
export const PLANT_MAP_VISUAL_KEYS = [
  'IDLE_NO_OPERATOR',
  'IDLE_WITH_OPERATOR',
  'AWAITING_PICKUP',
  'AWAITING_DELIVERY',
  'IN_PRODUCTION',
] as const;

export type PlantMapVisualKey = (typeof PLANT_MAP_VISUAL_KEYS)[number];

export const PLANT_MAP_STATE_LABEL: Record<PlantMapVisualKey, string> = {
  IDLE_NO_OPERATOR: 'Sem pedido (sem operador)',
  IDLE_WITH_OPERATOR: 'Sem pedido (com operador)',
  AWAITING_PICKUP: 'Aguardando retirada',
  AWAITING_DELIVERY: 'Aguardando entrega',
  IN_PRODUCTION: 'Em produção',
};

const FILL_BY_KEY: Record<PlantMapVisualKey, string> = {
  IDLE_NO_OPERATOR: '#a1a1aa',
  IDLE_WITH_OPERATOR: '#64748b',
  AWAITING_PICKUP: '#d97706',
  AWAITING_DELIVERY: '#2563eb',
  IN_PRODUCTION: '#16a34a',
};

/** Legenda na ordem exibida na tela do mapa. */
export const PLANT_MAP_LEGEND_ITEMS: {
  key: PlantMapVisualKey;
  label: string;
  color: string;
}[] = PLANT_MAP_VISUAL_KEYS.map((key) => ({
  key,
  label: PLANT_MAP_STATE_LABEL[key],
  color: FILL_BY_KEY[key],
}));

export function plantMapNodeFill(visualKey: PlantMapVisualKey): string {
  return FILL_BY_KEY[visualKey];
}
