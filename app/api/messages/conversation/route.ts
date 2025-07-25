import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userA = searchParams.get('userA');
    const userB = searchParams.get('userB');
    if (!userA || !userB) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: Number(userA), receiverId: Number(userB) },
          { senderId: Number(userB), receiverId: Number(userA) },
        ],
      },
      orderBy: { sentAt: 'asc' },
    });
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la récupération des messages' }, { status: 500 });
  }
} 