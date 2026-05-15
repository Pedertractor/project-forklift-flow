export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
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
  OPERATOR_MOVIMENT_PALLET: {
    MOVIMENT_PALLETS: '/operator-moviment-pallet/moviment-pallets',
    MY_MOVIMENT_PALLET: '/operator-moviment-pallet/my-moviment-pallet',
    REPLENISHMENT_QUEUE: '/operator-moviment-pallet/replenishment-requests',
    ACCEPT_REPLENISHMENT: (requestId: string) =>
      `/operator-moviment-pallet/replenishment-requests/${encodeURIComponent(requestId)}/accept`,
    ACCEPT_PICKUP: (taskId: string) =>
      `/operator-moviment-pallet/tasks/${encodeURIComponent(taskId)}/accept-pickup`,
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
