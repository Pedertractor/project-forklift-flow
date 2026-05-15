import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import {
  ForkliftTaskStatus,
  ForkliftTaskType,
  RequestStatus,
  RoleUser,
  TypeMovimentPallet,
  Unit,
} from '../generated/prisma/enums.js'
import { hashPassword } from '../shared/password.js'

const shouldRun = Boolean(
  process.env.RUN_ON_MACHINE_FLOW_TEST?.trim() &&
    process.env.RUN_ON_MACHINE_FLOW_TEST !== '0',
)

/**
 * Fluxo ponta a ponta (Postgres real, mesmo DATABASE_URL do .env):
 * CREATED → aceitar entrega (IN_PROGRESS + DELIVER) → concluir entrega (ON_MACHINE)
 * → operador da máquina pede retirada (PICKUP) → empilhadeirista vê fila e aceita retirada.
 *
 * Rode: `npm run test:on-machine-flow` com Postgres acessível e .env válido.
 * PowerShell: `$env:RUN_ON_MACHINE_FLOW_TEST='1'; npm run test:on-machine-flow`
 */
test(
  'fluxo ON_MACHINE: retirada visivel e aceitavel pelo empilhadeirista',
  { skip: !shouldRun },
  async () => {
    const { prisma } = await import('../lib/prisma.js')
    const {
      acceptOpenPickupTaskForMovimentOperator,
      acceptReplenishmentRequestAsMovimentOperator,
      bindOperatorToMovimentPallet,
      completeDeliverTaskToMachine,
      completePickupTaskToExpedition,
      listOpenReplenishmentRequestsForMyMovimentType,
      listTripRouteSuggestionsForOperator,
    } = await import('../services/operator-moviment-pallet.service.js')
    const { requestPalletPickupFromMachine } = await import(
      '../services/operator-machine.service.js'
    )

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12)
    const pwd = hashPassword(`Test-${suffix}-pwd`)
    const empMachine =
      1_000_000 + (Number.parseInt(suffix.slice(0, 7), 16) % 8_000_000)
    const empForklift = empMachine + 1

    let sectorId = ''
    let typeMachineId = ''
    let machineId = ''
    let userMachineId = ''
    let userForkliftId = ''
    let palletId = ''
    let requestId = ''

    try {
      const sector = await prisma.sector.create({
        data: { typeSector: `TEST_SECTOR_${suffix}` },
      })
      sectorId = sector.id

      const typeMachine = await prisma.typeMachine.create({
        data: {
          name: `TM_TEST_${suffix}`,
          urlImage: 'https://example.com/test.png',
        },
      })
      typeMachineId = typeMachine.id

      const userMachine = await prisma.user.create({
        data: {
          name: `OpMaquina_${suffix}`,
          employeeId: empMachine,
          card: `M${suffix}`.slice(0, 20),
          unit: Unit.TRACTOR,
          password: pwd,
          role: RoleUser.OPERATOR_MACHINE,
          sectorId,
        },
      })
      userMachineId = userMachine.id

      const userForklift = await prisma.user.create({
        data: {
          name: `Empilh_${suffix}`,
          employeeId: empForklift,
          card: `F${suffix}`.slice(0, 20),
          unit: Unit.TRACTOR,
          password: pwd,
          role: RoleUser.FORKLIFT_OPERATOR,
          sectorId,
        },
      })
      userForkliftId = userForklift.id

      const machine = await prisma.machine.create({
        data: {
          name: `Maquina_${suffix}`,
          position: `POS_${suffix}`,
          typeMachineId,
          sectorId,
          userId: userMachineId,
        },
      })
      machineId = machine.id

      const pallet = await prisma.movimentPallet.create({
        data: {
          code: `TEST-PL-${suffix}`,
          type: TypeMovimentPallet.FORKLIFT,
          sectorId,
        },
      })
      palletId = pallet.id

      const request = await prisma.machineReplenishmentRequest.create({
        data: {
          movementCube: `CUBE-${suffix}`,
          requestedById: userForkliftId,
          destinationId: machineId,
          typeMovimentPallet: TypeMovimentPallet.FORKLIFT,
          status: RequestStatus.PALLET_READY,
          preparedAt: new Date(),
        },
      })
      requestId = request.id

      await bindOperatorToMovimentPallet(
        userForkliftId,
        RoleUser.FORKLIFT_OPERATOR,
        palletId,
      )

      const { task: deliverTask } =
        await acceptReplenishmentRequestAsMovimentOperator(
          userForkliftId,
          RoleUser.FORKLIFT_OPERATOR,
          requestId,
        )
      assert.equal(deliverTask.type, ForkliftTaskType.DELIVER_TO_MACHINE)

      const { task: completedDeliver, request: reqAfterDeliver } =
        await completeDeliverTaskToMachine(
          userForkliftId,
          RoleUser.FORKLIFT_OPERATOR,
          deliverTask.id,
        )
      assert.equal(completedDeliver.status, ForkliftTaskStatus.COMPLETED)
      assert.equal(reqAfterDeliver?.status, RequestStatus.ON_MACHINE)

      const { pickupTask } = await requestPalletPickupFromMachine(
        userMachineId,
        requestId,
      )
      assert.equal(pickupTask.type, ForkliftTaskType.PICKUP_TO_EXPEDITION)

      const listReq = await listOpenReplenishmentRequestsForMyMovimentType(
        userForkliftId,
      )
      const pickupIds = listReq.onMachinePickupTasks.map((t) => t.id)
      assert.ok(
        pickupIds.includes(pickupTask.id),
        'GET replenishment-requests deve listar a tarefa PICKUP em onMachinePickupTasks',
      )

      const trip = await listTripRouteSuggestionsForOperator(
        userForkliftId,
        RoleUser.FORKLIFT_OPERATOR,
      )
      const standaloneIds = trip.standalonePickupTasks.map(
        (s) => s.pickupTask.id,
      )
      assert.ok(
        standaloneIds.includes(pickupTask.id),
        'GET trip-suggestions deve incluir standalonePickupTasks com esta retirada',
      )

      const { task: claimed } = await acceptOpenPickupTaskForMovimentOperator(
        userForkliftId,
        RoleUser.FORKLIFT_OPERATOR,
        pickupTask.id,
      )
      assert.equal(claimed.assignedMovimentPalletId, palletId)
      assert.equal(claimed.status, ForkliftTaskStatus.ASSIGNED)

      const { task: completedPickup, request: reqAfterPickup } =
        await completePickupTaskToExpedition(
          userForkliftId,
          RoleUser.FORKLIFT_OPERATOR,
          pickupTask.id,
        )
      assert.equal(completedPickup.status, ForkliftTaskStatus.COMPLETED)
      assert.equal(reqAfterPickup?.status, RequestStatus.COMPLETED)
    } finally {
      if (requestId) {
        await prisma.movimentPalletTripSuggestion.deleteMany({
          where: {
            OR: [
              { deliverTask: { requestId } },
              { pickupTask: { requestId } },
            ],
          },
        })
        await prisma.movimentPalletTask.deleteMany({ where: { requestId } })
        await prisma.machineReplenishmentRequest
          .delete({ where: { id: requestId } })
          .catch(() => {})
      }
      if (palletId) {
        await prisma.movimentPallet
          .update({
            where: { id: palletId },
            data: { operatorId: null },
          })
          .catch(() => {})
        await prisma.movimentPallet.delete({ where: { id: palletId } }).catch(() => {})
      }
      if (machineId) {
        await prisma.machine
          .update({
            where: { id: machineId },
            data: { userId: null },
          })
          .catch(() => {})
        await prisma.machine.delete({ where: { id: machineId } }).catch(() => {})
      }
      for (const uid of [userForkliftId, userMachineId]) {
        if (uid) {
          await prisma.user.delete({ where: { id: uid } }).catch(() => {})
        }
      }
      if (typeMachineId) {
        await prisma.typeMachine.delete({ where: { id: typeMachineId } }).catch(() => {})
      }
      if (sectorId) {
        await prisma.sector.delete({ where: { id: sectorId } }).catch(() => {})
      }
    }
  },
)
