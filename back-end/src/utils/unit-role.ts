import { RoleUser, Unit } from '../generated/prisma/enums.js'

export function isUnit(value: unknown): value is Unit {
  return value === Unit.PEDERTRACTOR || value === Unit.TRACTOR
}

export function isRole(value: unknown): value is RoleUser {
  return Object.values(RoleUser).includes(value as RoleUser)
}
