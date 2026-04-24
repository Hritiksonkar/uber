const shopkeeperModel = require('../models/shopkeeper.model');

module.exports.createShopkeeper = async ({ firstname, lastname, email, password, phone, shopName, shopAddress }) => {
    if (!firstname || !email || !password || !phone || !shopName || !shopAddress) {
        throw new Error('All fields are required');
    }

    const shopkeeper = await shopkeeperModel.create({
        fullname: {
            firstname,
            lastname,
        },
        email,
        password,
        phone,
        shop: {
            name: shopName,
            address: shopAddress,
        }
    });

    return shopkeeper;
};
