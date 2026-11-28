import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DEFAULT_MODULES_BY_BUSINESS, PERMISSIONS, registerSchema, type BusinessType } from '@restrocore/types';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly realtime: RealtimeGateway,
  ) {}

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
    legalName?: string;
    currency?: string;
    timezone?: string;
    branchName?: string;
    branchAddress?: string;
    branchPhone?: string;
    gstNumber?: string;
    country?: string;
    tableCount?: number;
    kitchenStations?: string[];
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerPhone?: string;
    plan?: string;
    businessType?: BusinessType;
    enabledModules?: string[];
  }) {
    const restaurantName = typeof dto.restaurantName === 'string' ? dto.restaurantName.trim() : '';
    const branchName = typeof dto.branchName === 'string' ? dto.branchName.trim() : '';
    const ownerName = typeof dto.ownerName === 'string' ? dto.ownerName.trim() : '';
    const ownerEmail = typeof dto.ownerEmail === 'string' ? dto.ownerEmail.trim() : '';
    const registration = registerSchema.safeParse({
      restaurantName,
      branchName,
      ownerName,
      email: ownerEmail,
      password: dto.ownerPassword,
      businessType: dto.businessType ?? 'RESTAURANT',
    });

    if (!registration.success) {
      throw new BadRequestException(
        'Enter a restaurant name, branch name, owner name, valid email, and password of at least 8 characters',
      );
    }

    if (
      dto.tableCount !== undefined &&
      (!Number.isInteger(dto.tableCount) || dto.tableCount < 0 || dto.tableCount > 50)
    ) {
      throw new BadRequestException('Table count must be an integer between 0 and 50');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: ownerEmail },
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
          name: restaurantName,
          legalName: dto.legalName?.trim() || null,
          currency: dto.currency || 'INR',
          timezone: dto.timezone || 'Asia/Kolkata',
          plan: dto.plan ?? 'ENTERPRISE',
          businessType: dto.businessType ?? 'RESTAURANT',
          enabledModules: dto.enabledModules ?? [...DEFAULT_MODULES_BY_BUSINESS[dto.businessType ?? 'RESTAURANT']],
          isActive: true,
        },
      });

      const branch = await tx.branch.create({
        data: {
          restaurantId: restaurant.id,
          name: branchName,
          address: dto.branchAddress,
          phone: dto.branchPhone,
          gstNumber: dto.gstNumber,
          country: dto.country || 'IN',
        },
      });

      // Create pre-configured kitchen stations
      if (dto.kitchenStations && (!Array.isArray(dto.kitchenStations) || dto.kitchenStations.length > 20)) {
        throw new BadRequestException('Choose no more than 20 kitchen stations');
      }
      const stations = Array.isArray(dto.kitchenStations)
        ? dto.kitchenStations
            .filter((station): station is string => typeof station === 'string')
            .map((station) => station.trim())
            .filter(Boolean)
        : [];
      for (const stationName of stations) {
        await tx.kitchenStation.create({
          data: {
            branchId: branch.id,
            name: stationName,
          },
        });
      }

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
          name: ownerName,
          email: ownerEmail,
          phone: dto.ownerPhone,
          passwordHash,
          branches: { create: { branchId: branch.id } },
        },
      });

      // Create Floor & Tables for ready-to-run operations
      const floor = await tx.floor.create({
        data: {
          branchId: branch.id,
          name: 'Main Dining Floor',
        },
      });

      const count = dto.tableCount ?? 0;
      for (let i = 1; i <= count; i++) {
        const row = Math.floor((i - 1) / 4);
        const col = (i - 1) % 4;
        await tx.table.create({
          data: {
            floorId: floor.id,
            number: String(i),
            name: `Table ${i}`,
            capacity: (i % 3 === 0) ? 6 : 4,
            shape: (i % 3 === 0) ? 'ROUND' : 'SQUARE',
            posX: 30 + col * 90,
            posY: 30 + row * 90,
          },
        });
      }

      return {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        branchId: branch.id,
        ownerId: owner.id,
        ownerEmail: owner.email,
        ownerPhone: owner.phone,
        tableCount: count,
        stationsCount: stations.length,
      };
    });
  }

  async getTenantCrm() {
    const restaurants = await this.prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
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
        branches: {
          select: {
            id: true,
            name: true,
            phone: true,
            _count: { select: { orders: true } },
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

    const crmTenants = await Promise.all(
      restaurants.map(async (r: any) => {
        const orderAgg = await this.prisma.order.aggregate({
          where: { branch: { restaurantId: r.id }, status: 'PAID' },
          _sum: { totalAmount: true },
          _count: { id: true },
        });

        const owner = r.users[0] ?? null;

        return {
          restaurantId: r.id,
          restaurantName: r.name,
          legalName: r.legalName,
          plan: r.plan,
          isActive: r.isActive,
          createdAt: r.createdAt,
          currency: r.currency,
          owner: owner
            ? {
                id: owner.id,
                name: owner.name,
                email: owner.email,
                phone: owner.phone,
                isActive: owner.isActive,
              }
            : null,
          branchesCount: r._count.branches,
          totalOrders: orderAgg._count.id,
          totalGmv: Number(orderAgg._sum.totalAmount ?? 0),
        };
      }),
    );

    return crmTenants;
  }

  async getSubscriptions() {
    const restaurants = await this.prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
        plan: true,
        isActive: true,
        createdAt: true,
        currency: true,
        users: {
          where: { role: { name: 'OWNER' } },
          take: 1,
          select: { name: true, email: true, phone: true },
        },
        _count: { select: { branches: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const PLAN_PRICES: Record<string, number> = {
      STARTER: 49,
      GROWTH: 99,
      ENTERPRISE: 199,
      CUSTOM: 299,
    };

    let totalMrr = 0;
    const items = restaurants.map((r: any) => {
      const price = PLAN_PRICES[r.plan?.toUpperCase()] ?? 199;
      if (r.isActive) totalMrr += price;
      const created = new Date(r.createdAt);
      const nextBilling = new Date(created);
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      return {
        id: r.id,
        restaurantName: r.name,
        plan: r.plan,
        monthlyFee: price,
        currency: 'USD',
        status: r.isActive ? 'ACTIVE' : 'SUSPENDED',
        billingCycle: 'MONTHLY',
        nextBillingDate: nextBilling.toISOString(),
        owner: r.users[0] ?? null,
        branchesCount: r._count.branches,
        createdAt: r.createdAt,
      };
    });

    return {
      totalMrr,
      totalArr: totalMrr * 12,
      activeSubscribers: restaurants.filter((r: any) => r.isActive).length,
      planBreakdown: {
        STARTER: restaurants.filter((r: any) => r.plan === 'STARTER').length,
        GROWTH: restaurants.filter((r: any) => r.plan === 'GROWTH').length,
        ENTERPRISE: restaurants.filter((r: any) => r.plan === 'ENTERPRISE').length,
      },
      subscriptions: items,
    };
  }

  async toggleRestaurantStatus(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { branches: { select: { id: true } } },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const nextActive = !restaurant.isActive;
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { isActive: nextActive },
    });

    // Real-time broadcast: If suspended, alert all active terminal & KDS connections
    for (const b of restaurant.branches) {
      this.realtime.emitToBranch(b.id, 'restaurant:status_changed', {
        restaurantId: id,
        isActive: nextActive,
      });
    }

    return { id: updated.id, isActive: updated.isActive };
  }

  async switchRestaurant(superAdminUserId: string, targetRestaurantId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: superAdminUserId },
    });
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Only SaaS SuperAdmin can switch restaurant context');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: targetRestaurantId },
      include: { branches: { take: 1, select: { id: true, name: true } } },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    let defaultBranchId = restaurant.branches[0]?.id ?? null;
    if (!defaultBranchId) {
      const created = await this.addBranch(restaurant.id, { name: 'Main Branch' });
      defaultBranchId = created.id;
    }

    const token = this.jwt.sign({
      sub: user.id,
      impersonatedRestaurantId: restaurant.id,
    });

    return {
      token,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
      },
      branchId: defaultBranchId,
    };
  }

  async switchBack(superAdminUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: superAdminUserId },
    });
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Only SaaS SuperAdmin can reset context');
    }

    const token = this.jwt.sign({
      sub: user.id,
    });

    return { token };
  }

  async deleteRestaurant(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    await this.prisma.restaurant.delete({ where: { id } });
    return { ok: true, deletedId: id };
  }

  // In-memory or persisted platform config
  private platformConfig = {
    platformName: 'RestroCore SaaS Enterprise',
    maintenanceMode: false,
    announcement: 'RestroCore Cloud 2.0 is live. All POS, KDS & QR systems are operational.',
    supportEmail: 'support@restrocore.com',
    supportPhone: '+91 80000 12345',
    allowRegistration: true,
    planPrices: {
      STARTER: 49,
      GROWTH: 99,
      ENTERPRISE: 199,
    },
  };

  getPlatformConfig() {
    return this.platformConfig;
  }

  updatePlatformConfig(dto: any) {
    this.platformConfig = { ...this.platformConfig, ...dto };
    return this.platformConfig;
  }

  async updateRestaurant(
    id: string,
    dto: {
      name?: string;
      legalName?: string;
      plan?: string;
      currency?: string;
      timezone?: string;
      upiVpa?: string;
      upiPayeeName?: string;
      isActive?: boolean;
      businessType?: BusinessType;
      enabledModules?: string[];
    },
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.legalName !== undefined ? { legalName: dto.legalName } : {}),
        ...(dto.plan ? { plan: dto.plan } : {}),
        ...(dto.currency ? { currency: dto.currency } : {}),
        ...(dto.timezone ? { timezone: dto.timezone } : {}),
        ...(dto.upiVpa !== undefined ? { upiVpa: dto.upiVpa } : {}),
        ...(dto.upiPayeeName !== undefined ? { upiPayeeName: dto.upiPayeeName } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.businessType ? { businessType: dto.businessType } : {}),
        ...(dto.enabledModules ? { enabledModules: dto.enabledModules } : {}),
      },
    });

    return updated;
  }

  async addBranch(
    restaurantId: string,
    dto: {
      name: string;
      address?: string;
      phone?: string;
      gstNumber?: string;
    },
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    return this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: {
          restaurantId,
          name: dto.name,
          address: dto.address,
          phone: dto.phone,
          gstNumber: dto.gstNumber,
          country: restaurant.currency === 'INR' ? 'IN' : 'US',
        },
      });

      // Create default floor and tables
      const floor = await tx.floor.create({
        data: {
          branchId: branch.id,
          name: 'Ground Floor',
        },
      });

      for (let i = 1; i <= 6; i++) {
        await tx.table.create({
          data: {
            floorId: floor.id,
            number: String(i),
            name: `Table ${i}`,
            capacity: 4,
            shape: 'SQUARE',
            posX: 30 + (i - 1) * 70,
            posY: 40,
          },
        });
      }

      await tx.kitchenStation.create({
        data: {
          branchId: branch.id,
          name: 'Main Kitchen',
        },
      });

      return branch;
    });
  }

  async updateBranch(
    branchId: string,
    dto: {
      name?: string;
      address?: string;
      phone?: string;
      gstNumber?: string;
      isActive?: boolean;
    },
  ) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    const updated = await this.prisma.branch.update({
      where: { id: branchId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.gstNumber !== undefined ? { gstNumber: dto.gstNumber } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return updated;
  }

  async updateOwner(
    restaurantId: string,
    dto: {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    },
  ) {
    const owner = await this.prisma.user.findFirst({
      where: { restaurantId, role: { name: 'OWNER' } },
    });
    if (!owner) throw new NotFoundException('Owner user not found for this restaurant');

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.email) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const updated = await this.prisma.user.update({
      where: { id: owner.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
      },
    });

    return updated;
  }
}
