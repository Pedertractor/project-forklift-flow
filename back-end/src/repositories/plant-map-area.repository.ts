import type { Prisma } from '../generated/prisma/client.js'
import { PlantMapAreaKind, PlantMapUnit } from '../generated/prisma/enums.js'
import { prisma } from '../lib/prisma.js'

export const plantMapAreaRepository = {
  findManyByPlantUnit(plantUnit: PlantMapUnit) {
    return prisma.plantMapArea.findMany({
      where: { plantUnit },
      orderBy: { kind: 'asc' },
    })
  },

  findUniqueById(id: string) {
    return prisma.plantMapArea.findUnique({ where: { id } })
  },

  upsertByUnitAndKind(
    plantUnit: PlantMapUnit,
    kind: PlantMapAreaKind,
    data: Pick<Prisma.PlantMapAreaCreateInput, 'nx' | 'ny' | 'nw' | 'nh' | 'label'>,
  ) {
    return prisma.plantMapArea.upsert({
      where: {
        plantUnit_kind: { plantUnit, kind },
      },
      create: {
        plantUnit,
        kind,
        nx: data.nx,
        ny: data.ny,
        nw: data.nw,
        nh: data.nh,
        label: data.label ?? null,
      },
      update: {
        nx: data.nx,
        ny: data.ny,
        nw: data.nw,
        nh: data.nh,
        ...(data.label !== undefined ? { label: data.label } : {}),
      },
    })
  },

  delete(id: string) {
    return prisma.plantMapArea.delete({ where: { id } })
  },
}
