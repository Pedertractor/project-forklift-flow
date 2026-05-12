import type { FastifyInstance } from 'fastify'
import {
  deleteMovimentPalletHandler,
  getListMovimentPallets,
  getMovimentPalletByIdHandler,
  patchUpdateMovimentPallet,
  postCreateMovimentPallet,
} from '../controllers/moviment-pallet-controller.js'
import { requireMachineDomainRoles } from '../middleware/require-roles.js'

export async function registerMovimentPalletRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (router) => {
      router.post(
        '/',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        postCreateMovimentPallet,
      )
      router.get(
        '/',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        getListMovimentPallets,
      )
      router.get(
        '/:movimentPalletId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        getMovimentPalletByIdHandler,
      )
      router.patch(
        '/:movimentPalletId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        patchUpdateMovimentPallet,
      )
      router.delete(
        '/:movimentPalletId',
        {
          preHandler: [fastify.authenticate, requireMachineDomainRoles()],
        },
        deleteMovimentPalletHandler,
      )
    },
    { prefix: '/moviment-pallets' },
  )
}
