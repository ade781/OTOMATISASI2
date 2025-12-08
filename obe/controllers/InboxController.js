import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { getSettings } from "../models/SettingsModel.js";
import EmailLog, { getSentLogsByUser, updateEmailLogStatus } from "../models/EmailLogModel.js";
import { decrypt } from "../utils/encryption.js";
import {
    saveReply,
    getRepliesForUser,
    getReplyMessageIdsByUser,
    getRepliesForSentEmails,
} from "../models/ReplyModel.js";

// Helper: Build IMAP config
const buildImapConfig = (settings) => {
    const decryptedPassword = decrypt(settings.app_password);
    return {
        imap: {
            user: settings.email_sender,
            password: (decryptedPassword || '').replace(/\s+/g, ''), // Sanitize password
            host: "imap.gmail.com",
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 10000,
        },
    };
};

// Helper: Connect with timeout
const connectWithTimeout = (config, timeoutMs = 20000) => {
    return Promise.race([
        imaps.connect(config),
        new Promise((_, reject) => setTimeout(() => reject(new Error('IMAP connect timeout')), timeoutMs)),
    ]);
};

// Helper: Normalize Message-ID
const normalizeMessageId = (value) => {
    if (!value) return null;
    return value.trim();
};

export const listStoredReplies = (req, res) => {
    const userId = req.query.user_id;
    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID diperlukan" });
    }

    getRepliesForUser(userId, (err, replies) => {
        if (err) {
            console.error("[Inbox] List replies error:", err);
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil balasan",
                error: err?.message || "Internal server error",
            });
        }

        res.json({ success: true, replies, count: replies?.length || 0 });
    });
};

export const listRepliesForSentEmails = (req, res) => {
    const userId = req.query.user_id;
    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID diperlukan" });
    }

    getRepliesForSentEmails(userId, (err, replies) => {
        if (err) {
            console.error("[Inbox] List replies for sent emails error:", err);
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil balasan",
                error: err?.message || "Internal server error",
            });
        }

        res.json({ success: true, replies: replies || [], count: replies?.length || 0 });
    });
};

export const refreshReplies = async (req, res) => {
    const { user_id } = req.body || {};
    console.log(`\n[INBOX] ========== REFRESH REPLIES START ==========`);
    console.log(`[INBOX] User ID: ${user_id}`);

    if (!user_id) {
        return res.status(400).json({ success: false, message: "User ID diperlukan" });
    }

    // Timeout safety
    const timeoutId = setTimeout(() => {
        if (!res.headersSent) {
            console.error("[INBOX] ❌ Timeout: Operation took too long");
            res.status(504).json({ success: false, message: "Waktu koneksi habis" });
        }
    }, 60000);

    let connection;

    try {
        // 1. Get Settings
        const settings = await new Promise((resolve, reject) => {
            getSettings(user_id, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });

        if (!settings || !settings.email_sender || !settings.app_password) {
            clearTimeout(timeoutId);
            return res.status(404).json({ success: false, message: "Pengaturan email belum lengkap" });
        }

        // 2. Connect to IMAP
        console.log(`[INBOX] Connecting to IMAP (${settings.email_sender})...`);
        const config = buildImapConfig(settings);
        connection = await connectWithTimeout(config);
        console.log(`[INBOX] ✓ Connected`);

        await connection.openBox("INBOX");
        console.log(`[INBOX] Inbox opened`);

        // 3. Search for messages
        // Fetch UNSEEN messages or messages from last 3 days
        const delayDays = 3;
        const date = new Date();
        date.setDate(date.getDate() - delayDays);
        const searchCriteria = [['SINCE', date]]; // Fetch recent emails
        
        const fetchOptions = {
            bodies: ["HEADER", "TEXT", "BODY[]"],
            markSeen: false,
            struct: true,
        };

        console.log(`[INBOX] Searching messages since ${date.toISOString()}...`);
        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`[INBOX] Found ${messages.length} messages`);

        let newRepliesCount = 0;

        // 4. Process messages
        for (const item of messages) {
            try {
                const allText = item.parts.find((part) => part.which === "BODY[]") || item.parts.find((part) => part.which === "TEXT");
                if (!allText) continue;

                const uid = item.attributes.uid;
                const raw = "Imap-Id: " + uid + "\r\n" + (allText.body || "");
                const parsed = await simpleParser(raw);

                // Extract headers
                const messageId = normalizeMessageId(parsed.messageId);
                const inReplyTo = normalizeMessageId(parsed.inReplyTo);
                const subject = parsed.subject;
                const fromAddress = parsed.from?.value?.[0]?.address;
                const fromName = parsed.from?.value?.[0]?.name;

                if (!inReplyTo) continue;

                // 5. Match with Database
                // Find the original sent email using message_id
                const originalEmail = await EmailLog.findOne({
                    where: { message_id: inReplyTo }
                });

                if (originalEmail) {
                    console.log(`[INBOX] [MATCH] Found reply for Email ID: ${originalEmail.id}`);

                    // Save Reply
                    const replyPayload = {
                        user_id,
                        badan_publik_id: originalEmail.badan_publik_id,
                        message_id: messageId, // The ID of the reply email
                        in_reply_to: inReplyTo, // The ID of the original email
                        thread_id: null,
                        from_email: fromAddress,
                        from_name: fromName,
                        subject: subject || "(No Subject)",
                        message: (parsed.text || parsed.html || "").trim(),
                        received_at: parsed.date || new Date(),
                    };

                    await new Promise((resolve, reject) => {
                        saveReply(replyPayload, (err, res) => {
                            if (err) {
                                console.error(`[INBOX] Error saving reply: ${err.message}`);
                                resolve(null); 
                            } else {
                                resolve(res);
                            }
                        });
                    });

                    // Update status of original email
                    if (originalEmail.status !== 'replied') {
                        await new Promise((resolve) => {
                            updateEmailLogStatus(originalEmail.id, 'replied', resolve);
                        });
                        console.log(`[INBOX] Updated status to 'replied' for Email ID: ${originalEmail.id}`);
                    }

                    newRepliesCount++;
                }

            } catch (err) {
                console.error(`[INBOX] Error processing message: ${err.message}`);
            }
        }

        clearTimeout(timeoutId);
        console.log(`[INBOX] ========== REFRESH REPLIES END (${newRepliesCount} new) ==========\n`);
        
        res.json({
            success: true,
            newReplies: newRepliesCount,
            message: `Berhasil menyegarkan. ${newRepliesCount} balasan baru ditemukan.`
        });

    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`[INBOX] ❌ Critical Error:`, error);
        res.status(500).json({
            success: false,
            message: "Gagal menyegarkan inbox: " + error.message,
        });
    } finally {
        if (connection) {
            try {
                connection.end();
            } catch (e) { /* ignore */ }
        }
    }
};

export default { listStoredReplies, listRepliesForSentEmails, refreshReplies };
