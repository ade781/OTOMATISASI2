import db from "../config/db.js";

export const getAllBadanPublik = (callback) => {
    const sql = "SELECT id, nama_badan_publik, kategori, website, pertanyaan, email, status, thread_id FROM badan_publik";
    db.query(sql, (err, result) => {
        if (err) return callback(err, null);
        callback(null, result);
    });
};
