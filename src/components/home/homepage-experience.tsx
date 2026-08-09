'use client';

import type { Spot } from '@/types/spot';
import { HomepageCinematicStory } from './sequence/homepage-cinematic-story';
import { HomepageStandardContent } from './homepage-standard-content';
import styles from './homepage.module.css';

export function HomepageExperience({ spots }: { spots: readonly Spot[] }) {
  return (
    <div className={styles.home}>
      <HomepageCinematicStory spots={spots} />
      <HomepageStandardContent spots={spots} />
    </div>
  );
}
