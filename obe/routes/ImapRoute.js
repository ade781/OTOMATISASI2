import express from "express";
import { getInboxEmails, getEmailByUid, markEmailAsRead } from "../controllers/ImapController.js";
import {
    refreshReplies,
    listRepliesForSentEmails,
    listStoredReplies,
} from "../controllers/InboxController.js";

const router = express.Router();

// General IMAP helpers (optional)
router.get("/inbox", getInboxEmails);
router.get("/email", getEmailByUid);
router.post("/mark-read", markEmailAsRead);

// Reply-specific endpoints
router.post("/refresh-replies", refreshReplies);
router.get("/replies/sent-emails", listRepliesForSentEmails);
router.get("/replies", listStoredReplies);

export default router;