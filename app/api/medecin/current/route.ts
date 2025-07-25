import { NextRequest, NextResponse } from 'next/server';
import { getMedecinByUserId } from '@/actions';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token manquant' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Token invalide' }, { status: 401 });
    }
    // Vérifier que l'utilisateur est un médecin
    if (decoded.role !== 'MEDECIN' && decoded.role !== 'DOCTEUR') {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }
    // Récupérer les informations du médecin
    const medecin = await getMedecinByUserId(decoded.id);
    if (!medecin) {
      return NextResponse.json({ success: false, error: 'Médecin non trouvé' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      medecin: {
        id: medecin.id,
        firstName: medecin.firstName,
        lastName: medecin.lastName,
        email: medecin.email,
        phone: medecin.phone,
        photo: medecin.photo,
        appointments: medecin.appointments
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du médecin:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
} 