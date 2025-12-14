import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { seedDatabase } from './seed.js';
import { verifyEmailConnection } from './utils/email.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS Configuration - Allow frontend origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'IronWall Auth Service is running.' });
});

// Connect to MongoDB and Start Server
const startServer = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('MONGODB_URI is not defined in .env');
            process.exit(1);
        }
        // Connect to the 'ironwall' database
        await mongoose.connect(mongoUri, { dbName: 'ironwall' });
        console.log('✅ Connected to MongoDB (ironwall database)');

        // Run seed to ensure default users exist
        await seedDatabase();

        // Verify email connection
        await verifyEmailConnection();

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
};

startServer();
