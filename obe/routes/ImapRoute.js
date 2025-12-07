import express from 'express';
import { getInboxEmails, getEmailByUid, markEmailAsRead } from '../controllers/ImapController.js';

const router = express.Router();

// Get inbox emails
router.get('/inbox', getInboxEmails);

// Get specific email by UID
router.get('/email', getEmailByUid);

// Mark email as read
router.post('/mark-read', markEmailAsRead);

export default router;
