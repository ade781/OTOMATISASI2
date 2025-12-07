import {
    createEmailLogsSchema,
    ensureSentCountColumn,
    ensureBadanPublikIdColumn,
} from "../models/EmailLogsSchemaModel.js";
import { createEmailRepliesSchema } from "../models/EmailRepliesSchemaModel.js";

export const ensureEmailLogsSchema = async () => {
    await createEmailLogsSchema();
    await ensureSentCountColumn();
    await ensureBadanPublikIdColumn();
    await createEmailRepliesSchema();
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
