import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendOTPEmail } from '../utils/email.js';

const signToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// In-memory store for pending registrations (use Redis in production)
const pendingRegistrations = new Map();

// @desc    Initiate registration with OTP
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or username already exists.' });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store pending registration
        pendingRegistrations.set(email, {
            username,
            email,
            password,
            otp,
            otpExpiresAt,
            createdAt: new Date(),
        });

        // Clean up old pending registrations (older than 15 minutes)
        for (const [key, value] of pendingRegistrations.entries()) {
            if (Date.now() - value.createdAt.getTime() > 15 * 60 * 1000) {
                pendingRegistrations.delete(key);
            }
        }

        // Send OTP via email
        try {
            await sendOTPEmail(email, otp, username);
            console.log(`✅ OTP sent to ${email}`);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError.message);
            // Still log OTP for development fallback
            console.log(`\n📧 OTP for ${email}: ${otp}\n`);
        }

        res.status(200).json({
            message: 'OTP sent to your email. Please verify to complete registration.',
            email: email,
        });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ message: 'Server error during registration.', error: error.message });
    }
};

// @desc    Verify OTP and complete registration
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required.' });
        }

        const pending = pendingRegistrations.get(email);
        if (!pending) {
            return res.status(400).json({ message: 'No pending registration found. Please register again.' });
        }

        // Check if OTP expired
        if (new Date() > pending.otpExpiresAt) {
            pendingRegistrations.delete(email);
            return res.status(400).json({ message: 'OTP has expired. Please register again.' });
        }

        // Verify OTP
        if (pending.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
        }

        // Create the user
        const user = await User.create({
            username: pending.username,
            email: pending.email,
            password: pending.password,
            isVerified: true,
        });

        // Remove from pending
        pendingRegistrations.delete(email);

        const token = signToken(user._id);

        res.status(201).json({
            message: 'Email verified successfully. Account created!',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: 'Server error during verification.', error: error.message });
    }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        const pending = pendingRegistrations.get(email);
        if (!pending) {
            return res.status(400).json({ message: 'No pending registration found. Please register again.' });
        }

        // Generate new OTP
        const newOtp = generateOTP();
        pending.otp = newOtp;
        pending.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        pendingRegistrations.set(email, pending);

        // Send OTP via email
        try {
            await sendOTPEmail(email, newOtp, pending.username);
            console.log(`✅ New OTP sent to ${email}`);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError.message);
            console.log(`\n📧 New OTP for ${email}: ${newOtp}\n`);
        }

        res.status(200).json({
            message: 'New OTP sent to your email.',
        });
    } catch (error) {
        console.error('Resend OTP Error:', error);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password.' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const token = signToken(user._id);

        res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login.', error: error.message });
    }
};

// @desc    Get current user's profile
// @route   GET /api/auth/profile
// @access  Private (requires token)
export const getProfile = async (req, res) => {
    try {
        // req.user is set by the protect middleware
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            createdAt: user.createdAt,
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// @desc    Update user's profile
// @route   PUT /api/auth/profile
// @access  Private (requires token)
export const updateProfile = async (req, res) => {
    try {
        const { username, email } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if new email/username is already taken by another user
        if (email && email !== user.email) {
            const existingEmail = await User.findOne({ email, _id: { $ne: user._id } });
            if (existingEmail) {
                return res.status(400).json({ message: 'Email is already taken.' });
            }
            user.email = email;
        }

        if (username && username !== user.username) {
            const existingUsername = await User.findOne({ username, _id: { $ne: user._id } });
            if (existingUsername) {
                return res.status(400).json({ message: 'Username is already taken.' });
            }
            user.username = username;
        }

        await user.save();

        res.status(200).json({
            message: 'Profile updated successfully.',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private (requires token)
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters.' });
        }

        const user = await User.findById(req.user.id).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};
