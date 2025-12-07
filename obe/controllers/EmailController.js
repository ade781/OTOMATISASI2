// obe/controllers/EmailController.js
import nodemailer from "nodemailer";
import { getSettings } from "../models/SettingsModel.js"; // Import model

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
            return res.status(400).json({ message: "Pengaturan Email belum diset! Silakan ke menu Pengaturan." });
        }

        const targets = JSON.parse(recipients);

        // 2. Buat Transporter pakai data dari DB
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: userSettings.email_sender, // Ambil dari DB
                pass: userSettings.app_password, // Ambil dari DB (Plain Text)
            },
        });

        let successCount = 0;
        let failedCount = 0;

        // 3. Loop kirim email
        for (const target of targets) {
            try {
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

                await transporter.sendMail({
                    from: `"Otomatisasi PPID" <${userSettings.email_sender}>`, // Pakai email user
                    to: target.email,
                    subject: subject,
                    text: bodyText,
                    attachments: [{ filename: ktpFile.originalname, content: ktpFile.buffer }],
                });

                successCount++;
            } catch (error) {
                console.error(`Gagal ke ${target.nama_badan_publik}:`, error.message);
                failedCount++;
            }
        }

        res.json({ message: "Selesai", processed: successCount, failed: failedCount });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};