import type { Unit } from "../generated/prisma/enums.js";
import { AuthError, UserPasswordError } from "../errors/domain-errors.js";
import { userRepository } from "../repositories/user.repository.js";
import { hashPassword, verifyPassword } from "../shared/password.js";

export async function loginWithCardUnitPassword(
  card: string,
  unit: Unit,
  password: string,
) {
  console.log(password);

  const user = await userRepository.findFirstByCardAndUnit(card, unit);
  if (!user || !verifyPassword(password, user.password)) {
    throw new AuthError("Cartao, unidade ou senha invalidos.");
  }
  return user;
}

export async function updateOwnPassword(input: {
  userId: string;
  newPassword: string;
  currentPassword?: string;
}) {
  if (input.newPassword.length < 4) {
    throw new UserPasswordError(
      "A nova senha deve ter pelo menos 4 caracteres.",
    );
  }

  const user = await userRepository.findUniqueById(input.userId);
  if (!user) {
    throw new UserPasswordError("Usuario nao encontrado.");
  }

  const needsCurrentPassword = user.isLogged;
  if (needsCurrentPassword) {
    if (!input.currentPassword) {
      throw new UserPasswordError("Informe a senha atual.");
    }
    if (!verifyPassword(input.currentPassword, user.password)) {
      throw new UserPasswordError("Senha atual incorreta.");
    }
  }

  await userRepository.update(input.userId, {
    password: hashPassword(input.newPassword),
    isLogged: true,
  });
}

export async function getUserProfileById(userId: string) {
  return userRepository.findProfileById(userId);
}
