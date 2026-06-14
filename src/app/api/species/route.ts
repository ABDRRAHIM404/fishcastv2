import { NextResponse } from 'next/server';
import { getSpeciesCatalog } from '@/lib/species/queries';

export const dynamic = 'force-dynamic';

/** GET /api/species — returns the full regional species catalog. */
export async function GET() {
  try {
    const species = await getSpeciesCatalog();
    return NextResponse.json({ species });
  } catch {
    return NextResponse.json(
      { error: 'Failed to load species catalog' },
      { status: 502 }
    );
  }
}
