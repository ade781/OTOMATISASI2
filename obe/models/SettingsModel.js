// obe/models/SettingsModel.js
import db from "../config/db.js";

// Simpan atau Update setting
export const saveSettings = (userId, email, appPassword, callback) => {
    // Upsert: Jika user_id sudah ada, update. Jika belum, insert.
    const sql = `
        INSERT INTO email_settings (user_id, email_sender, app_password) 
        VALUES (?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
        email_sender = VALUES(email_sender), 
        app_password = VALUES(app_password)
    `;

    db.query(sql, [userId, email, appPassword], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result);
    });
};

// Ambil setting
export const getSettings = (userId, callback) => {
    const sql = "SELECT * FROM email_settings WHERE user_id = ?";
    db.query(sql, [userId], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result[0]); // Mengembalikan baris pertama atau undefined
    });
};