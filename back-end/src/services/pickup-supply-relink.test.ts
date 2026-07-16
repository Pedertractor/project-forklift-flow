import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const here = dirname(fileURLToPath(import.meta.url))

test('supply eligibility: aviso com retirada cancelada/concluida ainda pode ser reivindicado', () => {
  const src = readFileSync(
    join(here, '../repositories/operator-machine-supply-request.repository.ts'),
    'utf8',
  )
  assert.match(src, /unclaimedLinkedPickupWhere/)
  assert.match(src, /MachineTaskStatus\.CANCELED/)
  assert.match(src, /MachineTaskStatus\.COMPLETED/)
})

test('pickup-supply-link: limpa vinculo terminal antes de amarrar retirada nova', () => {
  const src = readFileSync(join(here, 'pickup-supply-link.service.ts'), 'utf8')
  assert.match(src, /clearTerminalPickupLinksForSupply/)
  assert.match(src, /linkedSupplyRequestId:\s*null/)
})

test('pickup-supply-link: fallback amarra pela entrega no recebimento (pallet pronto)', () => {
  const src = readFileSync(join(here, 'pickup-supply-link.service.ts'), 'utf8')
  assert.match(src, /resolveSupplyForNewPickupLink/)
  assert.match(src, /findOpenPreparedForMachine/)
  assert.match(src, /findEligibleUnclaimedByDeliveryTaskId/)
  assert.match(src, /ensureFulfilledForOrphanDelivery/)
})

test('pickup-supply-link: mid-flight amarra retirada a entrega ja aceita (ASSIGNED/IN_PROGRESS)', () => {
  const src = readFileSync(join(here, 'pickup-supply-link.service.ts'), 'utf8')
  const resolveBlock = src.slice(
    src.indexOf('async function resolveSupplyForNewPickupLink'),
    src.indexOf('export async function linkNewPickupToEligibleSupplyRequest'),
  )
  assert.match(resolveBlock, /findOpenAssignedForMachine/)
  assert.match(resolveBlock, /MachineTaskStatus\.ASSIGNED/)
  assert.match(resolveBlock, /MachineTaskStatus\.IN_PROGRESS/)

  const linkBlock = src.slice(
    src.indexOf('export async function linkNewPickupToEligibleSupplyRequest'),
    src.indexOf('export async function linkNewSupplyRequestToEligiblePickup'),
  )
  assert.match(linkBlock, /joined_active_delivery/)
  assert.match(linkBlock, /upsertAcceptedPair/)
  assert.match(linkBlock, /operatedWith/)
})

test('pickup-supply-link: retirada nova apos entrega criada sincroniza sugestao de viagem', () => {
  const src = readFileSync(join(here, 'pickup-supply-link.service.ts'), 'utf8')
  const fnBlock = src.slice(
    src.indexOf('export async function linkNewPickupToEligibleSupplyRequest'),
    src.indexOf('export async function linkNewSupplyRequestToEligiblePickup'),
  )
  assert.match(fnBlock, /bindLinkedPickupToDelivery/)
  assert.match(fnBlock, /MachineTaskStatus\.CREATED/)
})

test('cancel pickup: desvincula aviso de abastecimento para liberar re-amarracao', () => {
  const src = readFileSync(join(here, 'operator-machine.service.ts'), 'utf8')
  const fnBlock = src.slice(
    src.indexOf('export async function cancelPickupRequestByOperator'),
    src.indexOf('return {\n    pickupTask: updated,'),
  )
  assert.match(fnBlock, /linkedSupplyRequest:\s*\{\s*disconnect:\s*true\s*\}/)
})

test('pickup-supply-link: nao amarra retirada paralela quando continuum entrega+retirada ja esta aberto', () => {
  const src = readFileSync(join(here, 'pickup-supply-link.service.ts'), 'utf8')
  const resolveBlock = src.slice(
    src.indexOf('async function resolveSupplyForNewPickupLink'),
    src.indexOf('export async function linkNewPickupToEligibleSupplyRequest'),
  )
  assert.match(resolveBlock, /findFirstOpenLinkedForMachine/)
  assert.match(resolveBlock, /return null/)

  const repairBlock = src.slice(
    src.indexOf('export async function repairUnlinkedPickupLinksForMachine'),
    src.length,
  )
  assert.match(repairBlock, /findFirstOpenLinkedForMachine/)
})

test('supply repository: materializa aviso FULFILLED para entrega sem aviso previo', () => {
  const src = readFileSync(
    join(here, '../repositories/operator-machine-supply-request.repository.ts'),
    'utf8',
  )
  assert.match(src, /ensureFulfilledForOrphanDelivery/)
  assert.match(src, /findEligibleUnclaimedByDeliveryTaskId/)
  assert.match(src, /claimedByOpenPickup/)
})
