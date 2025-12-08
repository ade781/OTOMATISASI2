import { DataTypes } from "sequelize";
import db from "../config/db.js";

const EmailSettings = db.define("email_settings", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
    email_sender: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    app_password: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
}, {
    freezeTableName: true,
    timestamps: true,
    createdAt: false,
    updatedAt: "updated_at",
});

db.sync().then(() => console.log("✓ Database synced model or table email_settings"));

// Export helper functions for controllers
export const getSettings = (userId, callback) => {
    EmailSettings.findOne({ where: { user_id: userId } })
        .then((settings) => callback(null, settings))
        .catch((err) => callback(err, null));
};

export const saveSettings = (userId, data, callback) => {
    EmailSettings.upsert(
        { user_id: userId, ...data },
        { where: { user_id: userId } }
    )
        .then((result) => callback(null, result))
        .catch((err) => callback(err, null));
};

export default EmailSettings;
