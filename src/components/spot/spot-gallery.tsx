'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { PremiumCard } from '@/components/spot/premium-card';
import { staggerContainer, fadeInUp } from '@/components/shared/motion';
import type { SpotPhoto } from '@/lib/spots/photos';

/**
 * Responsive photo gallery for the spot details page. Renders nothing when the
 * spot has no additional photos, so the layout stays clean for image-light
 * spots.
 */
export function SpotGallery({
  photos,
  spotName,
}: {
  photos: SpotPhoto[];
  spotName: string;
}) {
  if (photos.length === 0) return null;

  return (
    <PremiumCard className="p-6">
      <h2 className="font-display text-h3">Gallery</h2>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {photos.map((photo, index) => (
          <motion.div
            key={photo.id}
            variants={fadeInUp}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border/60"
          >
            <Image
              src={photo.url}
              alt={`${spotName} — photo ${index + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </motion.div>
        ))}
      </motion.div>
    </PremiumCard>
  );
}
