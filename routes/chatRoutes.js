import express from 'express';
import { sendMessage } from '../controllers/chatController.js';

const router = express.Router();

// Chat route (can be protected if needed)
router.post('/message', sendMessage);

export default router;
