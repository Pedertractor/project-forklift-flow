import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import type { RoleUser, Unit } from "../src/generated/prisma/enums.js";
import { infoByCardAndUnit } from "../src/external-api/employee-verify/index.js";
import { hashPassword } from "../src/shared/password.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://docker:docker@localhost:5436/forklift_db?schema=public";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const firstPlain = process.env.FIRST_PASSWORD?.trim();
if (!firstPlain) {
  throw new Error("Seed: FIRST_PASSWORD nao esta definido no ambiente.");
}
const seedPassword = hashPassword(firstPlain);

async function upsertUserFromEmployeeApi(input: {
  card: string;
  unit: Unit;
  role: RoleUser;
}) {
  const card = input.card.trim();
  const employee = await infoByCardAndUnit(input.unit, card);
  if (!employee) {
    throw new Error(
      `Seed: colaborador nao encontrado (card=${card}, unit=${input.unit}). Confira URL_VERIFY_EMPLOYEES, APPKEY e se o servico esta acessivel.`,
    );
  }
  if (employee.cardNumber.trim() !== card) {
    throw new Error(
      `Seed: o cartao retornado pela API nao confere com o cartao informado (card=${card}).`,
    );
  }

  await prisma.user.upsert({
    where: {
      card_unit: { card, unit: input.unit },
    },
    create: {
      name: employee.name,
      employeeId: employee.id,
      card,
      unit: input.unit,
      password: seedPassword,
      role: input.role,
    },
    update: {
      name: employee.name,
      employeeId: employee.id,
      password: seedPassword,
      role: input.role,
    },
  });
}

async function main() {
  await upsertUserFromEmployeeApi({
    card: "2287",
    unit: "TRACTOR",
    role: "SUPERADMIN",
  });

  await upsertUserFromEmployeeApi({
    card: "2282",
    unit: "TRACTOR",
    role: "SUPERADMIN",
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // Keep seed failures explicit for CI/container logs.
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
