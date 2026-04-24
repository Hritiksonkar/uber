const shopkeeperModel = require('../models/shopkeeper.model');

module.exports.listShops = async (req, res) => {
    try {
        const shops = await shopkeeperModel
            .find({})
            .select('fullname email phone shop createdAt updatedAt');

        // Return only shop-related public details
        const normalized = shops.map((s) => ({
            _id: s._id,
            owner: {
                firstname: s.fullname?.firstname,
                lastname: s.fullname?.lastname,
            },
            shop: {
                name: s.shop?.name,
                address: s.shop?.address,
            },
            phone: s.phone,
            email: s.email,
        }));

        return res.status(200).json(normalized);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
