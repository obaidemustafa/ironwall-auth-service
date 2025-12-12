import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedUsers = [
    {
        username: 'zubair_khan',
        email: 'zubair@ironwall.com',
        password: 'admin123',
        role: 'admin',
        isVerified: true,
    },
    {
        username: 'shahab',
        email: 'shahab@ironwall.com',
        password: 'user123',
        role: 'user',
        isVerified: true,
    },
    {
        username: 'alex_researcher',
        email: 'alex@ironwall.com',
        password: 'user123',
        role: 'researcher',
        isVerified: true,
    },
    {
        username: 'sara_analyst',
        email: 'sara@ironwall.com',
        password: 'user123',
        role: 'user',
        isVerified: true,
    },
];

export const seedDatabase = async () => {
    try {
        console.log('🌱 Checking seed data...');

        for (const userData of seedUsers) {
            const existingUser = await User.findOne({ email: userData.email });
            if (!existingUser) {
                await User.create(userData);
                console.log(`✅ Created user: ${userData.username} (${userData.role})`);
            } else {
                console.log(`ℹ️  User already exists: ${userData.username}`);
            }
        }

        console.log('🌱 Seed check complete!\n');
    } catch (error) {
        console.error('❌ Seeding error:', error.message);
    }
};

// If running directly (node seed.js)
if (process.argv[1].includes('seed.js')) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI is not defined in .env');
        process.exit(1);
    }

    mongoose.connect(mongoUri)
        .then(async () => {
            console.log('✅ Connected to MongoDB');
            await seedDatabase();
            console.log('Done!');
            process.exit(0);
        })
        .catch((err) => {
            console.error('❌ MongoDB connection error:', err.message);
            process.exit(1);
        });
}
