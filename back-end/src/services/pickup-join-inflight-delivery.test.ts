import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const here = dirname(fileURLToPath(import.meta.url))

test('pickup-supply-link: retirada nova anexa entrega ja em rota (mid-flight) e notifica o empilhadeirista', () => {
  const src = readFileSync(join(here, 'pickup-supply-link.service.ts'), 'utf8')
  const fnBlock = src.slice(
    src.indexOf('export async function linkNewPickupToEligibleSupplyRequest'),
    src.indexOf('export async function linkNewSupplyRequestToEligiblePickup'),
  )
  assert.match(fnBlock, /MachineTaskStatus\.ASSIGNED/)
  assert.match(fnBlock, /MachineTaskStatus\.IN_PROGRESS/)
  assert.match(fnBlock, /upsertAcceptedPair/)
  assert.match(fnBlock, /joined_active_delivery/)
})

test('frontend: toast de retirada conjunta e de abastecimento vinculado no empilhadeirista', () => {
  const src = readFileSync(
    join(
      here,
      '../../../front-end/src/components/layout/OperatorMovimentWorkProvider.tsx',
    ),
    'utf8',
  )
  assert.match(src, /joined_active_delivery/)
  assert.match(src, /solicitou retirada em conjunto/)
  assert.match(src, /replenishment_linked/)
})

test('frontend: reason do pickup_task_updated aceita joined_active_delivery e replenishment_linked', () => {
  const src = readFileSync(
    join(
      here,
      '../../../front-end/src/types/operator-moviment-ws.types.ts',
    ),
    'utf8',
  )
  assert.match(src, /'joined_active_delivery' \| 'replenishment_linked'/)
})

test('back-end ws hub: PickupLinkNotifyReason cobre os dois motivos de notificacao ao empilhadeirista', () => {
  const src = readFileSync(
    join(here, '../ws/operator-moviment-pallet-ws.hub.ts'),
    'utf8',
  )
  assert.match(
    src,
    /PickupLinkNotifyReason = 'joined_active_delivery' \| 'replenishment_linked'/,
  )
})

test('delivery create: amarra a retirada explicitamente vinculada ao aviso desta entrega', () => {
  const src = readFileSync(join(here, 'delivery-task.service.ts'), 'utf8')
  assert.match(src, /bindLinkedPickupToDelivery/)
  assert.match(src, /deliverTaskId: row\.id/)
})

test('frontend: retirada avulsa nunca forca supply:true so por existir aviso OPEN ja vinculado a outra retirada', () => {
  const src = readFileSync(
    join(
      here,
      '../../../front-end/src/pages/OperatorMachinePage/OperatorMachineOpenRequestDialog.tsx',
    ),
    'utf8',
  )
  const fnBlock = src.slice(
    src.indexOf('const buildSelection'),
    src.indexOf('const handlePrimary'),
  )
  // `supplyAlreadyOpen` só pode virar `supply: true` quando o operador
  // escolheu o card combinado — nunca na retirada avulsa (2a retirada
  // solicitada com o aviso já amarrado à 1a criaria um par duplicado).
  assert.match(fnBlock, /combinedSelected\s*\n?\s*\?\s*\(supply && supplyAvailable\) \|\| supplyAlreadyOpen/)
  assert.match(fnBlock, /:\s*supply && supplyAvailable/)
})

test('frontend: card "Entrega + Retirada" e exibido so via linkedToReplenishmentFlow (sem pareamento COMBINED heuristico)', () => {
  const display = readFileSync(
    join(
      here,
      '../../../front-end/src/pages/OperatorMachinePage/operator-machine-display.ts',
    ),
    'utf8',
  )
  assert.equal(display.includes('COMBINED'), false)
  assert.equal(display.includes('combinedDeliveryId'), false)
  assert.equal(display.includes('combinedDeliveryActive'), false)
  assert.match(display, /linkedToReplenishmentFlow/)
})
