import React, { useState, useEffect } from 'react'
import { LoadScript, GoogleMap, Marker } from '@react-google-maps/api'

const containerStyle = {
    width: '100%',
    height: '100%',
};

const center = {
    lat: -3.745,
    lng: -38.523
};

const LiveTracking = () => {
    const [ currentPosition, setCurrentPosition ] = useState(center);

    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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

    if (!googleMapsApiKey) {
        return (
            <div className='h-full w-full flex items-center justify-center p-4 text-center'>
                Google Maps API key missing. Add <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>frontend/.env</code> and restart the dev server.
            </div>
        );
    }

    return (
        <LoadScript googleMapsApiKey={googleMapsApiKey}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={currentPosition}
                zoom={15}
            >
                <Marker position={currentPosition} />
            </GoogleMap>
        </LoadScript>
    )
}

export default LiveTracking