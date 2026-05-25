import type { FastifyInstance } from "fastify";
import { RoleUser } from "../generated/prisma/enums.js";
import {
  getEmployeeInfo,
  getListRoles,
  getListUsers,
  patchUserRole,
  postCreateUser,
  postResetUserPassword,
} from "../controllers/user-controller.js";
import { requireRoles } from "../middleware/require-roles.js";

export async function registerUserRoutes(fastify: FastifyInstance) {
  await fastify.register(
    async (userRouter) => {
      userRouter.get(
        "/employee-info",
        {
          preHandler: [
            fastify.authenticate,
            requireRoles(RoleUser.ADMIN, RoleUser.LEADER),
          ],
        },
        getEmployeeInfo,
      );
      userRouter.get(
        "/",
        {
          preHandler: [
            fastify.authenticate,
            requireRoles(RoleUser.ADMIN, RoleUser.LEADER),
          ],
        },
        getListUsers,
      );
      userRouter.get(
        "/roles",
        {
          preHandler: [fastify.authenticate, requireRoles(RoleUser.ADMIN)],
        },
        getListRoles,
      );
      userRouter.post(
        "/",
        {
          preHandler: [
            fastify.authenticate,
            requireRoles(RoleUser.ADMIN, RoleUser.LEADER),
          ],
        },
        postCreateUser,
      );
      userRouter.patch(
        "/:userId/role",
        {
          preHandler: [
            fastify.authenticate,
            requireRoles(RoleUser.ADMIN, RoleUser.LEADER),
          ],
        },
        patchUserRole,
      );
      userRouter.post(
        "/:userId/reset-password",
        {
          preHandler: [
            fastify.authenticate,
            requireRoles(RoleUser.ADMIN, RoleUser.LEADER),
          ],
        },
        postResetUserPassword,
      );
    },
    { prefix: "/users" },
  );
}
