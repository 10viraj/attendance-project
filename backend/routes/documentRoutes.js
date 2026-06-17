const express = require('express');
const router = express.Router();
const { getMyDocuments, uploadDocument } = require('../controllers/documentController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.route('/')
  .post(protect, upload.single('file'), uploadDocument);

router.route('/my-documents')
  .get(protect, getMyDocuments);

module.exports = router;
