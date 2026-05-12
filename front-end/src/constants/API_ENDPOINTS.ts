export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
  },
  SECTORS: {
    LIST: '/sectors',
  },
  TYPE_MACHINES: {
    LIST: '/type-machines',
    BY_ID: (id: string) => `/type-machines/${id}`,
  },
  MACHINES: {
    LIST: '/machines',
    BY_ID: (id: string) => `/machines/${id}`,
  },
} as const;
