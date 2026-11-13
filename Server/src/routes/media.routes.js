const router = require('express').Router();
const mediaController = require('../controllers/media.controller');
router.get('/:assetId', mediaController.readMedia);
module.exports = router;
