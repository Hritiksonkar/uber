const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const shopkeeperSchema = new mongoose.Schema({
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [3, 'Firstname must be at least 3 characters long'],
        },
        lastname: {
            type: String,
            minlength: [3, 'Lastname must be at least 3 characters long'],
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    phone: {
        type: String,
        required: true,
        minlength: [8, 'Phone must be at least 8 characters long'],
    },
    shop: {
        name: {
            type: String,
            required: true,
            minlength: [2, 'Shop name must be at least 2 characters long'],
        },
        address: {
            type: String,
            required: true,
            minlength: [5, 'Shop address must be at least 5 characters long'],
        }
    }
}, { timestamps: true });

shopkeeperSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
};

shopkeeperSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

shopkeeperSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
};

module.exports = mongoose.model('shopkeeper', shopkeeperSchema);
