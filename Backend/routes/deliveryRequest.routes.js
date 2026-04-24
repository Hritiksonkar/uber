const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const deliveryRequestController = require('../controllers/deliveryRequest.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/create',
    authMiddleware.authUser,
    body('shopkeeperId').isMongoId().withMessage('Invalid shopkeeperId'),
    body('dropoffAddress').isString().isLength({ min: 5 }).withMessage('Invalid dropoff address'),
    body('vehicleType').optional().isString().isIn(['auto', 'car', 'moto']).withMessage('Invalid vehicleType'),
    body('note').optional().isString().isLength({ max: 1000 }).withMessage('Note too long'),
    deliveryRequestController.createDeliveryRequest
);

router.get('/shopkeeper',
    authMiddleware.authShopkeeper,
    deliveryRequestController.listShopkeeperRequests
);

router.post('/:requestId/accept',
    authMiddleware.authShopkeeper,
    param('requestId').isMongoId().withMessage('Invalid request id'),
    deliveryRequestController.acceptDeliveryRequest
);

module.exports = router;
