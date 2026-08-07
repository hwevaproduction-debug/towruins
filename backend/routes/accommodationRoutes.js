const express = require('express');
const auth = require('../controllers/authController');
const roomController = require('../controllers/roomController');
const accommodationController = require('../controllers/accommodationController');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

router.get('/:id/reviews', reviewController.getAccommodationReviews);

router.use(auth.protect);

// Tax (existing)
router.get('/:id/tax', auth.requireRole('provider'), roomController.getAccommodationTax);
router.put('/:id/tax', auth.requireRole('provider'), roomController.upsertAccommodationTax);

// New accommodation routes
router.get('/mine', auth.requireRole('provider'), accommodationController.getMyAccommodation);
router.patch('/:id', auth.requireRole('provider'), accommodationController.updateAccommodation);
router.post('/:id/images', auth.requireRole('provider'), accommodationController.addAccommodationImage);
router.delete('/:id/images/:imageId', auth.requireRole('provider'), accommodationController.deleteAccommodationImage);
router.put('/:id/cancellation-policy', auth.requireRole('provider'), accommodationController.upsertCancellationPolicy);
router.put('/:id/checkin-rules', auth.requireRole('provider'), accommodationController.upsertCheckInRules);

module.exports = router;
