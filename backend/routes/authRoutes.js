const express = require('express');
const router = express.Router();
const { registerUser, loginUser, updatePushToken } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/push-token', protect, updatePushToken);

module.exports = router;
