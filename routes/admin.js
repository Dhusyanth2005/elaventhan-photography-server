const express = require('express');
const router = express.Router();
const { createUser, getAllUsersWithSelections,deleteUser,getAllUserSelectionsWithCount,getUserSelectionsAdmin,getDashboardStats} = require('../controllers/adminController');
const protect = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

router.use(protect);
router.use(roleAuth('admin'));

router.post('/create-user', createUser);
router.get('/users', getAllUsersWithSelections);
router.delete('/users/:id', deleteUser);
router.get('/selections', getAllUserSelectionsWithCount);
router.get('/selections/:userId', getUserSelectionsAdmin);
router.get('/dashboard-stats', getDashboardStats);
module.exports = router;