import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getPatientByUserId } from '@/actions';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { 
      userId, 
      medicalLocationId, 
      type = 'INDIVIDUAL', 
      endDate,
      familyMembers,
      structureDetails 
    } = await request.json();
    
    if (!userId || !medicalLocationId) {
      return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
    }
    
    // Récupérer le patient à partir du userId
    const patient = await getPatientByUserId(userId);
    if (!patient) {
      return NextResponse.json({ error: 'Aucun patient lié à cet utilisateur.' }, { status: 404 });
    }
    const patientId = patient.id;
    
    // Validation spécifique au type d'abonnement
    if (type === 'FAMILY' && (!familyMembers || !Array.isArray(familyMembers) || familyMembers.length === 0)) {
      return NextResponse.json({ error: 'Membres de famille requis pour l\'abonnement famille.' }, { status: 400 });
    }
    
    if (type === 'STRUCTURE' && !structureDetails) {
      return NextResponse.json({ error: 'Détails de la structure requis pour l\'abonnement structure.' }, { status: 400 });
    }
    
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
      // Mettre à jour l'abonnement existant
      const updatedSubscription = await prisma.subscription.update({
        where: {
          patientId_medicalLocationId: {
            patientId,
            medicalLocationId
          }
        },
        data: {
          type,
          status: 'ACTIVE',
          endDate: endDate || null,
          familyMembers: familyMembers ? JSON.stringify(familyMembers) : null,
          structureDetails: structureDetails || null
        }
      });
      return NextResponse.json({ success: true, subscription: updatedSubscription });
    }
    
    // Créer la souscription
    const subscription = await prisma.subscription.create({
      data: {
        patientId,
        medicalLocationId,
        type,
        endDate: endDate || null,
        status: 'ACTIVE',
        familyMembers: familyMembers ? JSON.stringify(familyMembers) : null,
        structureDetails: structureDetails || null
      }
    });
    
    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error('Erreur souscription:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
} 