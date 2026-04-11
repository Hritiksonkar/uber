const axios = require('axios');
const captainModel = require('../models/captain.model');

const getGoogleApiKey = () => {
    const key = (process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    return key;
};

const hasMapplsOAuthCredentials = () => {
    const clientId = (process.env.MAPPLS_CLIENT_ID || '').trim();
    const clientSecret = (process.env.MAPPLS_CLIENT_SECRET || '').trim();
    return Boolean(clientId && clientSecret);
};

const hasMapplsRestKey = () => {
    const key = (process.env.MAPPLS_REST_KEY || process.env.Mappls_MAPS_API || '').trim();
    return Boolean(key);
};

const normalizePlaceId = (value) => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return trimmed;
};

const normalizeAddress = (value) => {
    if (value === null || value === undefined) return '';
    const trimmed = String(value).trim();
    return trimmed;
};

const requireMapplsRestKey = () => {
    // REST key is used for Advanced Maps endpoints (route, tiles, etc.).
    // Backwards compat: allow using Mappls_MAPS_API if MAPPLS_REST_KEY isn't set.
    const apiKey = (process.env.MAPPLS_REST_KEY || process.env.Mappls_MAPS_API || '').trim();
    if (!apiKey) {
        const err = new Error('Mappls REST key not configured (MAPPLS_REST_KEY)');
        err.code = 'MAPPLS_API_KEY_MISSING';
        err.status = 500;
        throw err;
    }
    return apiKey;
};

const requireMapplsClientCredentials = () => {
    const clientId = (process.env.MAPPLS_CLIENT_ID || '').trim();
    const clientSecret = (process.env.MAPPLS_CLIENT_SECRET || '').trim();
    if (!clientId || !clientSecret) {
        const err = new Error('Mappls OAuth credentials not configured (MAPPLS_CLIENT_ID / MAPPLS_CLIENT_SECRET)');
        err.code = 'MAPPLS_OAUTH_MISSING';
        err.status = 500;
        throw err;
    }
    return { clientId, clientSecret };
};

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_PLACES_AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const GOOGLE_DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

const toGoogleApiError = (err, fallbackMessage) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const message =
        (typeof data?.error_message === 'string' && data.error_message) ||
        (typeof data?.error?.message === 'string' && data.error.message) ||
        err?.message ||
        fallbackMessage ||
        'Request failed';

    const e = new Error(message);
    e.status = Number.isFinite(status) ? status : 500;
    e.code = 'GOOGLE_MAPS_ERROR';
    return e;
};

const requireGoogleApiKey = () => {
    const key = getGoogleApiKey();
    if (!key) {
        const err = new Error('Google Maps API key not configured (GOOGLE_MAPS_API_KEY)');
        err.code = 'GOOGLE_API_KEY_MISSING';
        err.status = 500;
        throw err;
    }
    return key;
};

const googleGeocode = async ({ address, placeId }) => {
    const key = requireGoogleApiKey();
    const params = { key };
    if (placeId) params.place_id = placeId;
    if (address) params.address = address;

    const response = await axios.get(GOOGLE_GEOCODE_URL, { params });
    const data = response.data;
    const status = data?.status;
    if (status !== 'OK') {
        const msg = data?.error_message || `Google Geocode failed (${status || 'UNKNOWN'})`;
        const e = new Error(msg);
        e.status = 502;
        e.code = 'GOOGLE_GEOCODE_FAILED';
        throw e;
    }

    const first = Array.isArray(data?.results) ? data.results[0] : null;
    const loc = first?.geometry?.location;
    const lat = asNumber(loc?.lat);
    const lng = asNumber(loc?.lng);
    if (lat === null || lng === null) {
        const e = new Error('Unable to fetch coordinates');
        e.status = 404;
        e.code = 'GOOGLE_COORDINATES_NOT_FOUND';
        throw e;
    }
    return { ltd: lat, lng };
};

