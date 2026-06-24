const express = require('express');
const router = express.Router();
const { registerUser, loginUser, updatePushToken, updatePassword } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/push-token', protect, updatePushToken);
router.put('/password', protect, updatePassword);

module.exports = router;
