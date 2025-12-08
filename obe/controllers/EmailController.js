// obe/controllers/EmailController.js
import nodemailer from "nodemailer";
import fs from "fs";
import { getSettings } from "../models/SettingsModel.js"; // Import model
import { saveEmailLog } from "../models/EmailLogModel.js";
import { decrypt } from "../utils/encryption.js";
import db from "../config/db.js";

// Helper untuk delay (Rate Limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const sendBulkEmail = async (req, res) => {
    try {
        const { nama_pemohon, tujuan, recipients, user_id } = req.body;
        const ktpFile = req.file;

        if (!user_id) return res.status(400).json({ message: "User ID hilang!" });
        if (!ktpFile) return res.status(400).json({ message: "File KTP wajib diupload!" });

        // 1. AMBIL SETTING DARI DB (Promise Wrapper biar enak dibaca)
        const userSettings = await new Promise((resolve, reject) => {
            getSettings(user_id, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        if (!userSettings) {
            // Hapus file jika gagal
            if (ktpFile && ktpFile.path) fs.unlinkSync(ktpFile.path);
            return res.status(400).json({ message: "Pengaturan Email belum diset! Silakan ke menu Pengaturan." });
        }

        const targets = JSON.parse(recipients);
        
        // Dekripsi password
        const decryptedPassword = decrypt(userSettings.app_password);

        // 3. Buat Transporter pakai data dari DB
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: userSettings.email_sender, // Ambil dari DB
                pass: decryptedPassword, // Password terdekripsi
            },
        });

        let successCount = 0;
        let failedCount = 0;

        // 4. Loop kirim email dengan Queue/Delay sederhana
        for (const target of targets) {
            try {
                // Validate target has required fields
                if (!target.id || !target.email) {
                    console.error("Target missing required fields:", target);
                    failedCount++;
                    continue;
                }

                const subjekDokumen = target.pertanyaan
                    ? target.pertanyaan.substring(0, 50).replace(/\n/g, " ") + "..."
                    : "Informasi Publik";

                const subject = `Permohonan Informasi [${subjekDokumen}]`;
                const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

                const bodyText = `
Kepada Yth. Pejabat Pengelola Data dan Informasi (PPID)
${target.nama_badan_publik}

Dengan hormat,
Saya ${nama_pemohon}, bermaksud mengajukan permohonan informasi berikut ini:
${target.pertanyaan}

Informasi tersebut saya butuhkan untuk: ${tujuan}.
Bukti identitas berupa KTP saya lampirkan.

Yogyakarta, ${today}
Salam hormat,
${nama_pemohon}
        `;

                const info = await transporter.sendMail({
                    from: `"Otomatisasi PPID" <${userSettings.email_sender}>`, // Pakai email user
                    to: target.email,
                    subject: subject,
                    text: bodyText,
                    attachments: [{ 
                        filename: ktpFile.originalname, 
                        path: ktpFile.path // Baca dari disk
                    }],
                });

                // Log email berhasil dikirim ke database
                // Penting: message_id disimpan untuk pelacakan balasan (reply tracking)
                saveEmailLog({
                    user_id: parseInt(user_id),
                    badan_publik_id: parseInt(target.id),
                    recipient_email: target.email,
                    recipient_name: target.nama_badan_publik,
                    email_subject: subject,
                    email_body: bodyText,
                    status: 'sent',
                    sent_at: new Date(),
                    message_id: info.messageId // Ambil Message-ID dari respon nodemailer
                }, (err, result) => {
                    if (err) {
                        console.error('Error logging email:', err);
                    } else {
                        console.log('Email logged successfully:', result?.id);
                    }
                });

                // Increment sent_count di badan_publik
                db.query(
                    'UPDATE badan_publik SET sent_count = COALESCE(sent_count, 0) + 1 WHERE id = ?',
                    [target.id],
                    (err) => {
                        if (err) console.error('Error updating sent_count:', err);
                    }
                );

                successCount++;
                
                // Delay 2 detik untuk menghindari rate limit (Queue sederhana)
                await delay(2000);

            } catch (error) {
                console.error(`Gagal ke ${target.nama_badan_publik}:`, error.message);

                // Log failed email - only with fields that exist in model
                saveEmailLog({
                    user_id: parseInt(user_id),
                    badan_publik_id: parseInt(target.id),
                    recipient_email: target.email,
                    recipient_name: target.nama_badan_publik,
                    email_subject: `Permohonan Informasi - GAGAL`,
                    email_body: `Error: ${error.message}`,
                    status: 'failed',
                    sent_at: new Date()
                }, (err, result) => {
                    if (err) {
                        console.error('Error logging failed email:', err);
                    } else {
                        console.log('Failed email logged successfully:', result?.id);
                    }
                });

                failedCount++;
            }
        }

        // Hapus file KTP dari disk setelah selesai semua pengiriman
        if (ktpFile && ktpFile.path) {
            try {
                fs.unlinkSync(ktpFile.path);
            } catch (e) {
                console.error("Gagal menghapus file temp:", e);
            }
        }

        res.json({ message: "Selesai", processed: successCount, failed: failedCount });

    } catch (err) {
        // Hapus file jika terjadi error global
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {}
        }
        console.error("Send bulk email error:", err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};