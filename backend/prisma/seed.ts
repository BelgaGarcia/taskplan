import argon2 from 'argon2';
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const adminRole = await prisma.role.upsert({
    where: {
      name: 'Administrador',
    },
    update: {
      accessLevel: 'ADMIN',
      active: true,
    },
    create: {
      name: 'Administrador',
      description: 'Acesso administrativo ao TaskPlan.',
      accessLevel: 'ADMIN',
      active: true,
    },
  });

  const adminPosition = await prisma.position.upsert({
    where: {
      name: 'Administrador',
    },
    update: {
      active: true,
    },
    create: {
      name: 'Administrador',
      description: 'Responsável pela administração do TaskPlan.',
      active: true,
    },
  });

  const passwordHash = await argon2.hash(
    'TaskPlan123!',
  );

  await prisma.user.upsert({
    where: {
      email: 'admin@empresa.com.br',
    },
    update: {
      name: 'Administrador TaskPlan',
      roleId: adminRole.id,
      positionId: adminPosition.id,
      active: true,
      deletedAt: null,
    },
    create: {
      name: 'Administrador TaskPlan',
      email: 'admin@empresa.com.br',
      passwordHash,
      roleId: adminRole.id,
      positionId: adminPosition.id,
      active: true,
    },
  });

  await prisma.periodicity.upsert({
    where: {
      name: 'Diária',
    },
    update: {
      active: true,
    },
    create: {
      name: 'Diária',
      type: 'DAILY',
      interval: 1,
      active: true,
    },
  });

  await prisma.periodicity.upsert({
    where: {
      name: 'Semanal',
    },
    update: {
      active: true,
    },
    create: {
      name: 'Semanal',
      type: 'WEEKLY',
      interval: 1,
      active: true,
    },
  });

  await prisma.periodicity.upsert({
    where: {
      name: 'Mensal',
    },
    update: {
      active: true,
    },
    create: {
      name: 'Mensal',
      type: 'MONTHLY',
      interval: 1,
      active: true,
    },
  });

  console.log('Seed executado com sucesso.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });