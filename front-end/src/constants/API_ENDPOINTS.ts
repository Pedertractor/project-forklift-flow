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
} as const;
