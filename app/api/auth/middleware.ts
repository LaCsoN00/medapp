import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function verifyJWT(request: NextRequest, allowedRoles?: string[]) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }
    // Ajoute l'utilisateur à la requête (optionnel, selon usage)
    // (request as any).user = payload; // Retiré pour éviter l'erreur linter
    return null; // Pas d'erreur, accès autorisé
  } catch {
    return NextResponse.json({ error: 'Token invalide.' }, { status: 401 });
  }
} 