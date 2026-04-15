import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const containerStyle = {
    width: '100%',
    height: '100%',
};

// Default center (Delhi) until geolocation resolves.
const center = {
    lat: 28.6139,
    lng: 77.2090
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
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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