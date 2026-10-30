import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PERMISSIONS } from '@restrocore/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformOverview() {
    const [
      totalRestaurants,
      activeRestaurants,
      totalBranches,
      totalOrders,
      totalUsers,
      revenueResult,
    ] = await Promise.all([
      this.prisma.restaurant.count(),
      this.prisma.restaurant.count({ where: { isActive: true } }),
      this.prisma.branch.count(),
      this.prisma.order.count(),
      this.prisma.user.count(),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'PAID' },
      }),
    ]);

    const totalRevenue = Number(revenueResult._sum.totalAmount ?? 0);

    return {
      totalRestaurants,
      activeRestaurants,
      totalBranches,
      totalOrders,
      totalUsers,
      totalRevenue,
      systemHealth: '100% OPERATIONAL',
      version: 'v2.0-SaaS',
    };
  }

  async getAllRestaurants() {
    const restaurants = await this.prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        branches: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            isActive: true,
            _count: { select: { orders: true } },
          },
        },
        users: {
          where: { role: { name: 'OWNER' } },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            branches: true,
            users: true,
          },
        },
      },
    });

    return restaurants.map((r: any) => ({
      id: r.id,
      name: r.name,
      legalName: r.legalName,
      logoUrl: r.logoUrl,
      currency: r.currency,
      timezone: r.timezone,
      isActive: r.isActive,
      plan: r.plan,
      createdAt: r.createdAt,
      branchesCount: r._count?.branches ?? 0,
      usersCount: r._count?.users ?? 0,
      branches: r.branches,
      owner: r.users?.[0] ?? null,
    }));
  }

  async createRestaurant(dto: {
    restaurantName: string;
    branchName?: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    plan?: string;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.ownerEmail },
    });
    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }

    // Ensure permissions are seeded
    for (const permission of PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { key: permission.key },
        update: {},
        create: permission,
      });
    }
    const allPermissions = await this.prisma.permission.findMany();

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);

    return this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: dto.restaurantName,
          plan: dto.plan ?? 'ENTERPRISE',
          isActive: true,
        },
      });

      const branch = await tx.branch.create({
        data: {
          restaurantId: restaurant.id,
          name: dto.branchName || 'Main Branch',
        },
      });

      // Create owner role with all permissions
      const ownerRole = await tx.role.create({
        data: {
          restaurantId: restaurant.id,
          name: 'OWNER',
          label: 'Owner',
          isSystem: true,
          permissions: {
            create: allPermissions.map((p) => ({ permissionId: p.id })),
          },
        },
      });

      // Create owner user
      const owner = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          roleId: ownerRole.id,
          name: dto.ownerName,
          email: dto.ownerEmail,
          passwordHash,
          branches: { create: { branchId: branch.id } },
        },
      });

      // Create Floor & Sample Table for quick start
      const floor = await tx.floor.create({
        data: {
          branchId: branch.id,
          name: 'Ground Floor',
        },
      });

      await tx.table.create({
        data: {
          floorId: floor.id,
          number: '1',
          name: 'Table 1',
          capacity: 4,
          shape: 'SQUARE',
          posX: 40,
          posY: 40,
        },
      });

      return {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        branchId: branch.id,
        ownerId: owner.id,
        ownerEmail: owner.email,
      };
    });
  }

  async toggleRestaurantStatus(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { isActive: !restaurant.isActive },
    });

    return { id: updated.id, isActive: updated.isActive };
  }

  async deleteRestaurant(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    await this.prisma.restaurant.delete({ where: { id } });
    return { ok: true, deletedId: id };
  }
}
