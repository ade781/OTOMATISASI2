import { DataTypes } from "sequelize";
import db from "../config/db.js";

const BadanPublik = db.define("badan_publik", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(255),
    },
    phone: {
        type: DataTypes.STRING(20),
    },
    sent_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    freezeTableName: true,
    timestamps: false,
});

db.sync().then(() => console.log("✓ Database synced model or table badan_publik"));

// Export helper functions for controllers
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
