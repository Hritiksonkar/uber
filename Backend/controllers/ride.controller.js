const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const { sendMessageToSocketId } = require('../socket');
const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');


module.exports.createRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userId, pickup, destination, vehicleType } = req.body;

    try {
        const ride = await rideService.createRide({ user: req.user._id, pickup, destination, vehicleType });
        res.status(201).json(ride);

        // Notify captains asynchronously; do not fail the HTTP request if maps/socket steps fail.
        (async () => {
            try {
                let captainsInRadius = [];
                try {
                    const pickupCoordinates = await mapService.getAddressCoordinate(pickup);
                    captainsInRadius = await mapService.getCaptainsInTheRadius(
                        pickupCoordinates.ltd,
                        pickupCoordinates.lng,
                        2
                    );
                } catch (geoErr) {
                    // If Geocoding API isn't enabled, fall back to notifying all connected captains.
                    console.warn('Pickup geocoding failed; falling back to connected captains:', geoErr?.message || geoErr);
                    captainsInRadius = await captainModel.find({ socketId: { $exists: true, $ne: null } });
                }

                const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate('user');
                if (!rideWithUser) return;

                captainsInRadius
                    .filter((captain) => captain && captain.socketId)
                    .forEach((captain) => {
                        sendMessageToSocketId(captain.socketId, {
                            event: 'new-ride',
                            data: rideWithUser
                        });
                    });
            } catch (notifyErr) {
                console.error('Failed to notify captains for new ride:', notifyErr?.message || notifyErr);
            }
        })();

    } catch (err) {
        console.log(err);
        if (!res.headersSent) {
            return res.status(500).json({ message: err.message });
        }
    }

};

module.exports.getFare = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination } = req.query;

    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.confirmRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.confirmRide({ rideId, captain: req.captain });

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-confirmed',
            data: ride
        })

        return res.status(200).json(ride);
    } catch (err) {

        console.log(err);
        return res.status(500).json({ message: err.message });
    }
}

module.exports.startRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, otp } = req.query;

    try {
        const ride = await rideService.startRide({ rideId, otp, captain: req.captain });

        console.log(ride);

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-started',
            data: ride
        })

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.endRide({ rideId, captain: req.captain });

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-ended',
            data: ride
        })



        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    } s
}