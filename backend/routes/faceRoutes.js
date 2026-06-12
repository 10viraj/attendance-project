const express = require('express');
const router = express.Router();
const { registerFace, verifyFace } = require('../controllers/faceController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', protect, registerFace);
router.post('/verify', protect, verifyFace);

module.exports = router;
