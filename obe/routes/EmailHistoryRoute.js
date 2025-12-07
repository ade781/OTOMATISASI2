import express from 'express';
import {
    getEmailHistory,
    getEmailDetail,
    getStats,
    searchEmails,
    updateStatus
} from '../controllers/EmailHistoryController.js';

const router = express.Router();

// Get email history
router.get('/history', getEmailHistory);

// Get email detail
router.get('/history/:id', getEmailDetail);

// Get statistics
router.get('/stats', getStats);

// Search emails
router.get('/search', searchEmails);

// Update email status
router.put('/status', updateStatus);

export default router;
