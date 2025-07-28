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
      
      // Vérifier si l'utilisateur est un médecin
      if (payload.role !== 'MEDECIN' && payload.role !== 'DOCTEUR') {
        return NextResponse.json(
          { error: 'Seuls les médecins peuvent modifier des ordonnances' },
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

    // Récupérer les données du body
    const data = await req.json();
    const { medication, dosage, renewal } = data;

    // Vérifier que les champs requis sont présents
    if (!medication || !dosage) {
      return NextResponse.json(
        { error: 'Médicament et posologie sont requis' },
        { status: 400 }
      );
    }

    // Récupérer le médecin connecté
    const medecin = await prisma.medecin.findFirst({
      where: { userId },
    });

    if (!medecin) {
      return NextResponse.json(
        { error: 'Médecin non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que l'ordonnance existe
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: {
          include: {
            appointments: {
              where: { medecinId: medecin.id },
            },
          },
        },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: 'Ordonnance non trouvée' },
        { status: 404 }
      );
    }

    // Mettre à jour l'ordonnance
    const updatedPrescription = await prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        medication,
        dosage,
        renewal: renewal ?? false,
      },
    });

    return NextResponse.json(updatedPrescription);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'ordonnance:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'ordonnance" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      
      // Vérifier si l'utilisateur est un médecin
      if (payload.role !== 'MEDECIN' && payload.role !== 'DOCTEUR') {
        return NextResponse.json(
          { error: 'Seuls les médecins peuvent supprimer des ordonnances' },
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

    // Récupérer le médecin connecté
    const medecin = await prisma.medecin.findFirst({
      where: { userId },
    });

    if (!medecin) {
      return NextResponse.json(
        { error: 'Médecin non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que l'ordonnance existe et appartient à ce médecin
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: {
          include: {
            appointments: {
              where: { medecinId: medecin.id },
            },
          },
        },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: 'Ordonnance non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que l'ordonnance a été prescrite par ce médecin
    if (prescription.medecinId !== medecin.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez supprimer que vos propres ordonnances' },
        { status: 403 }
      );
    }

    // Supprimer l'ordonnance
    await prisma.prescription.delete({
      where: { id: prescriptionId },
    });

    return NextResponse.json(
      { message: 'Ordonnance supprimée avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de la suppression de l'ordonnance:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'ordonnance" },
      { status: 500 }
    );
  }
} 