const googleAutocomplete = async (input) => {
    const key = requireGoogleApiKey();
    const response = await axios.get(GOOGLE_PLACES_AUTOCOMPLETE_URL, {
        params: {
            input: String(input),
            key
        }
    });

    const data = response.data;
    const status = data?.status;
    // Google returns ZERO_RESULTS for no matches; treat as empty list.
    if (status !== 'OK' && status !== 'ZERO_RESULTS') {
        const msg = data?.error_message || `Google Places autocomplete failed (${status || 'UNKNOWN'})`;
        const e = new Error(msg);
        e.status = 502;
        e.code = 'GOOGLE_AUTOCOMPLETE_FAILED';
        throw e;
    }

    const preds = Array.isArray(data?.predictions) ? data.predictions : [];
    return preds
        .map((p) => {
            const description = typeof p?.description === 'string' ? p.description.trim() : '';
            const placeId = typeof p?.place_id === 'string' ? p.place_id : null;
            if (!description) return null;
            return { description, placeId };
        })
        .filter(Boolean);
};

const googleDistanceMatrix = async ({ origin, destination, originPlaceId, destinationPlaceId }) => {
    const key = requireGoogleApiKey();
    const origins = originPlaceId ? `place_id:${originPlaceId}` : String(origin);
    const destinations = destinationPlaceId ? `place_id:${destinationPlaceId}` : String(destination);

    const response = await axios.get(GOOGLE_DISTANCE_MATRIX_URL, {
        params: {
            origins,
            destinations,
            key
        }
    });

    const data = response.data;
    const status = data?.status;
    if (status !== 'OK') {
        const msg = data?.error_message || `Google Distance Matrix failed (${status || 'UNKNOWN'})`;
        const e = new Error(msg);
        e.status = 502;
        e.code = 'GOOGLE_DISTANCE_MATRIX_FAILED';
        throw e;
    }

    const element = data?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
        const e = new Error('Unable to fetch distance and time');
        e.status = 404;
        e.code = 'GOOGLE_DISTANCE_NOT_FOUND';
        throw e;
    }

    return {
        distance: {
            value: Number(element.distance?.value) || 0,
            text: String(element.distance?.text || '')
        },
        duration: {
            value: Number(element.duration?.value) || 0,
            text: String(element.duration?.text || '')
        },
        status: 'OK'
    };
};

const getMapplsBaseUrl = () => {
    // Allow overriding in case your Mappls plan uses a different host.
    const base = (process.env.MAPPLS_BASE_URL || 'https://apis.mappls.com/advancedmaps/v1').trim();
    return base.replace(/\/+$/, '');
};

const MAPPLS_OAUTH_URL = 'https://outpost.mappls.com/api/security/oauth/token';
const MAPPLS_PLACES_BASE_URL = 'https://atlas.mappls.com/api/places';

let mapplsTokenCache = {
    accessToken: null,
    expiresAtMs: 0
};

