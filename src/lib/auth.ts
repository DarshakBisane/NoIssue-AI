import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { JwtPayload, UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_noissue_ai_2025';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): JwtPayload | null {
  // 1. Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    if (payload) return payload;
  }

  // 2. Check cookies
  const cookieToken = req.cookies.get('noissue_token')?.value;
  if (cookieToken) {
    const payload = verifyJwt(cookieToken);
    if (payload) return payload;
  }

  return null;
}

export function requireAuth(req: NextRequest, allowedRoles?: UserRole[]): { user: JwtPayload | null; errorResponse: NextResponse | null } {
  const user = getUserFromRequest(req);

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: `Forbidden: Access restricted to ${allowedRoles.join(', ')}.` },
          { status: 403 }
        ),
      };
    }
  }

  return { user, errorResponse: null };
}
