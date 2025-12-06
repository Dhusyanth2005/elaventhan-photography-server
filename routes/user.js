const express = require('express');
const router = express.Router();
const { getUserGallery, selectPhoto, getMySelections, getUserSelections } = require('../controllers/PhotoController');
const protect = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

router.use(protect);

router.get('/gallery', getUserGallery);
router.post('/select', selectPhoto);
router.get('/my-selections', getMySelections);

// Admin only: view specific user's selections
router.get('/selections/:userId', roleAuth('admin'), getUserSelections);

module.exports = router;