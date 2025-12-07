import { DataTypes } from "sequelize";
import db from "../config/db.js";

const BadanPublik = db.define(
    "badan_publik",
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nama_badan_publik: { type: DataTypes.STRING, allowNull: false },
        kategori: { type: DataTypes.STRING },
        website: { type: DataTypes.STRING },
        pertanyaan: { type: DataTypes.TEXT },
        email: { type: DataTypes.STRING },
        status: { type: DataTypes.STRING },
        thread_id: { type: DataTypes.STRING },
        sent_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    {
        freezeTableName: true,
        timestamps: false,
    }
);

export const getAllBadanPublik = (callback) => {
    BadanPublik.findAll()
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export default BadanPublik;
