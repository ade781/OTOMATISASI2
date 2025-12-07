import { getRepliesByBpId } from "../models/ReplyModel.js";
import nodemailer from "nodemailer";
import { getSettings } from "../models/SettingsModel.js";

export const listReplies = (req, res) => {
    const bpId = req.params.id;
    getRepliesByBpId(bpId, (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ data: rows });
    });
};

export const sendReply = async (req, res) => {
    try {
        const { user_id, to, subject, body, in_reply_to } = req.body;

        if (!user_id || !to || !subject || !body) {
            return res.status(400).json({ success: false, message: "Data tidak lengkap" });
        }

        // Get user's Gmail settings
        const userSettings = await new Promise((resolve, reject) => {
            getSettings(user_id, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        if (!userSettings) {
            return res.status(400).json({ success: false, message: "Pengaturan Email belum diset" });
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: userSettings.email_sender,
                pass: userSettings.app_password,
            },
        });

        // Send email
        const mailOptions = {
            from: `"${userSettings.email_sender}" <${userSettings.email_sender}>`,
            to: to,
            subject: subject,
            text: body,
            inReplyTo: in_reply_to,
            references: in_reply_to
        };

        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: "Balasan berhasil dikirim" });

    } catch (err) {
        console.error('Send Reply Error:', err);
        res.status(500).json({ success: false, message: err.message || "Gagal mengirim balasan" });
    }
};