import type { FastifyInstance } from "fastify";
import { RoleUser } from "../generated/prisma/enums.js";
import {
  getEmployeeInfo,
  getListUsers,
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
          preHandler: [fastify.authenticate, requireRoles(RoleUser.ADMIN)],
        },
        getEmployeeInfo,
      );
      userRouter.get(
        "/",
        {
          preHandler: [fastify.authenticate, requireRoles(RoleUser.ADMIN)],
        },
        getListUsers,
      );
      userRouter.post(
        "/",
        // {
        //   preHandler: [fastify.authenticate, requireRoles(RoleUser.ADMIN)],
        // },
        postCreateUser,
      );
      userRouter.post(
        "/:userId/reset-password",
        {
          preHandler: [fastify.authenticate, requireRoles(RoleUser.ADMIN)],
        },
        postResetUserPassword,
      );
    },
    { prefix: "/users" },
  );
}
