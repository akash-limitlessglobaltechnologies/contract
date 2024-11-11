require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const expressSession = require('express-session'); // Fixed import
const passport = require('./config/passport');
const fs = require('fs');

// Import routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const contractRoutes = require('./routes/contractRoutes');

// Create Express app
const app = express();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

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

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration - Fixed session middleware
app.use(expressSession({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        httpOnly: true
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
});

app.use('/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/contracts', contractRoutes);

// Error handling middleware
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

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
    // Vercel serverless function export
    module.exports = async (req, res) => {
        await connectDb();
        app(req, res);
    };
} else {
    // Local development server
    const startServer = async () => {
        try {
            await connectDb();
            const PORT = process.env.PORT || 5001;
            app.listen(PORT, () => {
                console.log(`
🚀 Server is running in ${process.env.NODE_ENV || 'development'} mode
📡 Server URL: http://localhost:${PORT}
📍 Available endpoints:
   - Root: http://localhost:${PORT}/
   - Auth: http://localhost:${PORT}/auth
   - API: http://localhost:${PORT}/api
   - Contracts: http://localhost:${PORT}/api/contracts
                `);
            });
        } catch (err) {
            console.error('Failed to start server:', err);
            process.exit(1);
        }
    };

    startServer();
}