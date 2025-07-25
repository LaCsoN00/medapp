import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/actions';

export async function POST(request: NextRequest) {
  const { userId, role } = await request.json();
  await logoutUser(userId, role);
  return NextResponse.json({ success: true });
} 