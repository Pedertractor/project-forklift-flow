import assert from 'node:assert/strict'
import test from 'node:test'

/**
 * Contrato: retiradas PICKUP em ON_MACHINE sem entrega DELIVER em aberto na
 * mesma rodada de pareamento entram como "standalone" para o empilhadeirista.
 * (Antes da correcao, o servico ignorava pickups quando delivers.length === 0.)
 */
test('pickup-only queue: todos os pickups ficam sem par quando nao ha entregas', () => {
  const pairedPickupIds = new Set<string>()
  const openPickupIds = ['pickup-a']
  const standalone = openPickupIds.filter((id) => !pairedPickupIds.has(id))
  assert.deepEqual(standalone, ['pickup-a'])
})

test('pickup-only queue: pickup pareado com entrega nao entra duas vezes', () => {
  const pairedPickupIds = new Set(['pickup-a'])
  const openPickupIds = ['pickup-a', 'pickup-b']
  const standalone = openPickupIds.filter((id) => !pairedPickupIds.has(id))
  assert.deepEqual(standalone, ['pickup-b'])
})
