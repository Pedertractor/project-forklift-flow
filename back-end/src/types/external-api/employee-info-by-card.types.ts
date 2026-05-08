export type EmployeeVerifyUnit = 'PEDERTRACTOR' | 'TRACTOR' | 'POSTO'

export interface SectorResponse {
  id: string
  name: string
  costCenter: string
  normalizedName: string
  operationId: number
  leaderDayId: number
  leaderNightId: number
  supervisorDayId: number
  supervisorNightId: number
  managerId: number
  createdAt: string
  updatedAt: string
}

export interface EmployeePosition {
  id: number
  value: string
  name: string
  normalizedName: string
  createdAt: string
  updatedAt: string
}

export interface EmployeeDesignation {
  id: number
  startDate: string
  endDate: string
  leader: string
  sector: SectorResponse
  position: EmployeePosition
  createdAt: string
  updatedAt: string
}

export interface EmployeeInfoByCardResponse {
  id: number
  name: string
  cardNumber: string
  unit: EmployeeVerifyUnit
  firstEntry: string
  secondEntry: string
  firstExit: string
  secondExit: string
  status: boolean
  Designation: EmployeeDesignation[]
  createdAt: string
  updatedAt: string
}
