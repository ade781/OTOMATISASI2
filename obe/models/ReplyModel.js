import { DataTypes, QueryTypes } from "sequelize";
import db from "../config/db.js";

const EmailReply = db.define("email_replies", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    badan_publik_id: {
        type: DataTypes.INTEGER,
    },
    message_id: {
        type: DataTypes.STRING(255),
        unique: true,
    },
    in_reply_to: {
        type: DataTypes.STRING(255),
    },
    thread_id: {
        type: DataTypes.STRING(255),
    },
    from_email: {
        type: DataTypes.STRING(255),
    },
    from_name: {
        type: DataTypes.STRING(255),
    },
    subject: {
        type: DataTypes.STRING(500),
    },
    message: {
        type: DataTypes.TEXT,
    },
    received_at: {
        type: DataTypes.DATE,
    },
}, {
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
});

db.sync().then(() => console.log("✓ Database synced model or table email_replies"));

// Export helper functions for controllers
export const saveReply = (reply, callback) => {
    const { user_id, badan_publik_id, message_id, in_reply_to, thread_id, from_email, from_name, subject, message, received_at } = reply;
    EmailReply.create({
        user_id,
        badan_publik_id: badan_publik_id || null,
        message_id,
        in_reply_to,
        thread_id: thread_id || null,
        from_email,
        from_name: from_name || null,
        subject: subject || null,
        message: message || null,
        received_at: received_at || new Date(),
    })
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export const getRepliesForUser = (userId, callback) => {
    EmailReply.findAll({
        where: { user_id: userId },
        order: [["received_at", "DESC"]],
    })
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export const getReplyMessageIdsByUser = (userId, callback) => {
    EmailReply.findAll({
        where: { user_id: userId },
        attributes: ["message_id"],
    })
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export const getRepliesForSentEmails = (userId, callback) => {
    db.query(
        `
    SELECT
      er.id, er.badan_publik_id, er.from_email, er.from_name, er.subject, er.message, er.received_at, er.message_id, er.in_reply_to, er.thread_id,
      el.recipient_email, el.recipient_name
    FROM email_replies er
    INNER JOIN email_logs el ON er.in_reply_to = el.message_id
    WHERE el.user_id = ?
    ORDER BY er.received_at DESC
  `,
        { replacements: [userId], type: QueryTypes.SELECT }
    )
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export const getRepliesByBpId = (bpId, callback) => {
    db.query(
        `
    SELECT
      er.id, er.user_id, er.message_id, er.in_reply_to, er.thread_id, er.from_email, er.from_name, er.subject, er.message, er.received_at,
      el.recipient_email, el.recipient_name
    FROM email_replies er
    LEFT JOIN email_logs el ON er.in_reply_to = el.message_id
    WHERE er.badan_publik_id = ?
    ORDER BY er.received_at DESC
  `,
        { replacements: [bpId], type: QueryTypes.SELECT }
    )
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export default EmailReply;
