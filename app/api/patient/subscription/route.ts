import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getPatientByUserId } from '@/actions';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { userId, medicalLocationId, endDate } = await request.json();
    if (!userId || !medicalLocationId) {
      return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
    }
    // Récupérer le patient à partir du userId
    const patient = await getPatientByUserId(userId);
    if (!patient) {
      return NextResponse.json({ error: 'Aucun patient lié à cet utilisateur.' }, { status: 404 });
    }
    const patientId = patient.id;
    // Vérifier si la souscription existe déjà
    const existing = await prisma.subscription.findUnique({
      where: {
        patientId_medicalLocationId: {
          patientId,
          medicalLocationId
        }
      }
    });
    if (existing && existing.status === 'ACTIVE') {
      return NextResponse.json({ error: 'Déjà abonné à cette structure.' }, { status: 409 });
    }
    // Créer la souscription
    const subscription = await prisma.subscription.upsert({
      where: {
        patientId_medicalLocationId: {
          patientId,
          medicalLocationId
        }
      },
      update: {
        status: 'ACTIVE',
        endDate: endDate || null
      },
      create: {
        patientId,
        medicalLocationId,
        endDate: endDate || null,
        status: 'ACTIVE'
      }
    });
    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error('Erreur souscription:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
} 