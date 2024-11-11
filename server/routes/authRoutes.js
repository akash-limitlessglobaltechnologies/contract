const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require('../controllers/userController');

router.get('/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account',
        hd: 'limitlessglobaltechnologies.com'
    })
);

router.get('/google/callback',
    passport.authenticate('google', { 
        failureRedirect: 'http://localhost:3000/login?error=auth_failed',
        session: false 
    }),
    async (req, res) => {
        try {
            const token = userController.generateToken(req.user);
            res.redirect(`http://localhost:3000/google-callback?token=${token}`);
        } catch (error) {
            console.error('Callback error:', error);
            res.redirect('http://localhost:3000/login?error=auth_failed');
        }
    }
);

module.exports = router;