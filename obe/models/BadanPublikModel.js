import { DataTypes } from "sequelize";
import db from "../config/db.js";

const BadanPublik = db.define("badan_publik", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    // Mapped from 'Nama Badan Publik'
    name: {
        type: DataTypes.STRING(255), // Realistis: 31 char terlalu pendek
        field: 'Nama Badan Publik',  // Menunjuk ke kolom asli di DB
        allowNull: true,
    },
    // Mapped from 'Kategori'
    kategori: {
        type: DataTypes.STRING(50),
        field: 'Kategori',
        allowNull: true,
    },
    // Mapped from 'Website'
    website: {
        type: DataTypes.STRING(255), // URL butuh space lebih dari 43 char
        field: 'Website',
        allowNull: true,
    },
    // Mapped from 'Pertanyaan'
    pertanyaan: {
        type: DataTypes.STRING(255), // 201 oke, tapi 255 standar
        field: 'Pertanyaan',
        allowNull: true,
    },
    // Mapped from 'Email'
    email: {
        type: DataTypes.STRING(100),
        field: 'Email',
        allowNull: true,
        validate: {
            isEmail: true // Tambahan validasi biar data bersih
        }
    },
    // Mapped from 'Status'
    status: {
        type: DataTypes.STRING(20),
        field: 'Status',
        defaultValue: 'Pending' // Saran: kasih default value
    },
    // Mapped from 'Thread Id'
    threadId: {
        type: DataTypes.STRING(50),
        field: 'Thread Id', // Perhatikan spasi di sini sesuai SQL kamu
        allowNull: true,
    }
}, {
    freezeTableName: true,
    timestamps: false, // Sesuai request, tidak ada created_at/updated_at
    tableName: 'data'  // PENTING: Jika nama tabel di DB kamu adalah 'data', ganti ini. 
    // Jika tetap 'badan_publik', hapus baris ini.
});

// Sinkronisasi (Hati-hati: alter: true akan mengubah struktur tabel DB jika beda)
// db.sync({ alter: true }).then(() => console.log("✓ Database synced model badan_publik"));

// --- Helper Functions (Legacy Callback Style) ---

export const getBadanPublik = (callback) => {
    BadanPublik.findAll()
        .then((data) => callback(null, data))
        .catch((err) => callback(err, null));
};

export const getBadanPublikById = (id, callback) => {
    BadanPublik.findByPk(id)
        .then((data) => callback(null, data))
        .catch((err) => callback(err, null));
};

export const createBadanPublik = (data, callback) => {
    BadanPublik.create(data)
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export const updateBadanPublik = (id, data, callback) => {
    BadanPublik.update(data, { where: { id } })
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export const deleteBadanPublik = (id, callback) => {
    BadanPublik.destroy({ where: { id } })
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export default BadanPublik;