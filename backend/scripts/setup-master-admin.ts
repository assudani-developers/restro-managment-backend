import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

const NEW_MASTER_ADMIN = {
  name: 'masteradmin',
  email: 'masteradmin@restrocore.com',
  password: 'RestroMaster@2026!',
};

async function main() {
  console.log('--- RESTROCORE MASTER ADMIN SYNC ---');

  // 1. Permanently deactivate and strip privileges from old master admin accounts
  const revoked = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'piyushassudani', mode: 'insensitive' } },
        { name: { contains: 'piyushassudani', mode: 'insensitive' } },
        { phone: { contains: '9413879444' } },
      ],
    },
  });

  if (revoked.length > 0) {
    for (const u of revoked) {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          isActive: false,
          isSuperAdmin: false,
          passwordHash:
            '$2b$12$REVOKED_DEACTIVATED_ACCOUNT_' +
            randomBytes(16).toString('hex'),
          pinHash: null,
          twoFactorEnabled: false,
        },
      });
      console.log(
        `[REVOKED] Deactivated old user: ${u.id} (${u.email ?? u.name} | phone: ${u.phone}) and revoked isSuperAdmin.`,
      );
    }
  } else {
    console.log('[OK] No active old master admin users found.');
  }

  // 2. Ensure new Master Admin user
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
    console.log(`[CREATED] Root restaurant: ${restaurant.id}`);
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
    console.log(`[CREATED] Owner role: ${ownerRole.id}`);
  }

  const passwordHash = await bcrypt.hash(NEW_MASTER_ADMIN.password, 12);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: NEW_MASTER_ADMIN.email, mode: 'insensitive' } },
        { name: { equals: NEW_MASTER_ADMIN.name, mode: 'insensitive' } },
      ],
    },
  });

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        restaurantId: restaurant.id,
        roleId: ownerRole.id,
        name: NEW_MASTER_ADMIN.name,
        email: NEW_MASTER_ADMIN.email,
        passwordHash,
        isSuperAdmin: true,
        isActive: true,
      },
    });
    console.log(
      `[SUCCESS] Created new Master Admin:\n  ID: ${created.id}\n  Email: ${NEW_MASTER_ADMIN.email}\n  Name: ${NEW_MASTER_ADMIN.name}\n  Password: ${NEW_MASTER_ADMIN.password}\n  isSuperAdmin: true`,
    );
  } else {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        isSuperAdmin: true,
        isActive: true,
      },
    });
    console.log(
      `[SUCCESS] Updated existing Master Admin:\n  ID: ${existing.id}\n  Email: ${NEW_MASTER_ADMIN.email}\n  Password: ${NEW_MASTER_ADMIN.password}\n  isSuperAdmin: true\n  isActive: true`,
    );
  }
}

main()
  .catch((err) => {
    console.error('Error executing master admin setup:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
