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
  MACHINE_REPLENISHMENT_REQUESTS: {
    LIST: '/machine-replenishment-requests',
    PENDING_PREPARATION: '/machine-replenishment-requests/pending-preparation',
    BY_ID: (requestId: string) =>
      `/machine-replenishment-requests/${encodeURIComponent(requestId)}`,
    MARK_PALLET_READY: (requestId: string) =>
      `/machine-replenishment-requests/${encodeURIComponent(requestId)}/mark-pallet-ready`,
  },
  OPERATOR_MACHINE: {
    MY_MACHINE: '/operator-machine/my-machine',
    MACHINES: '/operator-machine/machines',
    REPLENISHMENT_REQUESTS: '/operator-machine/replenishment-requests',
    OPERATOR_SUPPLY_REQUESTS: '/operator-machine/operator-supply-requests',
    PICKUP_PROGRESS: (requestId: string) =>
      `/operator-machine/replenishment-requests/${encodeURIComponent(requestId)}/pickup-progress`,
    FINALIZE: '/operator-machine/my-machine/finalize',
    PICKUP: (requestId: string) =>
      `/operator-machine/replenishment-requests/${encodeURIComponent(requestId)}/pickup`,
  },
  OPERATOR_MOVIMENT_PALLET: {
    MOVIMENT_PALLETS: '/operator-moviment-pallet/moviment-pallets',
    MY_MOVIMENT_PALLET: '/operator-moviment-pallet/my-moviment-pallet',
    REPLENISHMENT_QUEUE: '/operator-moviment-pallet/replenishment-requests',
    ACCEPT_REPLENISHMENT: (requestId: string) =>
      `/operator-moviment-pallet/replenishment-requests/${encodeURIComponent(requestId)}/accept`,
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
