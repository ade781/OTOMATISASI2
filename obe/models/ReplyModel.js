import db from "../config/db.js";

// Ambil semua balasan berdasarkan ID Badan Publik
export const getRepliesByBpId = (bpId, callback) => {
    const sql = "SELECT * FROM email_replies WHERE badan_publik_id = ? ORDER BY received_at DESC";
    db.query(sql, [bpId], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result);
    });
};