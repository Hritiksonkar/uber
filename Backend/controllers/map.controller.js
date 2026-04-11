const mapService = require('../services/maps.service');
const { validationResult } = require('express-validator');

const sendError = (res, err, fallbackStatus = 500, fallbackMessage = 'Internal server error') => {
    const statusFromService = Number(err?.status);
    const status = Number.isFinite(statusFromService) && statusFromService >= 400 ? statusFromService : fallbackStatus;
    const message = err?.message || fallbackMessage;
    const code = typeof err?.code === 'string' ? err.code : undefined;
    return res.status(status).json(code ? { message, code } : { message });
};


module.exports.getCoordinates = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }


    const { address } = req.query;

    try {
        const coordinates = await mapService.getAddressCoordinate(address);
        res.status(200).json(coordinates);
    } catch (error) {
        const isMissingKey = error?.code === 'MAPPLS_API_KEY_MISSING' || /Mappls API key not configured/i.test(error?.message || '');
        if (isMissingKey) {
            return sendError(res, error, 500, 'Mappls API key not configured');
        }

        // Geocoding may fail with 4xx (invalid key, permissions) or 5xx.
        // Preserve the upstream status when present.
        return sendError(res, error, 404, 'Coordinates not found');
    }
}

module.exports.getDistanceTime = async (req, res, next) => {

    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { origin, destination, originPlaceId, destinationPlaceId } = req.query;

        const distanceTime = await mapService.getDistanceTime({
            origin,
            destination,
            originPlaceId,
            destinationPlaceId
        });

        res.status(200).json(distanceTime);

    } catch (err) {
        console.error(err);
        return sendError(res, err, 500, 'Internal server error');
    }
}

module.exports.getAutoCompleteSuggestions = async (req, res, next) => {

    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const rawInput = req.query?.input;
        const input = typeof rawInput === 'string' ? rawInput.trim() : '';

        // Avoid spamming upstream APIs (and avoid noisy errors on 0-1 char input).
        if (input.length < 2) {
            return res.status(200).json([]);
        }

        const suggestions = await mapService.getAutoCompleteSuggestions(input);

        res.status(200).json(suggestions);
    } catch (err) {
        console.error(err);
        return sendError(res, err, 500, 'Internal server error');
    }
}