// controllers/userController.js
const ContractUser = require('../Models/userModel');
const { generateToken } = require('../utils/generateToken');
                       
const userController = {
    getProfile: async (req, res) => {
        try {
            const user = await ContractUser.findById(req.user.id)
                .select('-password');

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json(user);
        } catch (error) {
            console.error('Profile fetch error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getCurrentUser: async (req, res) => {
        try {
            const user = await ContractUser.findById(req.user.id)
                .select('-password');
     
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    },

    logout: async (req, res) => {
        try {
            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ message: 'Error logging out' });
                }
                res.clearCookie('jwt');
                res.json({ message: 'Logged out successfully' });
           });
        } catch (error) {
            res.status(500).json({ message: 'Error logging out' });
        }
    },

    generateToken: (user) => {
        return generateToken(user);
    }
};

module.exports = userController;