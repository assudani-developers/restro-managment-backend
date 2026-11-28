import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export const MASTER_PIYUSH = {
  name: 'Piyushassudani',
  email: 'piyushassudani96@gmail.com',
  phone: '9413879444',
  password: 'Piyush@300609',
};

export const MASTER_ADMIN = {
  name: 'masteradmin',
  email: 'masteradmin@restrocore.com',
  password: 'RestroMaster@2026!',
};

@Injectable()
export class MasterAdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(MasterAdminBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncMasterAdmins();
  }

  async syncMasterAdmins() {
    try {
      let targetRestaurant = await this.prisma.restaurant.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      if (!targetRestaurant) {
        targetRestaurant = await this.prisma.restaurant.create({
          data: {
            id: 'restrocore-platform-admin',
            name: 'RestroCore Platform Root',
            currency: 'INR',
          },
        });
      }

      let ownerRole = await this.prisma.role.findFirst({
        where: {
          restaurantId: targetRestaurant.id,
          name: 'OWNER',
        },
      });

      if (!ownerRole) {
        ownerRole = await this.prisma.role.create({
          data: {
            restaurantId: targetRestaurant.id,
            name: 'OWNER',
            label: 'Owner',
          },
        });
      }

      // 1. Ensure MASTER PIYUSH user (Piyushassudani / Piyush@300609)
      const piyushPasswordHash = await bcrypt.hash(MASTER_PIYUSH.password, 12);
      const existingPiyush = await this.prisma.user.findFirst({
        where: {
          OR: [
            { name: { equals: MASTER_PIYUSH.name, mode: 'insensitive' } },
            { email: { equals: MASTER_PIYUSH.email, mode: 'insensitive' } },
            { phone: MASTER_PIYUSH.phone },
          ],
        },
      });

      if (!existingPiyush) {
        await this.prisma.user.create({
          data: {
            restaurantId: targetRestaurant.id,
            roleId: ownerRole.id,
            name: MASTER_PIYUSH.name,
            email: MASTER_PIYUSH.email,
            phone: MASTER_PIYUSH.phone,
            passwordHash: piyushPasswordHash,
            isSuperAdmin: true,
            isActive: true,
          },
        });
        this.logger.log(`Created Master Piyush: ${MASTER_PIYUSH.name} (isSuperAdmin = true)`);
      } else {
        await this.prisma.user.update({
          where: { id: existingPiyush.id },
          data: {
            name: MASTER_PIYUSH.name,
            passwordHash: piyushPasswordHash,
            isSuperAdmin: true,
            isActive: true,
          },
        });
        this.logger.log(`Updated Master Piyush: ${MASTER_PIYUSH.name} with new master credentials`);
      }

      // 2. Ensure MASTER_ADMIN fallback user (masteradmin / RestroMaster@2026!)
      const masterAdminPasswordHash = await bcrypt.hash(MASTER_ADMIN.password, 12);
      const existingMasterAdmin = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: MASTER_ADMIN.email, mode: 'insensitive' } },
            { name: { equals: MASTER_ADMIN.name, mode: 'insensitive' } },
          ],
        },
      });

      if (!existingMasterAdmin) {
        await this.prisma.user.create({
          data: {
            restaurantId: targetRestaurant.id,
            roleId: ownerRole.id,
            name: MASTER_ADMIN.name,
            email: MASTER_ADMIN.email,
            passwordHash: masterAdminPasswordHash,
            isSuperAdmin: true,
            isActive: true,
          },
        });
        this.logger.log(`Created Master Admin: ${MASTER_ADMIN.email} (isSuperAdmin = true)`);
      } else {
        await this.prisma.user.update({
          where: { id: existingMasterAdmin.id },
          data: {
            passwordHash: masterAdminPasswordHash,
            isSuperAdmin: true,
            isActive: true,
          },
        });
        this.logger.log(`Updated Master Admin: ${MASTER_ADMIN.email} to active superadmin`);
      }
    } catch (err) {
      this.logger.error(
        `MasterAdminBootstrapService failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
