import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from './db.ts';

// Ephemeral fallback secret if JWT_SECRET env var isn't set (never hardcoded static string)
const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');

export function getJwtSecret(): string {
  return process.env.JWT_SECRET && process.env.JWT_SECRET !== 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET'
    ? process.env.JWT_SECRET
    : EPHEMERAL_SECRET;
}

export interface AdminJwtPayload {
  id: number;
  email: string;
  name: string;
  role: string;
}

export function signAdminToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '12h' });
}

export function verifyAdminToken(token: string): AdminJwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AdminJwtPayload;
  } catch {
    return null;
  }
}

export interface AuthedRequest extends Request {
  admin?: AdminJwtPayload;
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.af_admin_token;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const decoded = verifyAdminToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }
  const existing = db.prepare('SELECT id, email, name, role FROM admin_users WHERE id = ?').get(decoded.id) as
    | AdminJwtPayload
    | undefined;
  if (!existing) {
    res.status(401).json({ error: 'Admin account no longer exists' });
    return;
  }
  req.admin = existing;
  next();
}

// Simple sliding-window in-memory rate limiter for sensitive endpoints
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.path}:${req.ip || 'unknown'}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (bucket.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      return;
    }
    bucket.count += 1;
    next();
  };
}
