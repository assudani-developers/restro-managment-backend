import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Phase 1 tenancy check: a branch belongs to exactly one restaurant, and a
// user belongs to exactly one restaurant — this confirms the branchId a
// request references actually belongs to the caller's restaurant. It does
@Injectable()
export class BranchAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAccess(restaurantId: string, branchId: string, userId?: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, restaurantId },
      select: { id: true },
    });
    if (!branch) {
      throw new ForbiddenException('Branch not found or not accessible');
    }
    if (!userId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSuperAdmin: true,
        role: { select: { name: true, isSystem: true } },
        branches: { where: { branchId }, select: { branchId: true } },
      },
    });
    if (!user) throw new ForbiddenException('User not found');
    if (user.isSuperAdmin || (user.role.isSystem && user.role.name === 'OWNER')) return;
    if (user.branches.length === 0) {
      throw new ForbiddenException('You are not assigned to this branch');
    }
  }
}
