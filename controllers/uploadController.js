import cloudinary from '../config/cloudinary.js';
import User from '../models/User.js';

// @desc    Upload avatar
// @route   POST /api/auth/avatar
// @access  Private
export const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Delete old avatar from Cloudinary if exists
        if (user.avatar && user.avatar.publicId) {
            await cloudinary.uploader.destroy(user.avatar.publicId);
        }

        // Upload new avatar to Cloudinary
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'ironwall/avatars',
                    transformation: [
                        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
                        { quality: 'auto', fetch_format: 'auto' },
                    ],
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        // Update user avatar
        user.avatar = {
            url: result.secure_url,
            publicId: result.public_id,
        };
        await user.save();

        res.status(200).json({
            message: 'Avatar uploaded successfully.',
            avatar: user.avatar,
        });
    } catch (error) {
        console.error('Avatar Upload Error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            http_code: error.http_code,
        });
        res.status(500).json({
            message: 'Failed to upload avatar.',
            error: error.message,
            details: error.http_code ? `Cloudinary error code: ${error.http_code}` : 'Check server logs'
        });
    }
};

// @desc    Delete avatar
// @route   DELETE /api/auth/avatar
// @access  Private
export const deleteAvatar = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.avatar && user.avatar.publicId) {
            await cloudinary.uploader.destroy(user.avatar.publicId);
        }

        user.avatar = { url: '', publicId: '' };
        await user.save();

        res.status(200).json({ message: 'Avatar deleted successfully.' });
    } catch (error) {
        console.error('Avatar Delete Error:', error);
        res.status(500).json({ message: 'Failed to delete avatar.', error: error.message });
    }
};
