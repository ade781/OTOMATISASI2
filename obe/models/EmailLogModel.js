import { DataTypes, QueryTypes } from "sequelize";
import db from "../config/db.js";

const EmailLog = db.define("email_logs", {
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
        allowNull: false,
    },
    recipient_email: {
        type: DataTypes.STRING(255),
    },
    recipient_name: {
        type: DataTypes.STRING(255),
    },
    email_subject: {
        type: DataTypes.STRING(500),
    },
    email_body: {
        type: DataTypes.TEXT,
    },
    status: {
        type: DataTypes.ENUM("pending", "sent", "failed", "replied"),
        defaultValue: "pending",
    },
    sent_at: {
        type: DataTypes.DATE,
    },
}, {
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
});

db.sync().then(() => console.log("✓ Database synced model or table email_logs"));

// Export helper functions for controllers
export const saveEmailLog = (logData, callback) => {
    EmailLog.create(logData)
        .then((log) => callback(null, log))
        .catch((err) => callback(err, null));
};

export const getEmailLogsByUser = (userId, limit = 50, offset = 0, callback) => {
    // Handle both callback and 3-param versions
    if (typeof offset === "function") {
        callback = offset;
        offset = 0;
        limit = 50;
    }

    EmailLog.findAll({
        where: { user_id: userId },
        order: [["created_at", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
    })
        .then((logs) => callback(null, logs))
        .catch((err) => callback(err, null));
};

export const getEmailLogById = (id, callback) => {
    EmailLog.findByPk(id)
        .then((log) => callback(null, log ? [log] : []))
        .catch((err) => callback(err, null));
};

export const getSentLogsByUser = (userId, callback) => {
    EmailLog.findAll({
        where: { user_id: userId, status: "sent" },
        order: [["sent_at", "DESC"]],
    })
        .then((logs) => callback(null, logs))
        .catch((err) => callback(err, null));
};

export const updateEmailLogStatus = (logId, status, callback) => {
    EmailLog.update(
        { status, sent_at: new Date() },
        { where: { id: logId } }
    )
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export const getEmailStats = (userId, callback) => {
    db.query(
        `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied
    FROM email_logs
    WHERE user_id = ?
  `,
        { replacements: [userId], type: QueryTypes.SELECT }
    )
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export const searchEmailLogs = (userId, query, callback) => {
    db.query(
        `
    SELECT * FROM email_logs
    WHERE user_id = ? AND (
      recipient_email LIKE ? OR
      recipient_name LIKE ? OR
      email_subject LIKE ?
    )
    ORDER BY created_at DESC
  `,
        { replacements: [userId, `%${query}%`, `%${query}%`, `%${query}%`], type: QueryTypes.SELECT }
    )
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export default EmailLog;
