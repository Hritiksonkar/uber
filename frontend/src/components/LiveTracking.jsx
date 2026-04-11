import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const containerStyle = {
    width: '100%',
    height: '100%',
};

const center = {
    lat: -3.745,
    lng: -38.523
};

const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const RecenterOnPosition = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (!position) return;
        map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
    }, [position, map]);
    return null;
};

const LiveTracking = () => {
    const [currentPosition, setCurrentPosition] = useState(center);

    // Mappls key is used for tile requests (Advanced Maps tile API).
    // Env name kept flexible.
    const mapplsKey = (import.meta.env.VITE_MAPPLS_MAPS_API || import.meta.env.VITE_MAPPLS_REST_KEY || '').trim();

    const tileUrl = useMemo(() => {
        if (!mapplsKey) return '';
        // Common Mappls/MapmyIndia tile URL pattern (may vary by account/plan).
        // If your plan uses a different pattern, set VITE_MAPPLS_TILE_URL in .env.
        const override = (import.meta.env.VITE_MAPPLS_TILE_URL || '').trim();
        if (override) {
            return override
                .replace('{key}', encodeURIComponent(mapplsKey));
        }
        return `https://apis.mappls.com/advancedmaps/v1/${encodeURIComponent(mapplsKey)}/map_tile/{z}/{x}/{y}.png`;
    }, [mapplsKey]);

    useEffect(() => {
        if (!navigator.geolocation) return;

        const setFromPosition = (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentPosition({ lat: latitude, lng: longitude });
        };

        navigator.geolocation.getCurrentPosition(setFromPosition);
        const watchId = navigator.geolocation.watchPosition(setFromPosition);

        // Fallback polling (some devices stop emitting watchPosition reliably)
        const intervalId = setInterval(() => {
            navigator.geolocation.getCurrentPosition(setFromPosition);
        }, 10000);

        return () => {
            navigator.geolocation.clearWatch(watchId);
            clearInterval(intervalId);
        };
    }, []);

    if (!mapplsKey) {
        return (
            <div className='h-full w-full flex items-center justify-center p-4 text-center'>
                Mappls key missing. Add <code>VITE_MAPPLS_MAPS_API</code> (or <code>VITE_MAPPLS_REST_KEY</code>) in <code>frontend/.env</code> and restart the dev server.
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <MapContainer
                center={[currentPosition.lat, currentPosition.lng]}
                zoom={15}
                style={containerStyle}
                zoomControl={false}
            >
                <RecenterOnPosition position={currentPosition} />
                <TileLayer
                    url={tileUrl}
                />
                <Marker
                    position={[currentPosition.lat, currentPosition.lng]}
                    icon={markerIcon}
                />
            </MapContainer>
        </div>
    )
}

export default LiveTracking