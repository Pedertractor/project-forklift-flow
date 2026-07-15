import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const here = dirname(fileURLToPath(import.meta.url))

test('updateUserRole: zera isOperating quando o novo role nao e PALLET_TRANSPORTER', () => {
  const src = readFileSync(join(here, 'user.service.ts'), 'utf8')
  const fnBlock = src.slice(
    src.indexOf('export async function updateUserRole'),
    src.indexOf('export async function updateUserSector'),
  )
  // Sem isso, um usuario promovido/realocado para outro role (ex.: LEADER,
  // SUPPLY_OPERATOR) continuaria "preso" contando na Frota da TV — que so
  // filtra por isOperating, nao por role.
  assert.match(fnBlock, /role === RoleUser\.PALLET_TRANSPORTER/)
  assert.match(fnBlock, /isOperating:\s*null/)
})

test('user.repository: consultas de "operando transporte" filtram por role (defesa em profundidade)', () => {
  const src = readFileSync(join(here, '../repositories/user.repository.ts'), 'utf8')
  const fnBlock = src.slice(
    src.indexOf('findManyOperatingTransportInSector'),
    src.indexOf('findManyForList'),
  )
  // isOperating so vale para PALLET_TRANSPORTER (ADMIN/LEADER nao operam).
  const occurrences = fnBlock.match(/role:\s*\{\s*in:\s*OPERATING_ROLES\s*\}/g) ?? []
  assert.equal(occurrences.length, 2)
})

test('operational-dashboard: KPI da Frota conta so PALLET_TRANSPORTER com isOperating', () => {
  const src = readFileSync(join(here, 'operational-dashboard.service.ts'), 'utf8')
  const start = src.indexOf('export async function getOperationalTvMonitorSnapshot')
  const fnBlock = src.slice(start, src.indexOf('const deliveryWaits =', start))
  const occurrences =
    fnBlock.match(/role:\s*RoleUser\.PALLET_TRANSPORTER/g) ?? []
  assert.equal(occurrences.length, 2)
  assert.equal(fnBlock.includes('RoleUser.ADMIN'), false)
})

test('requirePalletTransporterRole: somente PALLET_TRANSPORTER (sem ADMIN)', () => {
  const src = readFileSync(
    join(here, '../middleware/require-roles.ts'),
    'utf8',
  )
  const fnBlock = src.slice(
    src.indexOf('export function requirePalletTransporterRole'),
    src.indexOf('/** @deprecated Use requirePalletTransporterRole'),
  )
  assert.match(fnBlock, /requireRoles\(RoleUser\.PALLET_TRANSPORTER\)/)
  assert.equal(fnBlock.includes('RoleUser.ADMIN'), false)
})
