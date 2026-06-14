import { NextResponse } from 'next/server';
import { getSpeciesById } from '@/lib/species/queries';

export const dynamic = 'force-dynamic';

/** GET /api/species/[id] — returns a single species detail. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const species = await getSpeciesById(id);
  if (!species) {
    return NextResponse.json({ error: 'Species not found' }, { status: 404 });
  }
  return NextResponse.json(species);
}
