import { createHmac, timingSafeEqual } from 'node:crypto';

// A short-lived proof that this user's device was inside the branch's
// geo-fence. Issued by POST /hotel/geofence/check, sent back as an httpOnly
// cookie, and required by GeofenceGuard on every staff API call for a branch
// that has the fence switched on.

export const GEOFENCE_PASS_TTL_MS = 15 * 60_000;
export const geofenceCookieName = (branchId: string) => `geo_${branchId.replace(/[^A-Za-z0-9_-]/g, '')}`;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return `geofence:${s}`;
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueGeofencePass(userId: string, branchId: string, now = Date.now()) {
  const payload = `${userId}.${branchId}.${now + GEOFENCE_PASS_TTL_MS}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

export function verifyGeofencePass(token: string | undefined, userId: string, branchId: string, now = Date.now()): boolean {
  if (!token) return false;
  const [b64, mac] = token.split('.');
  if (!b64 || !mac) return false;
  const payload = Buffer.from(b64, 'base64url').toString();
  const expected = sign(payload);
  if (expected.length !== mac.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(mac))) return false;
  const [u, b, exp] = payload.split('.');
  return u === userId && b === branchId && Number(exp) > now;
}

/** Great-circle distance in metres. */
export function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}
