import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { getSettings } from "../models/SettingsModel.js";
import { getSentLogsByUser } from "../models/EmailLogModel.js";
import {
    saveReply,
    getRepliesForUser,
    getReplyMessageIdsByUser,
    getRepliesForSentEmails,
} from "../models/ReplyModel.js";

const buildImapConfig = (settings) => ({
    imap: {
        user: settings.email_sender,
        password: settings.app_password,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
    },
});

const normalizeMessageId = (value) => {
    if (!value) return null;
    const matches = value.match(/<([^>]+)>/);
    if (matches) return matches[1];
    return value.trim();
};

export const listStoredReplies = (req, res) => {
    const userId = req.query.user_id;
    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID diperlukan" });
    }

    getRepliesForUser(userId, (err, replies) => {
        if (err) {
            console.error("List replies error:", err);
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil balasan",
                error: err?.message || "Internal server error",
            });
        }

        res.json({ success: true, replies });
    });
};

/**
 * List stored replies only for emails sent via the application
 */
export const listRepliesForSentEmails = (req, res) => {
    const userId = req.query.user_id;
    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID diperlukan" });
    }

    getRepliesForSentEmails(userId, (err, replies) => {
        if (err) {
            console.error("List replies for sent emails error:", err);
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil balasan",
                error: err?.message || "Internal server error",
            });
        }

        res.json({ success: true, replies: replies || [] });
    });
};

export const refreshReplies = async (req, res) => {
    const { user_id } = req.body || {};
    if (!user_id) {
        return res.status(400).json({ success: false, message: "User ID diperlukan" });
    }

    try {
        const settings = await new Promise((resolve, reject) => {
            getSettings(user_id, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });

        if (!settings || !settings.email_sender || !settings.app_password) {
            return res.status(404).json({ success: false, message: "Pengaturan email belum lengkap" });
        }

        const sentLogs = await new Promise((resolve, reject) => {
            getSentLogsByUser(user_id, (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });

        if (sentLogs.length === 0) {
            return res.json({ success: true, newReplies: 0, message: "Belum ada email terkirim" });
        }

        const sentMap = new Map();
        sentLogs.forEach((row) => {
            const messageKey = normalizeMessageId(row.message_id);
            if (messageKey) {
                sentMap.set(messageKey, row);
            }
        });

        const existingMessages = await new Promise((resolve, reject) => {
            getReplyMessageIdsByUser(user_id, (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });

        const existingSet = new Set(existingMessages.map((row) => normalizeMessageId(row.message_id)).filter(Boolean));

        let connection;
        const savedReplies = [];
        try {
            connection = await imaps.connect(buildImapConfig(settings));
            await connection.openBox("INBOX");

            const fetchOptions = {
                bodies: ["HEADER", "TEXT"],
                markSeen: false,
                struct: true,
            };

            const messages = await connection.search(["UNSEEN"], fetchOptions);

            for (const item of messages) {
                const allText = item.parts.find((part) => part.which === "TEXT");
                if (!allText) continue;

                const uid = item.attributes.uid;
                const parsed = await simpleParser("Imap-Id: " + uid + "\r\n" + allText.body);
                const replyMessageId = normalizeMessageId(parsed.messageId);
                if (!replyMessageId) continue;
                if (existingSet.has(replyMessageId)) continue;

                const inReplyToHeader = parsed.inReplyTo || (parsed.references || [])[0];
                const referenceId = normalizeMessageId(inReplyToHeader);
                if (!referenceId || !sentMap.has(referenceId)) continue;

                const origin = sentMap.get(referenceId);
                const replyPayload = {
                    user_id,
                    badan_publik_id: origin?.badan_publik_id,
                    message_id: replyMessageId,
                    in_reply_to: referenceId,
                    thread_id: origin?.thread_id,
                    from_email: parsed.from?.text || parsed.from?.value?.[0]?.address || "",
                    from_name: parsed.from?.value?.[0]?.name || "",
                    subject: parsed.subject || "(Tidak ada subjek)",
                    message: parsed.text?.trim() || parsed.html?.trim() || "",
                    received_at: parsed.date || new Date(),
                };

                await new Promise((resolve, reject) => {
                    saveReply(replyPayload, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });

                existingSet.add(replyMessageId);
                savedReplies.push(replyPayload);
            }
        } finally {
            if (connection) {
                connection.end();
            }
        }

        res.json({ success: true, newReplies: savedReplies.length });
    } catch (error) {
        console.error("Refresh replies error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Gagal menyegarkan balasan",
            error: error.stack || undefined,
        });
    }
};
