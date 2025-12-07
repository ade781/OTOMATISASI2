import { getAllBadanPublik } from "../models/BadanPublikModel.js";

export const listBadanPublik = (req, res) => {
    getAllBadanPublik((err, rows) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json({ data: rows });
    });
};
