import { createHmac, timingSafeEqual } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export type UserRole = 'guest' | 'customer' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const sessions = new Map<string, AuthUser>();

const encodeBase64Url = (value: string): string => Buffer.from(value).toString('base64url');
const decodeBase64Url = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

export function createToken(user: AuthUser): string {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12
    })
  );
  const signingInput = `${header}.${payload}`;
  const signature = createHmac('sha256', env.jwtSecret).update(signingInput).digest('base64url');
  const token = `${signingInput}.${signature}`;
  sessions.set(token, user);
  return token;
}

export function getSession(token: string): AuthUser | undefined {
  return sessions.get(token) ?? verifyToken(token) ?? undefined;
}

export function setSession(token: string, user: AuthUser): void {
  sessions.set(token, user);
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}

export function hashPassword(password: string): string {
  return createHmac('sha256', env.jwtSecret).update(`password:${password}`).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function verifyToken(token: string): AuthUser | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const signingInput = `${header}.${payload}`;
  const expectedSignature = createHmac('sha256', env.jwtSecret).update(signingInput).digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const decodedPayload = JSON.parse(decodeBase64Url(payload)) as {
      sub?: string;
      email?: string;
      name?: string;
      role?: UserRole;
      exp?: number;
    };

    if (!decodedPayload.email || !decodedPayload.role) {
      return null;
    }

    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: decodedPayload.sub ?? decodedPayload.email,
      email: decodedPayload.email,
      name: decodedPayload.name ?? decodedPayload.email,
      role: decodedPayload.role
    };
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({ message: 'Bạn chưa đăng nhập.' });
    return;
  }

  const user = verifyToken(token) ?? getSession(token);
  if (!user) {
    res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Bạn chưa đăng nhập.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Bạn không có quyền truy cập tính năng này.' });
      return;
    }

    next();
  };
}