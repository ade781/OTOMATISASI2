import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { getSettings } from '../models/SettingsModel.js';

// Helper: attempt to connect with a timeout to avoid long hangs
const connectWithTimeout = (config, timeoutMs = 15000) => {
    return Promise.race([
        imaps.connect(config),
        new Promise((_, reject) => setTimeout(() => reject(new Error('IMAP connect timeout')), timeoutMs)),
    ]);
};

export const getInboxEmails = async (req, res) => {
    const { user_id, limit = 20 } = req.query;

    if (!user_id) {
        return res.status(400).json({ success: false, message: 'User ID diperlukan' });
    }

    let connection;
    const timeoutId = setTimeout(() => {
        console.error('[IMAP] Timeout exceeded for getInboxEmails');
        if (connection) {
            try {
                connection.end();
            } catch (e) {
                console.error('[IMAP] Error closing connection on timeout:', e);
            }
        }
        if (!res.headersSent) {
            res.status(504).json({
                success: false,
                message: 'Koneksi IMAP timeout. Silakan coba lagi.'
            });
        }
    }, 30000);

    try {
        // Get user's Gmail settings
        const settings = await new Promise((resolve, reject) => {
            getSettings(user_id, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (!settings || !settings.email_sender || !settings.app_password) {
            clearTimeout(timeoutId);
            return res.status(404).json({
                success: false,
                message: 'Pengaturan email belum dikonfigurasi. Silakan atur di halaman Settings.'
            });
        }

        console.log(`[IMAP] Connecting to Gmail for user: ${settings.email_sender}`);

        // IMAP configuration for Gmail
        const config = {
            imap: {
                user: settings.email_sender,
                password: (settings.app_password || '').replace(/\s+/g, ''),
                host: 'imap.gmail.com',
                port: 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 10000
            }
        };

        // Connect to IMAP server
        connection = await imaps.connect(config);
        console.log('[IMAP] Connected successfully');

        // Open INBOX
        await connection.openBox('INBOX');
        console.log('[IMAP] INBOX opened');

        // Search for all emails (or recent ones)
        const searchCriteria = ['ALL'];
        const fetchOptions = {
            // Request the full RFC822 message (BODY[]) as fallback so simpleParser gets full data
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES)', 'TEXT', 'BODY[]'],
            markSeen: false,
            struct: true
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`[IMAP] Found ${messages.length} emails in INBOX`);

        // Sort by most recent first and limit
        const sortedMessages = messages
            .sort((a, b) => b.attributes.uid - a.attributes.uid)
            .slice(0, parseInt(limit));

        console.log(`[IMAP] Processing ${sortedMessages.length} most recent emails`);

        // Parse emails
        const emails = await Promise.all(
            sortedMessages.map(async (item) => {
                try {
                    const textPart = item.parts.find(part => part.which === 'TEXT');
                    if (!textPart) {
                        console.log(`[IMAP] Email UID ${item.attributes.uid} has no TEXT part`);
                        return null;
                    }

                    const id = item.attributes.uid;
                    const idHeader = "Imap-Id: " + id + "\r\n";

                    const parsed = await simpleParser(idHeader + textPart.body);

                    return {
                        uid: id,
                        messageId: parsed.messageId,
                        from: parsed.from?.text || '',
                        to: parsed.to?.text || '',
                        subject: parsed.subject || '(No Subject)',
                        date: parsed.date || new Date(),
                        textBody: parsed.text || '',
                        htmlBody: parsed.html || '',
                        hasAttachments: parsed.attachments?.length > 0 || false,
                        flags: item.attributes.flags || [],
                        isRead: item.attributes.flags?.includes('\\Seen') || false
                    };
                } catch (parseErr) {
                    console.error('[IMAP] Error parsing email UID', item.attributes.uid, ':', parseErr.message);
                    return null;
                }
            })
        );

        // Filter out null results
        const validEmails = emails.filter(email => email !== null);

        clearTimeout(timeoutId);

        try {
            connection.end();
        } catch (e) {
            console.error('[IMAP] Error closing connection:', e);
        }

        res.json({
            success: true,
            count: validEmails.length,
            emails: validEmails
        });

    } catch (err) {
        clearTimeout(timeoutId);
        console.error('[IMAP] Error:', err.message);
        if (connection) {
            try {
                connection.end();
            } catch (e) {
                console.error('[IMAP] Error closing connection after error:', e);
            }
        }
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: err.message || 'Gagal mengambil email dari server'
            });
        }
    }
};

