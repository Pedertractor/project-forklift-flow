import type { FastifyInstance } from 'fastify'
import {
  deleteMovimentPalletHandler,
  getListMovimentPallets,
  getMovimentPalletByIdHandler,
  patchUpdateMovimentPallet,
  postCreateMovimentPallet,
} from '../controllers/moviment-pallet-controller.js'
import {
  requireMovimentPalletManageRoles,
  requireMovimentPalletReadRoles,
} from '../middleware/require-roles.js'

export async function registerMovimentPalletRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (router) => {
      router.post(
        '/',
        {
          preHandler: [fastify.authenticate, requireMovimentPalletManageRoles()],
        },
        postCreateMovimentPallet,
      )
      router.get(
        '/',
        {
          preHandler: [fastify.authenticate, requireMovimentPalletReadRoles()],
        },
        getListMovimentPallets,
      )
      router.get(
        '/:movimentPalletId',
        {
          preHandler: [fastify.authenticate, requireMovimentPalletReadRoles()],
        },
        getMovimentPalletByIdHandler,
      )
      router.patch(
        '/:movimentPalletId',
        {
          preHandler: [fastify.authenticate, requireMovimentPalletManageRoles()],
        },
        patchUpdateMovimentPallet,
      )
      router.delete(
        '/:movimentPalletId',
        {
          preHandler: [fastify.authenticate, requireMovimentPalletManageRoles()],
        },
        deleteMovimentPalletHandler,
      )
    },
    { prefix: '/moviment-pallets' },
  )
}
