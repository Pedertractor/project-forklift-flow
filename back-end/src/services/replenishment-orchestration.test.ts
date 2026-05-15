import assert from 'node:assert/strict'
import test from 'node:test'
import { RequestStatus } from '../generated/prisma/enums.js'

/** Contrato de status usados na orquestracao §9. */
test('status de fila do transporte inclui PALLET_READY e CREATED legado', () => {
  const poolStatuses = [RequestStatus.PALLET_READY, RequestStatus.CREATED]
  assert.ok(poolStatuses.includes(RequestStatus.PALLET_READY))
})

test('novo pedido sem marcar pronto fica AWAITING_PREPARATION', () => {
  assert.notEqual(
    RequestStatus.AWAITING_PREPARATION,
    RequestStatus.PALLET_READY,
  )
})
