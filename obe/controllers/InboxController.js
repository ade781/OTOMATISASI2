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
        // sanitize app password by removing spaces that are often present in app-password display
        password: (settings.app_password || '').replace(/\s+/g, ''),
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
    },
});

// Helper: wrap imaps.connect with timeout to avoid long hang
const connectWithTimeout = (config, timeoutMs = 20000) => {
    return Promise.race([
        imaps.connect(config),
        new Promise((_, reject) => setTimeout(() => reject(new Error('IMAP connect timeout')), timeoutMs)),
    ]);
};

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

// ... import bagian atas biarkan sama ...

export const refreshReplies = async (req, res) => {
    const { user_id } = req.body || {};
    console.log(`[DEBUG] Mulai refreshReplies untuk User ID: ${user_id}`);

    if (!user_id) {
        return res.status(400).json({ success: false, message: "User ID diperlukan" });
    }

    // Set timeout 60 detik untuk seluruh operasi
    const timeoutId = setTimeout(() => {
        console.error("[DEBUG] TIMEOUT: refreshReplies melebihi 60 detik!");
        if (!res.headersSent) {
            res.status(504).json({
                success: false,
                message: "Waktu koneksi timeout. Silakan coba lagi nanti.",
            });
        }
    }, 60000);

    try {
        // 1. Ambil Settings
        console.log("[DEBUG] Sedang mengambil settings...");
        const settings = await new Promise((resolve, reject) => {
            getSettings(user_id, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });

        if (!settings || !settings.email_sender || !settings.app_password) {
            clearTimeout(timeoutId);
            console.log("[DEBUG] Settings tidak lengkap/tidak ditemukan.");
            return res.status(404).json({ success: false, message: "Pengaturan email belum lengkap" });
        }
        console.log(`[DEBUG] Settings ditemukan untuk email: ${settings.email_sender}`);

        // 2. Ambil Log Email Terkirim
        console.log("[DEBUG] Sedang mengambil log email terkirim...");
        const sentLogs = await new Promise((resolve, reject) => {
            getSentLogsByUser(user_id, (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
        console.log(`[DEBUG] Ditemukan ${sentLogs.length} email terkirim di database.`);

        if (sentLogs.length === 0) {
            clearTimeout(timeoutId);
            return res.json({ success: true, newReplies: 0, message: "Belum ada email terkirim" });
        }

        // Mapping Message ID
        const sentMap = new Map();
        sentLogs.forEach((row) => {
            const messageKey = normalizeMessageId(row.message_id);
            if (messageKey) sentMap.set(messageKey, row);
        });

        // 3. Ambil Pesan yang Sudah Ada (agar tidak duplikat)
        const existingMessages = await new Promise((resolve, reject) => {
            getReplyMessageIdsByUser(user_id, (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
        const existingSet = new Set(existingMessages.map((row) => normalizeMessageId(row.message_id)).filter(Boolean));
        console.log(`[DEBUG] Ada ${existingSet.size} balasan yang sudah tersimpan sebelumnya.`);

        // 4. Koneksi ke IMAP (Gmail)
        let connection;
        const savedReplies = [];
        try {
            console.log("[DEBUG] Mencoba connect ke IMAP Gmail... (host: imap.gmail.com)");
            console.log(`[DEBUG] Menggunakan akun: ${settings.email_sender}`);
            const config = buildImapConfig(settings);
            connection = await connectWithTimeout(config, 20000);
            console.log("[DEBUG] Berhasil connect ke IMAP!");

            await connection.openBox("INBOX");
            console.log("[DEBUG] Kotak Masuk (INBOX) terbuka.");

            const fetchOptions = {
                // Prefer BODY[] (full raw message) so simpleParser extracts header fields correctly
                bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES)", "TEXT", "BODY[]"],
                markSeen: false,
                struct: true,
            };

            // Cari semua yang UNSEEN (Belum dibaca)
            console.log("[DEBUG] Mencari email UNSEEN...");
            let messages = await connection.search(["UNSEEN"], fetchOptions);
            console.log(`[DEBUG] Ditemukan ${messages.length} email UNSEEN.`);
            // Fallback: jika tidak ada UNSEEN, coba ambil beberapa pesan terakhir untuk debugging
            if (!messages || messages.length === 0) {
                console.log('[DEBUG] Tidak ada UNSEEN, mencoba ambil sedikit pesan terakhir (ALL).');
                messages = await connection.search(['ALL'], fetchOptions);
                console.log(`[DEBUG] Ditemukan ${messages.length} pesan dengan kriterium ALL.`);
            }

            // Loop setiap pesan
            for (const item of messages) {
                try {
                    // Prefer BODY[] part for full message, then fallback to TEXT
                    const allText = item.parts.find((part) => part.which === "BODY[]") || item.parts.find((part) => part.which === "TEXT");
                    if (!allText) {
                        console.log(`[DEBUG] Email UID ${item.attributes.uid} tidak punya TEXT part`);
                        continue;
                    }

                    const uid = item.attributes.uid;
                    const raw = "Imap-Id: " + uid + "\r\n" + (allText.body || "");
                    const parsed = await simpleParser(raw);
                    const replyMessageId = normalizeMessageId(parsed.messageId);

                    console.log(`[DEBUG] Memproses email UID: ${uid}, Subject: ${parsed.subject}`);

                    if (!replyMessageId) {
                        console.log("[DEBUG] -- Skip: Tidak ada Message-ID");
                        continue;
                    }
                    if (existingSet.has(replyMessageId)) {
                        console.log("[DEBUG] -- Skip: Email sudah ada di database");
                        continue;
                    }

                    // Cek In-Reply-To
                    const inReplyToHeader = parsed.inReplyTo || (parsed.references || [])[0];
                    const referenceId = normalizeMessageId(inReplyToHeader);

                    console.log(`[DEBUG] -- In-Reply-To: ${referenceId}`);

                    if (!referenceId || !sentMap.has(referenceId)) {
                        console.log("[DEBUG] -- Skip: Bukan balasan dari sistem kita");
                        continue;
                    }

                    const origin = sentMap.get(referenceId);
                    const fromAddress = parsed.from?.text || parsed.from?.value?.[0]?.address || "";
                    const fromName = parsed.from?.value?.[0]?.name || "";

                    const replyPayload = {
                        user_id,
                        badan_publik_id: origin?.badan_publik_id,
                        message_id: replyMessageId,
                        in_reply_to: referenceId,
                        thread_id: origin?.thread_id,
                        from_email: fromAddress,
                        from_name: fromName,
                        subject: parsed.subject || "(Tidak ada subjek)",
                        message: (parsed.text || parsed.html || "").trim(),
                        received_at: parsed.date || new Date(),
                    };

                    console.log("[DEBUG] -- Menyimpan ke database...");
                    await new Promise((resolve, reject) => {
                        saveReply(replyPayload, (err) => {
                            if (err) {
                                console.error("[DEBUG] -- Error Save DB:", err);
                                return reject(err);
                            }
                            console.log("[DEBUG] -- Berhasil disimpan!");
                            resolve();
                        });
                    });

                    existingSet.add(replyMessageId);
                    savedReplies.push(replyPayload);
                } catch (itemError) {
                    console.error("[DEBUG] Error processing individual email:", itemError);
                    // Lanjut ke email berikutnya
                }
            }
        } catch (imapError) {
            console.error("[DEBUG] Error IMAP Operation:", imapError);
            throw imapError;
        } finally {
            if (connection) {
                try {
                    console.log("[DEBUG] Menutup koneksi IMAP...");
                    connection.end();
                } catch (e) {
                    console.error("[DEBUG] Error closing connection:", e);
                }
            }
        }

        clearTimeout(timeoutId);
        console.log(`[DEBUG] Selesai! ${savedReplies.length} balasan baru disimpan.`);
        res.json({ success: true, newReplies: savedReplies.length });

    } catch (error) {
        clearTimeout(timeoutId);
        console.error("[DEBUG] CRITICAL ERROR di refreshReplies:", error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: error.message || "Gagal menyegarkan balasan",
            });
        }
    }
};
