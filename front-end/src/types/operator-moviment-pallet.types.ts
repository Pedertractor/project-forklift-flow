/** Valores alinhados ao Prisma / API. */

export type TypeMovimentPalletApi = 'FORKLIFT' | 'PALLET_TRUCK';

export type PriorityLevelApi = 'VERY_HIGH' | 'HIGH' | 'NORMAL';

export type RequestStatusApi =
  | 'CREATED'
  | 'IN_PROGRESS'
  | 'ON_MACHINE'
  | 'COMPLETED'
  | 'CANCELLED';

export type ForkliftTaskStatusApi =
  | 'CREATED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type ForkliftTaskTypeApi = 'DELIVER_TO_MACHINE' | 'PICKUP_TO_EXPEDITION';

export interface OperatorRequestUserBrief {
  id: string;
  name: string;
  employeeId: string;
  card: string | null;
  unit: string | null;
  role: string;
}

export interface OperatorRequestDestinationBrief {
  id: string;
  name: string;
  position: string;
  userId: string | null;
  typeMachine: { id: string; name: string };
  sector: { id: string; typeSector: string };
}

export interface OperatorReplenishmentRequestItem {
  id: string;
  movementCube: string;
  typeMovimentPallet: TypeMovimentPalletApi;
  status: RequestStatusApi;
  priorityLevel: PriorityLevelApi;
  requestedById: string;
  createdAt: string;
  updatedAt: string;
  requestedBy: OperatorRequestUserBrief;
  destination: OperatorRequestDestinationBrief;
  _count: { movimentPalletTasks: number };
}

export interface OperatorMovimentPalletBrief {
  id: string;
  code: string;
  type: TypeMovimentPalletApi;
  sectorId: string | null;
  operatorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorPickupTaskQueueItem {
  id: string;
  requestId: string;
  type: ForkliftTaskTypeApi;
  status: ForkliftTaskStatusApi;
  assignedMovimentPalletId: string | null;
  requestedById: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  request: OperatorReplenishmentRequestItem;
  assignedMovimentPallet: OperatorMovimentPalletBrief | null;
}

/** Alias semântico: mesma forma que tarefas em `my-tasks` / fila. */
export type OperatorMovimentTaskItem = OperatorPickupTaskQueueItem;

export interface OperatorReplenishmentQueueResponse {
  requests: OperatorReplenishmentRequestItem[];
  onMachinePickupTasks: OperatorPickupTaskQueueItem[];
}

export interface OperatorMovimentPalletsListResponse {
  movimentPallets: OperatorMovimentPalletBrief[];
}

export interface OperatorMyMovimentPalletResponse {
  movimentPallet: OperatorMovimentPalletBrief | null;
}

export interface OperatorAcceptReplenishmentResponse {
  task: {
    id: string;
    requestId: string;
    type: ForkliftTaskTypeApi;
    status: ForkliftTaskStatusApi;
  };
  request: OperatorReplenishmentRequestItem | null;
}

export interface OperatorAcceptPickupResponse {
  task: OperatorMovimentTaskItem;
}

export interface OperatorMyTasksResponse {
  tasks: OperatorMovimentTaskItem[];
}

export interface TripFlowStepApi {
  step: number;
  taskType: ForkliftTaskTypeApi;
  taskId: string;
  requestId: string;
  movementCube: string;
}

export interface TripSuggestionTripMeta {
  id: string;
  status: string;
  acceptedAt: string | null;
  acceptedByUserId: string | null;
  assignedMovimentPalletId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Par entrega + retirada na mesma máquina (rota combinada). */
export interface TripCombinedSuggestionApi {
  kind: 'COMBINE_DELIVER_AND_PICKUP_AT_MACHINE';
  typeMovimentPallet: TypeMovimentPalletApi;
  effectivePriority: PriorityLevelApi;
  deferRecommended: boolean;
  machine: { id: string; name: string; position: string };
  message: string;
  suggestedOrder: TripFlowStepApi[];
  deliverTask: OperatorPickupTaskQueueItem;
  pickupTask: OperatorPickupTaskQueueItem;
  tripSuggestion: TripSuggestionTripMeta;
}

/** Retirada isolada sugerida pela API de viagens. */
export interface TripStandalonePickupApi {
  kind: 'PICKUP_ONLY_AT_MACHINE';
  typeMovimentPallet: TypeMovimentPalletApi;
  effectivePriority: PriorityLevelApi;
  deferRecommended: boolean;
  machine: { id: string; name: string; position: string };
  message: string;
  suggestedOrder: TripFlowStepApi[];
  pickupTask: OperatorPickupTaskQueueItem;
}

/** Entrega isolada sugerida (recebimento → máquina, sem retirada combinada). */
export interface TripStandaloneDeliverApi {
  kind: 'DELIVER_ONLY_TO_MACHINE';
  typeMovimentPallet: TypeMovimentPalletApi;
  effectivePriority: PriorityLevelApi;
  deferRecommended: boolean;
  machine: { id: string; name: string; position: string };
  message: string;
  suggestedOrder: TripFlowStepApi[];
  requestId: string;
  deliverTask: OperatorPickupTaskQueueItem | null;
}

export interface TripSuggestionsPriorityContext {
  mostUrgentOpenInSector: PriorityLevelApi | null;
  hint?: string;
}

export interface TripSuggestionsResponse {
  suggestions: TripCombinedSuggestionApi[];
  standalonePickupTasks: TripStandalonePickupApi[];
  standaloneDeliverTasks: TripStandaloneDeliverApi[];
  priorityContext: TripSuggestionsPriorityContext;
}

export interface OperatorAcceptTripSuggestionResponse {
  tripSuggestion: TripSuggestionTripMeta;
  deliverTask: OperatorMovimentTaskItem;
  pickupTask: OperatorMovimentTaskItem;
}
