import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient();

async function main() {
  await prisma.healthcheck.create({
    data: {},
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
