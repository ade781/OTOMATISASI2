import db from "../config/db.js";

// GET ALL (Sudah ada)
export const getBadanPublik = (req, res) => {
    const sql = "SELECT * FROM badan_publik";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ message: "Server Error", error: err });
        res.json({ data: result });
    });
};

// CREATE (Baru)
export const createBadanPublik = (req, res) => {
    const { nama, kategori, email, website, pertanyaan } = req.body;
    const sql = "INSERT INTO badan_publik (nama_badan_publik, kategori, email, website, pertanyaan, status) VALUES (?, ?, ?, ?, ?, 'pending')";

    db.query(sql, [nama, kategori, email, website, pertanyaan], (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal menyimpan data", error: err });
        res.json({ message: "Data berhasil ditambahkan", id: result.insertId });
    });
};

// UPDATE (Baru)
export const updateBadanPublik = (req, res) => {
    const { id } = req.params;
    const { nama, kategori, email, website, pertanyaan } = req.body;
    const sql = "UPDATE badan_publik SET nama_badan_publik=?, kategori=?, email=?, website=?, pertanyaan=? WHERE id=?";

    db.query(sql, [nama, kategori, email, website, pertanyaan, id], (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal mengupdate data", error: err });
        res.json({ message: "Data berhasil diperbarui" });
    });
};

// DELETE (Baru)
export const deleteBadanPublik = (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM badan_publik WHERE id=?";

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal menghapus data", error: err });
        res.json({ message: "Data berhasil dihapus" });
    });
};