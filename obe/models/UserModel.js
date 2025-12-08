import { DataTypes } from "sequelize";
import db from "../config/db.js";

const User = db.define("users", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(50),
    defaultValue: "user",
  },
}, {
  freezeTableName: true,
  timestamps: false,
});

db.sync().then(() => console.log("✓ Database synced model or table users"));

// Export helper functions for controllers
export const findUser = (username, callback) => {
  User.findOne({ where: { username } })
    .then((user) => callback(null, user))
    .catch((err) => callback(err, null));
};

export const findUserById = (id, callback) => {
  User.findByPk(id)
    .then((user) => callback(null, user))
    .catch((err) => callback(err, null));
};

export const createUser = (userData, callback) => {
  User.create(userData)
    .then((user) => callback(null, user))
    .catch((err) => callback(err, null));
};

export default User;
