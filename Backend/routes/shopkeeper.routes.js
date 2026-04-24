const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const shopkeeperController = require('../controllers/shopkeeper.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/register',
    body('fullname.firstname').isString().isLength({ min: 3 }).withMessage('Invalid firstname'),
    body('fullname.lastname').optional().isString().isLength({ min: 3 }).withMessage('Invalid lastname'),
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').isString().isLength({ min: 8 }).withMessage('Invalid phone'),
    body('shop.name').isString().isLength({ min: 2 }).withMessage('Invalid shop name'),
    body('shop.address').isString().isLength({ min: 5 }).withMessage('Invalid shop address'),
    shopkeeperController.registerShopkeeper
);

router.post('/login',
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    shopkeeperController.loginShopkeeper
);

router.get('/profile', authMiddleware.authShopkeeper, shopkeeperController.getShopkeeperProfile);
router.get('/logout', authMiddleware.authShopkeeper, shopkeeperController.logoutShopkeeper);

module.exports = router;
