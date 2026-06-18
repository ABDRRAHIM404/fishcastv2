/** Map defaults centered on the Souss-Massa coastline. */
export const MAP_CONFIG = {
  /** [lat, lng] center over the Souss-Massa coast for Leaflet. */
  center: [30.0, -9.5] as [number, number],
  zoom: 9,
  minZoom: 5,
  maxZoom: 16,
  /** Padding (px) used when fitting all spots into view. */
  fitBoundsPadding: 64,
} as const;
