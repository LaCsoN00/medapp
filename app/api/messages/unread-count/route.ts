import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Paramètre userId manquant' }, { status: 400 });
    }
    const count = await prisma.message.count({
      where: {
        receiverId: Number(userId),
        lu: false,
      },
    });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la récupération du nombre de messages non lus' }, { status: 500 });
  }
} 