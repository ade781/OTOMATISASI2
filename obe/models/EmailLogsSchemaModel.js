import db from "../config/db.js";

export const createEmailLogsSchema = () =>
    new Promise((resolve, reject) => {
        const sql = `
      CREATE TABLE IF NOT EXISTS email_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255),
        subject VARCHAR(500),
        body TEXT,
        status ENUM('sent', 'failed', 'replied', 'pending') DEFAULT 'sent',
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        message_id VARCHAR(255),
        thread_id VARCHAR(255),
        replied_at TIMESTAMP NULL,
        error_message TEXT,
        attachment_name VARCHAR(255),
        INDEX idx_user_id (user_id),
        INDEX idx_recipient_email (recipient_email),
        INDEX idx_sent_at (sent_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

        db.query(sql, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });

export const ensureSentCountColumn = () =>
    new Promise((resolve, reject) => {
        const sql = `
      ALTER TABLE badan_publik 
      ADD COLUMN IF NOT EXISTS sent_count INT DEFAULT 0;
    `;

        db.query(sql, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
