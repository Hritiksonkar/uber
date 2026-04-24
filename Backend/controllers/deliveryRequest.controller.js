const { validationResult } = require('express-validator');
const deliveryRequestModel = require('../models/deliveryRequest.model');
const shopkeeperModel = require('../models/shopkeeper.model');
const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');
const mapService = require('../services/maps.service');
const { sendMessageToSocketId } = require('../socket');
const { sendDeliveryRequestEmail } = require('../services/email.service');
const crypto = require('crypto');

function generateOtp(digits = 6) {
    return crypto.randomInt(Math.pow(10, digits - 1), Math.pow(10, digits)).toString();
}

function estimateFare(vehicleType) {
    const base = {
        auto: 30,
        car: 50,
        moto: 20
    };

    return base[vehicleType] ?? 20;
}

module.exports.createDeliveryRequest = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { shopkeeperId, dropoffAddress, note, vehicleType } = req.body;

    try {
        const shopkeeper = await shopkeeperModel.findById(shopkeeperId);
        if (!shopkeeper) {
            return res.status(404).json({ message: 'Shop not found' });
        }

        const request = await deliveryRequestModel.create({
            user: req.user._id,
            shopkeeper: shopkeeper._id,
            dropoffAddress,
            note: note || '',
            vehicleType: vehicleType || 'moto',
        });

        // Best-effort email (do not fail the request creation)
        (async () => {
            try {
                const html = `
                    <div style="font-family: Arial, sans-serif; line-height: 1.4">
                        <h2>New Delivery Request</h2>
                        <p><b>Shop:</b> ${shopkeeper.shop?.name || ''}</p>
                        <p><b>Pickup:</b> ${shopkeeper.shop?.address || ''}</p>
                        <p><b>Dropoff:</b> ${dropoffAddress}</p>
                        <p><b>Vehicle:</b> ${(vehicleType || 'moto')}</p>
                        ${note ? `<p><b>Note:</b> ${note}</p>` : ''}
                        <p><b>Request ID:</b> ${request._id}</p>
                        <p>Open your Shopkeeper Panel and accept this request.</p>
                    </div>
                `;

                await sendDeliveryRequestEmail({
                    to: shopkeeper.email,
                    subject: 'New Delivery Request',
                    html,
                });
            } catch (err) {
                console.warn('Failed to send delivery request email:', err?.message || err);
            }
        })();

        return res.status(201).json(request);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.listShopkeeperRequests = async (req, res) => {
    try {
        const requests = await deliveryRequestModel
            .find({ shopkeeper: req.shopkeeper._id })
            .sort({ createdAt: -1 })
            .populate('user');

        return res.status(200).json(requests);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.acceptDeliveryRequest = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { requestId } = req.params;

    try {
        const request = await deliveryRequestModel.findById(requestId).populate('user').populate('shopkeeper');
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (String(request.shopkeeper?._id) !== String(req.shopkeeper._id)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        if (request.status !== 'requested') {
            return res.status(400).json({ message: 'Request already processed' });
        }

        const pickup = request.shopkeeper?.shop?.address;
        const destination = request.dropoffAddress;

        if (!pickup || !destination) {
            return res.status(400).json({ message: 'Invalid pickup/destination' });
        }

        // Create a normal ride so captain panel stays unchanged.
        const ride = await rideModel.create({
            user: request.user._id,
            pickup,
            destination,
            otp: generateOtp(6),
            fare: estimateFare(request.vehicleType),
        });

        await deliveryRequestModel.findByIdAndUpdate(request._id, {
            status: 'accepted',
            ride: ride._id,
        });

        // Notify captains similarly to createRide
        (async () => {
            try {
                let captainsInRadius = [];
                try {
                    const pickupCoordinates = await mapService.getAddressCoordinate({ address: pickup });
                    captainsInRadius = await mapService.getCaptainsInTheRadius(
                        pickupCoordinates.ltd,
                        pickupCoordinates.lng,
                        2
                    );

                    if (!Array.isArray(captainsInRadius) || captainsInRadius.length === 0) {
                        captainsInRadius = await captainModel.find({ socketId: { $exists: true, $ne: null } });
                    }
                } catch (geoErr) {
                    captainsInRadius = await captainModel.find({ socketId: { $exists: true, $ne: null } });
                }

                const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate('user');
                if (!rideWithUser) return;

                captainsInRadius
                    .filter((c) => c && c.socketId)
                    .forEach((c) => {
                        sendMessageToSocketId(c.socketId, {
                            event: 'new-ride',
                            data: rideWithUser
                        });
                    });
            } catch (err) {
                console.error('Failed to notify captains for delivery ride:', err?.message || err);
            }
        })();

        // Optional: notify user their delivery was accepted
        if (request.user?.socketId) {
            sendMessageToSocketId(request.user.socketId, {
                event: 'delivery-accepted',
                data: { requestId: request._id, rideId: ride._id }
            });
        }

        return res.status(200).json({ requestId: request._id, rideId: ride._id });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
