import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export const NEW_MASTER_ADMIN = {
  name: 'masteradmin',
  email: 'masteradmin@restrocore.com',
  password: 'RestroMaster@2026!',
};

@Injectable()
export class MasterAdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(MasterAdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async onModuleInit() {
    await this.syncMasterAdmins();
  }

  async syncMasterAdmins() {
    try {
      // 1. Find and permanently revoke old master admin credentials (piyushassudani / 9413879444)
      const revokedUsers = await this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: 'piyushassudani', mode: 'insensitive' } },
            { name: { contains: 'piyushassudani', mode: 'insensitive' } },
            { phone: { contains: '9413879444' } },
          ],
        },
      });

      if (revokedUsers.length > 0) {
        for (const u of revokedUsers) {
          await this.prisma.user.update({
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
          this.logger.warn(
            `REVOKED OLD MASTER ADMIN: User ${u.id} (${u.email ?? u.name}) permanently deactivated & isSuperAdmin revoked.`,
          );
        }

        // Notify all active socket sessions that old master admin sessions are revoked
        this.realtime.broadcastSessionRevoked(
          'MASTER_ADMIN_REVOKED: Master admin account (piyushassudani / 9413879444) has been permanently revoked.',
        );
      }

      // 2. Ensure the new Master Admin user exists with isSuperAdmin = true
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

      const passwordHash = await bcrypt.hash(NEW_MASTER_ADMIN.password, 12);

      const existingMaster = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: NEW_MASTER_ADMIN.email, mode: 'insensitive' } },
            { name: { equals: NEW_MASTER_ADMIN.name, mode: 'insensitive' } },
          ],
        },
      });

      if (!existingMaster) {
        await this.prisma.user.create({
          data: {
            restaurantId: targetRestaurant.id,
            roleId: ownerRole.id,
            name: NEW_MASTER_ADMIN.name,
            email: NEW_MASTER_ADMIN.email,
            passwordHash,
            isSuperAdmin: true,
            isActive: true,
          },
        });
        this.logger.log(
          `Created new Master Admin: ${NEW_MASTER_ADMIN.email} (isSuperAdmin = true)`,
        );
      } else {
        await this.prisma.user.update({
          where: { id: existingMaster.id },
          data: {
            passwordHash,
            isSuperAdmin: true,
            isActive: true,
          },
        });
        this.logger.log(
          `Ensured new Master Admin: ${NEW_MASTER_ADMIN.email} is active and isSuperAdmin = true`,
        );
      }
    } catch (err) {
      this.logger.error(
        `MasterAdminBootstrapService failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
