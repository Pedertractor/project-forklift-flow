import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const syncServicePath = join(
  dirname(fileURLToPath(import.meta.url)),
  'trip-suggestion-sync.service.ts',
)

const flowPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../front-end/src/pages/OperatorMachinePage/operator-machine-flow.ts',
)

test('trip sync: pareia retirada vinculada a abastecimento anterior do mesmo operador', () => {
  const src = readFileSync(syncServicePath, 'utf8')
  assert.match(src, /isPickupLinkedToReplenishmentFlow/)
  assert.match(src, /findPickupForTripPairOnMachine/)
  assert.match(src, /findFirstOpenByMachineId/)
  assert.match(
    src,
    /findLatestFulfilledWithOpenDeliveryForMachineAndOperator/,
  )
})

test('trip sync: nao depende apenas de triggersReplenishment para formar par', () => {
  const src = readFileSync(syncServicePath, 'utf8')
  const fnBlock = src.slice(
    src.indexOf('export async function findPickupForTripPairOnMachine'),
    src.indexOf('export async function expireOpenTripSuggestionsUnpreparedForSector'),
  )
  assert.match(fnBlock, /findFirstOpenWithReplenishmentForMachine/)
  assert.match(fnBlock, /isPickupLinkedToReplenishmentFlow/)
})

test('frontend: detecta retirada vinculada quando abastecimento foi solicitado antes', () => {
  const src = readFileSync(flowPath, 'utf8')
  assert.match(src, /export function isPickupLinkedToReplenishmentFlow/)
  assert.match(src, /openSupply\?\.requestedById === pickup\.requestedById/)
})

test('frontend: lista unifica abastecimento e retirada vinculados', () => {
  const displayPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../front-end/src/pages/OperatorMachinePage/operator-machine-display.ts',
  )
  const src = readFileSync(displayPath, 'utf8')
  assert.match(src, /linkedToReplenishmentFlow/)
  assert.match(src, /hasPickupLinkedToReplenishmentFlow/)
})
