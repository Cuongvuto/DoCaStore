import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import AuthRateLimit from '../models/authRateLimitModel.js';

export function ipIdentity(ip = 'unknown') {
  const value = ip.toLowerCase().replace(/^::ffff:(?=\d+\.)/, '');
  if (isIP(value) !== 6) return value;
  // Group IPv6 clients by /64 so rotating an interface address cannot bypass limits.
  const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const [left, right = ''] = canonical.split('::');
  const start = left ? left.split(':') : [];
  const end = right ? right.split(':') : [];
  const parts = canonical.includes('::') ? [...start, ...Array(8 - start.length - end.length).fill('0'), ...end] : start;
  return `${parts.slice(0, 4).map(part => parseInt(part, 16).toString(16)).join(':')}::/64`;
}

export async function consumeLimit(scope, identity, windowMs, now = new Date()) {
  const _id = createHash('sha256').update(`${scope}:${identity}`).digest('hex');
  const expired = { $lte: [{ $ifNull: ['$expiresAt', new Date(0)] }, now] };
  const update = [{ $set: {
    count: { $cond: [expired, 1, { $add: ['$count', 1] }] },
    expiresAt: { $cond: [expired, new Date(now.getTime() + windowMs), '$expiresAt'] },
  } }];
  try {
    return await AuthRateLimit.findOneAndUpdate({ _id }, update, { upsert: true, returnDocument: 'after', updatePipeline: true });
  } catch (error) {
    // Two first requests may race to insert the same key. Retry the atomic update.
    if (error.code !== 11000) throw error;
    return AuthRateLimit.findOneAndUpdate({ _id }, update, { upsert: true, returnDocument: 'after', updatePipeline: true });
  }
}

const minute = 60_000;
export const AUTH_LIMITS = {
  login: [
    { key: 'ip', scope: 'login-ip', max: 50, windowMs: 15 * minute },
    { key: 'email', scope: 'login-email', max: 10, windowMs: 15 * minute },
  ],
  otp: [
    { key: 'ip', scope: 'otp-ip', max: 30, windowMs: 10 * minute },
    { key: 'email', scope: 'otp-email', max: 5, windowMs: 10 * minute },
  ],
  email: [
    { key: 'ip', scope: 'mail-ip', max: 20, windowMs: 15 * minute },
    { key: 'email', scope: 'mail-email', max: 5, windowMs: 15 * minute },
    { key: 'email', scope: 'mail-cooldown', max: 1, windowMs: minute },
  ],
  google: [{ key: 'ip', scope: 'google-ip', max: 30, windowMs: 15 * minute }],
  reset: [{ key: 'ip', scope: 'reset-ip', max: 20, windowMs: 15 * minute }],
  changePassword: [
    { key: 'ip', scope: 'change-password-ip', max: 30, windowMs: 15 * minute },
    { key: 'user', scope: 'change-password-user', max: 5, windowMs: 15 * minute },
  ],
};

export function authRateLimit(kind) {
  return async (req, res, next) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const ip = ipIdentity(req.ip || req.socket?.remoteAddress);
      for (const rule of AUTH_LIMITS[kind]) {
        const identity = rule.key === 'ip' ? ip : rule.key === 'user' ? req.user?.id : email;
        if (!identity) continue;
        const entry = await consumeLimit(rule.scope, identity, rule.windowMs);
        if (entry.count > rule.max) {
          const retryAfter = Math.max(1, Math.ceil((entry.expiresAt.getTime() - Date.now()) / 1000));
          res.set('Retry-After', String(retryAfter));
          return res.status(429).json({ success: false, code: 'AUTH_RATE_LIMIT', retryAfter,
            message: `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ${retryAfter} giây.` });
        }
      }
      next();
    } catch (error) {
      console.error('Auth rate limit unavailable:', error.name);
      return res.status(503).json({ success: false, message: 'Tạm thời chưa thể xác thực. Vui lòng thử lại sau.' });
    }
  };
}
