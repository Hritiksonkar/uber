const mongoose = require('mongoose');

const deliveryRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    shopkeeper: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'shopkeeper',
        required: true,
    },
    dropoffAddress: {
        type: String,
        required: true,
        minlength: [5, 'Dropoff address must be at least 5 characters long'],
    },
    vehicleType: {
        type: String,
        enum: ['auto', 'car', 'moto'],
        default: 'moto',
    },
    note: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['requested', 'accepted', 'rejected'],
        default: 'requested',
    },
    ride: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ride'
    }
}, { timestamps: true });

module.exports = mongoose.model('deliveryRequest', deliveryRequestSchema);
