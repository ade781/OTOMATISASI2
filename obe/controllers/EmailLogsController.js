// obe/controllers/EmailLogsController.js
// All schema management is now handled by Sequelize models
// This file is kept for backwards compatibility

export const ensureEmailLogsSchema = async () => {
    // No-op: Models handle schema creation via db.sync()
    return Promise.resolve();
};

export const setupEmailLogsSchema = async (req, res) => {
    try {
        await ensureEmailLogsSchema();
        res.json({ success: true, message: "Email logs schema ready" });
    } catch (err) {
        console.error("Email logs schema setup error:", err);
        res.status(500).json({ success: false, message: "Failed to prepare email logs schema", error: err.message });
    }
};
