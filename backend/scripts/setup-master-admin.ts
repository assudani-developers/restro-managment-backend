import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const MASTER_PIYUSH = {
  name: 'Piyushassudani',
  email: 'piyushassudani96@gmail.com',
  phone: '9413879444',
  password: 'Piyush@300609',
};

const MASTER_ADMIN = {
  name: 'masteradmin',
  email: 'masteradmin@restrocore.com',
  password: 'RestroMaster@2026!',
};

async function main() {
  console.log('======================================================');
  console.log('--- RESTROCORE MASTER ADMIN SETUP ---');
  console.log('======================================================');

  let restaurant = await prisma.restaurant.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        id: 'restrocore-platform-admin',
        name: 'RestroCore Platform Root',
        currency: 'INR',
      },
    });
  }

  let ownerRole = await prisma.role.findFirst({
    where: {
      restaurantId: restaurant.id,
      name: 'OWNER',
    },
  });

  if (!ownerRole) {
    ownerRole = await prisma.role.create({
      data: {
        restaurantId: restaurant.id,
        name: 'OWNER',
        label: 'Owner',
      },
    });
  }

  const piyushHash = await bcrypt.hash(MASTER_PIYUSH.password, 12);
  const existingPiyush = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: MASTER_PIYUSH.name, mode: 'insensitive' } },
        { email: { equals: MASTER_PIYUSH.email, mode: 'insensitive' } },
        { phone: MASTER_PIYUSH.phone },
      ],
    },
  });

  if (!existingPiyush) {
    await prisma.user.create({
      data: {
        restaurantId: restaurant.id,
        roleId: ownerRole.id,
        name: MASTER_PIYUSH.name,
        email: MASTER_PIYUSH.email,
        phone: MASTER_PIYUSH.phone,
        passwordHash: piyushHash,
        isSuperAdmin: true,
        isActive: true,
      },
    });
    console.log(`[SUCCESS] Master Piyush created (${MASTER_PIYUSH.name})`);
  } else {
    await prisma.user.update({
      where: { id: existingPiyush.id },
      data: {
        name: MASTER_PIYUSH.name,
        passwordHash: piyushHash,
        isSuperAdmin: true,
        isActive: true,
      },
    });
    console.log(`[SUCCESS] Master Piyush updated (${MASTER_PIYUSH.name})`);
  }

  const masterAdminHash = await bcrypt.hash(MASTER_ADMIN.password, 12);
  const existingMasterAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: MASTER_ADMIN.email, mode: 'insensitive' } },
        { name: { equals: MASTER_ADMIN.name, mode: 'insensitive' } },
      ],
    },
  });

  if (!existingMasterAdmin) {
    await prisma.user.create({
      data: {
        restaurantId: restaurant.id,
        roleId: ownerRole.id,
        name: MASTER_ADMIN.name,
        email: MASTER_ADMIN.email,
        passwordHash: masterAdminHash,
        isSuperAdmin: true,
        isActive: true,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: existingMasterAdmin.id },
      data: {
        passwordHash: masterAdminHash,
        isSuperAdmin: true,
        isActive: true,
      },
    });
  }
  console.log(`[SUCCESS] Master Admin ready (${MASTER_ADMIN.email})`);
}

main()
  .catch((err) => {
    console.error('Error executing setup-master-admin:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
