import { getRepliesByBpId } from "../models/ReplyModel.js";

export const listReplies = (req, res) => {
    const bpId = req.params.id;
    getRepliesByBpId(bpId, (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ data: rows });
    });
};