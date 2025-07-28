import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    let userId: number;
    
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
      userId = payload.id;
      
      // Vérifier si l'utilisateur est un patient
      if (payload.role !== 'PATIENT') {
        return NextResponse.json(
          { error: 'Seuls les patients peuvent demander la suppression d\'ordonnances' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json({ error: 'Token invalide.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const prescriptionId = parseInt(resolvedParams.id);
    if (isNaN(prescriptionId)) {
      return NextResponse.json(
        { error: "ID d'ordonnance invalide" },
        { status: 400 }
      );
    }

    // Récupérer le patient connecté
    const patient = await prisma.patient.findFirst({
      where: { userId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que l'ordonnance existe et appartient à ce patient
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        medecin: true,
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: 'Ordonnance non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que l'ordonnance appartient à ce patient
    if (prescription.patientId !== patient.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez demander la suppression que de vos propres ordonnances' },
        { status: 403 }
      );
    }

    // Récupérer les données du body
    const data = await req.json();
    const { pendingDeletion } = data;

    // Mettre à jour l'ordonnance pour marquer la demande de suppression
    const updatedPrescription = await prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        pendingDeletion: pendingDeletion ?? true,
      },
      include: {
        medecin: true,
      },
    });

    return NextResponse.json(updatedPrescription);
  } catch (error) {
    console.error("Erreur lors de la demande de suppression de l'ordonnance:", error);
    return NextResponse.json(
      { error: "Erreur lors de la demande de suppression de l'ordonnance" },
      { status: 500 }
    );
  }
} 