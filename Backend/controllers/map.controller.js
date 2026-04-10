const mapService = require('../services/maps.service');
const { validationResult } = require('express-validator');


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
        const isMissingKey = error?.code === 'GOOGLE_MAPS_API_KEY_MISSING' || /API key not configured/i.test(error?.message || '');
        if (isMissingKey) {
            return res.status(500).json({ message: error.message });
        }

        return res.status(404).json({ message: error.message || 'Coordinates not found' });
    }
}

module.exports.getDistanceTime = async (req, res, next) => {

    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { origin, destination } = req.query;

        const distanceTime = await mapService.getDistanceTime(origin, destination);

        res.status(200).json(distanceTime);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || 'Internal server error' });
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
        res.status(500).json({ message: err.message || 'Internal server error' });
    }
}