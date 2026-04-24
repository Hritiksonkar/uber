const { validationResult } = require('express-validator');
const shopkeeperModel = require('../models/shopkeeper.model');
const shopkeeperService = require('../services/shopkeeper.service');
const blackListTokenModel = require('../models/blacklistToken.model');

module.exports.registerShopkeeper = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, phone, shop } = req.body;

    const exists = await shopkeeperModel.findOne({ email });
    if (exists) {
        return res.status(400).json({ message: 'Shopkeeper already exist' });
    }

    const hashedPassword = await shopkeeperModel.hashPassword(password);

    const shopkeeper = await shopkeeperService.createShopkeeper({
        firstname: fullname.firstname,
        lastname: fullname.lastname,
        email,
        password: hashedPassword,
        phone,
        shopName: shop?.name,
        shopAddress: shop?.address,
    });

    const token = shopkeeper.generateAuthToken();

    return res.status(201).json({ token, shopkeeper });
};

module.exports.loginShopkeeper = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const shopkeeper = await shopkeeperModel.findOne({ email }).select('+password');
    if (!shopkeeper) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await shopkeeper.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = shopkeeper.generateAuthToken();
    res.cookie('token', token);

    return res.status(200).json({ token, shopkeeper });
};

module.exports.getShopkeeperProfile = async (req, res) => {
    return res.status(200).json({ shopkeeper: req.shopkeeper });
};

module.exports.logoutShopkeeper = async (req, res) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (token) {
        await blackListTokenModel.create({ token });
    }

    res.clearCookie('token');
    return res.status(200).json({ message: 'Logout successfully' });
};
