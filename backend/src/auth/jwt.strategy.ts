import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { PERMISSIONS, type SessionUser } from '@restrocore/types';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  impersonatedRestaurantId?: string;
}

const cookieExtractor = (req: {
  cookies?: Record<string, string>;
}): string | null => {
  return req.cookies?.['restrocore_session'] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<SessionUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        restaurant: { select: { id: true, name: true, isActive: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Session no longer valid');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('USER_DEACTIVATED: Your account has been deactivated');
    }

    const isSuper = Boolean(user.isSuperAdmin);

    // Enforce real-time SaaS suspension for restaurants
    if (!isSuper && user.restaurant && !user.restaurant.isActive) {
      throw new UnauthorizedException(
        'ACCOUNT_SUSPENDED: Your restaurant account has been suspended by the SaaS platform administrator.',
      );
    }

    const targetRestaurantId =
      isSuper && payload.impersonatedRestaurantId
        ? payload.impersonatedRestaurantId
        : user.restaurantId;

    return {
      id: user.id,
      restaurantId: targetRestaurantId,
      name: user.name,
      roleId: user.roleId,
      roleName: isSuper ? 'SUPERADMIN' : user.role.name,
      permissions: isSuper
        ? PERMISSIONS.map((p) => p.key)
        : user.role.permissions.map((rp) => rp.permission.key),
      isSuperAdmin: isSuper,
    };
  }
}
