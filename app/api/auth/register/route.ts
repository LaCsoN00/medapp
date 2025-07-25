import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password, role, firstName, lastName, specialityId, phone } = await request.json();
    if (!email || !password || !role || !firstName || !lastName) {
      return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
    }
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email déjà utilisé.' }, { status: 409 });
    }
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });
    // Créer le profil associé
    if (role === 'PATIENT') {
      await prisma.patient.create({
        data: {
          email,
          firstName,
          lastName,
          phone: phone || null,
          userId: user.id,
        },
      });
    } else if (role === 'MEDECIN' || role === 'DOCTEUR') {
      await prisma.medecin.create({
        data: {
          firstName,
          lastName,
          email,
          phone: phone || null,
          specialityId,
          userId: user.id,
        },
      });
    }
    return NextResponse.json({ message: 'Utilisateur créé.', user: { id: user.id, email: user.email, role: user.role, firstName, lastName } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
} 