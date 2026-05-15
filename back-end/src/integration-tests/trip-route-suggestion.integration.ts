import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import {
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
 * Sugestao combinada: cubo ON_MACHINE com retirada pedida + nova solicitacao CREATED
 * no recebimento para a mesma maquina.
 *
 * Rode com o mesmo flag do fluxo ON_MACHINE:
 * `$env:RUN_ON_MACHINE_FLOW_TEST='1'; npm run test:on-machine-flow`
 */
test(
  'sugestao de viagem: pool CREATED no recebimento + retirada ON_MACHINE na mesma maquina',
  { skip: !shouldRun },
  async () => {
    const { prisma } = await import('../lib/prisma.js')
    const {
      acceptReplenishmentRequestAsMovimentOperator,
      bindOperatorToMovimentPallet,
      completeDeliverTaskToMachine,
      listTripRouteSuggestionsForOperator,
    } = await import('../services/operator-moviment-pallet.service.js')
    const { requestPalletPickupFromMachine } = await import(
      '../services/operator-machine.service.js'
    )

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12)
    const pwd = hashPassword(`Test-${suffix}-pwd`)
    const empMachine =
      1_100_000 + (Number.parseInt(suffix.slice(0, 7), 16) % 8_000_000)
    const empForklift = empMachine + 1
    const empSupply = empMachine + 2

    let sectorId = ''
    let typeMachineId = ''
    let machineId = ''
    let userMachineId = ''
    let userForkliftId = ''
    let userSupplyId = ''
    let palletId = ''
    let onMachineRequestId = ''
    let poolRequestId = ''

    try {
      const sector = await prisma.sector.create({
        data: { typeSector: `TEST_TRIP_${suffix}` },
      })
      sectorId = sector.id

      const typeMachine = await prisma.typeMachine.create({
        data: {
          name: `TM_TRIP_${suffix}`,
          urlImage: 'https://example.com/test.png',
        },
      })
      typeMachineId = typeMachine.id

      const userMachine = await prisma.user.create({
        data: {
          name: `OpMaquinaTrip_${suffix}`,
          employeeId: empMachine,
          card: `MT${suffix}`.slice(0, 20),
          unit: Unit.TRACTOR,
          password: pwd,
          role: RoleUser.OPERATOR_MACHINE,
          sectorId,
        },
      })
      userMachineId = userMachine.id

      const userForklift = await prisma.user.create({
        data: {
          name: `EmpilhTrip_${suffix}`,
          employeeId: empForklift,
          card: `FT${suffix}`.slice(0, 20),
          unit: Unit.TRACTOR,
          password: pwd,
          role: RoleUser.FORKLIFT_OPERATOR,
          sectorId,
        },
      })
      userForkliftId = userForklift.id

      const userSupply = await prisma.user.create({
        data: {
          name: `SupplyTrip_${suffix}`,
          employeeId: empSupply,
          card: `ST${suffix}`.slice(0, 20),
          unit: Unit.TRACTOR,
          password: pwd,
          role: RoleUser.SUPPLY_OPERATOR,
          sectorId,
        },
      })
      userSupplyId = userSupply.id

      const machine = await prisma.machine.create({
        data: {
          name: `MaquinaTrip_${suffix}`,
          position: `POS_TRIP_${suffix}`,
          typeMachineId,
          sectorId,
          userId: userMachineId,
        },
      })
      machineId = machine.id

      const pallet = await prisma.movimentPallet.create({
        data: {
          code: `TEST-TRIP-${suffix}`,
          type: TypeMovimentPallet.FORKLIFT,
          sectorId,
        },
      })
      palletId = pallet.id

      const onMachineRequest = await prisma.machineReplenishmentRequest.create({
        data: {
          movementCube: `CUBE-ON-${suffix}`,
          requestedById: userSupplyId,
          destinationId: machineId,
          typeMovimentPallet: TypeMovimentPallet.FORKLIFT,
        },
      })
      onMachineRequestId = onMachineRequest.id

      await bindOperatorToMovimentPallet(
        userForkliftId,
        RoleUser.FORKLIFT_OPERATOR,
        palletId,
      )

      const { task: deliverTask } =
        await acceptReplenishmentRequestAsMovimentOperator(
          userForkliftId,
          RoleUser.FORKLIFT_OPERATOR,
          onMachineRequestId,
        )
      await completeDeliverTaskToMachine(
        userForkliftId,
        RoleUser.FORKLIFT_OPERATOR,
        deliverTask.id,
      )

      const { pickupTask } = await requestPalletPickupFromMachine(
        userMachineId,
        onMachineRequestId,
      )
      assert.equal(pickupTask.type, ForkliftTaskType.PICKUP_TO_EXPEDITION)

      const poolRequest = await prisma.machineReplenishmentRequest.create({
        data: {
          movementCube: `CUBE-POOL-${suffix}`,
          requestedById: userSupplyId,
          destinationId: machineId,
          typeMovimentPallet: TypeMovimentPallet.FORKLIFT,
        },
      })
      poolRequestId = poolRequest.id
      assert.equal(poolRequest.status, RequestStatus.CREATED)

      const trip = await listTripRouteSuggestionsForOperator(
        userForkliftId,
        RoleUser.FORKLIFT_OPERATOR,
      )

      const combined = trip.suggestions.find(
        (s) =>
          s.pickupTask.id === pickupTask.id &&
          s.deliverTask.requestId === poolRequestId,
      )
      assert.ok(
        combined,
        'deve existir sugestao combinada entre solicitacao CREATED no recebimento e retirada ON_MACHINE',
      )
      assert.equal(combined.kind, 'COMBINE_DELIVER_AND_PICKUP_AT_MACHINE')

      const standaloneIds = trip.standalonePickupTasks.map(
        (s) => s.pickupTask.id,
      )
      assert.ok(
        !standaloneIds.includes(pickupTask.id),
        'retirada emparelhada nao deve aparecer como standalone',
      )
    } finally {
      for (const requestId of [onMachineRequestId, poolRequestId]) {
        if (!requestId) {
          continue
        }
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
      for (const uid of [userForkliftId, userMachineId, userSupplyId]) {
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
