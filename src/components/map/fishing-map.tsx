'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2, MapPinned } from 'lucide-react';
import { MAP_CONFIG } from '@/config/map';
import { SPOT_TYPE_LABELS, DIFFICULTY_LABELS, type Spot } from '@/types/spot';
import { cn } from '@/lib/utils';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface FishingMapProps {
  spots: Spot[];
  className?: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toFeatureCollection(spots: Spot[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: spots.map((spot) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [spot.longitude, spot.latitude],
      },
      properties: {
        slug: spot.slug,
        name: spot.name,
        spotType: SPOT_TYPE_LABELS[spot.spotType],
        difficulty: DIFFICULTY_LABELS[spot.difficultyLevel],
      },
    })),
  };
}

/**
 * Interactive Mapbox map for fishing spots.
 * - Dark ocean style, clustering, smooth fly-to, mobile-friendly controls.
 * - Clicking an unclustered marker navigates to the spot details page.
 */
export function FishingMap({ spots, className }: FishingMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!TOKEN) {
      const message =
        'Map unavailable: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set.';
      console.error(message);
      setErrorMessage(message);
      setStatus('error');
      return;
    }
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = TOKEN;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAP_CONFIG.style,
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
        attributionControl: false,
      });
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : 'Failed to initialize the map.';
      console.error('FishingMap initialization error:', err);
      setErrorMessage(errorText);
      setStatus('error');
      return;
    }

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));

    map.on('error', (e) => {
      console.error('Mapbox error event:', e.error);
      setErrorMessage(e.error?.message ?? 'Map failed to load.');
      setStatus('error');
    });

    map.on('load', () => {
      map.addSource('spots', {
        type: 'geojson',
        data: toFeatureCollection(spots),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 48,
      });

      // Cluster circles.
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'spots',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#1ea7c5',
          'circle-opacity': 0.85,
          'circle-radius': ['step', ['get', 'point_count'], 16, 5, 22, 10, 28],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#06121d',
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'spots',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 13,
        },
        paint: { 'text-color': '#06121d' },
      });

      // Individual spot markers.
      map.addLayer({
        id: 'spot-markers',
        type: 'circle',
        source: 'spots',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#39d4f0',
          'circle-radius': 8,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#06121d',
        },
      });

      // After map.on('load', ...) sets up layers, replace the fitBounds call with:
setTimeout(() => {
  if (spots.length > 1) {
    const bounds = new mapboxgl.LngLatBounds();
    spots.forEach((s) => bounds.extend([s.longitude, s.latitude]));
    map.fitBounds(bounds, {
      padding: MAP_CONFIG.fitBoundsPadding,
      maxZoom: 11,
      duration: 0,
    });
  }
}, 100);

      // Expand clusters on click (mapbox-gl v3 returns a Promise).
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['clusters'],
        });
        const feature = features[0];
        const clusterId = feature?.properties?.cluster_id;
        const source = map.getSource('spots') as mapboxgl.GeoJSONSource;
        if (clusterId == null || !source) return;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          if (feature?.geometry.type === 'Point') {
            map.easeTo({
              center: feature.geometry.coordinates as [number, number],
              zoom,
            });
          }
        });
      });

      // Popup + navigation for individual markers.
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
      });

      map.on('mouseenter', 'spot-markers', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const { name, spotType, difficulty } = feature.properties as Record<
          string,
          string
        >;
        const nameText = escapeHtml(String(name ?? ''));
        const spotTypeText = escapeHtml(String(spotType ?? ''));
        const difficultyText = escapeHtml(String(difficulty ?? ''));
        popup
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setHTML(
            `<div style="font-family:inherit"><strong>${nameText}</strong><br/>` +
              `<span style="opacity:.7">${spotTypeText} · ${difficultyText}</span></div>`
          )
          .addTo(map);
      });

      map.on('mouseleave', 'spot-markers', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      map.on('click', 'spot-markers', (e) => {
        const slug = e.features?.[0]?.properties?.slug;
        if (typeof slug === 'string') router.push(`/spots/${slug}`);
      });

      setStatus('ready');
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // spots are server-provided and stable per render; re-init only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        'relative h-[60vh] min-h-[420px] w-full overflow-hidden rounded-2xl border border-border/70 shadow-premium',
        className
      )}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {status === 'loading' ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading map…</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 p-6 text-center">
          <MapPinned className="size-6 text-muted-foreground" />
          <p className="max-w-sm text-sm text-muted-foreground">
            {errorMessage ?? 'The map could not be loaded.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}