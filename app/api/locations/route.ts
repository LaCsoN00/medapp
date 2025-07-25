import { NextResponse } from 'next/server';
import { getMedicalLocations } from '@/actions';

export async function GET() {
  const locations = await getMedicalLocations();
  return NextResponse.json(locations);
} 