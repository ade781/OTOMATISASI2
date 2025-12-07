// obe/controllers/SettingsController.js
import { saveSettings, getSettings } from "../models/SettingsModel.js";

export const updateEmailSettings = (req, res) => {
    const { userId, email, appPassword } = req.body;

    if (!userId || !email || !appPassword) {
        return res.status(400).json({ message: "Data tidak lengkap" });
    }

    // Langsung simpan tanpa enkripsi
    saveSettings(userId, email, appPassword, (err, result) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });
        res.json({ message: "Pengaturan email berhasil disimpan!" });
    });
};

export const getUserSettings = (req, res) => {
    const userId = req.query.userId;
    getSettings(userId, (err, data) => {
        if (err) return res.status(500).json({ message: "Error" });
        // Kirim email dan password untuk ditampilkan (lokal app)
        res.json({
            email: data ? data.email_sender : "",
            password: data ? data.app_password : ""
        });
    });
};