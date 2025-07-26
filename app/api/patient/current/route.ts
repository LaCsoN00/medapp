import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
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

    // Vérifier que l'utilisateur est un patient
    if (decoded.role !== 'PATIENT') {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer les informations du patient avec ses rendez-vous
    const patient = await prisma.patient.findUnique({
      where: { userId: decoded.id },
      include: {
        appointments: {
          include: {
            medecin: {
              include: {
                user: true,
                speciality: true
              }
            }
          }
        }
      }
    });

    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        photo: patient.photo,
        appointments: patient.appointments
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du patient:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
} 