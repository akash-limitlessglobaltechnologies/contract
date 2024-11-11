require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const expressSession = require('express-session');
const passport = require('./config/passport');

// Import routes// server.js
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const contractRoutes = require('./routes/contractRoutes');

// Create Express app
const app = express();

// Database connection function
const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(expressSession({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        httpOnly: true
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/contracts', contractRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: process.env.NODE_ENV === 'development' 
            ? err.message 
            : 'Something went wrong!'
    });
});

// Server initialization
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

if (isVercel) {
    module.exports = async (req, res) => {
        try {
            await connectDb();
            return app(req, res);
        } catch (error) {
            console.error('Serverless function error:', error);
            return res.status(500).json({ 
                message: 'Internal Server Error' 
            });
        }
    };
} else {
    const startServer = async () => {
        try {
            await connectDb();
            const PORT = process.env.PORT || 5001;
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        } catch (err) {
            console.error('Failed to start server:', err);
            process.exit(1);
        }
    };
    startServer();
}