const getMapplsAccessToken = async () => {
    const now = Date.now();
    if (mapplsTokenCache.accessToken && mapplsTokenCache.expiresAtMs - now > 60_000) {
        return mapplsTokenCache.accessToken;
    }

    const { clientId, clientSecret } = requireMapplsClientCredentials();

    const response = await axios.post(
        MAPPLS_OAUTH_URL,
        null,
        {
            params: {
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            }
        }
    );

    const token = response.data?.access_token;
    const expiresIn = Number(response.data?.expires_in);
    if (!token) {
        throw new Error('Unable to obtain Mappls access_token');
    }

    const ttlMs = Number.isFinite(expiresIn) ? expiresIn * 1000 : 15 * 60 * 1000;
    mapplsTokenCache = {
        accessToken: token,
        expiresAtMs: Date.now() + ttlMs
    };

    return token;
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

const toMapplsApiError = (err, fallbackMessage) => {
    // Mappls error payloads vary by API/plan; keep this defensive.
    const status = err?.response?.status;
    const data = err?.response?.data;
    const msg =
        data?.error_description ||
        data?.message ||
        data?.error ||
        (typeof data === 'string' ? data : null);

    const e = new Error(msg || fallbackMessage || err?.message || 'Request failed');

    // Our API is being called by the frontend; a 401 here is almost always
    // interpreted as "user is unauthorized". For Mappls, 401 frequently means
    // "backend credentials/token are invalid" instead.
    const upstreamError = (typeof data?.error === 'string' ? data.error : '').toLowerCase();
    const upstreamDesc = (typeof data?.error_description === 'string' ? data.error_description : '').toLowerCase();

    if (status === 401 && (upstreamError === 'invalid_client' || upstreamDesc.includes('bad client credentials'))) {
        e.code = 'MAPPLS_OAUTH_INVALID_CLIENT';
        e.status = 500;
        e.message = 'Mappls OAuth credentials are invalid. Check MAPPLS_CLIENT_ID / MAPPLS_CLIENT_SECRET in Backend/.env and restart the server.';
        return e;
    }

    if (status === 401 && upstreamError === 'invalid_token') {
        e.code = 'MAPPLS_OAUTH_INVALID_TOKEN';
        e.status = 500;
        e.message = 'Mappls OAuth token is invalid/expired. Restart backend and verify Mappls OAuth credentials.';
        return e;
    }

    if (status === 401) {
        e.code = 'MAPPLS_UNAUTHORIZED';
        e.status = 500;
        e.message = 'Mappls rejected the request as Unauthorized. This usually means your Mappls credentials/token/key are missing or invalid. Verify Backend/.env (MAPPLS_CLIENT_ID / MAPPLS_CLIENT_SECRET and/or MAPPLS_REST_KEY) and restart the server.';
        return e;
    }

    if (status === 412) {
        e.code = 'MAPPLS_PRECONDITION_FAILED';
        e.status = 502;
        return e;
    }

    e.status = status;
    return e;
};

const asNumber = (v) => {
    const n = typeof v === 'string' ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
};

const pickFirst = (...values) => values.find((v) => v !== undefined && v !== null);

const buildSuggestionDescription = (placeName, placeAddress) => {
    const name = typeof placeName === 'string' ? placeName.trim() : '';
    const addr = typeof placeAddress === 'string' ? placeAddress.trim() : '';
    if (name && addr) return `${name}, ${addr}`;
    return name || addr;
};

module.exports.getAddressCoordinate = async (address) => {
    // Backwards compatible signature:
    // - getAddressCoordinate('some address')
    // - getAddressCoordinate({ address: '...', placeId: '...' })
    // - getAddressCoordinate('some address', 'placeId')
    let addressValue = '';
    let placeIdValue = '';

    if (address && typeof address === 'object') {
        addressValue = normalizeAddress(address.address);
        placeIdValue = normalizePlaceId(address.placeId);
    } else {
        addressValue = normalizeAddress(address);
        // Optional 2nd arg supported via arguments
        placeIdValue = normalizePlaceId(arguments[1]);
    }

    if (!addressValue && !placeIdValue) {
        throw new Error('address or placeId is required');
    }

    // If Mappls OAuth isn't configured but Google is, use Google Geocoding.
    if (!hasMapplsOAuthCredentials()) {
        const googleKey = getGoogleApiKey();
        if (googleKey) {
            try {
                return await googleGeocode({ address: addressValue, placeId: placeIdValue });
            } catch (err) {
                throw toGoogleApiError(err, 'Unable to fetch coordinates');
            }
        }
    }

    try {
        // Address -> geocode via OAuth Places API (confirmed endpoint)
        if (addressValue) {
            const accessToken = await getMapplsAccessToken();
            const response = await axios.get(`${MAPPLS_PLACES_BASE_URL}/geocode`, {
                params: {
                    address: addressValue,
                    access_token: accessToken
                }
            });

            const data = response.data;
            const first =
                (Array.isArray(data?.results) && data.results[0]) ||
                (Array.isArray(data) && data[0]) ||
                data;

            const lat = asNumber(pickFirst(first?.latitude, first?.lat));
            const lng = asNumber(pickFirst(first?.longitude, first?.lng, first?.lon));
            if (lat !== null && lng !== null) {
                return { ltd: lat, lng };
            }
        }

        // placeId/eLoc -> try REST-key Advanced Maps endpoint(s) if configured.
        if (placeIdValue) {
            const apiKey = requireMapplsRestKey();
            const baseUrl = getMapplsBaseUrl();
            const candidates = [
                { url: `${baseUrl}/${encodeURIComponent(apiKey)}/place_detail`, params: { place_id: placeIdValue } },
                { url: `${baseUrl}/${encodeURIComponent(apiKey)}/place_detail`, params: { eloc: placeIdValue } }
            ];

            let lastErr = null;
            for (const c of candidates) {
                try {
                    const response = await axios.get(c.url, { params: c.params });
                    const data = response.data;
                    const first =
                        (Array.isArray(data?.results) && data.results[0]) ||
                        data?.copResults ||
                        data?.result ||
                        data;

                    const lat = asNumber(pickFirst(first?.latitude, first?.lat));
                    const lng = asNumber(pickFirst(first?.longitude, first?.lng, first?.lon));

                    if (lat !== null && lng !== null) {
                        return { ltd: lat, lng };
                    }
                } catch (e) {
                    lastErr = e;
                }
            }
            if (lastErr) throw lastErr;
        }

        throw new Error('Unable to fetch coordinates');
    } catch (error) {
        console.error('Mappls API error (geocode/place_detail):', error?.response?.data || error?.message || error);
        throw toMapplsApiError(error, 'Unable to fetch coordinates');
    }
}

module.exports.getDistanceTime = async (origin, destination) => {
    // Backwards compatible signature:
    // - getDistanceTime('origin address', 'destination address')
    // - getDistanceTime({ origin, destination, originPlaceId, destinationPlaceId })
    // - getDistanceTime('origin address', 'destination address', 'originPlaceId', 'destinationPlaceId')
    let originAddress = '';
    let destinationAddress = '';
    let originPlaceId = '';
    let destinationPlaceId = '';

    if (origin && typeof origin === 'object') {
        originAddress = normalizeAddress(origin.origin);
        destinationAddress = normalizeAddress(origin.destination);
        originPlaceId = normalizePlaceId(origin.originPlaceId);
        destinationPlaceId = normalizePlaceId(origin.destinationPlaceId);
    } else {
        originAddress = normalizeAddress(origin);
        destinationAddress = normalizeAddress(destination);
        originPlaceId = normalizePlaceId(arguments[2]);
        destinationPlaceId = normalizePlaceId(arguments[3]);
    }

    if ((!originAddress && !originPlaceId) || (!destinationAddress && !destinationPlaceId)) {
        throw new Error('Origin and destination are required');
    }

    // If Mappls REST key isn't configured but Google is, use Google Distance Matrix.
    if (!hasMapplsRestKey()) {
        const googleKey = getGoogleApiKey();
        if (googleKey) {
            try {
                return await googleDistanceMatrix({
                    origin: originAddress,
                    destination: destinationAddress,
                    originPlaceId,
                    destinationPlaceId
                });
            } catch (err) {
                throw toGoogleApiError(err, 'Unable to fetch distance and time');
            }
        }
    }

    try {
        const apiKey = requireMapplsRestKey();
        const baseUrl = getMapplsBaseUrl();

        // Prefer coordinates for routing.
        const originCoord = await module.exports.getAddressCoordinate({
            address: originAddress,
            placeId: originPlaceId
        });
        const destCoord = await module.exports.getAddressCoordinate({
            address: destinationAddress,
            placeId: destinationPlaceId
        });

        const start = `${originCoord.ltd},${originCoord.lng}`;
        const end = `${destCoord.ltd},${destCoord.lng}`;

        // Route API variants differ across plans; try a couple.
        const candidates = [
            {
                url: `${baseUrl}/${encodeURIComponent(apiKey)}/route`,
                params: { start, destination: end }
            },
            {
                url: `${baseUrl}/${encodeURIComponent(apiKey)}/route_eta`,
                params: { start, destination: end }
            }
        ];

        let lastErr = null;
        for (const c of candidates) {
            try {
                const response = await axios.get(c.url, { params: c.params });
                const data = response.data;

                // Common-ish fields seen across routing APIs:
                // - data?.routes?.[0]?.distance (km) or distance_m / distance
                // - data?.routes?.[0]?.duration (sec) or duration_s
                const route = (Array.isArray(data?.routes) && data.routes[0]) || data?.route || data;

                const distanceKm = asNumber(
                    pickFirst(
                        route?.distance,
                        route?.distanceKm,
                        route?.distance_km,
                        route?.distanceInKm
                    )
                );

                const distanceMeters = asNumber(route?.distance_m) || (distanceKm !== null ? Math.round(distanceKm * 1000) : null);

                const durationSeconds = asNumber(
                    pickFirst(
                        route?.duration,
                        route?.duration_s,
                        route?.durationSec,
                        route?.time,
                        route?.timeTaken
                    )
                );

                if (distanceMeters !== null && durationSeconds !== null) {
                    return {
                        distance: {
                            value: Math.round(distanceMeters),
                            text: `${(distanceMeters / 1000).toFixed(1)} km`
                        },
                        duration: {
                            value: Math.round(durationSeconds),
                            text: `${Math.max(1, Math.round(durationSeconds / 60))} mins`
                        },
                        status: 'OK'
                    };
                }
            } catch (e) {
                lastErr = e;
            }
        }

        throw lastErr || new Error('Unable to fetch distance and time');
    } catch (err) {
        // Fallback to haversine-based estimate.
        console.error('Mappls API error (route):', err?.response?.data || err?.message || err);

        try {
            const originCoord = await module.exports.getAddressCoordinate({
                address: originAddress,
                placeId: originPlaceId
            });
            const destCoord = await module.exports.getAddressCoordinate({
                address: destinationAddress,
                placeId: destinationPlaceId
            });

            const distanceKm = haversineDistanceKm(originCoord.ltd, originCoord.lng, destCoord.ltd, destCoord.lng);
            const distanceMeters = Math.round(distanceKm * 1000);

            const avgSpeedKmph = 30;
            const durationSeconds = Math.max(60, Math.round((distanceKm / avgSpeedKmph) * 3600));

            return {
                distance: {
                    value: distanceMeters,
                    text: `${distanceKm.toFixed(1)} km`
                },
                duration: {
                    value: durationSeconds,
                    text: `${Math.max(1, Math.round(durationSeconds / 60))} mins`
                },
                status: 'FALLBACK'
            };
        } catch (fallbackErr) {
            throw toMapplsApiError(err, fallbackErr?.message || 'Unable to fetch distance and time');
        }
    }
}

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new Error('query is required');
    }

    // Prefer Google if Mappls OAuth isn't configured.
    if (!hasMapplsOAuthCredentials()) {
        const googleKey = getGoogleApiKey();
        if (googleKey) {
            try {
                return await googleAutocomplete(input);
            } catch (err) {
                throw toGoogleApiError(err, 'Unable to fetch suggestions');
            }
        }
    }

    try {
        const accessToken = await getMapplsAccessToken();

        // Autosuggest (token-based) — confirmed endpoint.
        const response = await axios.get(`${MAPPLS_PLACES_BASE_URL}/autosuggest/json`, {
            params: {
                query: String(input),
                access_token: accessToken
            }
        });

        const data = response.data;
        const results =
            (Array.isArray(data?.suggestedLocations) && data.suggestedLocations) ||
            (Array.isArray(data?.suggested_locations) && data.suggested_locations) ||
            (Array.isArray(data?.results) && data.results) ||
            [];

        if (!Array.isArray(results)) return [];

        return results
            .map((r) => {
                const placeName = r?.placeName || r?.place_name || r?.name;
                const placeAddress = r?.placeAddress || r?.address || r?.place_address;
                const eLoc = r?.eLoc || r?.eloc || r?.e_loc || r?.placeId || r?.place_id;
                const description = buildSuggestionDescription(placeName, placeAddress);
                if (!description) return null;
                return {
                    description,
                    placeId: eLoc || null
                };
            })
            .filter(Boolean);
    } catch (err) {
        console.error('Mappls API error (autosuggest/search):', err?.response?.data || err?.message || err);
        // Fallback to Google if available.
        const googleKey = getGoogleApiKey();
        if (googleKey) {
            try {
                return await googleAutocomplete(input);
            } catch (googleErr) {
                throw toGoogleApiError(googleErr, 'Unable to fetch suggestions');
            }
        }
        throw toMapplsApiError(err, 'Unable to fetch suggestions');
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
                        coordinates: [lon, lat]
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