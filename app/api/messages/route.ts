import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { senderId, receiverId, content } = await req.json();
    if (!senderId || !receiverId || !content) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
      },
    });
    return NextResponse.json(message, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de l\'envoi du message' }, { status: 500 });
  }
} 