// Simple IMAP connectivity and read test
export const imapTest = async (req, res) => {
    const { user_id, limit = 3 } = req.query;
    if (!user_id) return res.status(400).json({ success: false, message: 'User ID diperlukan' });

    try {
        const settings = await new Promise((resolve, reject) => {
            getSettings(user_id, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (!settings || !settings.email_sender || !settings.app_password) {
            return res.status(404).json({ success: false, message: 'Pengaturan email belum dikonfigurasi' });
        }

        const config = {
            imap: {
                user: settings.email_sender,
                password: settings.app_password,
                host: 'imap.gmail.com',
                port: 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 10000
            }
        };

        console.log('[IMAP] Connecting to', config.imap.host, 'as', settings.email_sender);
        const connection = await connectWithTimeout(config, 20000);
        try {
            await connection.openBox('INBOX');
            const fetchOptions = { bodies: ['BODY[]'], markSeen: false, struct: true };
            const messages = await connection.search(['ALL'], fetchOptions);
            const sample = messages.slice(0, parseInt(limit)).map((m) => ({ uid: m.attributes.uid, flags: m.attributes.flags }));
            return res.json({ success: true, message: 'IMAP OK', account: settings.email_sender, sample });
        } finally {
            connection.end();
        }
    } catch (err) {
        console.error('IMAP test error:', err);
        return res.status(500).json({ success: false, message: err.message || 'IMAP error' });
    }
};

/**
 * Get email by UID
 */
export const getEmailByUid = async (req, res) => {
    const { user_id, uid } = req.query;

    if (!user_id || !uid) {
        return res.status(400).json({ success: false, message: 'User ID dan UID diperlukan' });
    }

    try {
        const settings = await new Promise((resolve, reject) => {
            getSettings(user_id, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (!settings || !settings.email_sender || !settings.app_password) {
            return res.status(404).json({
                success: false,
                message: 'Pengaturan email belum dikonfigurasi'
            });
        }

        const config = {
            imap: {
                user: settings.email_sender,
                password: settings.app_password,
                host: 'imap.gmail.com',
                port: 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 10000
            }
        };

        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Search for specific UID
        const searchCriteria = [['UID', uid]];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            markSeen: false,
            struct: true
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length === 0) {
            connection.end();
            return res.status(404).json({ success: false, message: 'Email tidak ditemukan' });
        }

        const item = messages[0];
        // Prefer BODY[] or fallback to TEXT. We'll attach a custom Imap-Id header to help parsing
        const id = item.attributes.uid;
        const idHeader = "Imap-Id: " + id + "\r\n";
        const bodyPart = item.parts.find(part => part.which === 'BODY[]') || item.parts.find(part => part.which === 'TEXT');
        if (!bodyPart) {
            console.warn('[IMAP] No BODY[] or TEXT part for UID', id);
            return null;
        }

        const raw = idHeader + (bodyPart.body || '');
        const parsed = await simpleParser(raw);

        const email = {
            uid: id,
            messageId: parsed.messageId,
            from: parsed.from?.text || '',
            to: parsed.to?.text || '',
            subject: parsed.subject || '(No Subject)',
            date: parsed.date || new Date(),
            textBody: parsed.text || '',
            htmlBody: parsed.html || '',
            attachments: parsed.attachments?.map(att => ({
                filename: att.filename,
                contentType: att.contentType,
                size: att.size
            })) || [],
            flags: item.attributes.flags || [],
            isRead: item.attributes.flags?.includes('\\Seen') || false
        };

        connection.end();

        res.json({
            success: true,
            email
        });

    } catch (err) {
        console.error('IMAP Error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Gagal mengambil email'
        });
    }
};

/**
 * Mark email as read
 */
export const markEmailAsRead = async (req, res) => {
    const { user_id, uid } = req.body;

    if (!user_id || !uid) {
        return res.status(400).json({ success: false, message: 'User ID dan UID diperlukan' });
    }

    try {
        const settings = await new Promise((resolve, reject) => {
            getSettings(user_id, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (!settings) {
            return res.status(404).json({ success: false, message: 'Pengaturan tidak ditemukan' });
        }

        const config = {
            imap: {
                user: settings.email_sender,
                password: settings.app_password,
                host: 'imap.gmail.com',
                port: 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false }
            }
        };

        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Add \Seen flag
        await connection.addFlags(uid, '\\Seen');

        connection.end();

        res.json({
            success: true,
            message: 'Email ditandai sebagai telah dibaca'
        });

    } catch (err) {
        console.error('IMAP Error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Gagal menandai email'
        });
    }
};

