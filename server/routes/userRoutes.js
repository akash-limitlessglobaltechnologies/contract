const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../utils/generateToken');

// Debug middleware
router.use((req, res, next) => {
    console.log('API Route accessed:', req.path);
    next();
});

router.get('/profile', authMiddleware, userController.getProfile);
router.get('/current-user', authMiddleware, userController.getCurrentUser);
router.get('/logout', authMiddleware, userController.logout);

module.exports = router;