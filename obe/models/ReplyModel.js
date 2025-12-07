import db from "../config/db.js";

export const saveReply = (reply, callback) => {
    const {
        user_id,
        badan_publik_id,
        message_id,
        in_reply_to,
        thread_id,
        from_email,
        from_name,
        subject,
        message,
        received_at,
    } = reply;

    const sql = `
        INSERT INTO email_replies
        (user_id, badan_publik_id, message_id, in_reply_to, thread_id, from_email, from_name, subject, message, received_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            user_id,
            badan_publik_id || null,
            message_id,
            in_reply_to,
            thread_id || null,
            from_email,
            from_name || null,
            subject || null,
            message || null,
            received_at || new Date(),
        ],
        callback
    );
};

export const getRepliesForUser = (userId, callback) => {
    const sql = `
        SELECT id, badan_publik_id, from_email, from_name, subject, message, received_at, message_id, in_reply_to
        FROM email_replies
        WHERE user_id = ?
        ORDER BY received_at DESC
    `;
    db.query(sql, [userId], callback);
};

export const getReplyMessageIdsByUser = (userId, callback) => {
    const sql = "SELECT message_id FROM email_replies WHERE user_id = ?";
    db.query(sql, [userId], callback);
};

export const getRepliesForSentEmails = (userId, callback) => {
    const sql = `
        SELECT
            er.id,
            er.badan_publik_id,
            er.from_email,
            er.from_name,
            er.subject,
            er.message,
            er.received_at,
            er.message_id,
            er.in_reply_to,
            er.thread_id,
            el.recipient_email,
            el.recipient_name
        FROM email_replies er
        INNER JOIN email_logs el ON er.in_reply_to = el.message_id
        WHERE el.user_id = ?
        ORDER BY er.received_at DESC
    `;
    db.query(sql, [userId], callback);
};

export const getRepliesByBpId = (bpId, callback) => {
    const sql = `
        SELECT
            er.id,
            er.user_id,
            er.message_id,
            er.in_reply_to,
            er.thread_id,
            er.from_email,
            er.from_name,
            er.subject,
            er.message,
            er.received_at,
            el.recipient_email,
            el.recipient_name
        FROM email_replies er
        LEFT JOIN email_logs el ON er.in_reply_to = el.message_id
        WHERE er.badan_publik_id = ?
        ORDER BY er.received_at DESC
    `;
    db.query(sql, [bpId], callback);
};