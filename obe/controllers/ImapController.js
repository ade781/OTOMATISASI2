import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { getSettings } from '../models/SettingsModel.js';

/**
 * Fetch emails from Gmail inbox via IMAP
 */
export const getInboxEmails = async (req, res) => {
    const { user_id, limit = 20 } = req.query;

    if (!user_id) {
        return res.status(400).json({ success: false, message: 'User ID diperlukan' });
    }

    try {
        // Get user's Gmail settings
        const settings = await new Promise((resolve, reject) => {
            getSettings(user_id, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (!settings || !settings.email_sender || !settings.app_password) {
            return res.status(404).json({
                success: false,
                message: 'Pengaturan email belum dikonfigurasi. Silakan atur di halaman Settings.'
            });
        }

        // IMAP configuration for Gmail
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

        // Connect to IMAP server
        const connection = await imaps.connect(config);

        // Open INBOX
        await connection.openBox('INBOX');

        // Search for all emails (or recent ones)
        const searchCriteria = ['ALL'];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            markSeen: false,
            struct: true
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        // Sort by most recent first and limit
        const sortedMessages = messages
            .sort((a, b) => b.attributes.uid - a.attributes.uid)
            .slice(0, parseInt(limit));

        // Parse emails
        const emails = await Promise.all(
            sortedMessages.map(async (item) => {
                try {
                    const all = item.parts.find(part => part.which === 'TEXT');
                    const id = item.attributes.uid;
                    const idHeader = "Imap-Id: " + id + "\r\n";

                    const parsed = await simpleParser(idHeader + all.body);

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
                    console.error('Error parsing email:', parseErr);
                    return null;
                }
            })
        );

        // Filter out null results
        const validEmails = emails.filter(email => email !== null);

        connection.end();

        res.json({
            success: true,
            count: validEmails.length,
            emails: validEmails
        });

    } catch (err) {
        console.error('IMAP Error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Gagal mengambil email dari server'
        });
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
        const all = item.parts.find(part => part.which === 'TEXT');
        const id = item.attributes.uid;
        const idHeader = "Imap-Id: " + id + "\r\n";

        const parsed = await simpleParser(idHeader + all.body);

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

