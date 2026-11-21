import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { geofenceCookieName, verifyGeofencePass } from '../geofence-pass';
import type { AuthenticatedRequest } from '../types/authenticated-request';

// Calls the geo-fence UI itself needs before a pass can exist.
const EXEMPT = [/\/auth\//, /\/hotel\/geofence\/check/, /\/hotel\/settings$/, /\/branches$/, /\/notifications/];

/**
 * Server-side half of the staff geo-fence (spec §14). Hiding the UI is not a
 * boundary, so every authenticated branch-scoped request must carry a valid,
 * unexpired pass for that branch when the branch enforces the fence. Super
 * admins are exempt (remote support). Guest/public routes never reach here.
 */
@Injectable()
export class GeofenceGuard implements CanActivate {
  private cache = new Map<string, { enforced: boolean; at: number }>();

  constructor(private readonly prisma: PrismaService) {}

  private async enforced(branchId: string) {
    const hit = this.cache.get(branchId);
    if (hit && Date.now() - hit.at < 30_000) return hit.enforced;
    const b = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { geofenceEnabled: true, latitude: true, longitude: true },
    });
    const enforced = !!b?.geofenceEnabled && b.latitude != null && b.longitude != null;
    this.cache.set(branchId, { enforced, at: Date.now() });
    return enforced;
  }

  /** Called when settings change so the new rule applies at once. */
  invalidate(branchId: string) {
    this.cache.delete(branchId);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.user;
    if (!user || user.isSuperAdmin) return true;
    const path = req.path ?? req.url;
    if (EXEMPT.some((r) => r.test(path))) return true;
    const branchId =
      typeof req.query?.branchId === 'string'
        ? req.query.branchId
        : typeof req.body?.branchId === 'string'
          ? req.body.branchId
          : null;
    if (!branchId || !(await this.enforced(branchId))) return true;
    const token = (req.cookies as Record<string, string> | undefined)?.[geofenceCookieName(branchId)];
    if (verifyGeofencePass(token, user.id, branchId)) return true;
    throw new ForbiddenException({
      message: 'Staff access is allowed only at the hotel. Verify your location to continue.',
      code: 'GEOFENCE_REQUIRED',
    });
  }
}
