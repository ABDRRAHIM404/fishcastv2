/** Map defaults centered on the Souss-Massa coastline. */
export const MAP_CONFIG = {
  /** Dark ocean-themed Mapbox style. */
  style: 'mapbox://styles/mapbox/dark-v11',
  /** [lng, lat] center over the Souss-Massa coast. */
  center: [-9.72, 30.0] as [number, number],
  zoom: 8.2,
  minZoom: 5,
  maxZoom: 16,
  /** Padding (px) used when fitting all spots into view. */
  fitBoundsPadding: 64,
} as const;
