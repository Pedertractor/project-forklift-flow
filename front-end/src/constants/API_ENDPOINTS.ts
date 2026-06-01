export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
    PASSWORD: '/auth/password',
  },
  USERS: {
    LIST: '/users',
    ROLES: '/users/roles',
    EMPLOYEE_INFO: '/users/employee-info',
    ROLE: (userId: string) => `/users/${userId}/role`,
    RESET_PASSWORD: (userId: string) => `/users/${userId}/reset-password`,
  },
  SECTORS: {
    LIST: '/sectors',
    BY_ID: (id: string) => `/sectors/${id}`,
  },
  TYPE_MACHINES: {
    LIST: '/type-machines',
    BY_ID: (id: string) => `/type-machines/${id}`,
  },
  MACHINES: {
    LIST: '/machines',
    BY_ID: (id: string) => `/machines/${id}`,
  },
  MOVIMENT_PALLETS: {
    LIST: '/moviment-pallets',
    BY_ID: (id: string) => `/moviment-pallets/${encodeURIComponent(id)}`,
  },
  DELIVERY_TASKS: {
    LIST: '/delivery-tasks',
    PENDING_SUPPLY_REQUESTS: '/delivery-tasks/pending-supply-requests',
    SECTOR_TRANSPORT_OPERATORS: '/delivery-tasks/sector-transport-operators',
    BY_ID: (taskId: string) => `/delivery-tasks/${encodeURIComponent(taskId)}`,
    MARK_PREPARED: (taskId: string) =>
      `/delivery-tasks/${encodeURIComponent(taskId)}/mark-prepared`,
  },
  OPERATOR_MACHINE: {
    MY_MACHINE: '/operator-machine/my-machine',
    MACHINES: '/operator-machine/machines',
    MACHINE_TASKS: '/operator-machine/machine-tasks',
    OPERATOR_SUPPLY_REQUESTS: '/operator-machine/operator-supply-requests',
    PICKUP_ONLY: '/operator-machine/pickup-only',
    SUPPLY_ONLY: '/operator-machine/supply-only',
    PICKUP_WITH_REPLENISHMENT: '/operator-machine/pickup-with-replenishment',
    CANCEL_PICKUP: (pickupTaskId: string) =>
      `/operator-machine/pickup-tasks/${encodeURIComponent(pickupTaskId)}/cancel`,
  },
  OPERATOR_MOVIMENT_PALLET: {
    MOVIMENT_PALLETS: '/operator-moviment-pallet/moviment-pallets',
    MY_MOVIMENT_PALLET: '/operator-moviment-pallet/my-moviment-pallet',
    OPEN_TASKS: '/operator-moviment-pallet/open-tasks',
    REPLENISHMENT_QUEUE: '/operator-moviment-pallet/replenishment-requests',
    ACCEPT_PICKUP: (taskId: string) =>
      `/operator-moviment-pallet/tasks/${encodeURIComponent(taskId)}/accept-pickup`,
    ACCEPT_DELIVER: (taskId: string) =>
      `/operator-moviment-pallet/tasks/${encodeURIComponent(taskId)}/accept-deliver`,
    MY_TASKS: '/operator-moviment-pallet/my-tasks',
    TRIP_SUGGESTIONS: '/operator-moviment-pallet/trip-suggestions',
    ACCEPT_TRIP_SUGGESTION: (tripSuggestionId: string) =>
      `/operator-moviment-pallet/trip-suggestions/${encodeURIComponent(tripSuggestionId)}/accept`,
    COMPLETE_DELIVER: (taskId: string) =>
      `/operator-moviment-pallet/tasks/${encodeURIComponent(taskId)}/complete-deliver`,
    COMPLETE_PICKUP: (taskId: string) =>
      `/operator-moviment-pallet/tasks/${encodeURIComponent(taskId)}/complete-pickup`,
  },
} as const;
