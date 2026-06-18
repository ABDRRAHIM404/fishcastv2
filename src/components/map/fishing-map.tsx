'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPinned } from 'lucide-react';
import { MAP_CONFIG } from '@/config/map';
import { SPOT_TYPE_LABELS, type Spot } from '@/types/spot';
import { cn } from '@/lib/utils';

interface FishingMapProps {
  spots: Spot[];
  className?: string;
}

function SpotBounds({ spots }: { spots: Spot[] }) {
  const map = useMap();

  useEffect(() => {
    if (spots.length <= 1) return;

    const bounds = L.latLngBounds(
      spots.map((spot) => [spot.latitude, spot.longitude] as [number, number])
    );

    map.fitBounds(bounds, {
      padding: [MAP_CONFIG.fitBoundsPadding, MAP_CONFIG.fitBoundsPadding],
      maxZoom: 11,
      animate: false,
    });
  }, [map, spots]);

  return null;
}

function configureLeafletIconDefaults() {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  });
}

export function FishingMap({ spots, className }: FishingMapProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    configureLeafletIconDefaults();
    setIsReady(true);
  }, []);

  const markers = useMemo(
    () =>
      spots.map((spot) => (
        <Marker key={spot.id} position={[spot.latitude, spot.longitude]}>
          <Popup>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{spot.name}</p>
              <p className="text-muted-foreground">{SPOT_TYPE_LABELS[spot.spotType]}</p>
              <a className="text-primary underline" href={`/spots/${spot.slug}`}>
                View spot
              </a>
            </div>
          </Popup>
        </Marker>
      )),
    [spots]
  );

  return (
    <div
      className={cn(
        'relative h-[60vh] min-h-[420px] w-full overflow-hidden rounded-2xl border border-border/70 shadow-premium',
        className
      )}
    >
      <MapContainer
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {spots.length > 1 ? <SpotBounds spots={spots} /> : null}
        {markers}
      </MapContainer>

      {!isReady ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading map…</p>
        </div>
      ) : null}

      {isReady && spots.length === 0 ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 p-6 text-center">
          <MapPinned className="size-6 text-muted-foreground" />
          <p className="max-w-sm text-sm text-muted-foreground">
            No spots are available to display on the map.
          </p>
        </div>
      ) : null}
    </div>
  );
}
