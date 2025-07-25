import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'; // À sécuriser en prod

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email }, include: { patient: true, medecin: true } });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé.' }, { status: 404 });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
    }
    // Générer le JWT
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    // Récupérer prénom/nom selon le rôle
    let firstName = null;
    let lastName = null;
    let phone = null;
    if (user.role === 'PATIENT') {
      if (!user.patient) {
        // Créer un profil Patient par défaut
        await prisma.patient.create({
          data: {
            email: user.email,
            firstName: 'Utilisateur',
            lastName: 'Patient',
            userId: user.id,
          },
        });
        firstName = 'Utilisateur';
        lastName = 'Patient';
      } else {
        firstName = user.patient.firstName;
        lastName = user.patient.lastName;
        phone = user.patient.phone;
      }
    } else if ((user.role === 'MEDECIN' || user.role === 'DOCTEUR') && user.medecin) {
      firstName = user.medecin.firstName;
      lastName = user.medecin.lastName;
    }
    return NextResponse.json({ token, user: { id: user.id, email: user.email, role: user.role, firstName, lastName, phone } });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
} 