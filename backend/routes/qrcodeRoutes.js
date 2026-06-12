const express = require('express');
const router = express.Router();
const { generateQR, validateQR } = require('../controllers/qrcodeController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/generate', protect, authorize('Admin', 'HR'), generateQR);
router.post('/validate', protect, validateQR);

module.exports = router;
