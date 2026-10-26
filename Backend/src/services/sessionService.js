import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

export async function authenticateSession(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  // Old JWTs and old accounts have version 0 until credentials are revoked.
  const version = decoded.tokenVersion === undefined ? 0 : decoded.tokenVersion;
  if (!decoded.id || !Number.isSafeInteger(version) || version < 0) throw new Error('AUTH_INVALID');
  const user = await User.findById(decoded.id).select('_id role isVerified tokenVersion');
  if (!user?.isVerified || version !== (user.tokenVersion ?? 0)) throw new Error('AUTH_INVALID');
  return { id: user._id.toString(), role: user.role, tokenVersion: version, exp: decoded.exp };
}
