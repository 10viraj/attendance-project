const QRCode = require('qrcode');
const crypto = require('crypto');

// In-memory store for valid QR tokens. In production, use Redis.
const validQRTokens = new Set();

// @desc    Generate a new dynamic QR code
// @route   GET /api/qrcode/generate
// @access  Private/Admin/HR
const generateQR = async (req, res, next) => {
  try {
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set token expiration (e.g., 30 seconds)
    validQRTokens.add(token);
    setTimeout(() => {
      validQRTokens.delete(token);
    }, 30000); // 30 seconds

    const qrData = JSON.stringify({ token, timestamp: Date.now() });

    // Generate QR code image as Data URL
    const qrImage = await QRCode.toDataURL(qrData);

    res.json({ success: true, data: { qrImage, token } });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate a scanned QR code
// @route   POST /api/qrcode/validate
// @access  Private
const validateQR = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token || !validQRTokens.has(token)) {
      res.status(400);
      throw new Error('Invalid or expired QR code');
    }

    // Token is valid, proceed to check-in or out logic in frontend
    res.json({ success: true, message: 'QR Code is valid' });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateQR, validateQR };
