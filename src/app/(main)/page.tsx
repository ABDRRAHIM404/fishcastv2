import { unstable_rethrow } from 'next/navigation';
import { HomepageExperience } from '@/components/home/homepage-experience';
import { getActiveSpots } from '@/lib/spots/queries';
import type { Spot } from '@/types/spot';

export default async function HomePage() {
  let spots: Spot[] = [];

  try {
    spots = await getActiveSpots();
  } catch (error) {
    // Never swallow Next's internal dynamic-rendering signals.
    unstable_rethrow(error);
    // The story and product explanation remain useful if public spot data is
    // temporarily unavailable. Provider details stay in server logs only.
    console.error('Homepage spots unavailable', error);
  }

  return <HomepageExperience spots={spots} />;
}
