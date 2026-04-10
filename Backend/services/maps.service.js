const axios = require('axios');
const captainModel = require('../models/captain.model');

const requireGoogleMapsApiKey = () => {
    const apiKey = (process.env.GOOGLE_MAPS_API || '').trim();
    if (!apiKey) {
        const err = new Error('Google Maps API key not configured (GOOGLE_MAPS_API)');
        err.code = 'GOOGLE_MAPS_API_KEY_MISSING';
        throw err;
    }
    return apiKey;
};

const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;

    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const parseGoogleDurationSeconds = (duration) => {
    // Routes API returns a string like "123s" or "3.5s"
    if (typeof duration !== 'string') return null;
    const match = duration.trim().match(/^([0-9]+(?:\.[0-9]+)?)s$/);
    if (!match) return null;
    const seconds = Number(match[ 1 ]);
    return Number.isFinite(seconds) ? seconds : null;
};

const toGoogleApiError = (err, fallbackMessage) => {
    const googleMessage = err?.response?.data?.error?.message;
    if (googleMessage) {
        const e = new Error(googleMessage);
        e.status = err?.response?.status;
        return e;
    }

    const e = new Error(fallbackMessage || err?.message || 'Request failed');
    e.status = err?.response?.status;
    return e;
};

module.exports.getAddressCoordinate = async (address) => {
    const apiKey = requireGoogleMapsApiKey();
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        if (response.data.status === 'OK') {
            const location = response.data.results[ 0 ].geometry.location;
            return {
                ltd: location.lat,
                lng: location.lng
            };
        } else {
            const msg = response.data?.error_message || response.data?.status || 'Unable to fetch coordinates';
            throw new Error(msg);
        }
    } catch (error) {
        console.error('Google Maps API error (geocode):', error?.response?.data?.error?.message || error?.message || error);
        throw toGoogleApiError(error, 'Unable to fetch coordinates');
    }
}

module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    const apiKey = requireGoogleMapsApiKey();

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const body = {
        origin: {
            address: String(origin)
        },
        destination: {
            address: String(destination)
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        units: 'METRIC'
    };

    try {
        const response = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.localizedValues.distance.text,routes.localizedValues.duration.text'
            }
        });

        const route = response.data?.routes?.[ 0 ];
        if (!route) {
            throw new Error('No routes found');
        }

        const distanceMeters = Number(route.distanceMeters);
        const durationSeconds = parseGoogleDurationSeconds(route.duration);

        if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) {
            throw new Error('Unable to fetch distance and time');
        }

        // Keep response compatible with Distance Matrix element shape.
        return {
            distance: {
                value: distanceMeters,
                text: route.localizedValues?.distance?.text || `${(distanceMeters / 1000).toFixed(1)} km`
            },
            duration: {
                value: Math.round(durationSeconds),
                text: route.localizedValues?.duration?.text || `${Math.max(1, Math.round(durationSeconds / 60))} mins`
            },
            status: 'OK'
        };
    } catch (err) {
        console.error('Google Maps API error (routes):', err?.response?.data?.error?.message || err?.message || err);
        throw toGoogleApiError(err, 'Unable to fetch distance and time');
    }
}

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new Error('query is required');
    }

    const apiKey = requireGoogleMapsApiKey();
    const url = 'https://places.googleapis.com/v1/places:autocomplete';

    try {
        const response = await axios.post(
            url,
            {
                input: String(input),
                // Bias formatting + suggestions for India by default (optional)
                regionCode: 'in',
                languageCode: 'en'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'suggestions.placePrediction.text.text,suggestions.queryPrediction.text.text'
                }
            }
        );

        const suggestions = response.data?.suggestions;
        if (!Array.isArray(suggestions)) {
            return [];
        }

        return suggestions
            .map((s) => s?.placePrediction?.text?.text || s?.queryPrediction?.text?.text)
            .filter((value) => Boolean(value));
    } catch (err) {
        console.error('Google Maps API error (places autocomplete):', err?.response?.data?.error?.message || err?.message || err);
        throw toGoogleApiError(err, 'Unable to fetch suggestions');
    }
}

module.exports.getCaptainsInTheRadius = async (ltd, lng, radius) => {

    // radius in km

    const lat = Number(ltd);
    const lon = Number(lng);
    const radiusKm = Number(radius);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radiusKm) || radiusKm <= 0) {
        throw new Error('Invalid radius search parameters');
    }

    // Prefer fast geospatial query when locationGeo is present.
    let nearCaptains = [];
    try {
        nearCaptains = await captainModel.find({
            locationGeo: {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [ lon, lat ]
                    },
                    $maxDistance: Math.round(radiusKm * 1000)
                }
            }
        });
    } catch (err) {
        // If index isn't built yet or docs don't have locationGeo, fall back.
        console.warn('Geo query failed, falling back to haversine filter:', err?.message || err);
    }

    // Fallback for older documents (or if index not built yet)
    if (!nearCaptains.length) {
        const captains = await captainModel.find({
            'location.ltd': { $type: 'number' },
            'location.lng': { $type: 'number' }
        });

        return captains.filter((captain) => {
            const cLat = captain?.location?.ltd;
            const cLng = captain?.location?.lng;
            if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) return false;
            return haversineDistanceKm(lat, lon, cLat, cLng) <= radiusKm;
        });
    }

    return nearCaptains;


}