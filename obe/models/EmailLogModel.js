import db from '../config/db.js';

/**
 * Save sent email log
 */
export const saveEmailLog = (logData, callback) => {
    const { user_id, recipient_email, recipient_name, subject, body, status, message_id, thread_id, attachment_name, error_message, badan_publik_id } = logData;

    const query = `
        INSERT INTO email_logs 
        (user_id, recipient_email, recipient_name, subject, body, status, message_id, thread_id, attachment_name, error_message, badan_publik_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        query,
        [user_id, recipient_email, recipient_name, subject, body, status || 'sent', message_id, thread_id, attachment_name, error_message, badan_publik_id || null],
        callback
    );
};

export const getSentLogsByUser = (user_id, callback) => {
    const query = `
        SELECT id, recipient_email, recipient_name, message_id, thread_id, user_id, badan_publik_id
        FROM email_logs
        WHERE user_id = ? AND message_id IS NOT NULL
    `;

    db.query(query, [user_id], callback);
};

/**
 * Get all email logs for a user
 */
export const getEmailLogsByUser = (user_id, limit = 50, offset = 0, callback) => {
    const query = `
        SELECT * FROM email_logs 
        WHERE user_id = ? 
        ORDER BY sent_at DESC 
        LIMIT ? OFFSET ?
    `;

    db.query(query, [user_id, parseInt(limit), parseInt(offset)], callback);
};

/**
 * Get email log by ID
 */
export const getEmailLogById = (id, callback) => {
    const query = 'SELECT * FROM email_logs WHERE id = ?';
    db.query(query, [id], callback);
};

/**
 * Update email log status
 */
export const updateEmailLogStatus = (id, status, callback) => {
    const query = 'UPDATE email_logs SET status = ? WHERE id = ?';
    db.query(query, [status, id], callback);
};

/**
 * Mark email as replied
 */
export const markEmailAsReplied = (id, callback) => {
    const query = 'UPDATE email_logs SET status = ?, replied_at = NOW() WHERE id = ?';
    db.query(query, ['replied', id], callback);
};

/**
 * Get email statistics for a user
 */
export const getEmailStats = (user_id, callback) => {
    const query = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM email_logs 
        WHERE user_id = ?
    `;

    db.query(query, [user_id], callback);
};

/**
 * Search email logs
 */
export const searchEmailLogs = (user_id, searchTerm, callback) => {
    const query = `
        SELECT * FROM email_logs 
        WHERE user_id = ? 
        AND (recipient_email LIKE ? OR recipient_name LIKE ? OR subject LIKE ?)
        ORDER BY sent_at DESC
        LIMIT 100
    `;

    const searchPattern = `%${searchTerm}%`;
    db.query(query, [user_id, searchPattern, searchPattern, searchPattern], callback);
};
