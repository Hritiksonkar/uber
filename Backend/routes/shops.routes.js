const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shop.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// User can see shop list
router.get('/', authMiddleware.authUser, shopController.listShops);

module.exports = router;
