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
    BY_ID: (id: string) => `/moviment-pallets/${id}`,
  },
  MACHINE_REPLENISHMENT_REQUESTS: {
    LIST: '/machine-replenishment-requests',
    PENDING_PREPARATION: '/machine-replenishment-requests/pending-preparation',
    BY_ID: (id: string) => `/machine-replenishment-requests/${id}`,
    MARK_PALLET_READY: (id: string) =>
      `/machine-replenishment-requests/${id}/mark-pallet-ready`,
  },
  OPERATOR_MACHINE: {
    MACHINES: '/operator-machine/machines',
    MY_MACHINE: '/operator-machine/my-machine',
    REPLENISHMENT_REQUESTS: '/operator-machine/replenishment-requests',
    FINALIZE: '/operator-machine/my-machine/finalize',
    PICKUP: (requestId: string) =>
      `/operator-machine/replenishment-requests/${requestId}/pickup`,
  },
} as const;
