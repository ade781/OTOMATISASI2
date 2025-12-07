import { DataTypes } from "sequelize";
import db from "../config/db.js";

const User = db.define(
  "users",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: "user" },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

export const findUser = (username, callback) => {
  User.findOne({ where: { username } })
    .then((user) => callback(null, user))
    .catch((err) => callback(err, null));
};

export default User;
