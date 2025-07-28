import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    let userId: number;
    let userRole: string;
    
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
      userId = payload.id;
      userRole = payload.role;
    } catch {
      return NextResponse.json({ error: 'Token invalide.' }, { status: 401 });
    }

    // Récupérer les prescriptions selon le rôle
    if (userRole === 'PATIENT') {
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

      // Récupérer les prescriptions du patient
      const prescriptions = await prisma.prescription.findMany({
        where: { patientId: patient.id },
        include: {
          medecin: {
            include: {
              speciality: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Formater les données pour le frontend
      const formattedPrescriptions = prescriptions.map(prescription => ({
        id: prescription.id,
        medication: prescription.medication,
        dosage: prescription.dosage,
        renewal: prescription.renewal,
        createdAt: prescription.createdAt,
        patientId: prescription.patientId,
        medecinId: prescription.medecinId,
        pendingDeletion: prescription.pendingDeletion,
        medecin: prescription.medecin ? {
          id: prescription.medecin.id,
          firstName: prescription.medecin.firstName,
          lastName: prescription.medecin.lastName,
          photo: prescription.medecin.photo,
          speciality: prescription.medecin.speciality ? {
            name: prescription.medecin.speciality.name
          } : undefined
        } : undefined
      }));

      return NextResponse.json(formattedPrescriptions);

    } else if (userRole === 'MEDECIN' || userRole === 'DOCTEUR') {
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

      // Récupérer les prescriptions du médecin
      const prescriptions = await prisma.prescription.findMany({
        where: { medecinId: medecin.id },
        include: {
          patient: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Formater les données pour le frontend
      const formattedPrescriptions = prescriptions.map(prescription => ({
        id: prescription.id,
        medication: prescription.medication,
        dosage: prescription.dosage,
        renewal: prescription.renewal,
        createdAt: prescription.createdAt,
        pendingDeletion: prescription.pendingDeletion,
        patient: prescription.patient ? {
          firstName: prescription.patient.firstName,
          lastName: prescription.patient.lastName,
          photo: prescription.patient.photo
        } : undefined
      }));

      return NextResponse.json(formattedPrescriptions);

    } else {
      return NextResponse.json(
        { error: 'Rôle non autorisé' },
        { status: 403 }
      );
    }

  } catch (error) {
    console.error("Erreur lors de la récupération des prescriptions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des prescriptions" },
      { status: 500 }
    );
  }
} 