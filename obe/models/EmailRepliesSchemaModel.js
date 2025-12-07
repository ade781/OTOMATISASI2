import db from "../config/db.js";

export const createEmailRepliesSchema = () =>
    new Promise((resolve, reject) => {
        const sql = `
      CREATE TABLE IF NOT EXISTS email_replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        badan_publik_id INT,
        message_id VARCHAR(255),
        in_reply_to VARCHAR(255),
        thread_id VARCHAR(255),
        from_email VARCHAR(255),
        from_name VARCHAR(255),
        subject VARCHAR(500),
        message TEXT,
        received_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_badan_publik_id (badan_publik_id),
        UNIQUE KEY uk_message_id (message_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

        db.query(sql, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
