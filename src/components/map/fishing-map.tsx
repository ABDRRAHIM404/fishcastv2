'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
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

export function FishingMap({ spots, className }: FishingMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;

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
      console.error('FishingMap initialization error:', err);
      return;
    }

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));

    map.on('load', () => {
      map.addSource('spots', {
        type: 'geojson',
        data: toFeatureCollection(spots),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 48,
      });

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

      if (spots.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        spots.forEach((s) => bounds.extend([s.longitude, s.latitude]));
        map.fitBounds(bounds, {
          padding: MAP_CONFIG.fitBoundsPadding,
          maxZoom: 11,
          duration: 0,
        });
      }

      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
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

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
      });

      map.on('mouseenter', 'spot-markers', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const { name, spotType, difficulty } = feature.properties as Record<string, string>;
        popup
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setHTML(
            `<div style="font-family:inherit"><strong>${escapeHtml(String(name ?? ''))}</strong><br/>` +
            `<span style="opacity:.7">${escapeHtml(String(spotType ?? ''))} · ${escapeHtml(String(difficulty ?? ''))}</span></div>`
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
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
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
    </div>
  );
}